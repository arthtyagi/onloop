import type { Metadata } from "next";
import Link from "next/link";
import { SubmitForm } from "@/components/onloop/submit-form";

export const metadata: Metadata = {
  title: "Submit ideas",
  description: "Submit podcast ideas to the onloop pipeline.",
};

export default function SubmitPage(): React.ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-20">
      <header className="mx-auto flex w-full max-w-2xl flex-col gap-3 text-center">
        <h1 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
          onloop
        </h1>
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Send ideas, get podcast episodes.
        </h2>
        <p className="text-balance text-base leading-relaxed text-muted-foreground">
          Drop a few podcast ideas below. Agents triage, research, write a
          script, voice it with ElevenLabs, and publish to the feed.
        </p>
        <p className="text-sm text-muted-foreground">
          <Link href="/canvas" className="underline hover:text-foreground">
            View all jobs →
          </Link>
        </p>
      </header>
      <SubmitForm />
    </main>
  );
}
