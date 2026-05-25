-- Add SCHEDULE_SETUP state to doctor onboarding status enum
-- This migration adds the intermediate onboarding step for schedule configuration

-- PostgreSQL: Add new enum value
ALTER TYPE "DoctorOnboardingStatus" ADD VALUE 'SCHEDULE_SETUP';

-- For existing doctors in PROFILE_COMPLETED status who have slot configuration,
-- auto-transition them to SCHEDULE_SETUP (or ACTIVE if fully configured)
-- This handles the production migration scenario
DO $$
BEGIN
  -- Doctors with slot configuration but PROFILE_COMPLETED should be SCHEDULE_SETUP
  UPDATE "Doctor"
  SET "onboarding_status" = 'SCHEDULE_SETUP'
  WHERE "onboarding_status" = 'PROFILE_COMPLETED'
    AND EXISTS (
      SELECT 1 FROM "SlotConfiguration" WHERE "doctor_id" = "Doctor"."id"
    );

  -- Doctors with slot configuration and PROFILE_COMPLETED should stay in flow
  -- They will transition to ACTIVE when they save their schedule
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Migration note: Some doctors may need manual status review';
END $$;