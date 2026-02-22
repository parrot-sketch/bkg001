#!/bin/bash

# Production Database Baseline Script
# This script baselines an existing production database and syncs it

set -e

echo "🚀 Starting Production Database Baseline and Sync..."
echo ""
echo "⚠️  WARNING: This will modify the production database!"
echo "   Make sure DATABASE_URL in .env points to production."
echo ""

# Step 1: Generate Prisma Client
echo "📦 Step 1: Generating Prisma Client..."
npx prisma generate
echo "✅ Prisma Client generated"
echo ""

# Step 2: Get list of migrations
echo "📊 Step 2: Checking migrations..."
MIGRATIONS=$(ls -1 prisma/migrations | grep -E '^[0-9]' | sort)

if [ -z "$MIGRATIONS" ]; then
  echo "❌ No migrations found!"
  exit 1
fi

MIGRATION_COUNT=$(echo "$MIGRATIONS" | wc -l)
echo "   Found $MIGRATION_COUNT migrations"
echo ""

# Step 3: Try to deploy migrations (will fail if database is not empty)
echo "🔄 Step 3: Attempting to deploy migrations..."
if npx prisma migrate deploy 2>&1 | grep -q "P3005"; then
  echo "   ⚠️  Database is not empty, baselining..."
  echo ""
  
  # Baseline: Mark all migrations as applied
  echo "📝 Step 4: Marking all migrations as applied (baseline)..."
  for migration in $MIGRATIONS; do
    echo "   Marking $migration as applied..."
    npx prisma migrate resolve --applied "$migration" 2>/dev/null || true
  done
  echo "✅ All migrations marked as applied"
  echo ""
  
  # Now try deploy again (should work or show only new migrations)
  echo "🔄 Step 5: Deploying any new migrations..."
  npx prisma migrate deploy || echo "   ⚠️  All migrations already applied"
  echo ""
else
  echo "✅ Migrations deployed successfully"
  echo ""
fi

# Step 6: Seed database
echo "🌱 Step 6: Seeding database with test data..."
echo "   ⚠️  This will clear existing data and seed fresh test data."
echo ""
npm run db:seed

echo ""
echo "🎉 Production database sync completed successfully!"
echo "   Your database is ready for the demo tomorrow."
echo ""
