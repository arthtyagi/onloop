"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function SubmitForm(): React.ReactElement {
  const router = useRouter();
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
    setSubmitting(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideas,
          k,
          email: email.length > 0 ? email : undefined,
        }),
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
      className="mx-auto flex w-full max-w-2xl flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <label
          htmlFor="ideas"
          className="font-mono text-xs uppercase tracking-wider text-muted-foreground"
        >
          Ideas (one per line)
        </label>
        <Textarea
          id="ideas"
          value={ideasText}
          onChange={(e) => setIdeasText(e.target.value)}
          rows={8}
          placeholder={
            "Why durable workflow runtimes are the next substrate\nThe Apple Podcasts search problem\nWhat the AI music licensing wars look like in 2030"
          }
          className="font-mono text-sm"
        />
      </div>
      <div className="flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <label
            htmlFor="email"
            className="font-mono text-xs uppercase tracking-wider text-muted-foreground"
          >
            Email (optional)
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="k"
            className="font-mono text-xs uppercase tracking-wider text-muted-foreground"
          >
            K
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
          {submitting ? "Starting..." : "Generate"}
        </Button>
      </div>
    </form>
  );
}
