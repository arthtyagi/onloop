import { nanoid } from "nanoid";
import { getWorkflowMetadata, getWritable, sleep } from "workflow";
import {
  createEpisode,
  getIdeasForRun,
  getRunWithRelations,
  updateIdeaSelection,
  updateRunStatus,
} from "@/lib/db/onloop-runs";
import type { NewEpisode } from "@/lib/db/schema";
import { concatAudio, estimateDurationSec } from "@/lib/onloop/concat";
import {
  EPISODE_MP3_PATH_PREFIX,
  INTRO_SFX_PROMPT,
  OUTRO_SFX_PROMPT,
} from "@/lib/onloop/config";
import type { PipelineEvent, PipelineStep } from "@/lib/onloop/events";
import { researchIdea } from "@/lib/onloop/research";
import type { MoodTag } from "@/lib/onloop/schemas";
import { generateScript } from "@/lib/onloop/script";
import { sendReplyEmail } from "@/lib/onloop/reply";
import { generateSfx } from "@/lib/onloop/sfx";
import { textToSpeech } from "@/lib/onloop/tts";
import { triageIdeas } from "@/lib/onloop/triage";

type WorkflowInput = {
  originalEmailId: string;
  k: number;
};

type Pick = {
  ideaId: string;
  text: string;
  moodTag: MoodTag;
};

function now(): string {
  return new Date().toISOString();
}

async function emitEvent(event: PipelineEvent): Promise<void> {
  "use step";
  const writer = getWritable<PipelineEvent>().getWriter();
  try {
    await writer.write(event);
  } finally {
    writer.releaseLock();
  }
}

async function updateRunStatusStep(
  runId: string,
  status: "running" | "completed" | "failed",
  completedAt?: Date,
): Promise<void> {
  "use step";
  await updateRunStatus(runId, status, completedAt);
}

async function fetchIdeasStep(
  runId: string,
): Promise<{ id: string; text: string }[]> {
  "use step";
  const rows = await getIdeasForRun(runId);
  return rows.map((idea) => ({ id: idea.id, text: idea.text }));
}

async function triageStep(
  runId: string,
  ideasWithText: { id: string; text: string }[],
  k: number,
): Promise<Pick[]> {
  "use step";
  const output = await triageIdeas(ideasWithText, k);
  await Promise.all(
    output.ideas.map((idea) =>
      updateIdeaSelection(idea.id, {
        selected: idea.selected,
        moodTag: idea.moodTag,
        rationale: idea.rationale,
        scoreNovelty: idea.scoreNovelty,
        scoreListenability: idea.scoreListenability,
        scoreFactuality: idea.scoreFactuality,
      }),
    ),
  );
  const textByIdeaId = new Map(
    ideasWithText.map((idea) => [idea.id, idea.text] as const),
  );
  return output.ideas
    .filter((idea) => idea.selected)
    .map((idea) => ({
      ideaId: idea.id,
      text: textByIdeaId.get(idea.id) ?? "",
      moodTag: idea.moodTag,
    }));
}

async function researchStep(
  ideaText: string,
): Promise<Awaited<ReturnType<typeof researchIdea>>> {
  "use step";
  return await researchIdea(ideaText);
}

async function scriptStep(
  ideaText: string,
  research: Awaited<ReturnType<typeof researchIdea>>,
  moodTag: MoodTag,
): Promise<Awaited<ReturnType<typeof generateScript>>> {
  "use step";
  return await generateScript(ideaText, research, moodTag);
}

async function voiceStep(text: string): Promise<Buffer> {
  "use step";
  return await textToSpeech(text);
}

async function introSfxStep(): Promise<Buffer> {
  "use step";
  return await generateSfx(INTRO_SFX_PROMPT);
}

async function outroSfxStep(): Promise<Buffer> {
  "use step";
  return await generateSfx(OUTRO_SFX_PROMPT);
}

async function concatStep(
  intro: Buffer,
  voice: Buffer,
  outro: Buffer,
): Promise<{ buffer: Buffer; durationSec: number }> {
  "use step";
  const buffer = concatAudio(
    Buffer.from(intro),
    Buffer.from(voice),
    Buffer.from(outro),
  );
  const durationSec = estimateDurationSec(buffer);
  return { buffer, durationSec };
}

async function publishStep(input: {
  runId: string;
  ideaId: string;
  title: string;
  description: string;
  episodeBuffer: Buffer;
  durationSec: number;
}): Promise<{
  episodeId: string;
  title: string;
  mp3Url: string;
  durationSec: number;
}> {
  "use step";
  const { put } = await import("@vercel/blob");
  const guid = nanoid();
  const path = `${EPISODE_MP3_PATH_PREFIX}/${input.runId}/${guid}.mp3`;
  const blob = await put(path, input.episodeBuffer, {
    access: "public",
    contentType: "audio/mpeg",
    addRandomSuffix: false,
  });
  const episodeRow: NewEpisode = {
    id: nanoid(),
    runId: input.runId,
    ideaId: input.ideaId,
    title: input.title,
    description: input.description,
    mp3Url: blob.url,
    lengthBytes: input.episodeBuffer.length,
    durationSec: input.durationSec,
    guid,
  };
  const saved = await createEpisode(episodeRow);
  return {
    episodeId: saved.id,
    title: saved.title,
    mp3Url: saved.mp3Url,
    durationSec: saved.durationSec,
  };
}

async function replyStep(
  runId: string,
  originalEmailId: string,
  fromAddress: string,
): Promise<void> {
  "use step";
  if (originalEmailId.startsWith("web:")) {
    return;
  }
  const relations = await getRunWithRelations(runId);
  if (!relations || relations.episodes.length === 0) {
    return;
  }
  await sendReplyEmail({
    originalEmailId,
    episodes: relations.episodes,
    fromAddress,
    runUrl: `https://onloop.work/flow/${runId}`,
  });
}

async function processBranch(runId: string, pick: Pick): Promise<void> {
  async function emitStep(
    step: PipelineStep,
    status: "running" | "completed" | "failed",
  ): Promise<void> {
    await emitEvent({
      type: "branch-step",
      ideaId: pick.ideaId,
      step,
      status,
      timestamp: now(),
    });
  }

  try {
    await emitStep("research", "running");
    const research = await researchStep(pick.text);
    await emitStep("research", "completed");

    await emitStep("script", "running");
    const script = await scriptStep(pick.text, research, pick.moodTag);
    await emitStep("script", "completed");

    await emitStep("voice", "running");
    await emitStep("intro-sfx", "running");
    await emitStep("outro-sfx", "running");
    const [voice, intro, outro] = await Promise.all([
      voiceStep(script.text),
      introSfxStep(),
      outroSfxStep(),
    ]);
    await emitStep("voice", "completed");
    await emitStep("intro-sfx", "completed");
    await emitStep("outro-sfx", "completed");

    await emitStep("concat", "running");
    const { buffer: episodeBuffer, durationSec } = await concatStep(
      intro,
      voice,
      outro,
    );
    await emitStep("concat", "completed");

    await emitStep("publish", "running");
    const published = await publishStep({
      runId,
      ideaId: pick.ideaId,
      title: script.title,
      description: script.description,
      episodeBuffer,
      durationSec,
    });
    await emitStep("publish", "completed");

    await emitEvent({
      type: "episode-published",
      ideaId: pick.ideaId,
      episodeId: published.episodeId,
      title: published.title,
      mp3Url: published.mp3Url,
      durationSec: published.durationSec,
      timestamp: now(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(
      `[onloop branch ${pick.ideaId}] step failed: ${message}\n${stack ?? ""}`,
    );
    await emitEvent({
      type: "run-error",
      message: `Branch ${pick.ideaId}: ${message}`,
      timestamp: now(),
    });
    throw err;
  }
}

export async function podcastWorkflow(input: WorkflowInput): Promise<void> {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  const runId = workflowRunId;

  await sleep("2s");

  try {
    await updateRunStatusStep(runId, "running");
    await emitEvent({
      type: "run-status",
      status: "running",
      timestamp: now(),
    });

    const ideaPairs = await fetchIdeasStep(runId);
    const picks = await triageStep(runId, ideaPairs, input.k);

    await emitEvent({
      type: "triage-complete",
      picks: picks.map((pick) => ({
        id: pick.ideaId,
        moodTag: pick.moodTag,
        rationale: "",
      })),
      timestamp: now(),
    });

    await Promise.all(picks.map((pick) => processBranch(runId, pick)));

    const fromAddress = process.env.ONLOOP_FROM_ADDRESS ?? "hello@onloop.work";
    await replyStep(runId, input.originalEmailId, fromAddress);
    await emitEvent({ type: "reply-sent", timestamp: now() });

    await updateRunStatusStep(runId, "completed", new Date());
    await emitEvent({
      type: "run-status",
      status: "completed",
      timestamp: now(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(
      `[onloop workflow ${runId}] failed: ${message}\n${stack ?? ""}`,
    );
    await emitEvent({
      type: "run-error",
      message,
      timestamp: now(),
    });
    await updateRunStatusStep(runId, "failed");
    await emitEvent({
      type: "run-status",
      status: "failed",
      timestamp: now(),
    });
  }
}
