import type { Metadata } from "next";
import { CanvasHeader } from "@/components/onloop/canvas-header";
import { JobsGrid } from "@/components/onloop/jobs-grid";
import { INBOUND_EMAIL } from "@/lib/onloop/config";

export const metadata: Metadata = {
  title: "onloop",
  description: "AI multimedia pipeline — podcast episodes from email.",
};

export const dynamic = "force-dynamic";

export default function Home(): React.ReactElement {
  return (
    <main className="flex min-h-screen flex-col gap-6 bg-black px-6 py-6 text-white">
      <CanvasHeader inboundEmail={INBOUND_EMAIL} totals={null} />
      <section className="pb-12">
        <JobsGrid />
      </section>
    </main>
  );
}
