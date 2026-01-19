#!/bin/bash

# Docker Cleanup Script for Nairobi Sculpt Database
# This script removes existing containers, volumes, and networks
# to prevent conflicts with the new database setup

set -e

echo "🧹 Starting Docker cleanup for Nairobi Sculpt database..."
echo ""

# Function to safely stop and remove container
cleanup_container() {
  local name=$1
  if docker ps -a --format "{{.Names}}" | grep -q "^${name}$"; then
    echo "  - Stopping container: $name"
    docker stop "$name" 2>/dev/null || true
    echo "  - Removing container: $name"
    docker rm "$name" 2>/dev/null || true
    echo "  ✓ Removed: $name"
  else
    echo "  ○ Container not found: $name"
  fi
}

# Function to safely remove volume
cleanup_volume() {
  local name=$1
  if docker volume ls --format "{{.Name}}" | grep -q "^${name}$"; then
    echo "  - Removing volume: $name"
    docker volume rm "$name" 2>/dev/null || true
    echo "  ✓ Removed: $name"
  else
    echo "  ○ Volume not found: $name"
  fi
}

# Function to safely remove network
cleanup_network() {
  local name=$1
  if docker network ls --format "{{.Name}}" | grep -q "^${name}$"; then
    echo "  - Removing network: $name"
    docker network rm "$name" 2>/dev/null || true
    echo "  ✓ Removed: $name"
  else
    echo "  ○ Network not found: $name"
  fi
}

# Stop and remove containers
echo "📦 Cleaning up containers..."
cleanup_container "nairobi-sculpt-db"
cleanup_container "nairobi-sculpt-cache"

# Remove volumes
echo ""
echo "💾 Cleaning up volumes..."
cleanup_volume "nairobi-sculpt_postgres_data"
cleanup_volume "ns_postgres_data"

# Remove networks
echo ""
echo "🌐 Cleaning up networks..."
cleanup_network "nairobi-sculpt_nairobi-network"
cleanup_network "nairobi-sculpt-network"

# Check for port conflicts
echo ""
echo "🔍 Checking for port conflicts..."
if docker ps --format "{{.Names}}:{{.Ports}}" | grep -q "5433"; then
  echo "  ⚠️  WARNING: Port 5433 is already in use!"
  docker ps --format "{{.Names}}:{{.Ports}}" | grep "5433"
  echo ""
  echo "  💡 The new database will use port 5433 (mapped from container port 5432)"
  echo "  💡 Update DATABASE_URL to use port 5433 if needed"
fi

if docker ps --format "{{.Names}}:{{.Ports}}" | grep -q ":5432"; then
  echo "  ⚠️  WARNING: Found containers using port 5432:"
  docker ps --format "{{.Names}}:{{.Ports}}" | grep ":5432"
  echo ""
  echo "  💡 Note: ehr-postgres is using port 5432"
  echo "  💡 Our new database will use port 5433 to avoid conflicts"
fi

echo ""
echo "✅ Docker cleanup completed!"
echo ""
echo "📝 Next steps:"
echo "  1. Update .env file: DATABASE_URL=\"postgresql://postgres:postgres@localhost:5433/nairobi_sculpt?schema=public\""
echo "  2. Start new database: npm run docker:up"
echo "  3. Run migrations: npm run db:migrate"
echo "  4. Seed database: npm run db:seed"
echo ""
