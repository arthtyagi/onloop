import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EpisodeCard } from "@/components/onloop/episode-card";
import { PipelineCanvas } from "@/components/onloop/pipeline-canvas";
import { getRunWithRelations } from "@/lib/db/onloop-runs";
import { relativeTime } from "@/lib/onloop/relative-time";

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

function sourceKind(originalEmailId: string): "email" | "web" {
  return originalEmailId.startsWith("web:") ? "web" : "email";
}

function siteOrigin(): string {
  const domain = process.env.ONLOOP_DOMAIN;
  if (domain) {
    return domain.startsWith("http") ? domain : `https://${domain}`;
  }
  return "https://onloop.work";
}

export default async function FlowPage(
  context: RouteContext,
): Promise<React.ReactElement> {
  const { runId } = await context.params;
  const data = await getRunWithRelations(runId);
  if (!data) {
    notFound();
  }

  const kind = sourceKind(data.run.originalEmailId);
  const feedUrl = `${siteOrigin()}/feed.xml`;
  const episodes = data.episodes.map((ep) => ({
    id: ep.id,
    ideaId: ep.ideaId,
    title: ep.title,
    description: ep.description,
    mp3Url: ep.mp3Url,
    durationSec: ep.durationSec,
  }));

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-black p-6 text-white">
      <header className="flex flex-col gap-3 border-b border-white/5 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/canvas"
              className="font-mono text-xs uppercase tracking-wider text-neutral-400 hover:text-white"
            >
              ← onloop
            </Link>
            <span className="text-neutral-600">·</span>
            <span className="font-mono text-xs uppercase tracking-wider text-neutral-300">
              run/{runId.slice(0, 10)}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-neutral-300">
              {kind === "email" ? "email" : "web"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-neutral-300">
              {data.run.status}
            </span>
          </div>
          <a
            href="/feed.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs uppercase tracking-wider text-neutral-400 hover:text-white"
          >
            /feed.xml
          </a>
        </div>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div className="flex flex-col gap-0.5">
            <dt className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
              from
            </dt>
            <dd className="font-mono text-sm text-neutral-200">
              {data.run.senderLabel}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
              {data.run.subject ? "subject" : "received"}
            </dt>
            <dd className="text-sm text-neutral-200">
              {data.run.subject ??
                relativeTime(data.run.createdAt.toISOString())}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
              {data.run.completedAt ? "completed" : "started"}
            </dt>
            <dd className="font-mono text-sm text-neutral-200">
              {relativeTime(
                (data.run.completedAt ?? data.run.createdAt).toISOString(),
              )}
            </dd>
          </div>
        </dl>
      </header>

      {episodes.length > 0 ? (
        <section className="flex flex-col gap-5">
          {episodes.map((ep) => (
            <EpisodeCard
              key={ep.id}
              episode={{
                id: ep.id,
                title: ep.title,
                description: ep.description,
                mp3Url: ep.mp3Url,
                durationSec: ep.durationSec,
              }}
              feedUrl={feedUrl}
            />
          ))}
        </section>
      ) : null}

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
        episodes={episodes}
      />
    </main>
  );
}
