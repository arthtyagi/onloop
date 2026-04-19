import { nanoid } from "nanoid";
import { start } from "workflow/api";
import { podcastWorkflow } from "@/app/workflows/podcast";
import {
  createIdeas,
  createRun,
  getRunBySourceMessageId,
} from "@/lib/db/onloop-runs";
import type { NewIdea } from "@/lib/db/schema";
import { sha256Hex } from "./hash";

export type CreateRunInput = {
  ideas: string[];
  k: number;
  sourceMessageId: string;
  originalEmailId: string;
  senderEmail: string;
};

export type CreateRunResult = {
  runId: string;
  deduped: boolean;
};

export async function createOnloopRun(
  input: CreateRunInput,
): Promise<CreateRunResult> {
  const existing = await getRunBySourceMessageId(input.sourceMessageId);
  if (existing) {
    return { runId: existing.id, deduped: true };
  }

  const senderHash = await sha256Hex(input.senderEmail.toLowerCase());
  const runId = nanoid();

  await createRun({
    id: runId,
    kind: "podcast",
    k: input.k,
    status: "queued",
    senderHash,
    sourceMessageId: input.sourceMessageId,
    originalEmailId: input.originalEmailId,
  });

  const ideaRows: NewIdea[] = input.ideas.map((text) => ({
    id: nanoid(),
    runId,
    text,
    selected: false,
  }));
  await createIdeas(ideaRows);

  await start(podcastWorkflow, [
    {
      runId,
      originalEmailId: input.originalEmailId,
      k: input.k,
    },
  ]);

  return { runId, deduped: false };
}
