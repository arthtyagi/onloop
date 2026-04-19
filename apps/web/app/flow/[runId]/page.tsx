import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRunWithRelations } from "@/lib/db/onloop-runs";
import { PipelineCanvas } from "@/components/onloop/pipeline-canvas";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

export async function generateMetadata(
  context: RouteContext,
): Promise<Metadata> {
  const { runId } = await context.params;
  return {
    title: `run/${runId.slice(0, 8)}`,
    description: "onloop pipeline run",
  };
}

export default async function FlowPage(
  context: RouteContext,
): Promise<React.ReactElement> {
  const { runId } = await context.params;
  const data = await getRunWithRelations(runId);
  if (!data) {
    notFound();
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 p-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/submit"
            className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            onloop
          </Link>
          <span className="text-muted-foreground">·</span>
          <span className="font-mono text-xs uppercase tracking-wider">
            run/{runId.slice(0, 8)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <a
            href="/feed.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono uppercase tracking-wider hover:text-foreground"
          >
            /feed.xml
          </a>
        </div>
      </header>
      <PipelineCanvas
        runId={runId}
        run={{
          id: data.run.id,
          status: data.run.status,
          k: data.run.k,
          createdAt: data.run.createdAt.toISOString(),
          completedAt: data.run.completedAt?.toISOString() ?? null,
        }}
        ideas={data.ideas.map((idea) => ({
          id: idea.id,
          text: idea.text,
          selected: idea.selected,
          moodTag: idea.moodTag,
          rationale: idea.rationale,
        }))}
        episodes={data.episodes.map((ep) => ({
          id: ep.id,
          ideaId: ep.ideaId,
          title: ep.title,
          mp3Url: ep.mp3Url,
          durationSec: ep.durationSec,
        }))}
      />
    </main>
  );
}
