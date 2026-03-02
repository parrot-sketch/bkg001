-- AlterTable: Add surgical_medication_record_id column (nullable, unique)
ALTER TABLE "InventoryUsage" ADD COLUMN IF NOT EXISTS "surgical_medication_record_id" TEXT;

-- CreateUniqueIndex: Only if column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'InventoryUsage' 
    AND column_name = 'surgical_medication_record_id'
  ) THEN
    -- Drop existing unique constraint if it exists
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'InventoryUsage_surgical_medication_record_id_key'
    ) THEN
      ALTER TABLE "InventoryUsage" DROP CONSTRAINT "InventoryUsage_surgical_medication_record_id_key";
    END IF;
    
    -- Add unique constraint (allows NULL)
    CREATE UNIQUE INDEX IF NOT EXISTS "InventoryUsage_surgical_medication_record_id_key" 
    ON "InventoryUsage"("surgical_medication_record_id") 
    WHERE "surgical_medication_record_id" IS NOT NULL;
  END IF;
END $$;

-- AddForeignKey: Only add FK if SurgicalMedicationRecord table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'SurgicalMedicationRecord'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'InventoryUsage_surgical_medication_record_id_fkey'
    ) THEN
      ALTER TABLE "InventoryUsage" 
      ADD CONSTRAINT "InventoryUsage_surgical_medication_record_id_fkey" 
      FOREIGN KEY ("surgical_medication_record_id") 
      REFERENCES "SurgicalMedicationRecord"("id") 
      ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
