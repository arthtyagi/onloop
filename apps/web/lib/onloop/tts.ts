import { TTS_MODEL, TTS_OUTPUT_FORMAT, VOICE_ID } from "./config";
import { elevenlabs } from "./elevenlabs-client";
import { streamToBuffer } from "./stream-to-buffer";

export async function textToSpeech(text: string): Promise<Buffer> {
  const stream = await elevenlabs().textToSpeech.convert(VOICE_ID, {
    text,
    modelId: TTS_MODEL,
    outputFormat: TTS_OUTPUT_FORMAT,
  });
  return await streamToBuffer(stream);
}
