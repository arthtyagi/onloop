import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { createEpisode } from "@/lib/db/onloop-runs";
import type { Episode } from "@/lib/db/schema";
import { EPISODE_MP3_PATH_PREFIX } from "./config";

export type PublishInput = {
  buffer: Buffer;
  runId: string;
  ideaId: string;
  title: string;
  description: string;
  durationSec: number;
};

export async function publishEpisode(input: PublishInput): Promise<Episode> {
  const guid = nanoid();
  const path = `${EPISODE_MP3_PATH_PREFIX}/${input.runId}/${guid}.mp3`;

  const blob = await put(path, input.buffer, {
    access: "public",
    contentType: "audio/mpeg",
    addRandomSuffix: false,
  });

  return await createEpisode({
    id: nanoid(),
    runId: input.runId,
    ideaId: input.ideaId,
    title: input.title,
    description: input.description,
    mp3Url: blob.url,
    lengthBytes: input.buffer.length,
    durationSec: input.durationSec,
    guid,
  });
}
