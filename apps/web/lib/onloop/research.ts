import { gateway } from "@open-harness/agent";
import { generateObject } from "ai";
import { Exa } from "exa-js";
import { RESEARCH_MODEL } from "./config";
import { ResearchOutputSchema, type ResearchOutput } from "./schemas";

const SYSTEM_PROMPT = `You are the research agent for onloop. Given a podcast idea and a set of search results, produce:
- 3 to 5 cited bullets of fact, each tied to a real source URL from the search results
- a single-sentence summary framing the angle

Every bullet must cite a real URL. Do not invent sources. Prefer recent, reputable results. If the search returned little, write fewer bullets rather than fabricating facts.`;

let _exa: Exa | undefined;
function exa(): Exa {
  if (!_exa) {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      throw new Error("EXA_API_KEY is not set");
    }
    _exa = new Exa(apiKey);
  }
  return _exa;
}

export async function researchIdea(idea: string): Promise<ResearchOutput> {
  const search = await exa().searchAndContents(idea, {
    type: "auto",
    numResults: 5,
    text: { maxCharacters: 1200 },
  });

  const context = search.results
    .map((r, i) => {
      const url = r.url;
      const title = r.title ?? url;
      const text = (r.text ?? "").slice(0, 800);
      return `[${i + 1}] ${title}\nURL: ${url}\n${text}`;
    })
    .join("\n\n");

  const userPrompt = [
    `IDEA: ${idea}`,
    "",
    "SEARCH RESULTS:",
    context.length > 0 ? context : "(no results)",
  ].join("\n");

  const { object } = await generateObject({
    model: gateway(RESEARCH_MODEL),
    schema: ResearchOutputSchema,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    providerOptions: {
      anthropic: { thinking: { type: "disabled", budgetTokens: 0 } },
    },
  });

  return object;
}
