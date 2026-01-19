-- CreateEnum
CREATE TYPE "DoctorOnboardingStatus" AS ENUM ('INVITED', 'ACTIVATED', 'PROFILE_COMPLETED', 'ACTIVE');

-- AlterTable: Add columns with default values
ALTER TABLE "Doctor" 
ADD COLUMN "activated_at" TIMESTAMP(3),
ADD COLUMN "invited_at" TIMESTAMP(3),
ADD COLUMN "invited_by" TEXT,
ADD COLUMN "onboarding_status" "DoctorOnboardingStatus" NOT NULL DEFAULT 'INVITED',
ADD COLUMN "profile_completed_at" TIMESTAMP(3);

-- Set existing doctors to ACTIVE (they're already functional)
-- New doctors will default to INVITED and must complete onboarding
UPDATE "Doctor"
SET 
  onboarding_status = 'ACTIVE',
  activated_at = created_at,
  profile_completed_at = created_at
WHERE onboarding_status = 'INVITED';

-- CreateIndex
CREATE INDEX "Doctor_onboarding_status_idx" ON "Doctor"("onboarding_status");

-- CreateIndex
CREATE INDEX "Doctor_invited_by_idx" ON "Doctor"("invited_by");
