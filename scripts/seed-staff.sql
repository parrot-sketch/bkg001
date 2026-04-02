-- =============================================================
-- SEED PRODUCTION: Staff first
-- Run with: psql $PRODUCTION_URL -f scripts/seed-staff.sql
-- =============================================================

-- Password: "password123" (bcrypt hash)
-- Staff should reset on first login

-- ── Non-Doctor Staff ─────────────────────────────────────────
INSERT INTO "User" (id, email, password_hash, role, status, first_name, last_name, phone, created_at, updated_at) VALUES
    (gen_random_uuid(), 'admin@nairobisculpt.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ADMIN', 'ACTIVE', 'System', 'Administrator', NULL, NOW(), NOW()),
    (gen_random_uuid(), 'reception@nairobisculpt.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'FRONTDESK', 'ACTIVE', 'David', 'Omondi', '+254700000001', NOW(), NOW()),
    (gen_random_uuid(), 'napali@nairobisculpt.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'NURSE', 'ACTIVE', 'Napali', NULL, NULL, NOW(), NOW()),
    (gen_random_uuid(), 'samuel.kiprop@nairobisculpt.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'THEATER_TECHNICIAN', 'ACTIVE', 'Samuel', 'Kiprop', '+254700000004', NOW(), NOW()),
    (gen_random_uuid(), 'stores@nairobisculpt.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'STORES', 'ACTIVE', 'Inventory', 'Manager', '+254700000005', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- ── Doctor 1: Dr. Angela Muoki ───────────────────────────────
INSERT INTO "User" (id, email, password_hash, role, status, first_name, last_name, phone, created_at, updated_at)
VALUES (gen_random_uuid(), 'angela@nairobisculpt.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'DOCTOR', 'ACTIVE', 'Angela', 'Muoki', '+254700000010', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO "Doctor" (id, user_id, email, first_name, last_name, name, title, specialization, license_number, phone, onboarding_status, created_at, updated_at)
SELECT gen_random_uuid(), u.id, 'angela@nairobisculpt.com', 'Angela', 'Muoki', 'Dr. Angela Muoki', 'Dr.', 'Plastic, Reconstructive & Aesthetic Surgery', 'KMPDB-001', '+254700000010', 'ACTIVE', NOW(), NOW()
FROM "User" u WHERE u.email = 'angela@nairobisculpt.com'
ON CONFLICT DO NOTHING;

-- ── Doctor 2: Dr. Ken Aluora ─────────────────────────────────
INSERT INTO "User" (id, email, password_hash, role, status, first_name, last_name, phone, created_at, updated_at)
VALUES (gen_random_uuid(), 'ken@nairobisculpt.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'DOCTOR', 'ACTIVE', 'Ken', 'Aluora', '+254700000011', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO "Doctor" (id, user_id, email, first_name, last_name, name, title, specialization, license_number, phone, onboarding_status, created_at, updated_at)
SELECT gen_random_uuid(), u.id, 'ken@nairobisculpt.com', 'Ken', 'Aluora', 'Dr. Ken Aluora', 'Dr.', 'Plastic Surgery & Wound Care', 'KMPDB-002', '+254700000011', 'ACTIVE', NOW(), NOW()
FROM "User" u WHERE u.email = 'ken@nairobisculpt.com'
ON CONFLICT DO NOTHING;

-- ── Doctor 3: Dr. Dorsi Jowi ─────────────────────────────────
INSERT INTO "User" (id, email, password_hash, role, status, first_name, last_name, phone, created_at, updated_at)
VALUES (gen_random_uuid(), 'dorsi@nairobisculpt.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'DOCTOR', 'ACTIVE', 'Dorsi', 'Jowi', '+254700000012', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO "Doctor" (id, user_id, email, first_name, last_name, name, title, specialization, license_number, phone, onboarding_status, created_at, updated_at)
SELECT gen_random_uuid(), u.id, 'dorsi@nairobisculpt.com', 'Dorsi', 'Jowi', 'Dr. Dorsi Jowi', 'Dr.', 'Aesthetic Medicine', 'KMPDB-003', '+254700000012', 'ACTIVE', NOW(), NOW()
FROM "User" u WHERE u.email = 'dorsi@nairobisculpt.com'
ON CONFLICT DO NOTHING;

-- ── Doctor 4: Dr. Mukami Gathariki ───────────────────────────
INSERT INTO "User" (id, email, password_hash, role, status, first_name, last_name, phone, created_at, updated_at)
VALUES (gen_random_uuid(), 'mukami@nairobisculpt.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'DOCTOR', 'ACTIVE', 'Mukami', 'Gathariki', '+254700000013', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO "Doctor" (id, user_id, email, first_name, last_name, name, title, specialization, license_number, phone, onboarding_status, created_at, updated_at)
SELECT gen_random_uuid(), u.id, 'mukami@nairobisculpt.com', 'Mukami', 'Gathariki', 'Dr. Mukami Gathariki', 'Dr.', 'Dermatology', 'KMPDB-004', '+254700000013', 'ACTIVE', NOW(), NOW()
FROM "User" u WHERE u.email = 'mukami@nairobisculpt.com'
ON CONFLICT DO NOTHING;

-- ── Doctor 5: Dr. John Paul Ogalo ────────────────────────────
INSERT INTO "User" (id, email, password_hash, role, status, first_name, last_name, phone, created_at, updated_at)
VALUES (gen_random_uuid(), 'john@nairobisculpt.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'DOCTOR', 'ACTIVE', 'John Paul', 'Ogalo', '+254700000014', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO "Doctor" (id, user_id, email, first_name, last_name, name, title, specialization, license_number, phone, onboarding_status, created_at, updated_at)
SELECT gen_random_uuid(), u.id, 'john@nairobisculpt.com', 'John Paul', 'Ogalo', 'Dr. John Paul Ogalo', 'Dr.', 'General Surgery', 'KMPDB-005', '+254700000014', 'ACTIVE', NOW(), NOW()
FROM "User" u WHERE u.email = 'john@nairobisculpt.com'
ON CONFLICT DO NOTHING;

-- Verify
SELECT 'Staff Users' as category, COUNT(*) as count FROM "User" WHERE role != 'PATIENT'
UNION ALL
SELECT 'Doctor Profiles', COUNT(*) FROM "Doctor";
