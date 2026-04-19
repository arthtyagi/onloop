import { verifyWebhookFromHeaders } from "inboundemail";
import { NextResponse } from "next/server";
import { createOnloopRun } from "@/lib/onloop/create-run";
import { inbound } from "@/lib/onloop/inbound-client";
import { EmailParseError, parseInboundEmail } from "@/lib/onloop/parse-email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  let isValid = false;
  try {
    isValid = await verifyWebhookFromHeaders(request.headers, inbound());
  } catch {
    isValid = false;
  }
  if (!isValid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  let parsed: Awaited<ReturnType<typeof parseInboundEmail>>;
  try {
    parsed = await parseInboundEmail(rawBody);
  } catch (err) {
    if (err instanceof EmailParseError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : "parse_failed";
    return NextResponse.json(
      { error: "parse_failed", message },
      { status: 400 },
    );
  }

  const result = await createOnloopRun({
    ideas: parsed.ideas,
    k: parsed.k,
    sourceMessageId: parsed.sourceMessageId,
    originalEmailId: parsed.originalEmailId,
    senderEmail: parsed.senderEmail,
    senderLabel: parsed.senderLabel,
    subject: parsed.subjectClean.length > 0 ? parsed.subjectClean : null,
    notifyEmail: null,
  });

  return NextResponse.json(
    { runId: result.runId, deduped: result.deduped, status: "queued" },
    { status: 200 },
  );
}
