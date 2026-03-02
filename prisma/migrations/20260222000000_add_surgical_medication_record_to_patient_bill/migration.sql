-- Add SurgicalMedicationRecord table and link to PatientBill
-- This migration:
-- 1. Creates the SurgicalMedicationRecord table (if it doesn't exist)
-- 2. Adds surgical_medication_record_id to PatientBill
-- 3. Links PatientBill items to SurgicalMedicationRecord for medication billing

-- ============================================================================
-- STEP 1: Create SurgicalMedicationRecord table (if it doesn't exist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "SurgicalMedicationRecord" (
  "id" TEXT NOT NULL,
  "surgical_case_id" TEXT NOT NULL,
  "form_response_id" TEXT,
  "inventory_item_id" INTEGER,
  "name" TEXT NOT NULL,
  "dose_value" DOUBLE PRECISION NOT NULL,
  "dose_unit" TEXT NOT NULL,
  "route" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "administered_at" TIMESTAMP(3),
  "administered_by" TEXT,
  "voided_at" TIMESTAMP(3),
  "voided_by" TEXT,
  "void_reason" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SurgicalMedicationRecord_pkey" PRIMARY KEY ("id")
);

-- Foreign keys for SurgicalMedicationRecord
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SurgicalMedicationRecord_surgical_case_id_fkey'
  ) THEN
    ALTER TABLE "SurgicalMedicationRecord" ADD CONSTRAINT "SurgicalMedicationRecord_surgical_case_id_fkey"
      FOREIGN KEY ("surgical_case_id") REFERENCES "SurgicalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SurgicalMedicationRecord_form_response_id_fkey'
  ) THEN
    ALTER TABLE "SurgicalMedicationRecord" ADD CONSTRAINT "SurgicalMedicationRecord_form_response_id_fkey"
      FOREIGN KEY ("form_response_id") REFERENCES "ClinicalFormResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SurgicalMedicationRecord_inventory_item_id_fkey'
  ) THEN
    ALTER TABLE "SurgicalMedicationRecord" ADD CONSTRAINT "SurgicalMedicationRecord_inventory_item_id_fkey"
      FOREIGN KEY ("inventory_item_id") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Indexes for SurgicalMedicationRecord
CREATE INDEX IF NOT EXISTS "SurgicalMedicationRecord_surgical_case_id_idx" 
  ON "SurgicalMedicationRecord"("surgical_case_id");
CREATE INDEX IF NOT EXISTS "SurgicalMedicationRecord_form_response_id_idx" 
  ON "SurgicalMedicationRecord"("form_response_id");
CREATE INDEX IF NOT EXISTS "SurgicalMedicationRecord_status_idx" 
  ON "SurgicalMedicationRecord"("status");

-- ============================================================================
-- STEP 2: Add surgical_medication_record_id to PatientBill
-- ============================================================================

-- Add the column (nullable, as it's optional)
ALTER TABLE "PatientBill" ADD COLUMN IF NOT EXISTS "surgical_medication_record_id" TEXT;

-- Add unique constraint (allows multiple NULLs in PostgreSQL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PatientBill_surgical_medication_record_id_key'
  ) THEN
    ALTER TABLE "PatientBill" ADD CONSTRAINT "PatientBill_surgical_medication_record_id_key" 
      UNIQUE ("surgical_medication_record_id");
  END IF;
END $$;

-- Add foreign key constraint to SurgicalMedicationRecord
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PatientBill_surgical_medication_record_id_fkey'
  ) THEN
    ALTER TABLE "PatientBill" ADD CONSTRAINT "PatientBill_surgical_medication_record_id_fkey"
      FOREIGN KEY ("surgical_medication_record_id") REFERENCES "SurgicalMedicationRecord"("id") 
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS "PatientBill_surgical_medication_record_id_idx" 
  ON "PatientBill"("surgical_medication_record_id");
