import { getRun } from "workflow/api";
import { getRunWithRelations } from "@/lib/db/onloop-runs";
import type { PipelineEvent } from "@/lib/onloop/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function sseEncode(data: unknown): Uint8Array {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  return new TextEncoder().encode(`data: ${payload}\n\n`);
}

function sseComment(text: string): Uint8Array {
  return new TextEncoder().encode(`: ${text}\n\n`);
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;

  const snapshot = await getRunWithRelations(id);
  if (!snapshot) {
    return new Response("not_found", { status: 404 });
  }

  const headers: HeadersInit = {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const safeEnqueue = (chunk: Uint8Array): boolean => {
        try {
          controller.enqueue(chunk);
          return true;
        } catch {
          return false;
        }
      };

      safeEnqueue(sseComment("onloop stream open"));
      safeEnqueue(
        sseEncode({
          type: "snapshot",
          run: {
            id: snapshot.run.id,
            status: snapshot.run.status,
            k: snapshot.run.k,
            createdAt: snapshot.run.createdAt.toISOString(),
            completedAt: snapshot.run.completedAt?.toISOString() ?? null,
          },
          ideas: snapshot.ideas.map((idea) => ({
            id: idea.id,
            text: idea.text,
            selected: idea.selected,
            moodTag: idea.moodTag,
            rationale: idea.rationale,
          })),
          episodes: snapshot.episodes.map((ep) => ({
            id: ep.id,
            ideaId: ep.ideaId,
            title: ep.title,
            description: ep.description,
            mp3Url: ep.mp3Url,
            durationSec: ep.durationSec,
          })),
        }),
      );

      if (
        snapshot.run.status === "completed" ||
        snapshot.run.status === "failed"
      ) {
        safeEnqueue(
          sseEncode({ type: "terminal", status: snapshot.run.status }),
        );
        controller.close();
        return;
      }

      const abortSignal = request.signal;
      const run = getRun<PipelineEvent>(id);
      let reader: ReadableStreamDefaultReader<PipelineEvent> | undefined;
      try {
        reader = run.getReadable<PipelineEvent>().getReader();
      } catch (err) {
        safeEnqueue(
          sseEncode({
            type: "stream-error",
            message: err instanceof Error ? err.message : "no active stream",
          }),
        );
        controller.close();
        return;
      }

      abortSignal.addEventListener("abort", () => {
        reader?.cancel().catch((err: unknown) => {
          void err;
        });
      });

      const heartbeat = setInterval(() => {
        if (!safeEnqueue(sseComment("heartbeat"))) {
          clearInterval(heartbeat);
        }
      }, 15000);

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done || abortSignal.aborted) {
            break;
          }
          if (value) {
            if (!safeEnqueue(sseEncode(value))) {
              break;
            }
            if (
              value.type === "run-status" &&
              (value.status === "completed" || value.status === "failed")
            ) {
              break;
            }
          }
        }
        safeEnqueue(sseEncode({ type: "terminal" }));
      } catch (err) {
        safeEnqueue(
          sseEncode({
            type: "stream-error",
            message: err instanceof Error ? err.message : "stream error",
          }),
        );
      } finally {
        clearInterval(heartbeat);
        try {
          reader.releaseLock();
        } catch (err) {
          void err;
        }
        controller.close();
      }
    },
  });

  return new Response(stream, { headers });
}
