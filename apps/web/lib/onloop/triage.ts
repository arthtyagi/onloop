import { gateway } from "@open-harness/agent";
import { generateObject } from "ai";
import { TRIAGE_MODEL } from "./config";
import type { MoodTag, ScoredIdea } from "./schemas";
import { TriageOutputSchema } from "./schemas";

const SYSTEM_PROMPT = `You are the triage agent for onloop, an AI-managed podcast pipeline. Score every idea on three axes (1-10 integers):
- novelty: is this fresh or well-covered already?
- listenability: can this sustain 2-3 minutes of narrated audio?
- factuality: is this grounded enough to write truthfully about it?

Assign exactly one moodTag per idea: "news" for timely events, "explainer" for educational content, "commentary" for opinion/analysis.

Mark selected=true for exactly K ideas — the top K by (novelty + listenability + factuality). All others selected=false.

Return one entry per input idea, preserving the input index (1-based).

Rationale: one concise sentence per idea, grounded in the scores.`;

export type TriageIdeaResult = {
  id: string;
  selected: boolean;
  moodTag: MoodTag;
  rationale: string;
  scoreNovelty: number;
  scoreListenability: number;
  scoreFactuality: number;
};

export async function triageIdeas(
  ideas: { id: string; text: string }[],
  k: number,
): Promise<{ ideas: TriageIdeaResult[] }> {
  const userPrompt = [
    `K = ${k} (select exactly ${k} idea${k === 1 ? "" : "s"})`,
    "",
    "IDEAS (numbered, 1-based):",
    ...ideas.map((idea, i) => `${i + 1}. ${idea.text}`),
  ].join("\n");

  let object: Awaited<
    ReturnType<typeof generateObject<typeof TriageOutputSchema>>
  >["object"];
  try {
    const result = await generateObject({
      model: gateway(TRIAGE_MODEL),
      schema: TriageOutputSchema,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    });
    object = result.object;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const cause =
      err instanceof Error && err.cause ? String(err.cause) : undefined;
    console.error(
      `[triage] generateObject failed: ${message}${
        cause ? ` | cause=${cause}` : ""
      } | model=${TRIAGE_MODEL} | k=${k} | ideaCount=${ideas.length}`,
    );
    throw err;
  }

  const seen = new Set<number>();
  const byIndex: ScoredIdea[] = [];
  for (const scored of object.ideas) {
    if (scored.index < 1 || scored.index > ideas.length) {
      continue;
    }
    if (seen.has(scored.index)) {
      continue;
    }
    seen.add(scored.index);
    byIndex[scored.index - 1] = scored;
  }

  const results: TriageIdeaResult[] = ideas.map((idea, i) => {
    const scored = byIndex[i];
    if (!scored) {
      return {
        id: idea.id,
        selected: false,
        moodTag: "commentary",
        rationale: "Not scored by triage; defaulted to unselected.",
        scoreNovelty: 1,
        scoreListenability: 1,
        scoreFactuality: 1,
      };
    }
    return {
      id: idea.id,
      selected: scored.selected,
      moodTag: scored.moodTag,
      rationale: scored.rationale,
      scoreNovelty: scored.scoreNovelty,
      scoreListenability: scored.scoreListenability,
      scoreFactuality: scored.scoreFactuality,
    };
  });

  const selectedCount = results.filter((r) => r.selected).length;
  if (selectedCount === 0) {
    const sorted = [...results].sort(
      (a, b) =>
        b.scoreNovelty +
        b.scoreListenability +
        b.scoreFactuality -
        (a.scoreNovelty + a.scoreListenability + a.scoreFactuality),
    );
    const toPick = Math.min(k, results.length);
    const pickIds = new Set(sorted.slice(0, toPick).map((r) => r.id));
    for (const r of results) {
      r.selected = pickIds.has(r.id);
    }
  } else if (selectedCount > k) {
    const sorted = results
      .filter((r) => r.selected)
      .sort(
        (a, b) =>
          b.scoreNovelty +
          b.scoreListenability +
          b.scoreFactuality -
          (a.scoreNovelty + a.scoreListenability + a.scoreFactuality),
      );
    const keep = new Set(sorted.slice(0, k).map((r) => r.id));
    for (const r of results) {
      r.selected = keep.has(r.id);
    }
  }

  return { ideas: results };
}
