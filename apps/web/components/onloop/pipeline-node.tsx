"use client";

import { Handle, Position } from "@xyflow/react";
import { useMemo, type JSX } from "react";

export type StepStatus = "pending" | "running" | "completed" | "failed";

export type PipelineNodeData = {
  readonly label: string;
  readonly sublabel?: string;
  readonly status: StepStatus;
  readonly href?: string;
};

type NodeProps = { data: PipelineNodeData };

const STATUS_CLASS: Record<StepStatus, string> = {
  pending: "border-neutral-800 bg-neutral-950/60 text-neutral-500",
  running: "border-blue-500/50 bg-blue-500/10 text-blue-200 animate-pulse",
  completed: "border-emerald-500/50 bg-emerald-500/10 text-emerald-200",
  failed: "border-red-500/50 bg-red-500/10 text-red-200",
};

export function PipelineNode({ data }: NodeProps): JSX.Element {
  const className = useMemo(() => STATUS_CLASS[data.status], [data.status]);
  const content = (
    <div className="flex flex-col gap-0.5">
      <div className="font-mono text-xs uppercase tracking-wider">
        {data.label}
      </div>
      {data.sublabel ? (
        <div className="truncate text-xs opacity-70">{data.sublabel}</div>
      ) : null}
    </div>
  );

  return (
    <div
      className={`rounded-md border px-3 py-2 text-xs shadow-sm transition-colors min-w-[140px] max-w-[200px] ${className}`}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      {data.href ? (
        <a href={data.href} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      ) : (
        content
      )}
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}
