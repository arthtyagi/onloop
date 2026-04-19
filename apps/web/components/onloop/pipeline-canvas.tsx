"use client";

import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildPipelineGraph,
  type CanvasEpisode,
  type CanvasIdea,
  type CanvasState,
} from "./pipeline-graph";
import { PipelineNode, type StepStatus } from "./pipeline-node";

export type InitialRun = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  k: number;
  createdAt: string;
  completedAt: string | null;
};

export type CanvasInitialProps = {
  runId: string;
  run: InitialRun;
  ideas: CanvasIdea[];
  episodes: CanvasEpisode[];
};

const nodeTypes: NodeTypes = { pipeline: PipelineNode };

type SnapshotEvent = {
  type: "snapshot";
  run: InitialRun;
  ideas: CanvasIdea[];
  episodes: CanvasEpisode[];
};

type RunStatusEvent = {
  type: "run-status";
  status: "running" | "completed" | "failed";
  timestamp: string;
};

type TriageCompleteEvent = {
  type: "triage-complete";
  picks: Array<{ id: string; moodTag: string; rationale: string }>;
  timestamp: string;
};

type BranchStepEvent = {
  type: "branch-step";
  ideaId: string;
  step:
    | "triage"
    | "research"
    | "script"
    | "voice"
    | "intro-sfx"
    | "outro-sfx"
    | "concat"
    | "publish";
  status: "running" | "completed" | "failed";
  timestamp: string;
};

type EpisodePublishedEvent = {
  type: "episode-published";
  ideaId: string;
  episodeId: string;
  title: string;
  mp3Url: string;
  durationSec: number;
  timestamp: string;
};

type ReplySentEvent = { type: "reply-sent"; timestamp: string };
type RunErrorEvent = { type: "run-error"; message: string; timestamp: string };
type TerminalEvent = { type: "terminal"; status?: string };

type StreamEvent =
  | SnapshotEvent
  | RunStatusEvent
  | TriageCompleteEvent
  | BranchStepEvent
  | EpisodePublishedEvent
  | ReplySentEvent
  | RunErrorEvent
  | TerminalEvent;

function mapStatus(status: InitialRun["status"]): StepStatus | "queued" {
  if (status === "queued") {
    return "queued";
  }
  if (status === "running") {
    return "running";
  }
  if (status === "completed") {
    return "completed";
  }
  return "failed";
}

function initialState(initial: CanvasInitialProps): CanvasState {
  const episodeIdeaIds = new Set(initial.episodes.map((ep) => ep.ideaId));
  const stepStates: Record<string, StepStatus> = {};
  for (const ideaId of episodeIdeaIds) {
    for (const phase of [
      "research",
      "script",
      "voice",
      "intro-sfx",
      "outro-sfx",
      "concat",
      "publish",
    ]) {
      stepStates[`${ideaId}-${phase}`] = "completed";
    }
  }
  const triageStatus: StepStatus =
    initial.ideas.some((idea) => idea.selected) ||
    initial.run.status === "completed"
      ? "completed"
      : initial.run.status === "running"
        ? "running"
        : "pending";
  const replyStatus: StepStatus =
    initial.run.status === "completed" ? "completed" : "pending";
  return {
    runId: initial.runId,
    runStatus: mapStatus(initial.run.status),
    k: initial.run.k,
    ideas: initial.ideas,
    episodes: initial.episodes,
    stepStates,
    triageStatus,
    replyStatus,
  };
}

export function PipelineCanvas(props: CanvasInitialProps): React.ReactElement {
  const [state, setState] = useState<CanvasState>(() => initialState(props));
  const [connected, setConnected] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const apply = useCallback((update: (prev: CanvasState) => CanvasState) => {
    setState((prev) => update(prev));
  }, []);

  useEffect(() => {
    if (state.runStatus === "completed" || state.runStatus === "failed") {
      return;
    }
    const es = new EventSource(`/api/runs/${props.runId}/events`);
    const onOpen = () => {
      setConnected(true);
    };
    const onMessage = (event: MessageEvent<string>) => {
      let payload: StreamEvent | undefined;
      try {
        payload = JSON.parse(event.data) as StreamEvent;
      } catch {
        return;
      }
      if (!payload || !("type" in payload)) {
        return;
      }
      handleEvent(payload, apply);
    };
    const onError = () => {
      setConnected(false);
    };
    es.addEventListener("open", onOpen);
    es.addEventListener("message", onMessage);
    es.addEventListener("error", onError);
    return () => {
      es.removeEventListener("open", onOpen);
      es.removeEventListener("message", onMessage);
      es.removeEventListener("error", onError);
      es.close();
      setConnected(false);
    };
  }, [props.runId, state.runStatus, apply]);

  const { nodes, edges } = useMemo(() => buildPipelineGraph(state), [state]);

  const label = connected ? "live" : state.runStatus;

  return (
    <div className="relative h-[calc(100vh-120px)] w-full rounded-lg border bg-black/40">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md border bg-background/80 px-3 py-1.5 text-xs font-mono backdrop-blur-sm">
        <span
          className={`size-1.5 rounded-full ${
            connected
              ? "bg-emerald-400 animate-pulse"
              : state.runStatus === "completed"
                ? "bg-emerald-500"
                : state.runStatus === "failed"
                  ? "bg-red-500"
                  : "bg-neutral-500"
          }`}
        />
        <span className="uppercase tracking-wider">
          {label} · k={state.k} · {state.episodes.length}/{state.k} episodes
        </span>
      </div>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          minZoom={0.3}
          maxZoom={1.6}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#222" gap={24} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

function handleEvent(
  payload: StreamEvent,
  apply: (fn: (prev: CanvasState) => CanvasState) => void,
): void {
  if (payload.type === "snapshot") {
    apply(() =>
      initialState({
        runId: payload.run.id,
        run: payload.run,
        ideas: payload.ideas,
        episodes: payload.episodes,
      }),
    );
    return;
  }
  if (payload.type === "run-status") {
    apply((prev) => ({
      ...prev,
      runStatus: mapStatus(payload.status),
    }));
    return;
  }
  if (payload.type === "triage-complete") {
    apply((prev) => {
      const selectedIds = new Set(payload.picks.map((p) => p.id));
      return {
        ...prev,
        triageStatus: "completed",
        ideas: prev.ideas.map((idea) => ({
          ...idea,
          selected: selectedIds.has(idea.id),
          moodTag:
            payload.picks.find((p) => p.id === idea.id)?.moodTag ??
            idea.moodTag,
        })),
      };
    });
    return;
  }
  if (payload.type === "branch-step") {
    apply((prev) => ({
      ...prev,
      stepStates: {
        ...prev.stepStates,
        [`${payload.ideaId}-${payload.step}`]: payload.status,
      },
    }));
    return;
  }
  if (payload.type === "episode-published") {
    apply((prev) => {
      const alreadyHas = prev.episodes.some(
        (ep) => ep.id === payload.episodeId,
      );
      if (alreadyHas) {
        return prev;
      }
      return {
        ...prev,
        episodes: [
          ...prev.episodes,
          {
            id: payload.episodeId,
            ideaId: payload.ideaId,
            title: payload.title,
            mp3Url: payload.mp3Url,
            durationSec: payload.durationSec,
          },
        ],
        stepStates: {
          ...prev.stepStates,
          [`${payload.ideaId}-publish`]: "completed",
        },
      };
    });
    return;
  }
  if (payload.type === "reply-sent") {
    apply((prev) => ({ ...prev, replyStatus: "completed" }));
    return;
  }
  if (payload.type === "run-error") {
    apply((prev) => ({ ...prev, runStatus: "failed" }));
    return;
  }
  if (payload.type === "terminal") {
    apply((prev) =>
      prev.runStatus === "running" ? { ...prev, runStatus: "completed" } : prev,
    );
  }
}
