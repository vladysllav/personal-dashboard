CREATE TABLE IF NOT EXISTS "challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"seq" serial NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT '' NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"benefit_unit" text,
	"benefit_per_time" double precision,
	"benefit_times_per_month" double precision,
	"created_at" text NOT NULL,
	"finished_at" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "challenge_relapses" (
	"id" text PRIMARY KEY NOT NULL,
	"challenge_id" text NOT NULL,
	"date_key" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "challenge_relapses" ADD CONSTRAINT "challenge_relapses_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "challenges_user_id_idx" ON "challenges" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "challenge_relapses_challenge_id_idx" ON "challenge_relapses" USING btree ("challenge_id");
