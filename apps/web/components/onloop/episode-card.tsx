"use client";

import { Copy, Download, ExternalLink, Headphones, Rss } from "lucide-react";
import { useState, type JSX } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type EpisodeCardProps = {
  episode: {
    id: string;
    title: string;
    description: string;
    mp3Url: string;
    durationSec: number;
  };
  feedUrl: string;
};

type Platform = {
  name: string;
  hint: string;
  action: "paste-feed" | "open-app";
  href: string;
};

const PLATFORMS: Platform[] = [
  {
    name: "Apple Podcasts",
    hint: "Paste your feed URL in Podcasts Connect",
    action: "paste-feed",
    href: "https://podcastsconnect.apple.com/my-podcasts/new-feed",
  },
  {
    name: "Spotify for Podcasters",
    hint: "Submit the feed URL — verification via DNS or email code",
    action: "paste-feed",
    href: "https://podcasters.spotify.com/submit",
  },
  {
    name: "Pocket Casts",
    hint: "Subscribe instantly in the app — no account needed",
    action: "open-app",
    href: "pktc://subscribe/onloop.work/feed.xml",
  },
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.max(0, seconds - m * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function EpisodeCard({
  episode,
  feedUrl,
}: EpisodeCardProps): JSX.Element {
  const [copiedFeed, setCopiedFeed] = useState(false);

  async function copyFeed(): Promise<void> {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopiedFeed(true);
      setTimeout(() => setCopiedFeed(false), 1500);
      toast.success("Copied RSS feed URL");
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-300/80">
            Episode ready · {formatDuration(episode.durationSec)}
          </p>
          <h2 className="text-balance text-xl font-semibold text-white">
            {episode.title}
          </h2>
          <p className="text-sm text-neutral-300">{episode.description}</p>
        </div>
        <Headphones className="size-6 shrink-0 text-emerald-400" />
      </header>

      <audio
        src={episode.mp3Url}
        controls
        preload="metadata"
        className="w-full rounded-md"
      >
        <track kind="captions" />
      </audio>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="secondary" className="gap-1.5">
          <a href={episode.mp3Url} download>
            <Download className="size-3.5" />
            Download MP3
          </a>
        </Button>
        <Button asChild size="sm" variant="secondary" className="gap-1.5">
          <a href={feedUrl} target="_blank" rel="noopener noreferrer">
            <Rss className="size-3.5" />
            Open RSS feed
          </a>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-1.5"
          onClick={copyFeed}
        >
          <Copy className="size-3.5" />
          {copiedFeed ? "Copied" : "Copy feed URL"}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-white/5 bg-black/30 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            Ship this everywhere
          </h3>
          <span className="font-mono text-[10px] text-neutral-500">
            {feedUrl}
          </span>
        </div>
        <ul className="flex flex-col gap-2">
          {PLATFORMS.map((p) => (
            <li
              key={p.name}
              className="flex items-center justify-between gap-3 rounded-md border border-white/5 bg-white/[0.02] px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">{p.name}</span>
                <span className="text-xs text-neutral-400">{p.hint}</span>
              </div>
              <a
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
              >
                {p.action === "open-app" ? "Open app" : "Open submit"}
                <ExternalLink className="size-3" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
