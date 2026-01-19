-- Migration: Ensure Doctor.user_id is NOT NULL
-- Purpose: Enforce invariant that every Doctor MUST have a User account
-- Date: 2025-01-XX

-- Step 1: Detect orphaned Doctors (doctors without user_id)
DO $$
DECLARE
  orphan_count INTEGER;
  orphan_record RECORD;
BEGIN
  -- Count orphaned doctors
  SELECT COUNT(*) INTO orphan_count
  FROM "Doctor"
  WHERE user_id IS NULL;

  -- If orphans exist, create User records for them
  IF orphan_count > 0 THEN
    RAISE NOTICE 'Found % orphaned doctor(s). Creating User records...', orphan_count;

    -- Create User records for each orphaned doctor
    FOR orphan_record IN
      SELECT id, email, first_name, last_name, phone
      FROM "Doctor"
      WHERE user_id IS NULL
    LOOP
      -- Generate a temporary password hash (doctor must reset on first login)
      -- Using a secure random password that will be forced to change
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
      VALUES (
        gen_random_uuid()::text,
        orphan_record.email,
        '$2b$10$TemporaryPasswordHashMustBeResetOnFirstLogin', -- Placeholder - must be reset
        'DOCTOR',
        'ACTIVE',
        orphan_record.first_name,
        orphan_record.last_name,
        orphan_record.phone,
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE
      SET
        role = 'DOCTOR',
        first_name = COALESCE(EXCLUDED.first_name, "User".first_name),
        last_name = COALESCE(EXCLUDED.last_name, "User".last_name),
        phone = COALESCE(EXCLUDED.phone, "User".phone),
        updated_at = NOW()
      RETURNING id INTO orphan_record.user_id;

      -- Link doctor to user
      UPDATE "Doctor"
      SET user_id = (
        SELECT id FROM "User" WHERE email = orphan_record.email LIMIT 1
      )
      WHERE id = orphan_record.id;

      RAISE NOTICE 'Created User for doctor: % (email: %)', orphan_record.id, orphan_record.email;
    END LOOP;

    RAISE NOTICE 'Migration complete. All doctors now have User accounts.';
  ELSE
    RAISE NOTICE 'No orphaned doctors found. All doctors have User accounts.';
  END IF;
END $$;

-- Step 2: Add NOT NULL constraint
-- First, ensure all doctors have user_id
UPDATE "Doctor"
SET user_id = (
  SELECT id FROM "User" WHERE email = "Doctor".email AND role = 'DOCTOR' LIMIT 1
)
WHERE user_id IS NULL;

-- Verify no nulls remain
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM "Doctor"
  WHERE user_id IS NULL;

  IF null_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % doctors still have NULL user_id. Cannot proceed.', null_count;
  END IF;
END $$;

-- Step 3: Change foreign key constraint from SET NULL to CASCADE
-- Drop existing constraint
ALTER TABLE "Doctor" DROP CONSTRAINT IF EXISTS "Doctor_user_id_fkey";

-- Add new constraint with CASCADE
ALTER TABLE "Doctor"
ADD CONSTRAINT "Doctor_user_id_fkey"
FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 4: Add NOT NULL constraint
ALTER TABLE "Doctor" ALTER COLUMN user_id SET NOT NULL;

-- Step 5: Final validation
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
