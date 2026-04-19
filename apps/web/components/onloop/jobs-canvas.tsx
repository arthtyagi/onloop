"use client";

import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useState, type JSX } from "react";
import { JobCard, type JobCardData, type JobStatus } from "./job-card";

export type CanvasJob = {
  id: string;
  status: JobStatus;
  k: number;
  createdAt: string;
  completedAt: string | null;
  originalEmailId: string;
  ideaCount: number;
  selectedCount: number;
  episodeCount: number;
};

type ListResponse = { runs: CanvasJob[] };

const CARD_WIDTH = 320;
const CARD_HEIGHT = 200;
const GUTTER_X = 40;
const GUTTER_Y = 40;
const COLS = 3;

type JobNode = Node<JobCardData, "job">;

const nodeTypes: NodeTypes = { job: JobCard };

function sourceKindFromRun(originalEmailId: string): "email" | "web" {
  return originalEmailId.startsWith("web:") ? "web" : "email";
}

function toNodes(runs: CanvasJob[]): JobNode[] {
  return runs.map((run, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    return {
      id: run.id,
      type: "job",
      position: {
        x: col * (CARD_WIDTH + GUTTER_X),
        y: row * (CARD_HEIGHT + GUTTER_Y),
      },
      data: {
        runId: run.id,
        status: run.status,
        k: run.k,
        createdAt: run.createdAt,
        completedAt: run.completedAt,
        sourceKind: sourceKindFromRun(run.originalEmailId),
        ideaCount: run.ideaCount,
        selectedCount: run.selectedCount,
        episodeCount: run.episodeCount,
      },
      draggable: false,
      selectable: false,
      connectable: false,
    };
  });
}

export type JobsCanvasProps = {
  initial: CanvasJob[];
  pollIntervalMs?: number;
};

export function JobsCanvas({
  initial,
  pollIntervalMs = 2500,
}: JobsCanvasProps): JSX.Element {
  const [runs, setRuns] = useState<CanvasJob[]>(initial);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch("/api/runs/list", { cache: "no-store" });
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as ListResponse;
        if (!cancelled) {
          setRuns(data.runs);
        }
      } catch (err) {
        void err;
      }
    }

    const id = setInterval(tick, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollIntervalMs]);

  const { nodes, edges } = useMemo(() => {
    return { nodes: toNodes(runs), edges: [] as Edge[] };
  }, [runs]);

  if (runs.length === 0) {
    return (
      <div className="relative h-full w-full rounded-xl border border-white/5 bg-black/30">
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-center">
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
              No jobs yet
            </p>
            <p className="max-w-xs text-sm text-neutral-500">
              Send ideas via email or the header form. Your jobs will appear
              here as cards.
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
          fitView
          fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          minZoom={0.3}
          maxZoom={1.3}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1f1f1f" gap={24} size={1} />
          <Controls showInteractive={false} position="bottom-right" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
