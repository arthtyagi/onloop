import { SFX_DURATION_SEC, TTS_OUTPUT_FORMAT } from "./config";
import { elevenlabs } from "./elevenlabs-client";
import { streamToBuffer } from "./stream-to-buffer";

export async function generateSfx(
  prompt: string,
  durationSeconds: number = SFX_DURATION_SEC,
): Promise<Buffer> {
  const stream = await elevenlabs().textToSoundEffects.convert({
    text: prompt,
    durationSeconds,
    outputFormat: TTS_OUTPUT_FORMAT,
  });
  return await streamToBuffer(stream);
}
