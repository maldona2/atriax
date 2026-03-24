CREATE TABLE "daily_appointment_usage" (
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"usage_date" date NOT NULL,
	"count" integer NOT NULL DEFAULT 0,
	"last_updated" timestamp with time zone DEFAULT now(),
	CONSTRAINT "daily_appointment_usage_pkey" PRIMARY KEY("user_id","usage_date"),
	CONSTRAINT "count_non_negative" CHECK ("count" >= 0)
);
--> statement-breakpoint
CREATE INDEX "idx_daily_appointment_usage_date" ON "daily_appointment_usage" ("usage_date");
