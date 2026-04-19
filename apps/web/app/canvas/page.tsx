import type { Metadata } from "next";
import { CanvasHeader } from "@/components/onloop/canvas-header";
import type { CanvasJob } from "@/components/onloop/jobs-canvas";
import { JobsCanvas } from "@/components/onloop/jobs-canvas";
import { listRunSummaries } from "@/lib/db/onloop-runs";
import { INBOUND_EMAIL } from "@/lib/onloop/config";

export const metadata: Metadata = {
  title: "onloop · jobs",
  description: "Live pipeline dashboard — every onloop podcast job as a card.",
};

export const dynamic = "force-dynamic";

export default async function CanvasPage(): Promise<React.ReactElement> {
  const rows = await listRunSummaries(80);
  const jobs: CanvasJob[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    k: r.k,
    createdAt: r.createdAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
    originalEmailId: r.originalEmailId,
    senderLabel: r.senderLabel,
    subject: r.subject,
    firstIdeaPreview: r.firstIdeaPreview,
    ideaCount: r.ideaCount,
    selectedCount: r.selectedCount,
    episodeCount: r.episodeCount,
  }));
  const completed = jobs.filter((j) => j.status === "completed").length;
  const episodeTotal = jobs.reduce((sum, j) => sum + j.episodeCount, 0);

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-black px-6 py-6 text-white">
      <CanvasHeader
        inboundEmail={INBOUND_EMAIL}
        totals={{
          runs: jobs.length,
          completed,
          episodes: episodeTotal,
        }}
      />
      <section className="h-[calc(100vh-260px)] min-h-[480px]">
        <JobsCanvas initial={jobs} />
      </section>
    </main>
  );
}
