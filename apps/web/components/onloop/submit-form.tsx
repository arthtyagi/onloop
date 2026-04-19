"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SESSION_HEADER } from "@/lib/onloop/session";
import { useSessionId } from "@/lib/onloop/use-session-id";

export function SubmitForm(): React.ReactElement {
  const router = useRouter();
  const sessionId = useSessionId();
  const [ideasText, setIdeasText] = useState("");
  const [email, setEmail] = useState("");
  const [k, setK] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const ideas = ideasText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length >= 10);
    if (ideas.length === 0) {
      toast.error("Add at least one idea (10+ chars per line)");
      return;
    }
    if (!email || !email.includes("@")) {
      toast.error("Enter a valid email so we can notify you");
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
      router.push(`/flow/${data.runId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex w-full max-w-3xl flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <label
          htmlFor="ideas"
          className="font-mono text-xs uppercase tracking-wider text-muted-foreground"
        >
          Podcast ideas (one per line, min 10 chars)
        </label>
        <Textarea
          id="ideas"
          value={ideasText}
          onChange={(e) => setIdeasText(e.target.value)}
          rows={10}
          placeholder={
            "Why durable workflow runtimes are the 2026 substrate for agents\nThe Apple Podcasts search problem and what it means for discovery\nWhat the AI music licensing wars look like in 2030"
          }
          className="min-h-[240px] resize-y font-mono text-sm leading-relaxed"
        />
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <label
            htmlFor="email"
            className="font-mono text-xs uppercase tracking-wider text-muted-foreground"
          >
            Email (for the finished episode)
          </label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
          />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3" />
            <span>
              We only use this to send your ready-to-publish episode back. No
              account. No list.
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="k"
            className="font-mono text-xs uppercase tracking-wider text-muted-foreground"
          >
            K (episodes)
          </label>
          <select
            id="k"
            value={k}
            onChange={(e) => setK(Number.parseInt(e.target.value, 10))}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </div>
        <Button type="submit" disabled={submitting} size="lg">
          {submitting ? "Starting…" : "Generate"}
        </Button>
      </div>
    </form>
  );
}
