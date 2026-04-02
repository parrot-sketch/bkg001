#!/bin/bash
# =============================================================
# SEED PRODUCTION DATABASE
#
# Usage: ./scripts/seed-production.sh <PRODUCTION_DB_URL>
#
# Prerequisites:
# 1. CSV files exported to /tmp/ (patients.csv, services.csv, inventory.csv)
# 2. Production database schema is up to date (prisma db push)
# =============================================================

set -e

DB_URL="$1"

if [ -z "$DB_URL" ]; then
    echo "Usage: $0 <PRODUCTION_DB_URL>"
    echo "Example: $0 'postgres://user:pass@host:port/db?sslmode=require'"
    exit 1
fi

echo "=== Step 1/4: Seeding Staff (5 staff + 5 doctors) ==="
psql "$DB_URL" -f scripts/seed-staff.sql
echo "✓ Staff seeded"

echo ""
echo "=== Step 2/4: Importing Patients (856 records) ==="
psql "$DB_URL" -f scripts/seed-patients.sql
echo "✓ Patients imported"

echo ""
echo "=== Step 3/4: Importing Services (463 records) ==="
psql "$DB_URL" -f scripts/seed-services.sql
echo "✓ Services imported"

echo ""
echo "=== Step 4/4: Importing Inventory (113 records) ==="
psql "$DB_URL" -f scripts/seed-inventory.sql
echo "✓ Inventory imported"

echo ""
echo "=== Seeding Complete ==="
psql "$DB_URL" -c "
SELECT 'Users' as table_name, COUNT(*) as count FROM \"User\"
UNION ALL SELECT 'Patients', COUNT(*) FROM \"Patient\"
UNION ALL SELECT 'Doctors', COUNT(*) FROM \"Doctor\"
UNION ALL SELECT 'Services', COUNT(*) FROM \"Service\"
UNION ALL SELECT 'Inventory', COUNT(*) FROM \"InventoryItem\";
"
