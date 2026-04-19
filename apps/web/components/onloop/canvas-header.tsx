"use client";

import { Check, Copy, Mail, Rss, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type JSX } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SESSION_HEADER } from "@/lib/onloop/session";
import { useSessionId } from "@/lib/onloop/use-session-id";

export type CanvasHeaderProps = {
  inboundEmail: string;
  totals: {
    runs: number;
    completed: number;
    episodes: number;
  } | null;
};

export function CanvasHeader({
  inboundEmail,
  totals,
}: CanvasHeaderProps): JSX.Element {
  const router = useRouter();
  const sessionId = useSessionId();
  const [copied, setCopied] = useState(false);
  const [ideasText, setIdeasText] = useState("");
  const [email, setEmail] = useState("");
  const [k, setK] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(inboundEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    e.preventDefault();
    const ideas = ideasText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length >= 10);
    if (ideas.length === 0) {
      toast.error("Drop at least one idea (10+ chars per line)");
      return;
    }
    if (!email || !email.includes("@")) {
      toast.error("Email is required so we can notify you");
      return;
    }
    setSubmitting(true);
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (sessionId) {
        headers[SESSION_HEADER] = sessionId;
      }
      const res = await fetch("/api/runs", {
        method: "POST",
        headers,
        body: JSON.stringify({ ideas, k, email }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.error(data.error ?? "Failed to start run");
        return;
      }
      const data = (await res.json()) as { runId: string };
      setIdeasText("");
      toast.success(`Queued · ${data.runId.slice(0, 12)}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <header className="flex flex-col gap-4 border-b border-white/5 pb-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            onloop · AI multimedia pipeline
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Jobs
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          {totals ? (
            <>
              <Stat label="runs" value={totals.runs} />
              <Stat label="completed" value={totals.completed} />
              <Stat label="episodes" value={totals.episodes} />
            </>
          ) : null}
          <a
            href="/feed.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-neutral-300 hover:bg-white/10"
          >
            <Rss className="size-3" />
            feed.xml
          </a>
        </div>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 md:w-[360px]">
          <Mail className="size-4 text-neutral-400" />
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
              send ideas to
            </span>
            <span className="font-mono text-sm text-white">{inboundEmail}</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="copy email"
            className="ml-auto rounded p-1.5 text-neutral-400 hover:bg-white/5 hover:text-white"
          >
            {copied ? (
              <Check className="size-4 text-emerald-400" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
        >
          <label
            htmlFor="canvas-ideas"
            className="font-mono text-[10px] uppercase tracking-widest text-neutral-500"
          >
            or drop ideas here (one per line, min 10 chars)
          </label>
          <Textarea
            id="canvas-ideas"
            value={ideasText}
            onChange={(e) => setIdeasText(e.target.value)}
            rows={6}
            placeholder={
              "The Apple Podcasts search problem and what it means for discovery\nWhy durable runtimes are the agent substrate of 2026\nHow AI music licensing wars will unfold over the next decade"
            }
            className="min-h-[140px] resize-y border-white/10 bg-black/30 font-mono text-sm leading-relaxed text-white placeholder:text-neutral-600"
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@domain.com · we notify you when ready"
              className="h-8 flex-1 rounded border border-white/10 bg-black/40 px-2 font-mono text-xs text-white placeholder:text-neutral-600"
            />
            <label className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-400">
              k
              <select
                value={k}
                onChange={(e) => setK(Number.parseInt(e.target.value, 10))}
                className="h-8 rounded border border-white/10 bg-black/40 px-1.5 text-xs text-white"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </label>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="gap-1"
            >
              <Send className="size-3.5" />
              {submitting ? "Starting…" : "Drop"}
            </Button>
          </div>
        </form>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-neutral-300">
      <span className="tabular-nums text-white">{value}</span>
      <span className="ml-1 text-neutral-500">{label}</span>
    </div>
  );
}
