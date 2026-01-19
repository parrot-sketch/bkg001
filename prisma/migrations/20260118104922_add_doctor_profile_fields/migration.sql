-- AlterTable: Add new optional fields first
ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "first_name" TEXT,
ADD COLUMN IF NOT EXISTS "last_name" TEXT,
ADD COLUMN IF NOT EXISTS "title" TEXT,
ADD COLUMN IF NOT EXISTS "clinic_location" TEXT,
ADD COLUMN IF NOT EXISTS "profile_image" TEXT,
ADD COLUMN IF NOT EXISTS "bio" TEXT,
ADD COLUMN IF NOT EXISTS "education" TEXT,
ADD COLUMN IF NOT EXISTS "focus_areas" TEXT,
ADD COLUMN IF NOT EXISTS "professional_affiliations" TEXT;

-- Update existing records: Split name into first_name and last_name
UPDATE "Doctor" 
SET 
  "first_name" = SPLIT_PART("name", ' ', 1),
  "last_name" = CASE 
    WHEN POSITION(' ' IN "name") > 0 THEN SUBSTRING("name" FROM POSITION(' ' IN "name") + 1)
    ELSE ''
  END,
  "title" = CASE 
    WHEN "name" LIKE 'Dr. %' THEN 'Dr.'
    WHEN "name" LIKE 'Prof. %' THEN 'Prof.'
    ELSE NULL
  END
WHERE "first_name" IS NULL OR "last_name" IS NULL;

-- Now make first_name and last_name required (NOT NULL)
ALTER TABLE "Doctor" ALTER COLUMN "first_name" SET NOT NULL;
ALTER TABLE "Doctor" ALTER COLUMN "last_name" SET NOT NULL;
