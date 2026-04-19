import { gateway } from "@open-harness/agent";
import { generateObject } from "ai";
import { TRIAGE_MODEL } from "./config";
import { TriageOutputSchema, type TriageOutput } from "./schemas";

const SYSTEM_PROMPT = `You are the triage agent for onloop, an AI-managed podcast pipeline. Score every idea on three axes (1-10 integers):
- novelty: is this fresh or well-covered already?
- listenability: can this sustain 2-3 minutes of narrated audio?
- factuality: is this grounded enough to write truthfully about it?

Assign exactly one moodTag per idea: "news" for timely events, "explainer" for educational content, "commentary" for opinion/analysis.

Mark selected=true for exactly K ideas — the top K by (novelty + listenability + factuality). All others selected=false.

Rationale: one concise sentence per idea, grounded in the scores.`;

export async function triageIdeas(
  ideas: { id: string; text: string }[],
  k: number,
): Promise<TriageOutput> {
  const userPrompt = [
    `K = ${k} (select exactly ${k} idea${k === 1 ? "" : "s"})`,
    "",
    "IDEAS:",
    ...ideas.map((idea) => `- [${idea.id}] ${idea.text}`),
  ].join("\n");

  const { object } = await generateObject({
    model: gateway(TRIAGE_MODEL),
    schema: TriageOutputSchema,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
  });

  const expectedIds = new Set(ideas.map((idea) => idea.id));
  const returnedIds = new Set(object.ideas.map((idea) => idea.id));
  if (expectedIds.size !== returnedIds.size) {
    throw new Error(
      `Triage returned ${returnedIds.size} ideas, expected ${expectedIds.size}`,
    );
  }
  for (const id of expectedIds) {
    if (!returnedIds.has(id)) {
      throw new Error(`Triage missing idea id ${id}`);
    }
  }

  const selectedCount = object.ideas.filter((idea) => idea.selected).length;
  if (selectedCount !== k) {
    throw new Error(`Triage selected ${selectedCount} ideas, expected ${k}`);
  }

  return object;
}
