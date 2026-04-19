import type { Edge, Node } from "@xyflow/react";
import type { PipelineNodeData, StepStatus } from "./pipeline-node";

const COL_INGEST = 0;
const COL_TRIAGE = 220;
const COL_RESEARCH = 460;
const COL_SCRIPT = 680;
const COL_AUDIO = 900;
const COL_CONCAT = 1120;
const COL_PUBLISH = 1320;
const COL_EPISODE = 1540;
const COL_REPLY = 1780;

const ROW_HEIGHT = 220;
const AUDIO_OFFSET = 72;

export type CanvasIdea = {
  id: string;
  text: string;
  selected: boolean;
  moodTag: string | null;
  rationale: string | null;
};

export type CanvasEpisode = {
  id: string;
  ideaId: string;
  title: string;
  mp3Url: string;
  durationSec: number;
};

export type CanvasState = {
  runId: string;
  runStatus: StepStatus | "queued";
  k: number;
  ideas: CanvasIdea[];
  episodes: CanvasEpisode[];
  stepStates: Record<string, StepStatus>;
  triageStatus: StepStatus;
  replyStatus: StepStatus;
};

type PipelineFlowNode = Node<PipelineNodeData, "pipeline">;

function step(
  id: string,
  x: number,
  y: number,
  label: string,
  status: StepStatus,
  sublabel?: string,
  href?: string,
): PipelineFlowNode {
  return {
    id,
    type: "pipeline",
    position: { x, y },
    data: { label, sublabel, status, href },
    draggable: false,
    selectable: false,
    connectable: false,
  };
}

function edge(id: string, source: string, target: string): Edge {
  return {
    id,
    source,
    target,
    type: "default",
    animated: false,
    style: { stroke: "#3a3a3a", strokeWidth: 1 },
  };
}

function stepStatus(
  states: Record<string, StepStatus>,
  key: string,
): StepStatus {
  return states[key] ?? "pending";
}

export function buildPipelineGraph(state: CanvasState): {
  nodes: PipelineFlowNode[];
  edges: Edge[];
} {
  const nodes: PipelineFlowNode[] = [];
  const edges: Edge[] = [];
  const selected = state.ideas.filter((idea) => idea.selected);
  const effectiveIdeas =
    selected.length > 0 ? selected : state.ideas.slice(0, state.k);

  nodes.push(
    step(
      "ingest",
      COL_INGEST,
      0,
      "Ingest",
      state.ideas.length > 0 ? "completed" : "pending",
      `${state.ideas.length} idea${state.ideas.length === 1 ? "" : "s"}`,
    ),
  );

  nodes.push(
    step(
      "triage",
      COL_TRIAGE,
      0,
      "Triage",
      state.triageStatus,
      selected.length > 0
        ? `pick top ${state.k}`
        : `scoring ${state.ideas.length}`,
    ),
  );
  edges.push(edge("e-ingest-triage", "ingest", "triage"));

  effectiveIdeas.forEach((idea, branchIndex) => {
    const y = branchIndex * ROW_HEIGHT;
    const ideaIdSafe = idea.id;
    const preview = idea.text.slice(0, 36);

    const researchId = `${ideaIdSafe}-research`;
    const scriptId = `${ideaIdSafe}-script`;
    const voiceId = `${ideaIdSafe}-voice`;
    const introId = `${ideaIdSafe}-intro-sfx`;
    const outroId = `${ideaIdSafe}-outro-sfx`;
    const concatId = `${ideaIdSafe}-concat`;
    const publishId = `${ideaIdSafe}-publish`;
    const episodeId = `${ideaIdSafe}-episode`;

    const episode = state.episodes.find((ep) => ep.ideaId === idea.id);

    nodes.push(
      step(
        researchId,
        COL_RESEARCH,
        y,
        "Research",
        stepStatus(state.stepStates, researchId),
        preview,
      ),
      step(
        scriptId,
        COL_SCRIPT,
        y,
        "Script",
        stepStatus(state.stepStates, scriptId),
      ),
      step(
        voiceId,
        COL_AUDIO,
        y - AUDIO_OFFSET,
        "Voice",
        stepStatus(state.stepStates, voiceId),
        "ElevenLabs TTS",
      ),
      step(
        introId,
        COL_AUDIO,
        y,
        "Intro SFX",
        stepStatus(state.stepStates, introId),
      ),
      step(
        outroId,
        COL_AUDIO,
        y + AUDIO_OFFSET,
        "Outro SFX",
        stepStatus(state.stepStates, outroId),
      ),
      step(
        concatId,
        COL_CONCAT,
        y,
        "Concat",
        stepStatus(state.stepStates, concatId),
      ),
      step(
        publishId,
        COL_PUBLISH,
        y,
        "Publish",
        stepStatus(state.stepStates, publishId),
      ),
      step(
        episodeId,
        COL_EPISODE,
        y,
        "Episode",
        episode ? "completed" : "pending",
        episode
          ? `${Math.max(1, Math.round(episode.durationSec / 60))} min`
          : undefined,
        episode?.mp3Url,
      ),
    );

    edges.push(
      edge(`e-triage-${researchId}`, "triage", researchId),
      edge(`e-${researchId}-${scriptId}`, researchId, scriptId),
      edge(`e-${scriptId}-${voiceId}`, scriptId, voiceId),
      edge(`e-${scriptId}-${introId}`, scriptId, introId),
      edge(`e-${scriptId}-${outroId}`, scriptId, outroId),
      edge(`e-${voiceId}-${concatId}`, voiceId, concatId),
      edge(`e-${introId}-${concatId}`, introId, concatId),
      edge(`e-${outroId}-${concatId}`, outroId, concatId),
      edge(`e-${concatId}-${publishId}`, concatId, publishId),
      edge(`e-${publishId}-${episodeId}`, publishId, episodeId),
      edge(`e-${episodeId}-reply`, episodeId, "reply"),
    );
  });

  nodes.push(step("reply", COL_REPLY, 0, "Reply", state.replyStatus));

  return { nodes, edges };
}
