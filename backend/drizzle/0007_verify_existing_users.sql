-- Mark all pre-existing users as verified.
-- These were created by an admin before the self-registration feature was added
-- and therefore never went through the email verification flow.
UPDATE "users" SET "is_verified" = true WHERE "is_verified" = false;
