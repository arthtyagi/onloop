"use client";

import { Handle, Position } from "@xyflow/react";
import {
  CheckCircle2,
  Clock,
  Globe,
  Headphones,
  Mail,
  Play,
  XCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type JSX } from "react";
import { relativeTime } from "@/lib/onloop/relative-time";

export type JobStatus = "queued" | "running" | "completed" | "failed";

export type JobCardData = {
  readonly runId: string;
  readonly status: JobStatus;
  readonly k: number;
  readonly createdAt: string;
  readonly completedAt: string | null;
  readonly sourceKind: "email" | "web";
  readonly senderLabel: string;
  readonly subject: string | null;
  readonly firstIdeaPreview: string | null;
  readonly firstEpisodeMp3Url: string | null;
  readonly firstEpisodeDurationSec: number | null;
  readonly firstEpisodeTitle: string | null;
  readonly ideaCount: number;
  readonly selectedCount: number;
  readonly episodeCount: number;
};

type CardProps = { data: JobCardData };

const STATUS_STYLE: Record<
  JobStatus,
  {
    readonly borderClass: string;
    readonly badgeClass: string;
    readonly dotClass: string;
    readonly icon: JSX.Element;
    readonly label: string;
  }
> = {
  queued: {
    borderClass: "border-neutral-800",
    badgeClass: "bg-neutral-900 text-neutral-400 border border-neutral-800",
    dotClass: "bg-neutral-500",
    icon: <Clock className="size-3" />,
    label: "queued",
  },
  running: {
    borderClass: "border-blue-500/40",
    badgeClass: "bg-blue-500/10 text-blue-200 border border-blue-500/30",
    dotClass: "bg-blue-400 animate-pulse",
    icon: <Zap className="size-3" />,
    label: "running",
  },
  completed: {
    borderClass: "border-emerald-500/30",
    badgeClass:
      "bg-emerald-500/10 text-emerald-200 border border-emerald-500/30",
    dotClass: "bg-emerald-400",
    icon: <CheckCircle2 className="size-3" />,
    label: "ready",
  },
  failed: {
    borderClass: "border-red-500/40",
    badgeClass: "bg-red-500/10 text-red-200 border border-red-500/30",
    dotClass: "bg-red-400",
    icon: <XCircle className="size-3" />,
    label: "failed",
  },
};

function shortId(id: string): string {
  if (id.startsWith("wrun_")) {
    return id.slice(5, 13);
  }
  return id.slice(0, 8);
}

function sourceLabel(kind: JobCardData["sourceKind"]): string {
  return kind === "email" ? "via email" : "via web";
}

function useTick(intervalMs: number): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}

function truncate(input: string, max: number): string {
  if (input.length <= max) {
    return input;
  }
  return `${input.slice(0, max - 1).trimEnd()}…`;
}

export function JobCard({ data }: CardProps): JSX.Element {
  useTick(30_000);
  const style = STATUS_STYLE[data.status];
  const doneCount = data.episodeCount;
  const total = Math.max(1, data.selectedCount || data.k);
  const progressPct = Math.min(100, Math.round((doneCount / total) * 100));
  const preview = data.subject ?? data.firstIdeaPreview ?? "—";

  return (
    <div
      className={`relative flex w-[320px] flex-col rounded-lg border bg-neutral-950/80 shadow-xl backdrop-blur-sm transition-[box-shadow,transform] duration-200 hover:shadow-2xl ${style.borderClass}`}
      data-status={data.status}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <div className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className={`size-1.5 rounded-full ${style.dotClass}`} />
          <span className="text-neutral-300">{shortId(data.runId)}</span>
        </div>
        <div
          className={`flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${style.badgeClass}`}
        >
          {style.icon}
          {style.label}
        </div>
      </div>
      <div className="flex flex-col gap-3 px-3 py-3">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-1.5">
            {data.sourceKind === "email" ? (
              <Mail className="size-3.5" />
            ) : (
              <Globe className="size-3.5" />
            )}
            <span>{sourceLabel(data.sourceKind)}</span>
          </div>
          <span className="tabular-nums">{relativeTime(data.createdAt)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
            from
          </span>
          <span className="truncate font-mono text-xs text-neutral-200">
            {data.senderLabel}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
            {data.subject ? "subject" : "first idea"}
          </span>
          <p className="line-clamp-2 text-xs leading-snug text-neutral-300">
            {truncate(preview, 140)}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-neutral-300">
            <span className="font-mono text-sm tabular-nums text-white">
              {data.ideaCount}
            </span>
            <span className="text-neutral-500">ideas</span>
          </div>
          <div className="flex items-center gap-1 text-neutral-300">
            <span className="font-mono text-sm tabular-nums text-white">
              k={data.k}
            </span>
          </div>
          <div className="flex items-center gap-1 text-neutral-300">
            <Headphones className="size-3.5 text-neutral-500" />
            <span className="font-mono text-sm tabular-nums text-white">
              {data.episodeCount}
            </span>
            <span className="text-neutral-500">/{total}</span>
          </div>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/5">
          <div
            className={`h-full transition-[width] duration-500 ${
              data.status === "failed"
                ? "bg-red-500/60"
                : data.status === "completed"
                  ? "bg-emerald-500/70"
                  : "bg-blue-500/60"
            } ${data.status === "running" ? "animate-pulse" : ""}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
      {data.firstEpisodeMp3Url ? (
        <div className="flex flex-col gap-1.5 border-t border-white/5 px-3 py-2">
          {data.firstEpisodeTitle ? (
            <p className="truncate font-mono text-[10px] uppercase tracking-wider text-emerald-300/80">
              {data.firstEpisodeTitle}
            </p>
          ) : null}
          <audio
            src={data.firstEpisodeMp3Url}
            controls
            preload="none"
            className="nodrag w-full"
            onPointerDownCapture={(e) => e.stopPropagation()}
            onMouseDownCapture={(e) => e.stopPropagation()}
          >
            <track kind="captions" />
          </audio>
        </div>
      ) : null}
      <div className="flex items-center justify-between border-t border-white/5 px-3 py-2">
        <Link
          href={`/flow/${data.runId}`}
          className="font-mono text-xs text-neutral-400 hover:text-white"
          onPointerDownCapture={(e) => e.stopPropagation()}
        >
          open →
        </Link>
        {data.episodeCount > 0 && data.firstEpisodeMp3Url ? (
          <a
            href={data.firstEpisodeMp3Url}
            download
            onPointerDownCapture={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-200 hover:bg-emerald-500/20"
          >
            <Play className="size-3" />
            <span>download</span>
          </a>
        ) : (
          <span className="font-mono text-[11px] text-neutral-600">—</span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}
