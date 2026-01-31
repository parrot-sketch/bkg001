-- AlterTable
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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Appointment_doctor_id_scheduled_at_idx" ON "Appointment"("doctor_id", "scheduled_at");
CREATE INDEX IF NOT EXISTS "Appointment_doctor_id_status_scheduled_at_idx" ON "Appointment"("doctor_id", "status", "scheduled_at");
CREATE INDEX IF NOT EXISTS "Appointment_patient_id_scheduled_at_idx" ON "Appointment"("patient_id", "scheduled_at");
CREATE INDEX IF NOT EXISTS "Appointment_patient_id_status_scheduled_at_idx" ON "Appointment"("patient_id", "status", "scheduled_at");
CREATE INDEX IF NOT EXISTS "Appointment_status_created_at_idx" ON "Appointment"("status", "created_at");
CREATE INDEX IF NOT EXISTS "Appointment_status_changed_at_idx" ON "Appointment"("status_changed_at");
CREATE INDEX IF NOT EXISTS "Appointment_status_changed_by_idx" ON "Appointment"("status_changed_by");

-- CreateIndex (Unique)
CREATE UNIQUE INDEX IF NOT EXISTS "unique_doctor_scheduled_slot" ON "Appointment"("doctor_id", "scheduled_at");

-- Keep the index on Patient from the original file just in case it was valid
CREATE INDEX IF NOT EXISTS "idx_patient_firstname_search" ON "Patient"("first_name");
