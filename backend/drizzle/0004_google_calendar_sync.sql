CREATE TABLE "calendar_sync_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"appointment_id" uuid,
	"operation" text NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 5 NOT NULL,
	"next_retry_at" timestamp with time zone,
	"payload" jsonb,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "calendar_sync_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"google_event_id" text,
	"status" text DEFAULT 'unsynced' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "calendar_sync_status_appointment_id_unique" UNIQUE("appointment_id")
);
--> statement-breakpoint
CREATE TABLE "google_calendar_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"encrypted_access_token" text NOT NULL,
	"encrypted_refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"scope" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "google_calendar_tokens_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "calendar_sync_queue" ADD CONSTRAINT "calendar_sync_queue_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_sync_queue" ADD CONSTRAINT "calendar_sync_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_sync_queue" ADD CONSTRAINT "calendar_sync_queue_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_sync_status" ADD CONSTRAINT "calendar_sync_status_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_sync_status" ADD CONSTRAINT "calendar_sync_status_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_sync_status" ADD CONSTRAINT "calendar_sync_status_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_calendar_tokens" ADD CONSTRAINT "google_calendar_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_calendar_tokens" ADD CONSTRAINT "google_calendar_tokens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_calendar_sync_queue_tenant" ON "calendar_sync_queue" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_calendar_sync_queue_user" ON "calendar_sync_queue" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_calendar_sync_queue_status" ON "calendar_sync_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_calendar_sync_queue_priority" ON "calendar_sync_queue" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_calendar_sync_queue_next_retry" ON "calendar_sync_queue" USING btree ("next_retry_at");--> statement-breakpoint
CREATE INDEX "idx_calendar_sync_status_appointment" ON "calendar_sync_status" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "idx_calendar_sync_status_tenant" ON "calendar_sync_status" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_calendar_sync_status_user" ON "calendar_sync_status" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_calendar_sync_status_status" ON "calendar_sync_status" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_google_calendar_tokens_user" ON "google_calendar_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_google_calendar_tokens_tenant" ON "google_calendar_tokens" USING btree ("tenant_id");