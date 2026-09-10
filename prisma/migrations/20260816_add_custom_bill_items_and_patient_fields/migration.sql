-- AlterTable (idempotent: earlier migrations may have already added these columns)
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "referral_source" TEXT;

-- AlterTable
ALTER TABLE "PatientBill" ADD COLUMN IF NOT EXISTS "custom_description" TEXT;

-- AlterTable
ALTER TABLE "SurgicalCase" ADD COLUMN IF NOT EXISTS "primary_surgeon_name" TEXT;
