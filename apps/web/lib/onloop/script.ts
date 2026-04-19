import { gateway } from "@open-harness/agent";
import { generateObject } from "ai";
import { SCRIPT_MAX_WORDS, SCRIPT_MIN_WORDS, SCRIPT_MODEL } from "./config";
import {
  ScriptOutputSchema,
  type MoodTag,
  type ResearchOutput,
  type ScriptOutput,
} from "./schemas";

const SYSTEM_PROMPT = `You are the script agent for onloop. Write an audio-native podcast script.

Constraints:
- ${SCRIPT_MIN_WORDS}–${SCRIPT_MAX_WORDS} words
- Conversational, for a single narrator
- No markdown, no stage directions, no sound effect cues — prose only
- Do not write the host's name or "welcome to the show"
- Weave research facts into natural sentences, attributing when helpful
- End with a brief closing thought, not a call-to-action

Also output a short episode title (under 80 chars) and a single-sentence description suitable for a podcast feed. Report an honest wordCount of the script text.`;

export async function generateScript(
  idea: string,
  research: ResearchOutput,
  moodTag: MoodTag | null = null,
): Promise<ScriptOutput> {
  const mood: MoodTag = moodTag ?? "commentary";
  const bullets = research.bullets
    .map((b, i) => `${i + 1}. ${b.text} (source: ${b.sourceUrl})`)
    .join("\n");

  const userPrompt = [
    `IDEA: ${idea}`,
    `MOOD: ${mood}`,
    `FRAMING: ${research.summary}`,
    "",
    "FACTS:",
    bullets,
  ].join("\n");

  const { object } = await generateObject({
    model: gateway(SCRIPT_MODEL),
    schema: ScriptOutputSchema,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    providerOptions: {
      anthropic: { thinking: { type: "disabled", budgetTokens: 0 } },
    },
  });

  const actualCount = object.text.trim().split(/\s+/).filter(Boolean).length;
  return { ...object, wordCount: actualCount };
}
