#!/bin/bash

# Production Database Setup Script
# This script applies migrations and seeds the production database
# Usage: DATABASE_URL="your-connection-string" ./scripts/setup-production-db.sh

set -e  # Exit on error

echo "🚀 Production Database Setup"
echo "============================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is required"
  echo ""
  echo "Usage:"
  echo "  DATABASE_URL=\"postgresql://user:pass@host:port/db?sslmode=require\" ./scripts/setup-production-db.sh"
  echo ""
  echo "Or set it in your environment:"
  echo "  export DATABASE_URL=\"your-connection-string\""
  echo "  ./scripts/setup-production-db.sh"
  exit 1
fi

echo "📦 Step 1: Generating Prisma Client..."
npx prisma generate

echo ""
echo "🔄 Step 2: Applying database migrations..."
npx prisma migrate deploy

echo ""
echo "🌱 Step 3: Seeding database with initial data..."
npm run db:seed

echo ""
echo "✅ Production database setup complete!"
echo ""
echo "📊 Next steps:"
echo "   1. Verify data: DATABASE_URL=\"$DATABASE_URL\" npx prisma studio"
echo "   2. Test login with default credentials (see PRODUCTION_DB_SETUP.md)"
echo "   3. Change default passwords for security"
echo ""
