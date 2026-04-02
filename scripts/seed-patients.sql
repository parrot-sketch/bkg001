-- =============================================================
-- SEED PRODUCTION: Import patients from CSV
--
-- Prerequisites:
-- 1. Copy patients.csv to the production server
-- 2. Run seed-staff.sql first
-- 3. Run: psql $PRODUCTION_URL -f scripts/seed-patients.sql
-- =============================================================

-- This script uses a temp table + COPY to bulk import patients.
-- It creates both User and Patient records in one pass.
-- Passwords are set to a placeholder — patients will reset on first login.

BEGIN;

-- Create temp table matching the CSV structure
CREATE TEMP TABLE _import_patients (
    id TEXT,
    user_id TEXT,
    file_number TEXT,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    date_of_birth TEXT,
    gender TEXT,
    address TEXT,
    marital_status TEXT,
    occupation TEXT,
    emergency_contact_name TEXT,
    emergency_contact_number TEXT,
    relation TEXT,
    blood_group TEXT,
    allergies TEXT,
    medical_conditions TEXT,
    medical_history TEXT,
    insurance_provider TEXT,
    insurance_number TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- Load CSV (adjust path as needed on production server)
\copy _import_patients FROM '/tmp/patients.csv' WITH (FORMAT csv, HEADER true, NULL '');

-- Generate bcrypt hash for placeholder password
-- Using a static hash for "password123" — patients should reset on first login
-- $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy = bcrypt("password123")

-- Insert User records for each patient (new UUIDs, old email/name/phone)
INSERT INTO "User" (id, email, password_hash, role, status, first_name, last_name, phone, created_at, updated_at)
SELECT
    gen_random_uuid(),
    COALESCE(email, file_number || '@placeholder.nsac.co.ke'),
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'PATIENT',
    'ACTIVE',
    first_name,
    last_name,
    phone,
    COALESCE(created_at::timestamp, NOW()),
    COALESCE(updated_at::timestamp, NOW())
FROM _import_patients
ON CONFLICT (email) DO NOTHING;

-- Insert Patient records linked to the new User records
INSERT INTO "Patient" (
    id, user_id, file_number, first_name, last_name, email, phone,
    date_of_birth, gender, address, marital_status, occupation,
    emergency_contact_name, emergency_contact_number, relation,
    blood_group, allergies, medical_conditions, medical_history,
    insurance_provider, insurance_number, approved, created_at, updated_at
)
SELECT
    gen_random_uuid(),
    u.id,
    i.file_number,
    i.first_name,
    i.last_name,
    i.email,
    i.phone,
    CASE WHEN i.date_of_birth != '' AND i.date_of_birth IS NOT NULL
         THEN i.date_of_birth::date ELSE NULL END,
    CASE WHEN i.gender = 'MALE' THEN 'MALE'::"Gender"
         WHEN i.gender = 'FEMALE' THEN 'FEMALE'::"Gender"
         ELSE 'OTHER'::"Gender" END,
    i.address,
    i.marital_status,
    i.occupation,
    i.emergency_contact_name,
    i.emergency_contact_number,
    i.relation,
    i.blood_group,
    i.allergies,
    i.medical_conditions,
    i.medical_history,
    i.insurance_provider,
    i.insurance_number,
    true,
    COALESCE(i.created_at::timestamp, NOW()),
    COALESCE(i.updated_at::timestamp, NOW())
FROM _import_patients i
JOIN "User" u ON u.email = COALESCE(i.email, i.file_number || '@placeholder.nsac.co.ke')
WHERE u.role = 'PATIENT'
AND NOT EXISTS (SELECT 1 FROM "Patient" p WHERE p.file_number = i.file_number);

DROP TABLE _import_patients;

COMMIT;

-- Verify
SELECT 'Patient Users' as category, COUNT(*) as count FROM "User" WHERE role = 'PATIENT'
UNION ALL
SELECT 'Patient Records', COUNT(*) FROM "Patient";
