-- Add is_verified to users
ALTER TABLE "users" ADD COLUMN "is_verified" boolean DEFAULT false NOT NULL;
--> statement-breakpoint

-- Drop old AI usage-tracking columns (removed from schema)
ALTER TABLE "users" DROP COLUMN IF EXISTS "clinical_notes_limit_monthly";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "recording_minutes_limit_daily";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "tokens_limit_monthly";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "cost_limit_monthly_usd";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "clinical_notes_used_monthly";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "recording_minutes_used_daily";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "tokens_used_monthly";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "cost_used_monthly_usd";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "billing_month";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "daily_usage_date";
--> statement-breakpoint

-- Drop old index no longer in schema
DROP INDEX IF EXISTS "idx_users_billing_month";
--> statement-breakpoint

-- Add new index for is_verified
CREATE INDEX "idx_users_is_verified" ON "users" USING btree ("is_verified");
--> statement-breakpoint

-- Create verification_tokens table
CREATE TABLE "verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_verification_tokens_user_id" ON "verification_tokens" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_verification_tokens_token" ON "verification_tokens" USING btree ("token");
--> statement-breakpoint
CREATE INDEX "idx_verification_tokens_expires_at" ON "verification_tokens" USING btree ("expires_at");
--> statement-breakpoint

-- Create patient_counts table
CREATE TABLE "patient_counts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "patient_counts" ADD CONSTRAINT "patient_counts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_patient_counts_user_id" ON "patient_counts" USING btree ("user_id");
