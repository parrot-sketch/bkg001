DO $$
BEGIN
  BEGIN
    ALTER TYPE "DoctorOnboardingStatus" ADD VALUE 'SCHEDULE_SETUP';
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
END $$;

DO $$
BEGIN
  UPDATE "Doctor"
  SET "onboarding_status" = 'SCHEDULE_SETUP'
  WHERE "onboarding_status" = 'PROFILE_COMPLETED'
    AND EXISTS (
      SELECT 1 FROM "SlotConfiguration" WHERE "doctor_id" = "Doctor"."id"
    );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Patch note: Some doctors may need manual status review';
END $$;

