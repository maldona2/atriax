ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "specialty" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "license_number" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "education" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "working_hours" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "appointment_duration" integer DEFAULT 30;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;