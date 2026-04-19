import {
  K_DEFAULT,
  K_MAX,
  K_SUBJECT_REGEX,
  MAX_IDEAS,
  MIN_IDEA_LENGTH,
} from "./config";
import { sha256Hex } from "./hash";
import { InboundWebhookPayloadSchema, type ParsedEmail } from "./schemas";

export class EmailParseError extends Error {
  readonly code: "no_ideas" | "invalid_payload" | "no_body";

  constructor(code: EmailParseError["code"], message: string) {
    super(message);
    this.name = "EmailParseError";
    this.code = code;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

export function extractIdeas(body: string): string[] {
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= MIN_IDEA_LENGTH && !line.startsWith(">"))
    .slice(0, MAX_IDEAS);
  return lines;
}

export function extractK(subject: string): number {
  const match = K_SUBJECT_REGEX.exec(subject);
  if (!match) {
    return K_DEFAULT;
  }
  const raw = Number.parseInt(match[1], 10);
  if (Number.isNaN(raw)) {
    return K_DEFAULT;
  }
  return Math.max(1, Math.min(K_MAX, raw));
}

export async function parseInboundEmail(
  rawPayload: unknown,
): Promise<ParsedEmail> {
  const parsed = InboundWebhookPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    throw new EmailParseError(
      "invalid_payload",
      `Invalid inbound payload: ${parsed.error.message}`,
    );
  }

  const { email } = parsed.data;
  const senderEmail = email.from.addresses[0]?.address ?? "";
  if (!senderEmail) {
    throw new EmailParseError(
      "invalid_payload",
      "No sender address in payload",
    );
  }

  const textBody = email.parsedData.textBody ?? "";
  const htmlBody = email.parsedData.htmlBody ?? "";
  const body = textBody.trim().length > 0 ? textBody : stripHtml(htmlBody);
  if (!body || body.trim().length === 0) {
    throw new EmailParseError("no_body", "Email has no text or HTML body");
  }

  const ideas = extractIdeas(body);
  if (ideas.length === 0) {
    throw new EmailParseError(
      "no_ideas",
      "No ideas found in email body (expected one idea per line, min 10 chars)",
    );
  }

  const senderHash = await sha256Hex(senderEmail.toLowerCase());
  const k = extractK(email.subject);

  return {
    originalEmailId: email.id,
    sourceMessageId: email.messageId,
    senderEmail,
    senderHash,
    subject: email.subject,
    k,
    ideas,
  };
}
