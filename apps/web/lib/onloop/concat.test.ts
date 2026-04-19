import { describe, expect, test } from "bun:test";
import { concatAudio, estimateDurationSec } from "./concat";

describe("concatAudio", () => {
  test("concatenates three buffers in order", () => {
    const intro = Buffer.from([1, 2]);
    const voice = Buffer.from([3, 4, 5]);
    const outro = Buffer.from([6]);
    const out = concatAudio(intro, voice, outro);
    expect(out).toEqual(Buffer.from([1, 2, 3, 4, 5, 6]));
    expect(out.length).toBe(intro.length + voice.length + outro.length);
  });

  test("handles empty buffers", () => {
    expect(
      concatAudio(Buffer.alloc(0), Buffer.alloc(0), Buffer.alloc(0)),
    ).toEqual(Buffer.alloc(0));
  });
});

describe("estimateDurationSec", () => {
  test("returns at least 1 second for tiny buffers", () => {
    expect(estimateDurationSec(Buffer.alloc(1000))).toBeGreaterThanOrEqual(1);
  });

  test("roughly 60s for 960KB at 128kbps", () => {
    const bytes = (128 * 1000 * 60) / 8;
    const duration = estimateDurationSec(Buffer.alloc(bytes));
    expect(duration).toBe(60);
  });

  test("accepts custom bitrate", () => {
    const bytes = (64 * 1000 * 30) / 8;
    expect(estimateDurationSec(Buffer.alloc(bytes), 64)).toBe(30);
  });
});
