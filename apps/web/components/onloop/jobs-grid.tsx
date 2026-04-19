"use client";

import { useCallback, useEffect, useState, type JSX } from "react";
import { SESSION_HEADER } from "@/lib/onloop/session";
import { useSessionId } from "@/lib/onloop/use-session-id";
import { JobCard, type JobCardData } from "./job-card";
import { JobDetailDialog } from "./job-detail-dialog";

export type GridJob = {
  id: string;
  status: JobCardData["status"];
  k: number;
  createdAt: string;
  completedAt: string | null;
  originalEmailId: string;
  senderLabel: string;
  subject: string | null;
  firstIdeaPreview: string | null;
  firstEpisodeMp3Url: string | null;
  firstEpisodeDurationSec: number | null;
  firstEpisodeTitle: string | null;
  ideaCount: number;
  selectedCount: number;
  episodeCount: number;
};

type ListResponse = { runs: GridJob[] };

function sourceKind(originalEmailId: string): "email" | "web" {
  return originalEmailId.startsWith("web:") ? "web" : "email";
}

function toCardData(run: GridJob): JobCardData {
  return {
    runId: run.id,
    status: run.status,
    k: run.k,
    createdAt: run.createdAt,
    completedAt: run.completedAt,
    sourceKind: sourceKind(run.originalEmailId),
    senderLabel: run.senderLabel,
    subject: run.subject,
    firstIdeaPreview: run.firstIdeaPreview,
    firstEpisodeMp3Url: run.firstEpisodeMp3Url,
    firstEpisodeDurationSec: run.firstEpisodeDurationSec,
    firstEpisodeTitle: run.firstEpisodeTitle,
    ideaCount: run.ideaCount,
    selectedCount: run.selectedCount,
    episodeCount: run.episodeCount,
  };
}

export function JobsGrid({
  pollIntervalMs = 2500,
}: {
  pollIntervalMs?: number;
}): JSX.Element {
  const sessionId = useSessionId();
  const [runs, setRuns] = useState<GridJob[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [selectedJob, setSelectedJob] = useState<JobCardData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openDetail = useCallback((data: JobCardData) => {
    setSelectedJob(data);
    setDialogOpen(true);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    let cancelled = false;

    async function tick(): Promise<void> {
      try {
        const res = await fetch("/api/runs/list?limit=80", {
          cache: "no-store",
          headers: { [SESSION_HEADER]: sessionId as string },
        });
        if (!res.ok) {
          if (!cancelled) {
            setFetchError(`${res.status} ${res.statusText}`);
            setLoaded(true);
          }
          return;
        }
        const data = (await res.json()) as ListResponse;
        if (!cancelled) {
          setRuns(data.runs);
          setFetchError(null);
          setLoaded(true);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "network error";
          setFetchError(message);
          setLoaded(true);
        }
      }
    }

    void tick();
    const id = setInterval(tick, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionId, pollIntervalMs, reloadTick]);

  if (!sessionId || !loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="font-mono text-xs uppercase tracking-wider text-neutral-500">
          loading…
        </p>
      </div>
    );
  }

  if (fetchError && runs.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <p className="font-mono text-xs uppercase tracking-wider text-red-300">
            couldn&apos;t load jobs
          </p>
          <p className="text-sm text-neutral-400">{fetchError}</p>
          <button
            type="button"
            onClick={() => setReloadTick((n) => n + 1)}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-white hover:bg-white/10"
          >
            retry
          </button>
        </div>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <div className="rounded-full border border-white/10 bg-white/5 p-4">
            <svg
              role="img"
              aria-label="empty"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-neutral-500"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18" />
            </svg>
          </div>
          <p className="font-mono text-xs uppercase tracking-wider text-neutral-500">
            No jobs yet
          </p>
          <p className="text-sm text-neutral-500">
            Drop ideas in the form above, or email{" "}
            <span className="font-mono text-neutral-300">
              agent@onloop.work
            </span>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {runs.map((run) => {
          const data = toCardData(run);
          return (
            <JobCard
              key={run.id}
              data={data}
              onClick={() => openDetail(data)}
            />
          );
        })}
      </div>
      <JobDetailDialog
        job={selectedJob}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
