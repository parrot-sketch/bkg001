-- =============================================================
-- SEED PRODUCTION: Import inventory from CSV
--
-- Run: psql $PRODUCTION_URL -f scripts/seed-inventory.sql
-- =============================================================

BEGIN;

CREATE TEMP TABLE _import_inventory (
    id TEXT,
    name TEXT,
    sku TEXT,
    category TEXT,
    description TEXT,
    unit_of_measure TEXT,
    unit_cost TEXT,
    reorder_point TEXT,
    supplier TEXT,
    is_active TEXT,
    is_billable TEXT,
    is_implant TEXT,
    manufacturer TEXT,
    low_stock_threshold TEXT,
    created_at TEXT,
    updated_at TEXT
);

\copy _import_inventory FROM '/tmp/inventory.csv' WITH (FORMAT csv, HEADER true, NULL '');

INSERT INTO "InventoryItem" (
    name, sku, category, description, unit_of_measure, unit_cost,
    reorder_point, supplier, is_active, is_billable, is_implant,
    manufacturer, low_stock_threshold, created_at, updated_at
)
SELECT
    name,
    COALESCE(sku, 'SKU-' || gen_random_uuid()::text),
    COALESCE(category::"InventoryCategory", 'OTHER'::"InventoryCategory"),
    description,
    COALESCE(unit_of_measure, 'unit'),
    COALESCE(unit_cost::double precision, 0),
    COALESCE(reorder_point::integer, 0),
    supplier,
    COALESCE(is_active::boolean, true),
    COALESCE(is_billable::boolean, true),
    COALESCE(is_implant::boolean, false),
    manufacturer,
    COALESCE(low_stock_threshold::integer, 0),
    COALESCE(created_at::timestamp, NOW()),
    COALESCE(updated_at::timestamp, NOW())
FROM _import_inventory
WHERE NOT EXISTS (SELECT 1 FROM "InventoryItem" inv WHERE inv.sku = _import_inventory.sku);

DROP TABLE _import_inventory;

COMMIT;

SELECT 'Inventory Items' as category, COUNT(*) as count FROM "InventoryItem";
