import { NextResponse } from "next/server";
import { listRunSummaries } from "@/lib/db/onloop-runs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam
    ? Math.min(200, Math.max(1, Number.parseInt(limitParam, 10) || 50))
    : 50;
  const rows = await listRunSummaries(limit);
  return NextResponse.json({
    runs: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      k: r.k,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
      originalEmailId: r.originalEmailId,
      senderLabel: r.senderLabel,
      subject: r.subject,
      firstIdeaPreview: r.firstIdeaPreview,
      ideaCount: r.ideaCount,
      selectedCount: r.selectedCount,
      episodeCount: r.episodeCount,
    })),
  });
}
