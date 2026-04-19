import { describe, expect, test } from "bun:test";
import { sha256Hex } from "./hash";

describe("sha256Hex", () => {
  test("produces 64-char hex for any input", async () => {
    const out = await sha256Hex("hello");
    expect(out).toHaveLength(64);
    expect(out).toMatch(/^[0-9a-f]{64}$/);
  });

  test("matches known SHA-256 fixture", async () => {
    const out = await sha256Hex("abc");
    expect(out).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  test("is deterministic", async () => {
    const a = await sha256Hex("user@example.com");
    const b = await sha256Hex("user@example.com");
    expect(a).toBe(b);
  });
});
