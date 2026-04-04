-- WhatsApp Bot: conversation sessions, phone verifications, and message audit log

CREATE TABLE IF NOT EXISTS "whatsapp_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "phone_number" text NOT NULL,
  "context" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "last_message_at" timestamp with time zone DEFAULT now(),
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "whatsapp_sessions_tenant_phone_unique" UNIQUE ("tenant_id", "phone_number")
);

CREATE INDEX IF NOT EXISTS "idx_whatsapp_sessions_tenant" ON "whatsapp_sessions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_sessions_phone" ON "whatsapp_sessions" ("phone_number");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_sessions_expires" ON "whatsapp_sessions" ("expires_at");

CREATE TABLE IF NOT EXISTS "whatsapp_verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "phone_number" text NOT NULL,
  "otp_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "attempts" integer NOT NULL DEFAULT 0,
  "is_verified" boolean NOT NULL DEFAULT false,
  "verified_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_whatsapp_verifications_user" ON "whatsapp_verifications" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_verifications_tenant" ON "whatsapp_verifications" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_verifications_expires" ON "whatsapp_verifications" ("expires_at");

CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "phone_number" text NOT NULL,
  "direction" text NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "meta_message_id" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_whatsapp_messages_tenant" ON "whatsapp_messages" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_messages_phone" ON "whatsapp_messages" ("phone_number");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_messages_meta_id" ON "whatsapp_messages" ("meta_message_id");
