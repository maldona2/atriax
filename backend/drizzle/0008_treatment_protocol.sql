-- Migration: Add treatment protocol fields and patient_treatments table
ALTER TABLE "treatments" ADD COLUMN IF NOT EXISTS "initial_frequency_weeks" integer;
--> statement-breakpoint
ALTER TABLE "treatments" ADD COLUMN IF NOT EXISTS "initial_sessions_count" integer;
--> statement-breakpoint
ALTER TABLE "treatments" ADD COLUMN IF NOT EXISTS "maintenance_frequency_weeks" integer;
--> statement-breakpoint
ALTER TABLE "treatments" ADD COLUMN IF NOT EXISTS "protocol_notes" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_treatments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"treatment_id" uuid NOT NULL,
	"current_session" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now(),
	"last_appointment_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "patient_treatments" ADD CONSTRAINT "patient_treatments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "patient_treatments" ADD CONSTRAINT "patient_treatments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "patient_treatments" ADD CONSTRAINT "patient_treatments_treatment_id_treatments_id_fk" FOREIGN KEY ("treatment_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "patient_treatments" ADD CONSTRAINT "patient_treatments_last_appointment_id_appointments_id_fk" FOREIGN KEY ("last_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_patient_treatments_tenant" ON "patient_treatments" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_patient_treatments_patient" ON "patient_treatments" USING btree ("patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_patient_treatments_treatment" ON "patient_treatments" USING btree ("treatment_id");
