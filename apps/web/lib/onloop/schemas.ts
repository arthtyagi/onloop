import { z } from "zod";

const emailAddressSchema = z.object({
  address: z.string(),
  name: z.string().optional().nullable(),
});

const addressGroupSchema = z.object({
  text: z.string().optional().nullable(),
  addresses: z.array(emailAddressSchema),
});

export const InboundWebhookPayloadSchema = z.object({
  event: z.literal("email.received"),
  timestamp: z.string(),
  email: z.object({
    id: z.string(),
    messageId: z.string(),
    from: addressGroupSchema,
    to: addressGroupSchema,
    recipient: z.string(),
    subject: z.string(),
    receivedAt: z.string(),
    parsedData: z.object({
      messageId: z.string(),
      date: z.union([z.string(), z.date()]).optional(),
      subject: z.string(),
      from: addressGroupSchema,
      textBody: z.string().nullable().optional(),
      htmlBody: z.string().nullable().optional(),
    }),
    cleanedContent: z
      .object({
        text: z.string().nullable().optional(),
        html: z.string().nullable().optional(),
      })
      .optional(),
  }),
  endpoint: z
    .object({
      id: z.string(),
      name: z.string().optional(),
      type: z.string().optional(),
    })
    .optional(),
});

export type InboundWebhookPayload = z.infer<typeof InboundWebhookPayloadSchema>;

export const MoodTagSchema = z.enum(["news", "explainer", "commentary"]);
export type MoodTag = z.infer<typeof MoodTagSchema>;

const scoredIdeaSchema = z.object({
  index: z.number().int().min(1),
  selected: z.boolean(),
  moodTag: MoodTagSchema,
  rationale: z.string(),
  scoreNovelty: z.number().int().min(0).max(10),
  scoreListenability: z.number().int().min(0).max(10),
  scoreFactuality: z.number().int().min(0).max(10),
});

export const TriageOutputSchema = z.object({
  ideas: z.array(scoredIdeaSchema).min(1),
});

export type TriageOutput = z.infer<typeof TriageOutputSchema>;
export type ScoredIdea = z.infer<typeof scoredIdeaSchema>;

export const ResearchBulletSchema = z.object({
  text: z.string().min(1),
  sourceUrl: z.string(),
  sourceTitle: z.string().min(1),
});

export const ResearchOutputSchema = z.object({
  bullets: z.array(ResearchBulletSchema).min(1).max(8),
  summary: z.string().min(1),
});

export type ResearchOutput = z.infer<typeof ResearchOutputSchema>;
export type ResearchBullet = z.infer<typeof ResearchBulletSchema>;

export const ScriptOutputSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(400),
  text: z.string().min(1),
  wordCount: z.number().int().min(1),
});

export type ScriptOutput = z.infer<typeof ScriptOutputSchema>;

export const ParsedEmailSchema = z.object({
  originalEmailId: z.string(),
  sourceMessageId: z.string(),
  senderEmail: z.string(),
  senderHash: z.string().length(64),
  senderLabel: z.string(),
  subject: z.string(),
  subjectClean: z.string(),
  k: z.number().int().min(1).max(3),
  ideas: z.array(z.string().min(1)).min(1).max(10),
  sessionId: z.string().nullable(),
});

export type ParsedEmail = z.infer<typeof ParsedEmailSchema>;

export const RunStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
]);

export type RunStatus = z.infer<typeof RunStatusSchema>;

export const RunResponseSchema = z.object({
  run: z.object({
    id: z.string(),
    kind: z.literal("podcast"),
    k: z.number().int(),
    status: RunStatusSchema,
    langfuseTraceId: z.string().nullable().optional(),
    createdAt: z.string(),
    completedAt: z.string().nullable().optional(),
  }),
  ideas: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      selected: z.boolean(),
      moodTag: MoodTagSchema.nullable(),
      rationale: z.string().nullable(),
    }),
  ),
  episodes: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      mp3Url: z.string().url(),
      durationSec: z.number().int(),
      pubDate: z.string(),
      guid: z.string(),
    }),
  ),
});

export type RunResponse = z.infer<typeof RunResponseSchema>;
