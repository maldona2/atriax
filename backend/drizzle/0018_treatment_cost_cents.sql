-- Add cost_cents column to treatments table for tracking treatment costs
ALTER TABLE "treatments" ADD COLUMN "cost_cents" integer;
--> statement-breakpoint
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_cost_cents_check" CHECK ("cost_cents" >= 0);
