import type { Metadata } from "next";
import { CanvasHeader } from "@/components/onloop/canvas-header";
import { JobsCanvas } from "@/components/onloop/jobs-canvas";
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
      <section className="h-[calc(100vh-260px)] min-h-[480px]">
        <JobsCanvas />
      </section>
    </main>
  );
}
