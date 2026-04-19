import type { Episode } from "@/lib/db/schema";
import { inbound } from "./inbound-client";

export type ReplyInput = {
  originalEmailId: string;
  episodes: Episode[];
  fromAddress: string;
  runUrl?: string;
  traceUrl?: string;
};

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildHtml(input: ReplyInput): string {
  const { episodes, runUrl, traceUrl } = input;
  const count = episodes.length;
  const header =
    count === 1
      ? "<p>Your episode is ready.</p>"
      : `<p>Your ${count} episodes are ready.</p>`;
  const list = episodes
    .map((ep) => {
      const mins = Math.max(1, Math.round(ep.durationSec / 60));
      return `<li style="margin-bottom:12px">
  <a href="${escapeHtml(ep.mp3Url)}" style="font-weight:600;color:#0a0a0a">${escapeHtml(ep.title)}</a>
  <div style="color:#555;font-size:14px">${escapeHtml(ep.description)}</div>
  <div style="color:#888;font-size:12px;margin-top:4px">${mins} min · <a href="${escapeHtml(ep.mp3Url)}">Listen (MP3)</a></div>
</li>`;
    })
    .join("");
  const runLink = runUrl
    ? `<p style="color:#555;font-size:14px">Follow the run live: <a href="${escapeHtml(runUrl)}">${escapeHtml(runUrl)}</a></p>`
    : "";
  const traceLink = traceUrl
    ? `<p style="color:#888;font-size:12px">Trace: <a href="${escapeHtml(traceUrl)}">${escapeHtml(traceUrl)}</a></p>`
    : "";
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px">
  ${header}
  <ul style="padding-left:20px;margin:16px 0">${list}</ul>
  ${runLink}
  ${traceLink}
  <p style="color:#888;font-size:12px">— onloop</p>
</div>`;
}

export async function sendReplyEmail(input: ReplyInput): Promise<void> {
  const html = buildHtml(input);
  await inbound().emails.reply(input.originalEmailId, {
    from: input.fromAddress,
    html,
  });
}
