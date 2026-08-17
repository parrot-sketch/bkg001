-- AlterTable
ALTER TABLE "Patient" ADD COLUMN "referral_source" TEXT;

-- AlterTable
ALTER TABLE "PatientBill" ADD COLUMN "custom_description" TEXT;

-- AlterTable
ALTER TABLE "SurgicalCase" ADD COLUMN "primary_surgeon_name" TEXT;
