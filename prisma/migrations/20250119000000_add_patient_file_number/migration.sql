-- Migration: Add file_number, whatsapp_phone, and occupation to Patient table
-- This migration handles existing Patient records by generating file numbers for them

-- Step 1: Add columns as nullable (temporarily)
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "file_number" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "whatsapp_phone" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "occupation" TEXT;

-- Step 2: Generate sequential file numbers for existing records (ordered by created_at)
-- Format: NS001, NS002, NS003, etc.
WITH numbered AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM "Patient"
  WHERE "file_number" IS NULL
)
UPDATE "Patient"
SET "file_number" = 'NS' || LPAD(numbered.row_num::TEXT, 3, '0')
FROM numbered
WHERE "Patient".id = numbered.id;

-- Step 3: Make file_number required (NOT NULL)
ALTER TABLE "Patient" ALTER COLUMN "file_number" SET NOT NULL;

-- Step 4: Add unique constraint on file_number
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_file_number_key" UNIQUE ("file_number");

-- Step 5: Create index on file_number for faster lookups
CREATE INDEX IF NOT EXISTS "Patient_file_number_idx" ON "Patient"("file_number");
