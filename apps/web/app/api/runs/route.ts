import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { z } from "zod";
import { K_DEFAULT, K_MAX, MIN_IDEA_LENGTH } from "@/lib/onloop/config";
import { createOnloopRun } from "@/lib/onloop/create-run";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CreateRunRequestSchema = z.object({
  ideas: z.array(z.string().min(MIN_IDEA_LENGTH)).min(1).max(10),
  k: z.number().int().min(1).max(K_MAX).optional(),
  email: z.string().email().optional(),
});

export async function POST(request: Request): Promise<Response> {
  let parsed: z.infer<typeof CreateRunRequestSchema>;
  try {
    const body = await request.json();
    parsed = CreateRunRequestSchema.parse(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const sourceMessageId = `web:${nanoid()}`;
  const originalEmailId = `web:${nanoid()}`;
  const senderEmail = parsed.email ?? `anon-${nanoid()}@web.onloop.work`;

  const result = await createOnloopRun({
    ideas: parsed.ideas,
    k: parsed.k ?? K_DEFAULT,
    sourceMessageId,
    originalEmailId,
    senderEmail,
  });

  return NextResponse.json({ runId: result.runId }, { status: 200 });
}
