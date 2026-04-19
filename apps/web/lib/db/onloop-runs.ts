import { desc, eq, inArray } from "drizzle-orm";
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

export type RunSummary = Run & {
  ideaCount: number;
  selectedCount: number;
  episodeCount: number;
  firstIdeaPreview: string | null;
  firstEpisodeMp3Url: string | null;
  firstEpisodeDurationSec: number | null;
  firstEpisodeTitle: string | null;
};

export type ListRunSummariesOptions = {
  limit?: number;
  sessionId?: string | null;
};

export async function listRunSummaries(
  options: ListRunSummariesOptions = {},
): Promise<RunSummary[]> {
  const limit = options.limit ?? 50;
  const where = options.sessionId
    ? eq(runs.sessionId, options.sessionId)
    : undefined;

  const runRows = await (where
    ? db
        .select()
        .from(runs)
        .where(where)
        .orderBy(desc(runs.createdAt))
        .limit(limit)
    : db.select().from(runs).orderBy(desc(runs.createdAt)).limit(limit));
  if (runRows.length === 0) {
    return [];
  }
  const runIds = runRows.map((r) => r.id);
  const [ideaRows, episodeRows] = await Promise.all([
    db.select().from(ideas).where(inArray(ideas.runId, runIds)),
    db.select().from(episodes).where(inArray(episodes.runId, runIds)),
  ]);
  const ideaByRun = new Map<string, { total: number; selected: number }>();
  const firstIdeaByRun = new Map<string, { text: string; createdAt: Date }>();
  for (const id of runIds) {
    ideaByRun.set(id, { total: 0, selected: 0 });
  }
  for (const idea of ideaRows) {
    const acc = ideaByRun.get(idea.runId);
    if (!acc) {
      continue;
    }
    acc.total += 1;
    if (idea.selected) {
      acc.selected += 1;
    }
    const current = firstIdeaByRun.get(idea.runId);
    if (!current || idea.createdAt < current.createdAt) {
      firstIdeaByRun.set(idea.runId, {
        text: idea.text,
        createdAt: idea.createdAt,
      });
    }
  }
  const episodeByRun = new Map<string, number>();
  const firstEpisodeByRun = new Map<
    string,
    { mp3Url: string; durationSec: number; title: string; pubDate: Date }
  >();
  for (const ep of episodeRows) {
    episodeByRun.set(ep.runId, (episodeByRun.get(ep.runId) ?? 0) + 1);
    const current = firstEpisodeByRun.get(ep.runId);
    if (!current || ep.pubDate < current.pubDate) {
      firstEpisodeByRun.set(ep.runId, {
        mp3Url: ep.mp3Url,
        durationSec: ep.durationSec,
        title: ep.title,
        pubDate: ep.pubDate,
      });
    }
  }
  return runRows.map((r) => ({
    ...r,
    ideaCount: ideaByRun.get(r.id)?.total ?? 0,
    selectedCount: ideaByRun.get(r.id)?.selected ?? 0,
    episodeCount: episodeByRun.get(r.id) ?? 0,
    firstIdeaPreview: firstIdeaByRun.get(r.id)?.text ?? null,
    firstEpisodeMp3Url: firstEpisodeByRun.get(r.id)?.mp3Url ?? null,
    firstEpisodeDurationSec: firstEpisodeByRun.get(r.id)?.durationSec ?? null,
    firstEpisodeTitle: firstEpisodeByRun.get(r.id)?.title ?? null,
  }));
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
