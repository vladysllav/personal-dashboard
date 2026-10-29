CREATE TABLE IF NOT EXISTS "nutrition_plans" (
	"user_id" text PRIMARY KEY NOT NULL,
	"calories" double precision NOT NULL,
	"protein" double precision NOT NULL,
	"fat" double precision NOT NULL,
	"carbs" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nutrition_days" (
	"user_id" text NOT NULL,
	"date_key" text NOT NULL,
	"calories" double precision NOT NULL,
	"protein" double precision NOT NULL,
	"fat" double precision NOT NULL,
	"carbs" double precision NOT NULL,
	CONSTRAINT "nutrition_days_user_id_date_key_pk" PRIMARY KEY("user_id","date_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "weight_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date_key" text NOT NULL,
	"at" text NOT NULL,
	"value" double precision NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nutrition_plans" ADD CONSTRAINT "nutrition_plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "nutrition_days" ADD CONSTRAINT "nutrition_days_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "weight_entries" ADD CONSTRAINT "weight_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "weight_entries_user_id_idx" ON "weight_entries" USING btree ("user_id");
