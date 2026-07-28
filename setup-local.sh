#!/bin/bash
set -e

echo "=========================================="
echo "  HMS Video - Local Development Setup"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📋 Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env created"
else
    echo "✅ .env already exists"
fi

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    echo ""
    echo "Please install Docker first:"
    echo "  sudo apt update"
    echo "  sudo apt install -y docker.io docker-compose-plugin"
    echo ""
    echo "Then add your user to the docker group:"
    echo "  sudo usermod -aG docker \$USER"
    echo ""
    echo "Log out and back in, then run this script again."
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo "❌ Docker daemon is not running"
    echo "Please start Docker:"
    echo "  sudo systemctl start docker"
    echo "  sudo systemctl enable docker"
    exit 1
fi

echo "🐳 Docker is available"

# Start PostgreSQL
echo ""
echo "🗄️  Starting PostgreSQL container..."
docker compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U ns_admin > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ PostgreSQL did not become ready in time"
        exit 1
    fi
    sleep 2
done

# Generate Prisma Client (in case it's missing)
echo ""
echo "🔧 Generating Prisma Client..."
pnpm db:generate

# Run migrations
echo ""
echo "📦 Running database migrations..."
pnpm db:migrate

# Seed database
echo ""
echo "🌱 Seeding database with initial data..."
pnpm db:seed

echo ""
echo "=========================================="
echo "  ✅ Setup Complete!"
echo "=========================================="
echo ""
echo "You can now start the development server with:"
echo "  pnpm dev"
echo ""
echo "Default login credentials:"
echo "  Admin:    admin@nairobisculpt.com / admin123"
echo "  Doctor:   angela@nairobisculpt.com / doctor123"
echo "  Nurse:    jane@nairobisculpt.com / nurse123"
echo "  Frontdesk: reception@nairobisculpt.com / frontdesk123"
echo ""
