#!/bin/bash

# Baseline All Migrations Script
# Marks all existing migrations as applied (for existing production databases)

set -e

echo "📝 Baselining all migrations..."
echo ""

# Get all migration directories
MIGRATIONS=$(ls -1 prisma/migrations | grep -E '^[0-9]' | sort)

if [ -z "$MIGRATIONS" ]; then
  echo "❌ No migrations found!"
  exit 1
fi

COUNT=0
for migration in $MIGRATIONS; do
  echo "   Marking $migration as applied..."
  npx prisma migrate resolve --applied "$migration" 2>/dev/null && COUNT=$((COUNT + 1)) || echo "     (already applied or error - continuing)"
done

echo ""
echo "✅ Marked $COUNT migrations as applied"
echo ""
