-- Add missing low_stock_threshold column to InventoryItem
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "low_stock_threshold" INTEGER NOT NULL DEFAULT 0;

-- Create QueueStatus enum if not exists
DO $$ BEGIN
    CREATE TYPE "QueueStatus" AS ENUM ('WAITING', 'IN_CONSULTATION', 'COMPLETED', 'REMOVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create PatientQueue table
CREATE TABLE IF NOT EXISTS "PatientQueue" (
    "id" SERIAL NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "appointment_id" INTEGER,
    "status" "QueueStatus" NOT NULL DEFAULT 'WAITING',
    "added_by" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "called_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "position" INTEGER,
    "removed_at" TIMESTAMP(3),
    "removed_by" TEXT,
    "removal_reason" TEXT,
    CONSTRAINT "PatientQueue_pkey" PRIMARY KEY (id)
);

-- Create indexes for PatientQueue
CREATE INDEX IF NOT EXISTS "PatientQueue_patient_id_idx" ON "PatientQueue"("patient_id");
CREATE INDEX IF NOT EXISTS "PatientQueue_doctor_id_idx" ON "PatientQueue"("doctor_id");
CREATE INDEX IF NOT EXISTS "PatientQueue_appointment_id_idx" ON "PatientQueue"("appointment_id");
CREATE INDEX IF NOT EXISTS "PatientQueue_status_idx" ON "PatientQueue"("status");
CREATE INDEX IF NOT EXISTS "PatientQueue_added_at_idx" ON "PatientQueue"("added_at");

-- Add foreign keys for PatientQueue (skip if already exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PatientQueue_patient_id_fkey') THEN
        ALTER TABLE "PatientQueue" ADD CONSTRAINT "PatientQueue_patient_id_fkey" 
            FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PatientQueue_doctor_id_fkey') THEN
        ALTER TABLE "PatientQueue" ADD CONSTRAINT "PatientQueue_doctor_id_fkey" 
            FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PatientQueue_appointment_id_fkey') THEN
        ALTER TABLE "PatientQueue" ADD CONSTRAINT "PatientQueue_appointment_id_fkey" 
            FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
