import type { MoodTag, RunStatus } from "./schemas";

export type PipelineStep =
  | "triage"
  | "research"
  | "script"
  | "voice"
  | "intro-sfx"
  | "outro-sfx"
  | "concat"
  | "publish";

export type PipelineEvent =
  | { type: "run-status"; status: RunStatus; timestamp: string }
  | {
      type: "triage-complete";
      picks: Array<{
        id: string;
        moodTag: MoodTag;
        rationale: string;
      }>;
      timestamp: string;
    }
  | {
      type: "branch-step";
      ideaId: string;
      step: PipelineStep;
      status: "running" | "completed" | "failed";
      timestamp: string;
    }
  | {
      type: "episode-published";
      ideaId: string;
      episodeId: string;
      title: string;
      mp3Url: string;
      durationSec: number;
      timestamp: string;
    }
  | { type: "reply-sent"; timestamp: string }
  | { type: "run-error"; message: string; timestamp: string };
