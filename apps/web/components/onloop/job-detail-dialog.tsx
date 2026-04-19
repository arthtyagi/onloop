"use client";

import {
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Headphones,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState, type JSX } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { relativeTime } from "@/lib/onloop/relative-time";
import type { JobCardData, JobStatus } from "./job-card";

type RunDetail = {
  run: {
    id: string;
    k: number;
    status: string;
    senderLabel: string;
    subject: string | null;
    langfuseTraceId: string | null;
    createdAt: string;
    completedAt: string | null;
  };
  ideas: Array<{
    id: string;
    text: string;
    selected: boolean;
    moodTag: string | null;
    rationale: string | null;
    scoreNovelty: number | null;
    scoreListenability: number | null;
    scoreFactuality: number | null;
  }>;
  episodes: Array<{
    id: string;
    title: string;
    description: string;
    mp3Url: string;
    durationSec: number;
    pubDate: string;
    ideaId: string;
  }>;
};

const STATUS_ICON: Record<JobStatus, JSX.Element> = {
  queued: <Clock className="size-4 text-neutral-400" />,
  running: <Zap className="size-4 text-blue-400" />,
  completed: <CheckCircle2 className="size-4 text-emerald-400" />,
  failed: <XCircle className="size-4 text-red-400" />,
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.max(0, seconds - m * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function JobDetailDialog({
  job,
  open,
  onOpenChange,
}: {
  job: JobCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): JSX.Element {
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !job) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/runs/${job.runId}`)
      .then((res) => (res.ok ? (res.json() as Promise<RunDetail>) : null))
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, job]);

  if (!job) {
    return (
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-white/10 bg-neutral-950 text-white">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {STATUS_ICON[job.status]}
            <DialogTitle className="font-mono text-sm tracking-tight text-white">
              run/
              {job.runId.startsWith("wrun_")
                ? job.runId.slice(5, 17)
                : job.runId.slice(0, 12)}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-neutral-400">
            {job.senderLabel} · {relativeTime(job.createdAt)} · k={job.k}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="font-mono text-xs uppercase tracking-wider text-neutral-500">
              loading…
            </p>
          </div>
        ) : detail ? (
          <div className="flex flex-col gap-6 pt-2">
            <IdeasSection ideas={detail.ideas} />
            {detail.episodes.length > 0 ? (
              <EpisodesSection episodes={detail.episodes} />
            ) : null}
            <MetaSection run={detail.run} />
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="font-mono text-xs uppercase tracking-wider text-red-400">
              failed to load details
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function IdeasSection({ ideas }: { ideas: RunDetail["ideas"] }): JSX.Element {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        Ideas ({ideas.length})
      </h3>
      <ul className="flex flex-col gap-2">
        {ideas.map((idea) => (
          <li
            key={idea.id}
            className={`rounded-md border px-3 py-2 ${
              idea.selected
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-white/5 bg-white/[0.02]"
            }`}
          >
            <p className="text-sm leading-snug text-neutral-200">{idea.text}</p>
            {idea.selected ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {idea.moodTag ? (
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300">
                    {idea.moodTag}
                  </span>
                ) : null}
                {idea.scoreNovelty != null ? (
                  <Score label="novelty" value={idea.scoreNovelty} />
                ) : null}
                {idea.scoreListenability != null ? (
                  <Score label="listen" value={idea.scoreListenability} />
                ) : null}
                {idea.scoreFactuality != null ? (
                  <Score label="facts" value={idea.scoreFactuality} />
                ) : null}
                {idea.rationale ? (
                  <p className="mt-1 w-full text-xs text-neutral-400">
                    {idea.rationale}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-1 font-mono text-[10px] text-neutral-600">
                not selected
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Score({
  label,
  value,
}: {
  label: string;
  value: number;
}): JSX.Element {
  return (
    <span className="font-mono text-[10px] text-neutral-400">
      {label}: <span className="text-neutral-200">{value}</span>/5
    </span>
  );
}

function EpisodesSection({
  episodes,
}: {
  episodes: RunDetail["episodes"];
}): JSX.Element {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        Episodes ({episodes.length})
      </h3>
      {episodes.map((ep) => (
        <div
          key={ep.id}
          className="flex flex-col gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-300/80">
                {formatDuration(ep.durationSec)}
              </p>
              <h4 className="text-sm font-medium text-white">{ep.title}</h4>
              <p className="text-xs text-neutral-300">{ep.description}</p>
            </div>
            <Headphones className="size-5 shrink-0 text-emerald-400" />
          </div>
          <audio src={ep.mp3Url} controls preload="metadata" className="w-full">
            <track kind="captions" />
          </audio>
          <div className="flex items-center gap-2">
            <a
              href={ep.mp3Url}
              download
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-neutral-300 hover:bg-white/10"
            >
              <Download className="size-3" />
              Download
            </a>
          </div>
        </div>
      ))}
    </section>
  );
}

function MetaSection({ run }: { run: RunDetail["run"] }): JSX.Element {
  return (
    <section className="flex flex-col gap-2 border-t border-white/5 pt-4">
      <h3 className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        Run details
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div className="flex flex-col gap-0.5">
          <dt className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            Status
          </dt>
          <dd className="text-neutral-200">{run.status}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            Created
          </dt>
          <dd className="text-neutral-200">{relativeTime(run.createdAt)}</dd>
        </div>
        {run.completedAt ? (
          <div className="flex flex-col gap-0.5">
            <dt className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
              Completed
            </dt>
            <dd className="text-neutral-200">
              {relativeTime(run.completedAt)}
            </dd>
          </div>
        ) : null}
        {run.subject ? (
          <div className="col-span-2 flex flex-col gap-0.5">
            <dt className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
              Subject
            </dt>
            <dd className="text-neutral-200">{run.subject}</dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-2 flex items-center gap-2">
        <a
          href={`/flow/${run.id}`}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-xs text-neutral-300 hover:bg-white/10"
        >
          <ExternalLink className="size-3" />
          Pipeline view
        </a>
        {run.langfuseTraceId ? (
          <a
            href={`https://cloud.langfuse.com/trace/${run.langfuseTraceId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-xs text-neutral-300 hover:bg-white/10"
          >
            <ExternalLink className="size-3" />
            Trace
          </a>
        ) : null}
      </div>
    </section>
  );
}
