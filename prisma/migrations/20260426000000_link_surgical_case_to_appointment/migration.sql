-- Link doctor-confirmed procedure appointments to surgical cases
-- Safe / idempotent migration (PostgreSQL)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'SurgicalCase'
      AND column_name = 'appointment_id'
  ) THEN
    ALTER TABLE "SurgicalCase" ADD COLUMN "appointment_id" INTEGER;
  END IF;
END $$;

-- Unique link: one appointment can map to at most one surgical case
CREATE UNIQUE INDEX IF NOT EXISTS "SurgicalCase_appointment_id_key"
  ON "SurgicalCase"("appointment_id");

-- Query optimization for lookups
CREATE INDEX IF NOT EXISTS "SurgicalCase_appointment_id_idx"
  ON "SurgicalCase"("appointment_id");

-- Foreign key to Appointment
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SurgicalCase_appointment_id_fkey'
  ) THEN
    ALTER TABLE "SurgicalCase"
      ADD CONSTRAINT "SurgicalCase_appointment_id_fkey"
      FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

