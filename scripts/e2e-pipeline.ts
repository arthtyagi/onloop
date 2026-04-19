#!/usr/bin/env bun
const BASE = process.env.ONLOOP_BASE ?? "https://onloop.work";
const TIMEOUT_MS = Number(process.env.ONLOOP_TIMEOUT_MS ?? 4 * 60_000);
const POLL_MS = Number(process.env.ONLOOP_POLL_MS ?? 3000);

type RunResponse = {
  run: {
    id: string;
    status: "queued" | "running" | "completed" | "failed";
    k: number;
    createdAt: string;
    completedAt: string | null;
  };
  ideas: Array<{
    id: string;
    text: string;
    selected: boolean;
    moodTag: string | null;
  }>;
  episodes: Array<{
    id: string;
    title: string;
    mp3Url: string;
    durationSec: number;
    guid: string;
    ideaId: string;
  }>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function start(): Promise<string> {
  const res = await fetch(`${BASE}/api/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ideas: [
        "Why durable workflow runtimes are the 2026 substrate for agents",
        "Apple Podcasts search ranking and discovery mechanics today",
      ],
      k: 1,
    }),
  });
  if (!res.ok) {
    throw new Error(`start failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { runId: string };
  return data.runId;
}

async function pollUntilTerminal(runId: string): Promise<RunResponse> {
  const deadline = Date.now() + TIMEOUT_MS;
  let lastStatus = "";
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/api/runs/${runId}`);
    if (!res.ok) {
      await sleep(POLL_MS);
      continue;
    }
    const data = (await res.json()) as RunResponse;
    const status = data.run.status;
    const tag = `status=${status} episodes=${data.episodes.length}/${data.run.k}`;
    if (tag !== lastStatus) {
      console.log(`  ${tag}`);
      lastStatus = tag;
    }
    if (status === "completed" || status === "failed") {
      return data;
    }
    await sleep(POLL_MS);
  }
  throw new Error(`timeout after ${TIMEOUT_MS}ms`);
}

async function verifyFeed(guid: string): Promise<void> {
  const res = await fetch(`${BASE}/feed.xml`);
  if (!res.ok) {
    throw new Error(`feed.xml: ${res.status}`);
  }
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/rss+xml")) {
    throw new Error(`feed.xml wrong content-type: ${ct}`);
  }
  const xml = await res.text();
  if (!xml.includes(guid)) {
    throw new Error(`episode guid ${guid} not found in feed`);
  }
}

async function verifyMp3(url: string): Promise<number> {
  const res = await fetch(url, { method: "HEAD" });
  if (!res.ok) {
    throw new Error(`mp3 HEAD: ${res.status}`);
  }
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len < 1000) {
    throw new Error(`mp3 too small: ${len} bytes`);
  }
  return len;
}

async function main(): Promise<void> {
  console.log(`[1/5] POST ${BASE}/api/runs`);
  const runId = await start();
  console.log(`  runId: ${runId}`);
  console.log(`  canvas: ${BASE}/flow/${runId}`);
  console.log(`  events: ${BASE}/api/runs/${runId}/events`);

  console.log(`[2/5] Poll /api/runs/${runId}`);
  const final = await pollUntilTerminal(runId);

  console.log(`[3/5] Verify terminal state`);
  if (final.run.status !== "completed") {
    console.error("run failed");
    console.error(JSON.stringify(final, null, 2));
    throw new Error(`run status: ${final.run.status}`);
  }
  if (final.episodes.length === 0) {
    throw new Error("no episodes published");
  }
  const ep = final.episodes[0];
  if (!ep) {
    throw new Error("episode missing");
  }
  console.log(`  title: ${ep.title}`);
  console.log(`  mp3:   ${ep.mp3Url}`);
  console.log(`  dur:   ${ep.durationSec}s`);

  console.log(`[4/5] Verify mp3 reachable`);
  const size = await verifyMp3(ep.mp3Url);
  console.log(`  ${size} bytes`);

  console.log(`[5/5] Verify feed.xml contains episode`);
  await verifyFeed(ep.guid);
  console.log(`  feed contains guid ${ep.guid}`);

  console.log("\nE2E PASS");
}

await main();
