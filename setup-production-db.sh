#!/bin/bash

# Production Database Setup Script
# Usage: ./setup-production-db.sh

set -e

echo "🚀 Production Database Setup"
echo "============================"
echo ""

# Check if DATABASE_URL is provided as argument
if [ -n "$1" ]; then
  DATABASE_URL="$1"
  echo "📋 Using provided DATABASE_URL"
else
  # Get database URL from user
  echo "Please provide your Aiven DATABASE_URL:"
  echo "  Format: postgresql://avnadmin:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
  echo ""
  read -p "DATABASE_URL: " DATABASE_URL
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL is required"
  echo ""
  echo "Usage:"
  echo "  ./setup-production-db.sh 'postgresql://avnadmin:PASSWORD@HOST:PORT/DATABASE?sslmode=require'"
  echo ""
  exit 1
fi

export DATABASE_URL

echo ""
echo "📦 Step 1: Generating Prisma Client..."
npx prisma generate

echo ""
echo "🔄 Step 2: Running migrations..."
npx prisma migrate deploy

echo ""
read -p "Do you want to seed the database? (y/n): " SEED_DB

if [ "$SEED_DB" = "y" ] || [ "$SEED_DB" = "Y" ]; then
  echo ""
  echo "🌱 Step 3: Seeding database..."
  echo "  This will create:"
  echo "  - 5 Doctors (Nairobi Sculpt surgeons)"
  echo "  - Admin user"
  echo "  - Nurses, Frontdesk staff"
  echo "  - Sample patients, appointments, services"
  echo ""
  read -p "Continue? (y/n): " CONFIRM
  
  if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
    npm run db:seed
  else
    echo "⏭️  Skipping seed"
  fi
else
  echo "⏭️  Skipping seed"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 Next steps:"
echo "  1. Verify doctors: DATABASE_URL=\"$DATABASE_URL\" npx prisma studio"
echo "  2. Change default passwords (see PRODUCTION_DB_SETUP.md)"
echo "  3. Configure Vercel environment variables"
echo ""
