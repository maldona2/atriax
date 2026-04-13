-- Rollback migration for 0018_treatment_cost_cents.sql
-- This removes the cost_cents column from the treatments table

-- Drop the check constraint first
ALTER TABLE "treatments" DROP CONSTRAINT IF EXISTS "treatments_cost_cents_check";
--> statement-breakpoint
-- Drop the column
ALTER TABLE "treatments" DROP COLUMN IF EXISTS "cost_cents";
