-- =============================================================
-- SEED PRODUCTION: Import services from CSV
--
-- Run: psql $PRODUCTION_URL -f scripts/seed-services.sql
-- =============================================================

BEGIN;

CREATE TEMP TABLE _import_services (
    id TEXT,
    service_name TEXT,
    category TEXT,
    price TEXT,
    description TEXT,
    created_at TEXT,
    updated_at TEXT
);

\copy _import_services FROM '/tmp/services.csv' WITH (FORMAT csv, HEADER true, NULL '');

INSERT INTO "Service" (service_name, category, price, description, created_at, updated_at)
SELECT
    service_name,
    COALESCE(category, 'OTHER'),
    COALESCE(price::double precision, 0),
    description,
    COALESCE(created_at::timestamp, NOW()),
    COALESCE(updated_at::timestamp, NOW())
FROM _import_services;

DROP TABLE _import_services;

COMMIT;

SELECT 'Services' as category, COUNT(*) as count FROM "Service";
