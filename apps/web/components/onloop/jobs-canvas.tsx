"use client";

import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
import { SESSION_HEADER } from "@/lib/onloop/session";
import { useSessionId } from "@/lib/onloop/use-session-id";
import { JobCard, type JobCardData, type JobStatus } from "./job-card";

export type CanvasJob = {
  id: string;
  status: JobStatus;
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

type ListResponse = { runs: CanvasJob[] };

const CARD_WIDTH = 320;
const CARD_HEIGHT = 260;
const GUTTER_X = 40;
const GUTTER_Y = 40;
const COLS = 3;
const POSITIONS_KEY = "onloop-canvas-positions-v1";

type JobNode = Node<JobCardData, "job">;

const nodeTypes: NodeTypes = { job: JobCard };

function sourceKindFromRun(originalEmailId: string): "email" | "web" {
  return originalEmailId.startsWith("web:") ? "web" : "email";
}

function defaultPositionFor(index: number): { x: number; y: number } {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return {
    x: col * (CARD_WIDTH + GUTTER_X),
    y: row * (CARD_HEIGHT + GUTTER_Y),
  };
}

type PositionMap = Record<string, { x: number; y: number }>;

function loadPositions(): PositionMap {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(POSITIONS_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as PositionMap;
    }
    return {};
  } catch (err) {
    void err;
    return {};
  }
}

function savePositions(map: PositionMap): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(POSITIONS_KEY, JSON.stringify(map));
  } catch (err) {
    void err;
  }
}

function buildNodes(runs: CanvasJob[], positions: PositionMap): JobNode[] {
  return runs.map((run, i): JobNode => {
    const position = positions[run.id] ?? defaultPositionFor(i);
    return {
      id: run.id,
      type: "job",
      position,
      data: {
        runId: run.id,
        status: run.status,
        k: run.k,
        createdAt: run.createdAt,
        completedAt: run.completedAt,
        sourceKind: sourceKindFromRun(run.originalEmailId),
        senderLabel: run.senderLabel,
        subject: run.subject,
        firstIdeaPreview: run.firstIdeaPreview,
        firstEpisodeMp3Url: run.firstEpisodeMp3Url,
        firstEpisodeDurationSec: run.firstEpisodeDurationSec,
        firstEpisodeTitle: run.firstEpisodeTitle,
        ideaCount: run.ideaCount,
        selectedCount: run.selectedCount,
        episodeCount: run.episodeCount,
      },
      draggable: true,
      selectable: false,
      connectable: false,
    };
  });
}

export type JobsCanvasProps = {
  initial?: CanvasJob[];
  pollIntervalMs?: number;
};

export function JobsCanvas({
  initial = [],
  pollIntervalMs = 2500,
}: JobsCanvasProps): JSX.Element {
  const sessionId = useSessionId();
  const [runs, setRuns] = useState<CanvasJob[]>(initial);
  const [positions, setPositions] = useState<PositionMap>({});
  const [loaded, setLoaded] = useState(initial.length > 0);

  useEffect(() => {
    setPositions(loadPositions());
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
          return;
        }
        const data = (await res.json()) as ListResponse;
        if (!cancelled) {
          setRuns(data.runs);
          setLoaded(true);
        }
      } catch (err) {
        void err;
      }
    }

    void tick();
    const id = setInterval(tick, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionId, pollIntervalMs]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    let shouldPersist = false;
    setPositions((prev) => {
      const next = { ...prev };
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          next[change.id] = change.position;
          if (!change.dragging) {
            shouldPersist = true;
          }
        }
      }
      if (shouldPersist) {
        savePositions(next);
      }
      return next;
    });
  }, []);

  const { nodes, edges } = useMemo(() => {
    return { nodes: buildNodes(runs, positions), edges: [] as Edge[] };
  }, [runs, positions]);

  if (!sessionId || !loaded) {
    return (
      <div className="relative h-full w-full rounded-xl border border-white/5 bg-black/30">
        <div className="flex h-full items-center justify-center">
          <p className="font-mono text-xs uppercase tracking-wider text-neutral-500">
            loading…
          </p>
        </div>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="relative h-full w-full rounded-xl border border-white/5 bg-black/30">
        <div className="flex h-full items-center justify-center">
          <div className="flex max-w-md flex-col items-center gap-3 text-center">
            <div className="rounded-full border border-white/10 bg-white/5 p-4">
              <svg
                role="img"
                aria-label="empty canvas"
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
              You haven&apos;t submitted anything yet
            </p>
            <p className="text-sm text-neutral-500">
              Jobs appear here scoped to this browser (no account). Drop ideas
              in the form above, or email{" "}
              <span className="font-mono text-neutral-300">
                tasks@onloop.work
              </span>
              .
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600">
              session · {sessionId.slice(0, 8)}…
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-white/5 bg-black/30">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          fitView
          fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={[1, 2]}
          selectionOnDrag={false}
          zoomOnScroll
          minZoom={0.3}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1f1f1f" gap={24} size={1} />
          <Controls showInteractive={false} position="bottom-right" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
