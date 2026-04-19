import { describe, expect, test } from "bun:test";
import { K_DEFAULT, K_MAX, MIN_IDEA_LENGTH } from "./config";
import {
  EmailParseError,
  extractIdeas,
  extractK,
  parseInboundEmail,
} from "./parse-email";

describe("extractK", () => {
  test("defaults to K_DEFAULT when no tag present", () => {
    expect(extractK("my ideas")).toBe(K_DEFAULT);
  });

  test("parses [K=2]", () => {
    expect(extractK("podcast ideas [K=2]")).toBe(2);
  });

  test("clamps to K_MAX for K=5", () => {
    expect(extractK("[K=5] too many")).toBe(K_MAX);
  });

  test("clamps to 1 for K=0", () => {
    expect(extractK("[K=0]")).toBe(1);
  });
});

describe("extractIdeas", () => {
  test("splits lines and filters short ones", () => {
    const body = [
      "short",
      "This is a longer idea that passes the length filter",
      "",
      "Another idea that should be included",
      "xx",
    ].join("\n");
    const ideas = extractIdeas(body);
    expect(ideas).toHaveLength(2);
    expect(ideas[0]).toBe(
      "This is a longer idea that passes the length filter",
    );
  });

  test("caps at 10 ideas", () => {
    const body = Array.from(
      { length: 15 },
      (_, i) => `Idea number ${i} here`,
    ).join("\n");
    const ideas = extractIdeas(body);
    expect(ideas).toHaveLength(10);
  });

  test("drops quoted (>) lines", () => {
    const body = [
      "My real idea about AI trends in 2026",
      "> someone else's quoted text line in the body here",
      "Another genuine podcast topic worth discussing",
    ].join("\n");
    const ideas = extractIdeas(body);
    expect(ideas).toHaveLength(2);
    expect(ideas.every((idea) => !idea.startsWith(">"))).toBe(true);
  });

  test("respects MIN_IDEA_LENGTH", () => {
    const shortIdea = "a".repeat(MIN_IDEA_LENGTH - 1);
    const okIdea = "a".repeat(MIN_IDEA_LENGTH);
    const body = `${shortIdea}\n${okIdea}`;
    const ideas = extractIdeas(body);
    expect(ideas).toHaveLength(1);
    expect(ideas[0]?.length).toBeGreaterThanOrEqual(MIN_IDEA_LENGTH);
  });
});

describe("parseInboundEmail", () => {
  function payload(
    overrides: {
      subject?: string;
      textBody?: string | null;
      htmlBody?: string | null;
    } = {},
  ) {
    return {
      event: "email.received",
      timestamp: "2026-04-19T00:00:00Z",
      email: {
        id: "inb_123",
        messageId: "<m-1@example.com>",
        from: {
          text: "User <user@example.com>",
          addresses: [{ address: "user@example.com", name: "User" }],
        },
        to: {
          text: "agent@onloop.work",
          addresses: [{ address: "agent@onloop.work" }],
        },
        recipient: "agent@onloop.work",
        subject: overrides.subject ?? "podcast ideas",
        receivedAt: "2026-04-19T00:00:00Z",
        parsedData: {
          messageId: "<m-1@example.com>",
          subject: overrides.subject ?? "podcast ideas",
          from: {
            addresses: [{ address: "user@example.com" }],
          },
          to: { addresses: [{ address: "agent@onloop.work" }] },
          textBody:
            "textBody" in overrides
              ? (overrides.textBody ?? null)
              : "First idea about AI in the cloud\nSecond idea about podcasting\nThird idea about workflows",
          htmlBody: overrides.htmlBody ?? null,
        },
      },
    };
  }

  test("parses a valid plaintext email", async () => {
    const result = await parseInboundEmail(payload());
    expect(result.k).toBe(K_DEFAULT);
    expect(result.ideas).toHaveLength(3);
    expect(result.senderEmail).toBe("user@example.com");
    expect(result.senderHash).toHaveLength(64);
    expect(result.originalEmailId).toBe("inb_123");
  });

  test("extracts K from subject line", async () => {
    const result = await parseInboundEmail(
      payload({ subject: "podcast [K=3] ideas" }),
    );
    expect(result.k).toBe(3);
  });

  test("rejects when body has no ideas", async () => {
    await expect(
      parseInboundEmail(payload({ textBody: "short" })),
    ).rejects.toBeInstanceOf(EmailParseError);
  });

  test("falls back to HTML when textBody is missing", async () => {
    const html =
      "<p>First HTML-body idea for onloop</p><p>Another idea with some length here</p>";
    const result = await parseInboundEmail(
      payload({ textBody: null, htmlBody: html }),
    );
    expect(result.ideas.length).toBeGreaterThan(0);
  });
});
