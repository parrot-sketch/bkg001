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
}
trap cleanup EXIT

echo "🐳 Starting test Postgres container..."
docker compose -f "$COMPOSE_FILE" up -d --wait

echo "📦 Pushing Prisma schema to test database..."
DATABASE_URL="$TEST_DB_URL" npx prisma db push --skip-generate --accept-data-loss 2>&1 | tail -3

echo "🧪 Running integration tests..."
DATABASE_URL="$TEST_DB_URL" npx vitest run --config vitest.config.integration.ts
TEST_EXIT=$?

exit $TEST_EXIT
