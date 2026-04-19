import type { Episode } from "@/lib/db/schema";
import { inbound } from "./inbound-client";

export type NotifyInput = {
  to: string;
  fromAddress: string;
  episodes: Episode[];
  runId: string;
  runUrl?: string;
};

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildHtml(input: NotifyInput): string {
  const { episodes, runUrl } = input;
  const count = episodes.length;
  const header =
    count === 1
      ? '<p style="font-size:16px;margin:0 0 16px">Your onloop episode is ready.</p>'
      : `<p style="font-size:16px;margin:0 0 16px">Your ${count} onloop episodes are ready.</p>`;
  const list = episodes
    .map((ep) => {
      const mins = Math.max(1, Math.round(ep.durationSec / 60));
      return `<li style="margin-bottom:14px;list-style:none;padding:12px;border:1px solid #eee;border-radius:8px">
  <div style="font-weight:600;color:#0a0a0a;font-size:15px">${escapeHtml(ep.title)}</div>
  <div style="color:#555;font-size:13px;margin-top:4px">${escapeHtml(ep.description)}</div>
  <div style="margin-top:10px">
    <a href="${escapeHtml(ep.mp3Url)}" style="display:inline-block;padding:8px 14px;background:#0a0a0a;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:500">Listen · ${mins} min</a>
  </div>
</li>`;
    })
    .join("");
  const runLink = runUrl
    ? `<p style="color:#555;font-size:13px;margin-top:16px">Watch the pipeline: <a href="${escapeHtml(runUrl)}">${escapeHtml(runUrl)}</a></p>`
    : "";
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;color:#0a0a0a">
  ${header}
  <ul style="padding:0;margin:16px 0">${list}</ul>
  ${runLink}
  <p style="color:#999;font-size:12px;margin-top:24px;padding-top:16px;border-top:1px solid #eee">
    You received this because you submitted ideas to onloop. This is an automated
    notification — you will not receive further emails unless you submit new jobs.
  </p>
</div>`;
}

export async function sendNotificationEmail(input: NotifyInput): Promise<void> {
  const html = buildHtml(input);
  const subject =
    input.episodes.length === 1
      ? "Your onloop episode is ready"
      : `Your ${input.episodes.length} onloop episodes are ready`;
  await inbound().emails.send({
    from: input.fromAddress,
    to: input.to,
    subject,
    html,
  });
}
