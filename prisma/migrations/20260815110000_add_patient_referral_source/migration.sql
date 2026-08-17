-- AlterTable
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "referral_source" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_patient_referral_source" ON "Patient"("referral_source");
