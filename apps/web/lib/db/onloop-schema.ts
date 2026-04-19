import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const waitlist = pgTable(
  "waitlist",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("waitlist_email_idx").on(table.email)],
);

export type Waitlist = typeof waitlist.$inferSelect;
export type NewWaitlist = typeof waitlist.$inferInsert;

export const runs = pgTable(
  "runs",
  {
    id: text("id").primaryKey(),
    kind: text("kind", { enum: ["podcast"] })
      .notNull()
      .default("podcast"),
    k: integer("k").notNull(),
    status: text("status", {
      enum: ["queued", "running", "completed", "failed"],
    })
      .notNull()
      .default("queued"),
    senderHash: text("sender_hash").notNull(),
    senderLabel: text("sender_label").notNull().default("anon"),
    subject: text("subject"),
    notifyEmail: text("notify_email"),
    sourceMessageId: text("source_message_id").notNull(),
    originalEmailId: text("original_email_id").notNull(),
    langfuseTraceId: text("langfuse_trace_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    uniqueIndex("runs_source_message_id_idx").on(table.sourceMessageId),
  ],
);

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;

export const ideas = pgTable("ideas", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  selected: boolean("selected").notNull().default(false),
  moodTag: text("mood_tag", { enum: ["news", "explainer", "commentary"] }),
  rationale: text("rationale"),
  scoreNovelty: integer("score_novelty"),
  scoreListenability: integer("score_listenability"),
  scoreFactuality: integer("score_factuality"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Idea = typeof ideas.$inferSelect;
export type NewIdea = typeof ideas.$inferInsert;

export const episodes = pgTable(
  "episodes",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    ideaId: text("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    mp3Url: text("mp3_url").notNull(),
    lengthBytes: integer("length_bytes").notNull(),
    durationSec: integer("duration_sec").notNull(),
    guid: text("guid").notNull(),
    pubDate: timestamp("pub_date").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("episodes_guid_idx").on(table.guid)],
);

export type Episode = typeof episodes.$inferSelect;
export type NewEpisode = typeof episodes.$inferInsert;
