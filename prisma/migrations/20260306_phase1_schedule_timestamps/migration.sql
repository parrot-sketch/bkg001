-- Phase 1: Schedule Timestamps Migration
-- Adds scheduled_end_at, backfills scheduled_at from appointment_date+time,
-- makes duration_minutes non-nullable.

-- Step 1: Add new column scheduled_end_at
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "scheduled_end_at" TIMESTAMP(3);

-- Step 2: Make duration_minutes non-nullable with default 30
-- First set existing NULLs to the slot_duration or 30
UPDATE "Appointment"
SET "duration_minutes" = COALESCE("slot_duration", 30)
WHERE "duration_minutes" IS NULL;

-- Now alter the column to set default and make non-nullable
ALTER TABLE "Appointment" ALTER COLUMN "duration_minutes" SET DEFAULT 30;
ALTER TABLE "Appointment" ALTER COLUMN "duration_minutes" SET NOT NULL;

-- Step 3: Backfill scheduled_at for rows where it is NULL but appointment_date+time exist
-- The time field is stored in local Africa/Nairobi time (UTC+3).
-- appointment_date is stored as UTC midnight of the local date.
-- We build: (appointment_date at UTC midnight) + time interval = local datetime
-- Then subtract 3 hours to get UTC: time_string::interval - interval '3 hours'
UPDATE "Appointment"
SET "scheduled_at" = (
    DATE_TRUNC('day', "appointment_date") + "time"::interval - INTERVAL '3 hours'
)
WHERE "scheduled_at" IS NULL
  AND "time" IS NOT NULL
  AND "appointment_date" IS NOT NULL;

-- Step 4: Populate scheduled_end_at for all rows with a scheduled_at
UPDATE "Appointment"
SET "scheduled_end_at" = "scheduled_at" + ("duration_minutes" * INTERVAL '1 minute')
WHERE "scheduled_at" IS NOT NULL
  AND "scheduled_end_at" IS NULL;

-- Step 5: Create new indexes
CREATE INDEX IF NOT EXISTS "Appointment_scheduled_end_at_idx"
  ON "Appointment"("scheduled_end_at");

CREATE INDEX IF NOT EXISTS "Appointment_doctor_id_scheduled_at_scheduled_end_at_idx"
  ON "Appointment"("doctor_id", "scheduled_at", "scheduled_end_at");

-- Verify (run manually to check):
-- SELECT COUNT(*) FROM "Appointment" WHERE scheduled_at IS NULL;   -- should be 0 (or few with no time data)
-- SELECT COUNT(*) FROM "Appointment" WHERE scheduled_end_at IS NULL AND scheduled_at IS NOT NULL;  -- should be 0
