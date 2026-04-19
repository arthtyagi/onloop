CREATE TABLE "episodes" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"idea_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"mp3_url" text NOT NULL,
	"length_bytes" integer NOT NULL,
	"duration_sec" integer NOT NULL,
	"guid" text NOT NULL,
	"pub_date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ideas" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"text" text NOT NULL,
	"selected" boolean DEFAULT false NOT NULL,
	"mood_tag" text,
	"rationale" text,
	"score_novelty" integer,
	"score_listenability" integer,
	"score_factuality" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text DEFAULT 'podcast' NOT NULL,
	"k" integer NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"sender_hash" text NOT NULL,
	"source_message_id" text NOT NULL,
	"original_email_id" text NOT NULL,
	"langfuse_trace_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "episodes_guid_idx" ON "episodes" USING btree ("guid");--> statement-breakpoint
CREATE UNIQUE INDEX "runs_source_message_id_idx" ON "runs" USING btree ("source_message_id");