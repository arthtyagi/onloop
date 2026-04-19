import { desc, eq } from "drizzle-orm";
import { db } from "./client";
import {
  episodes,
  ideas,
  type Episode,
  type Idea,
  type NewEpisode,
  type NewIdea,
  type NewRun,
  type Run,
  runs,
} from "./schema";

export async function createRun(input: NewRun): Promise<Run> {
  const [row] = await db.insert(runs).values(input).returning();
  return row;
}

export async function getRun(id: string): Promise<Run | undefined> {
  const rows = await db.select().from(runs).where(eq(runs.id, id)).limit(1);
  return rows[0];
}

export async function getRunBySourceMessageId(
  sourceMessageId: string,
): Promise<Run | undefined> {
  const rows = await db
    .select()
    .from(runs)
    .where(eq(runs.sourceMessageId, sourceMessageId))
    .limit(1);
  return rows[0];
}

type RunStatus = Run["status"];

export async function updateRunStatus(
  id: string,
  status: RunStatus,
  completedAt?: Date,
): Promise<void> {
  const patch: Partial<Run> = { status };
  if (completedAt !== undefined) {
    patch.completedAt = completedAt;
  }
  await db.update(runs).set(patch).where(eq(runs.id, id));
}

export async function setRunLangfuseTraceId(
  id: string,
  langfuseTraceId: string,
): Promise<void> {
  await db.update(runs).set({ langfuseTraceId }).where(eq(runs.id, id));
}

export async function createIdeas(rows: NewIdea[]): Promise<Idea[]> {
  if (rows.length === 0) {
    return [];
  }
  return await db.insert(ideas).values(rows).returning();
}

export async function getIdeasForRun(runId: string): Promise<Idea[]> {
  return await db.select().from(ideas).where(eq(ideas.runId, runId));
}

export type IdeaSelectionPatch = {
  selected: boolean;
  moodTag: Idea["moodTag"];
  rationale: string;
  scoreNovelty: number;
  scoreListenability: number;
  scoreFactuality: number;
};

export async function updateIdeaSelection(
  id: string,
  patch: IdeaSelectionPatch,
): Promise<void> {
  await db.update(ideas).set(patch).where(eq(ideas.id, id));
}

export async function createEpisode(input: NewEpisode): Promise<Episode> {
  const [row] = await db.insert(episodes).values(input).returning();
  return row;
}

export async function getEpisodesForRun(runId: string): Promise<Episode[]> {
  return await db.select().from(episodes).where(eq(episodes.runId, runId));
}

export async function getPublishedEpisodes(limit = 50): Promise<Episode[]> {
  return await db
    .select()
    .from(episodes)
    .orderBy(desc(episodes.pubDate))
    .limit(limit);
}

export type RunWithRelations = {
  run: Run;
  ideas: Idea[];
  episodes: Episode[];
};

export async function getRunWithRelations(
  id: string,
): Promise<RunWithRelations | undefined> {
  const run = await getRun(id);
  if (!run) {
    return undefined;
  }
  const [runIdeas, runEpisodes] = await Promise.all([
    getIdeasForRun(id),
    getEpisodesForRun(id),
  ]);
  return { run, ideas: runIdeas, episodes: runEpisodes };
}
