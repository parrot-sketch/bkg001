/*
  Migration: Enforce Doctor.user_id Required
  Purpose: Enforce invariant that every Doctor MUST have a User account
  Date: 2025-01-18

  This migration:
  1. Detects orphaned Doctors (doctors without user_id)
  2. Creates User records for orphaned doctors
  3. Links doctors to their new User accounts
  4. Enforces NOT NULL constraint on user_id
  5. Updates foreign key to CASCADE on delete
*/

-- Step 1: Detect and report orphaned doctors
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM "Doctor"
  WHERE user_id IS NULL;

  IF orphan_count > 0 THEN
    RAISE NOTICE 'Found % orphaned doctor(s). Creating User records...', orphan_count;
  ELSE
    RAISE NOTICE 'No orphaned doctors found. All doctors have User accounts.';
  END IF;
END $$;

-- Step 2: Create User records for orphaned doctors
-- For each doctor without a user_id, create a User record
INSERT INTO "User" (
  id,
  email,
  password_hash,
  role,
  status,
  first_name,
  last_name,
  phone,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid()::text,
  d.email,
  '$2b$10$TemporaryPasswordHashMustBeResetOnFirstLogin', -- Placeholder - must be reset on first login
  'DOCTOR',
  'ACTIVE',
  d.first_name,
  d.last_name,
  d.phone,
  d.created_at,
  NOW()
FROM "Doctor" d
WHERE d.user_id IS NULL
ON CONFLICT (email) DO UPDATE
SET
  role = 'DOCTOR',
  first_name = COALESCE(EXCLUDED.first_name, "User".first_name),
  last_name = COALESCE(EXCLUDED.last_name, "User".last_name),
  phone = COALESCE(EXCLUDED.phone, "User".phone),
  updated_at = NOW();

-- Step 3: Link orphaned doctors to their User records
UPDATE "Doctor" d
SET user_id = (
  SELECT u.id
  FROM "User" u
  WHERE u.email = d.email AND u.role = 'DOCTOR'
  LIMIT 1
)
WHERE d.user_id IS NULL;

-- Step 4: Verify no nulls remain before adding constraint
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM "Doctor"
  WHERE user_id IS NULL;

  IF null_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % doctors still have NULL user_id. Cannot proceed. Please review orphaned doctors and create User records manually.', null_count;
  END IF;
END $$;

-- Step 5: Drop existing foreign key constraint
ALTER TABLE "Doctor" DROP CONSTRAINT IF EXISTS "Doctor_user_id_fkey";

-- Step 6: Add NOT NULL constraint
ALTER TABLE "Doctor" ALTER COLUMN "user_id" SET NOT NULL;

-- Step 7: Add foreign key constraint with CASCADE
ALTER TABLE "Doctor" 
ADD CONSTRAINT "Doctor_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: Final validation
DO $$
DECLARE
  validation_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO validation_count
  FROM "Doctor" d
  LEFT JOIN "User" u ON d.user_id = u.id
  WHERE u.id IS NULL OR u.role != 'DOCTOR';

  IF validation_count > 0 THEN
    RAISE WARNING 'Validation warning: % doctors have invalid User relationships', validation_count;
  ELSE
    RAISE NOTICE 'Validation passed: All doctors have valid DOCTOR User accounts.';
  END IF;
END $$;
