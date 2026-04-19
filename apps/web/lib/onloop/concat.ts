import { MP3_BITRATE_KBPS } from "./config";

export function concatAudio(
  intro: Buffer,
  voice: Buffer,
  outro: Buffer,
): Buffer {
  return Buffer.concat([intro, voice, outro]);
}

export function estimateDurationSec(
  buffer: Buffer,
  bitrateKbps: number = MP3_BITRATE_KBPS,
): number {
  const bytesPerSecond = (bitrateKbps * 1000) / 8;
  if (bytesPerSecond <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(buffer.length / bytesPerSecond));
}
