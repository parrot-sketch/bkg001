-- Fix for missing Phase 1 fields in Production
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "status_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "status_changed_by" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "doctor_confirmed_at" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "doctor_confirmed_by" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "doctor_rejection_reason" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "marked_no_show_at" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "slot_start_time" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "slot_duration" INTEGER DEFAULT 30;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "duration_minutes" INTEGER;

-- Add Performance Indexes if they don't exist
CREATE INDEX IF NOT EXISTS "Appointment_doctor_id_scheduled_at_idx" ON "Appointment"("doctor_id", "scheduled_at");
CREATE INDEX IF NOT EXISTS "Appointment_doctor_id_status_scheduled_at_idx" ON "Appointment"("doctor_id", "status", "scheduled_at");
CREATE INDEX IF NOT EXISTS "Appointment_patient_id_scheduled_at_idx" ON "Appointment"("patient_id", "scheduled_at");
CREATE INDEX IF NOT EXISTS "Appointment_patient_id_status_scheduled_at_idx" ON "Appointment"("patient_id", "status", "scheduled_at");
CREATE INDEX IF NOT EXISTS "Appointment_status_created_at_idx" ON "Appointment"("status", "created_at");
CREATE INDEX IF NOT EXISTS "Appointment_status_changed_at_idx" ON "Appointment"("status_changed_at");
CREATE INDEX IF NOT EXISTS "Appointment_status_changed_by_idx" ON "Appointment"("status_changed_by");

-- Add Unique Constraint for slot locking
CREATE UNIQUE INDEX IF NOT EXISTS "unique_doctor_scheduled_slot" ON "Appointment"("doctor_id", "scheduled_at");
