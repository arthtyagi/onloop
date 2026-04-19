# onloop · implementation spec

Email 3–5 podcast ideas → agents pick top-K → research → script → voice (ElevenLabs) → mix (ffmpeg in Sandbox) → publish to real RSS feed → reply email with playable links + public Langfuse trace. Live pipeline state visible on a ReactFlow canvas. Durable via Vercel Workflow SDK.

**Track**: MaaS primary + Revenue/Virality bonus. Target L4 on: Real Output, Task Decomposition, Observability, Live Product Quality.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Base repo | Fork `vercel-labs/open-agents`, GH routes 404-stubbed | Free: Workflow SDK + Postgres + Sandbox + AI SDK v6 wiring |
| Email I/O | inbound.new (`inboundemail` SDK) | Bidirectional, auto-threading on `.reply()`, MP3 attach OK |
| Audio | ElevenLabs TTS + SFX only (NO music endpoint) | Shared 20-concurrent pool → K=3 unconstrained |
| Orchestration | Vercel Workflow SDK v4.2 (`"use workflow"` + `step()`) | Durable, `RetryableError` for 429s |
| Audio mix | ffmpeg concat in Vercel Sandbox | No bed, no ducking, no LUFS — concat only |
| Storage | Vercel Blob (MP3s + cover) + Postgres (runs/episodes/ideas/waitlist) | Inherited from fork |
| RSS | `podcast` npm pkg | iTunes-compliant out of box |
| Canvas | `@xyflow/react` v12 (ref: `on-wav0/apps/web/src/components/canvas/canvas-view.tsx`) | Static layout, 2s polling, read-only |
| Observability | `@langfuse/tracing` ≥ 5.0.0 + PII regex sanitizer | Public traces per run |
| Local webhook | Tailscale Funnel: `https://arths-macbook-pro.tailcfe24b.ts.net/webhooks/inbound` | Portless is for local HTTPS browsing only, not webhook delivery |
| Prod webhook | `https://onloop.work/webhooks/inbound` | Configured in inbound.new dashboard |

---

## Architecture

```
email → inbound.new → POST /webhooks/inbound (token verify)
                    → createRun(pipelineWorkflow, { runId, ideas, k })
                    → 200 { runId }

pipelineWorkflow (durable, Workflow SDK):
  step("triage")                 → pick K of N, emit rationale, moodTag
  Promise.all(picks.map((idea, k) => [
    step(`research-${k}`)        → Exa search → cited facts
    step(`script-${k}`)          → 2–3 min audio-native script
    Promise.all([
      step(`voice-${k}`)         → ElevenLabs TTS → voice.mp3 buffer
      step(`intro-sfx-${k}`)     → ElevenLabs SFX → sting.mp3
      step(`outro-sfx-${k}`)     → ElevenLabs SFX → tag.mp3
    ])
    step(`mix-${k}`)             → Sandbox: ffmpeg concat → episode.mp3
    step(`publish-${k}`)         → Blob upload + DB insert
  ])
  step("reply")                  → inbound.emails.reply() with K links + rationale + trace URL

Every step wrapped in traceStep() → Langfuse → public URL per run.
PII sanitizer strips email addresses from span inputs/outputs.

Surfaces:
  /                 landing + waitlist form
  /flow/[runId]     ReactFlow canvas (SWR polling /api/runs/[id] every 2s)
  /flow/seed        pre-seeded K=2 fallback run
  /feed.xml         iTunes RSS via podcast pkg
  /api/runs/[id]    returns { run, steps[], episodes[] }
  /api/waitlist     POST { email } → insert
  /webhooks/inbound POST from inbound.new
```

---

## File layout (target, after fork + additions)

```
onloop/
├── app/
│   ├── page.tsx                            # landing + waitlist (new)
│   ├── flow/[runId]/page.tsx               # ReactFlow canvas (new)
│   ├── api/
│   │   ├── runs/[id]/route.ts              # canvas state (new)
│   │   ├── waitlist/route.ts               # POST (new)
│   │   └── github/**/*.ts                  # ⟵ 404 stubs (existing, gutted)
│   ├── webhooks/
│   │   └── inbound/route.ts                # inbound.new (new)
│   └── workflows/
│       └── pipeline.ts                     # "use workflow" (new)
├── lib/
│   ├── config.ts                           # frozen: voice ID, prompts, ffmpeg cmd (new)
│   ├── agents/
│   │   ├── triage.ts                       # generateObject picks K (new)
│   │   ├── research.ts                     # Exa + summarize (new)
│   │   └── script.ts                       # audio-native script (new)
│   ├── audio/
│   │   ├── tts.ts                          # ElevenLabs TTS wrapper (new)
│   │   ├── sfx.ts                          # ElevenLabs SFX wrapper (new)
│   │   └── mix.ts                          # Sandbox + ffmpeg (new)
│   ├── rss.ts                              # podcast pkg feed builder (new)
│   ├── email.ts                            # inbound.new reply builder (new)
│   ├── observability/
│   │   ├── trace.ts                        # Langfuse wrap (new)
│   │   └── sanitize.ts                     # PII regex (new)
│   └── db/
│       └── schema.ts                       # + podcast tables (modify)
├── components/
│   └── flow/
│       ├── canvas.tsx                      # (new, ref on-wav0 canvas-view.tsx)
│       ├── step-node.tsx                   # (new, ref on-wav0 generating-node.tsx for status pattern)
│       └── layout.ts                       # static (x,y) per step name (new)
└── SPEC.md                                 # this file
```

---

## Env vars (`.env.local`)

```bash
# Postgres (inherited from open-agents fork)
POSTGRES_URL=postgres://...

# Auth (open-agents requires; keep placeholders, unused)
JWE_SECRET=<openssl rand -base64 32>
ENCRYPTION_KEY=<openssl rand -hex 32>
NEXT_PUBLIC_VERCEL_APP_CLIENT_ID=placeholder
VERCEL_APP_CLIENT_SECRET=placeholder

# Email
INBOUND_API_KEY=...                          # from inbound.new dashboard

# Audio
ELEVENLABS_API_KEY=...

# AI SDK (gateway)
AI_GATEWAY_API_KEY=...                       # or ANTHROPIC_API_KEY + OPENAI_API_KEY

# Search
EXA_API_KEY=...

# Observability
LANGFUSE_SECRET_KEY=...
LANGFUSE_PUBLIC_KEY=...
LANGFUSE_BASEURL=https://cloud.langfuse.com  # or EU equivalent

# Storage
BLOB_READ_WRITE_TOKEN=...                    # Vercel Blob

# Config (non-secret, but env-driven for flexibility)
ONLOOP_DOMAIN=onloop.work
ONLOOP_FROM_ADDRESS=hello@onloop.work
ONLOOP_TO_ADDRESS=tasks@onloop.work
COVER_IMAGE_URL=<from Blob after W0 upload>
```

---

## Implementation order

### W0 · tonight (~60 min)

1. `gh repo fork vercel-labs/open-agents --clone` into `onloop/app/` (or strategy below)
2. `bun install` · `bun run build` · `vercel link`
3. `vercel env pull .env.local` · add the new keys above
4. Postgres: `bun run db:migrate` (open-agents has Drizzle set up)
5. Verify Tailscale Funnel: `tailscale funnel status` — confirm `https://arths-macbook-pro.tailcfe24b.ts.net/webhooks/inbound` forwards to `localhost:3000/webhooks/inbound`
6. Upload cover image (1400×1400 JPEG, anything dark-minimal will do) to Blob → save URL to `.env.local`
7. Smoke: ElevenLabs TTS + SFX via curl (save 3 test mp3s, play them, pick voice ID)
8. Smoke: Langfuse — send a test trace with `@langfuse/tracing` ≥ 5.0.0, toggle public, verify incognito loads
9. Smoke: Workflow SDK — run a 2-step dummy workflow locally, verify `steps.list()` returns both
10. Smoke: `podcast` pkg + Cast Feed Validator + Pocket Casts subscribe (1 dummy episode)
11. Pre-draft 3 demo idea-dumps in `fixtures/demo-emails/*.txt`
12. Lights out by midnight

**Strategy for fork placement**: simplest is `git clone <your-fork> onloop/app` (nested), then add `onloop/SPEC.md`, `onloop/.sisyphus/`, etc. at the parent. If that's ugly, `rsync -a --exclude=.git fork/ onloop/` to flatten — you lose the fork's git history but keep a clean tree. Pick one tonight, don't overthink.

### W1 · hour 0:00–0:45 — plumbing

- [ ] Stub GH: `for f in app/api/github/**/route.ts; do` replace exported handlers with `export async function GET() { return new Response(null, {status:404}); }` (and POST).
- [ ] `lib/db/schema.ts`: add
  ```ts
  export const runs = pgTable("runs", { id, kind: "podcast", k: int, status, senderHash, sourceMessageId, langfuseTraceId, createdAt });
  export const ideas = pgTable("ideas", { id, runId, text, selected: bool, moodTag, rationale, scoreNovelty, scoreListenability, scoreFactuality });
  export const episodes = pgTable("episodes", { id, runId, ideaId, title, description, mp3Url, lengthBytes, durationSec, guid, pubDate });
  export const waitlist = pgTable("waitlist", { id, email, createdAt });
  ```
  Generate + apply migration.
- [ ] `app/webhooks/inbound/route.ts`:
  ```ts
  import { Inbound, verifyWebhookFromHeaders } from "inboundemail";
  const inbound = new Inbound(process.env.INBOUND_API_KEY!);
  export async function POST(req: Request) {
    if (!(await verifyWebhookFromHeaders(req.headers, inbound))) return new Response(null, {status:401});
    const payload = await req.json();
    // parse ideas (split body by \n, trim, filter len >= 10, max 10)
    // parse K from subject regex /\[K=(\d)\]/, clamp 1..3, default 1
    // dedupe on payload.email.messageId → runs.sourceMessageId
    // insert run, create ideas rows
    // createRun(pipelineWorkflow, { runId, ideas, k, originalEmailId: payload.email.id })
    return Response.json({ runId, status: "queued" });
  }
  ```
- [ ] Curl verify against Tailscale URL end-to-end.

### W2 · hour 0:45–2:30 — the pipeline

- [ ] `lib/config.ts`: freeze VOICE_ID, TTS_MODEL (`eleven_v3`), INTRO/OUTRO SFX prompts, FFMPEG_MIX_CMD template.
- [ ] `app/workflows/pipeline.ts`: skeleton with all steps stubbed, verify it completes against an in-memory fixture.
- [ ] `lib/agents/triage.ts`: `generateObject` with Zod schema `{ picks: Array<{ ideaId, moodTag, rationale, scores }> }`. Prompt: "Score 1-5 on novelty, listenability, factuality. Return top K by sum. moodTag ∈ ['news','explainer','commentary']. Rationale ≤ 1 sentence."
- [ ] `lib/agents/research.ts`: 1 Exa call per idea, then `generateText` summarizing top 5 into 5 cited bullets.
- [ ] `lib/agents/script.ts`: `generateText`, 250–500 words, hook + 3 beats + outro, audio-native (no lists, no "as I mentioned").
- [ ] `lib/audio/tts.ts` + `lib/audio/sfx.ts`: call ElevenLabs, collect stream to `Buffer`, return `{ buffer, sizeBytes }`. Wrap 429 in `RetryableError` (from `workflow` pkg).
- [ ] `lib/audio/mix.ts`: Sandbox → write 3 buffers to `/tmp/{sting,voice,tag}.mp3` → `sudo dnf install -y ffmpeg` → run frozen command:
  ```
  ffmpeg -i sting.mp3 -i voice.mp3 -i tag.mp3 \
    -filter_complex "[0:a][1:a][2:a]concat=n=3:v=0:a=1[out]" \
    -map "[out]" -codec:a libmp3lame -q:a 4 episode.mp3
  ```
  Read `episode.mp3` back, return buffer.
- [ ] Publish: `put(episode.mp3, { access: "public" })` → insert `episodes` row.
- [ ] `lib/rss.ts`: build iTunes feed via `podcast` pkg. Required: `itunes:image`, `itunes:category="Technology"`, `itunes:explicit=false`, `language`, per-item `enclosure` with correct `length` + `type="audio/mpeg"`, `guid isPermaLink=false`, `pubDate` RFC 2822, `itunes:duration`.
- [ ] `app/api/feed.xml/route.ts`: query episodes, build feed, return `Content-Type: application/rss+xml`.
- [ ] `lib/email.ts`: HTML reply template → `inbound.emails.reply(originalEmailId, { from, html, attachments: K===1 ? [firstMp3] : [] })`.
- [ ] **K=1 e2e verify**: email via Tailscale → run → feed item appears → Pocket Casts plays.

### W3 · hour 2:30–3:00 — fan-out + canvas

- [ ] Verify `Promise.all(picks.map(...))` actually parallelizes (Workflow SDK should honor it; log timings).
- [ ] `app/api/runs/[id]/route.ts`: return `{ run, ideas, episodes, steps: await workflow.getRun(id).steps.list({resolveData:"none"}) }`.
- [ ] `components/flow/layout.ts`: static coords per step name:
  ```ts
  // ingest (left) → triage (center-left) → K branches (center, vertically stacked)
  //   each branch: research → script → voice/intro/outro (3 parallel) → mix → publish
  // reply (right, joins all branches)
  export const NODE_POSITIONS: Record<string, {x:number,y:number}> = { ... };
  ```
- [ ] `components/flow/step-node.tsx`: colored circle + label; status via prop (grey/blue/green/red). Ref `on-wav0/.../generating-node.tsx` for the pattern, but SIMPLIFY — no Convex reactivity, no pan-to-node callback, no provider-specific logic.
- [ ] `components/flow/canvas.tsx`: `<ReactFlow>` + `<Background>`, `nodeTypes={{stepNode: StepNode}}`, SWR poll `/api/runs/[id]` every 2s. **MUST NOT**: `useReactFlow`, animations, edge interactivity, drag, zoom controls.
- [ ] `app/flow/[runId]/page.tsx`: client component wrapper; right-panel links to `/feed.xml`, Langfuse trace, Pocket Casts deeplink (`pktc://subscribe/onloop.work/feed.xml`).
- [ ] **K=2 e2e verify**: 3 ideas + `[K=2]` → 2 episodes in feed + canvas shows 2 branches green.

### W4 · hour 3:00–3:30 — observability + reply

- [ ] `lib/observability/trace.ts`:
  ```ts
  import { observe } from "@langfuse/tracing";
  export async function traceStep<T>(name: string, runId: string, fn: () => Promise<T>): Promise<T> {
    const traced = observe({ name, attributes: { "onloop.runId": runId }, setPublic: true }, fn);
    return traced();
  }
  ```
- [ ] Wrap every `step(...)` body with `traceStep(name, runId, () => ...)`.
- [ ] `lib/observability/sanitize.ts`:
  ```ts
  export const sanitize = <T,>(x: T): T => JSON.parse(
    JSON.stringify(x)
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "user@redacted")
      .replace(/\+?\d{1,3}[- ]?\(?\d{1,4}\)?[- ]?\d{3,4}[- ]?\d{4}/g, "[phone-redacted]")
  );
  ```
  Apply inside `traceStep` before passing inputs/outputs to Langfuse.
- [ ] Persist `langfuse_trace_id` on the run row after workflow finishes (top-level trace ID from `observe`).
- [ ] Reply HTML includes: per-episode `<audio>` tag (first one only) + rationale block + Langfuse public URL + RSS URL + Pocket Casts deeplink. Use inline-safe CSS (most mail clients strip `<style>`).

### W5 · hour 3:30–4:00 — landing + seed

- [ ] `app/page.tsx`: single column, dark bg, JetBrains Mono. Title, one-line pitch, example `mailto:`, email input → POST `/api/waitlist`, toast on success. 3 links: latest feed, `/flow/seed`, Langfuse public URL. **No hero, no features grid, no testimonials.** 10 min max.
- [ ] `app/api/waitlist/route.ts`: POST `{ email }` → insert, 200. No dedup checking (UNIQUE constraint handles it).
- [ ] Seed script `scripts/seed.ts`: run pipeline with 3 hand-written ideas + K=2, store with fixed id `seed` in runs table. Run once against prod after deploy.
- [ ] `README.md`: pitch, demo video link (record during rehearsal), prod URL, feed URL, Langfuse URL, `/flow/seed` link, waitlist count, architecture ASCII, credits (open-agents fork, inbound.new, ElevenLabs, Langfuse).

### W6 · hour 4:00–4:15 — deploy + submit

- [ ] `vercel --prod`
- [ ] Switch inbound.new webhook from Tailscale URL → `https://onloop.work/webhooks/inbound`
- [ ] Send 1 test email end-to-end against prod — verify reply lands in Gmail Inbox (not spam)
- [ ] Pre-warm: send 1 K=1 email to keep sandbox warm before demo
- [ ] 2× timed rehearsal of demo script
- [ ] Submit: Track=MaaS, Bonus=Revenue + Virality

### Buffer · hour 4:15–5:00

Exists on purpose. Do not fill with new features. Use only to fix what breaks.

### Stretch (only if buffer > 20 min remaining)

- STT voice-memo ingestion (ElevenLabs STT for audio attachments)
- Evalite eval set (3 fixtures: triage accuracy + script duration + citation presence)
- Posthog analytics on landing

---

## Frozen constants (commit as `lib/config.ts`)

```ts
// Voice (pick ONE tonight, never iterate)
export const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";  // George, male narrative
export const TTS_MODEL = "eleven_v3";

// SFX prompts (never change)
export const INTRO_SFX_PROMPT = "Podcast intro chime, bright, professional, 2 seconds";
export const OUTRO_SFX_PROMPT = "Podcast outro chime, soft, fading, 2 seconds";

// Mix (never change)
export const FFMPEG_MIX_ARGS = [
  "-i", "sting.mp3", "-i", "voice.mp3", "-i", "tag.mp3",
  "-filter_complex", "[0:a][1:a][2:a]concat=n=3:v=0:a=1[out]",
  "-map", "[out]", "-codec:a", "libmp3lame", "-q:a", "4",
  "episode.mp3",
];

// Concurrency
export const K_DEFAULT = 1;
export const K_MAX = 3;
export const K_SUBJECT_REGEX = /\[K=(\d)\]/;

// Script
export const SCRIPT_MIN_WORDS = 250;
export const SCRIPT_MAX_WORDS = 500;

// RSS
export const PODCAST_TITLE = "onloop";
export const PODCAST_DESCRIPTION = "AI-agent-produced podcast episodes, generated from email.";
export const PODCAST_LANGUAGE = "en-us";
export const PODCAST_CATEGORY = "Technology";
export const COVER_IMAGE_URL = process.env.COVER_IMAGE_URL!;

// Email
export const FROM_ADDRESS = process.env.ONLOOP_FROM_ADDRESS!;
```

---

## Not shipping (guardrails — violate = cut the feature)

- ❌ ElevenLabs music endpoint / music beds / pre-generated beds
- ❌ Auth / accounts / login / sessions
- ❌ Chat UI (from open-agents fork, even though it's there)
- ❌ Settings page (K via email subject only)
- ❌ Mobile responsive / theme toggle / light mode
- ❌ ReactFlow animations / WebSockets / SSE / dragging / zoom
- ❌ Multi-voice / dialogue / interviews
- ❌ Spotify submission (Pocket Casts + Apple Podcasts only)
- ❌ Evalite in core (stretch)
- ❌ STT voice-memo input (stretch)
- ❌ ffmpeg beyond concat (no LUFS, sidechain, loudnorm, ducking, volume curves)
- ❌ Hand-written RSS XML (`podcast` pkg always)
- ❌ Full strip of open-agents GH code (404 stubs only)
- ❌ Iteration on ElevenLabs prompts/voice during buildathon
- ❌ Stripe / billing / payment walls
- ❌ Running more than K=3 concurrent branches
- ❌ Attachments > 25MB in inbound email

---

## Demo (3 min)

1. Screen: `onloop.work` landing. Empty feel.
2. Phone email: `To: tasks@onloop.work` · `Subject: podcast ideas [K=2]` · body: 3 ideas, one per line. Send.
3. Switch screen to `/flow/<latest>`. Triage node lights blue → green, then 2 branches light up in parallel.
4. While nodes animate through state (~60–90s), narrate:
   > "Triage scored each on novelty, listenability, factuality. Two branches running in parallel — research via Exa, audio-native script, ElevenLabs voice, intro and outro stingers, ffmpeg concat in a Vercel Sandbox. Every step traced to Langfuse — tokens, tool calls, latencies. Durable via Vercel Workflow SDK."
5. Gmail refresh. Reply landed. Open it. Tap play on embedded `<audio>`. Episode plays on stage speakers.
6. Switch to Pocket Casts: "Subscribed to the feed before the talk. Same episode, right here."
7. Close: "Email in, agents out, real podcast on a real feed. Built with opencode, forked from open-agents, on inbound.new and ElevenLabs."

### Backup if anything breaks

> "Live demos fail — here's a run from earlier." → navigate `/flow/seed`. Walk through the canvas, play the episode, show the Langfuse trace, show the RSS feed.

No debug on stage. Ever.

---

## Status

**Scope locked. Portless for local HTTPS browsing (optional), Tailscale Funnel for webhook delivery in dev. onloop.work prod domain wired through inbound.new. Fork strategy: stub, don't strip. Six waves + 45 min buffer. Four L4 targets (Real Output, Task Decomp, Observability, LPQ). No music, no bed, no auth, no chat UI, no ceremony.**
