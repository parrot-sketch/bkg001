-- Migration: Update ProcedureCategory enum from 11 values to 5 broad categories
-- Date: 2026-08-14
-- Description: Consolidates procedure categories into FACIAL, BODY, BREAST, SKIN_AND_SCAR, NON_SURGICAL, OTHER

-- Step 1: Create new enum type with consolidated categories
CREATE TYPE "ProcedureCategory_new" AS ENUM ('FACIAL', 'BODY', 'BREAST', 'SKIN_AND_SCAR', 'NON_SURGICAL', 'OTHER');

-- Step 2: Alter column to use new type, mapping old values to new categories
-- Mapping:
--   FACE, FACE_AND_NECK, HAIR_RESTORATION → FACIAL
--   BODY, BODY_CONTOURING, INTIMATE_AESTHETIC, POST_WEIGHT_LOSS → BODY
--   BREAST → BREAST
--   RECONSTRUCTIVE → OTHER (no direct equivalent in new structure)
--   NON_SURGICAL → NON_SURGICAL
--   OTHER → OTHER
ALTER TABLE "surgical_procedure_options" 
  ALTER COLUMN "category" TYPE "ProcedureCategory_new" 
  USING (
    CASE "category"::text
      WHEN 'FACE' THEN 'FACIAL'::"ProcedureCategory_new"
      WHEN 'FACE_AND_NECK' THEN 'FACIAL'::"ProcedureCategory_new"
      WHEN 'BREAST' THEN 'BREAST'::"ProcedureCategory_new"
      WHEN 'BODY' THEN 'BODY'::"ProcedureCategory_new"
      WHEN 'BODY_CONTOURING' THEN 'BODY'::"ProcedureCategory_new"
      WHEN 'RECONSTRUCTIVE' THEN 'OTHER'::"ProcedureCategory_new"
      WHEN 'INTIMATE_AESTHETIC' THEN 'BODY'::"ProcedureCategory_new"
      WHEN 'HAIR_RESTORATION' THEN 'FACIAL'::"ProcedureCategory_new"
      WHEN 'NON_SURGICAL' THEN 'NON_SURGICAL'::"ProcedureCategory_new"
      WHEN 'POST_WEIGHT_LOSS' THEN 'BODY'::"ProcedureCategory_new"
      WHEN 'OTHER' THEN 'OTHER'::"ProcedureCategory_new"
      ELSE 'OTHER'::"ProcedureCategory_new"
    END
  );

-- Step 3: Drop old enum type
DROP TYPE "ProcedureCategory";

-- Step 4: Rename new enum type to original name
ALTER TYPE "ProcedureCategory_new" RENAME TO "ProcedureCategory";
