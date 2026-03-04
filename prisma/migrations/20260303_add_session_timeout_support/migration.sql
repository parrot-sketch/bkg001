-- Add session timeout support to Consultation model
-- Purpose: Enable heartbeat tracking and automated cleanup of abandoned sessions

-- Add last_activity_at column to track when consultation was last active
-- This replaces relying on updated_at which can change for other reasons
ALTER TABLE "public"."Consultation" ADD COLUMN "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add index for cleanup queries (finding stale sessions)
CREATE INDEX "Consultation_last_activity_at_completed_at_idx" ON "public"."Consultation"("last_activity_at" ASC, "completed_at" ASC);

-- Update existing rows to set last_activity_at from updated_at
UPDATE "public"."Consultation" SET "last_activity_at" = "updated_at" WHERE "last_activity_at" = CURRENT_TIMESTAMP AND "updated_at" IS NOT NULL;

-- Add index for heartbeat updates (single consultation lookups)
CREATE INDEX "Consultation_id_completed_at_idx" ON "public"."Consultation"("id" ASC, "completed_at" ASC);
