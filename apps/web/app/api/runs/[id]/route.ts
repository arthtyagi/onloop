import { NextResponse } from "next/server";
import { getRunWithRelations } from "@/lib/db/onloop-runs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  const data = await getRunWithRelations(id);
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    run: {
      id: data.run.id,
      kind: data.run.kind,
      k: data.run.k,
      status: data.run.status,
      senderLabel: data.run.senderLabel,
      subject: data.run.subject,
      originalEmailId: data.run.originalEmailId,
      langfuseTraceId: data.run.langfuseTraceId,
      createdAt: data.run.createdAt.toISOString(),
      completedAt: data.run.completedAt?.toISOString() ?? null,
    },
    ideas: data.ideas.map((idea) => ({
      id: idea.id,
      text: idea.text,
      selected: idea.selected,
      moodTag: idea.moodTag,
      rationale: idea.rationale,
      scoreNovelty: idea.scoreNovelty,
      scoreListenability: idea.scoreListenability,
      scoreFactuality: idea.scoreFactuality,
    })),
    episodes: data.episodes.map((ep) => ({
      id: ep.id,
      title: ep.title,
      description: ep.description,
      mp3Url: ep.mp3Url,
      durationSec: ep.durationSec,
      pubDate: ep.pubDate.toISOString(),
      guid: ep.guid,
      ideaId: ep.ideaId,
    })),
  });
}
