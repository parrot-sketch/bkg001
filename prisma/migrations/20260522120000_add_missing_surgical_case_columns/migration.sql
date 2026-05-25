-- Add missing SurgicalCase columns referenced by Prisma schema / seed
-- Also align primary_surgeon_id nullability with schema.

ALTER TABLE "SurgicalCase" ADD COLUMN IF NOT EXISTS "admission_type" TEXT;
ALTER TABLE "SurgicalCase" ADD COLUMN IF NOT EXISTS "anaesthesia_type" TEXT;
ALTER TABLE "SurgicalCase" ADD COLUMN IF NOT EXISTS "device_used" TEXT;
ALTER TABLE "SurgicalCase" ADD COLUMN IF NOT EXISTS "primary_or_revision" TEXT;
ALTER TABLE "SurgicalCase" ADD COLUMN IF NOT EXISTS "procedure_category" TEXT;
ALTER TABLE "SurgicalCase" ADD COLUMN IF NOT EXISTS "procedure_date" TIMESTAMP(3);
ALTER TABLE "SurgicalCase" ADD COLUMN IF NOT EXISTS "skin_to_skin_minutes" INTEGER;
ALTER TABLE "SurgicalCase" ADD COLUMN IF NOT EXISTS "surgeon_ids" TEXT;
ALTER TABLE "SurgicalCase" ADD COLUMN IF NOT EXISTS "total_theatre_minutes" INTEGER;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'SurgicalCase'
      AND column_name = 'primary_surgeon_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "SurgicalCase" ALTER COLUMN "primary_surgeon_id" DROP NOT NULL;
  END IF;
END $$;

