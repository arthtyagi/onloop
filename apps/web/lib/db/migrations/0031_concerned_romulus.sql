ALTER TABLE "runs" ADD COLUMN "sender_label" text DEFAULT 'anon' NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "subject" text;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "notify_email" text;