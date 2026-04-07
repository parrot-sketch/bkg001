#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Integration Test Runner
#
# 1. Starts a temporary Postgres container (port 5434, tmpfs for speed)
# 2. Pushes the Prisma schema to it
# 3. Runs integration tests
# 4. Tears down the container
#
# Exit code = vitest exit code (0 = pass, 1 = fail)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

COMPOSE_FILE="docker-compose.test.yml"
TEST_DB_URL="postgresql://postgres:postgres@localhost:5444/test_db"

cleanup() {
  echo ""
  echo "🧹 Tearing down test database..."
  docker compose -f "$COMPOSE_FILE" down --volumes --remove-orphans 2>/dev/null || true
  
  if [ -f ".env.tmp" ]; then
    mv .env.tmp .env
  fi
}
trap cleanup EXIT

if [ -f ".env" ]; then
  mv .env .env.tmp
fi

echo "🐳 Starting test Postgres container..."
docker compose -f "$COMPOSE_FILE" up -d --wait

echo "📦 Pushing Prisma schema to test database..."
# Use TEST_DATABASE_URL and DATABASE_URL to ensure both Prisma and Vitest use the local DB
# We also pass --schema explicitly just in case prisma.config.ts misbehaves
export DATABASE_URL="$TEST_DB_URL"
export TEST_DATABASE_URL="$TEST_DB_URL"
# CRITICAL: Overwrite DIRECT_URL and SHADOW_DATABASE_URL so Prisma doesn't use production/Aiven values from .env
export DIRECT_URL="$TEST_DB_URL"
export SHADOW_DATABASE_URL="$TEST_DB_URL"

# REGENERATE Prisma Client to ensure it's compatible with local postgresql:// protocol
# (It often gets "locked" to prisma:// if generated with an Accelerate URL)
npx prisma generate

npx prisma db push --skip-generate --accept-data-loss

echo "🧪 Running integration tests..."
npx vitest run --config vitest.config.integration.ts
TEST_EXIT=$?

exit $TEST_EXIT
