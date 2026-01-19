# Database Setup Guide

## Quick Start

### 1. Start Database

```bash
# Start PostgreSQL in Docker
npm run docker:up

# Or manually
docker-compose up -d
```

### 2. Run Migrations

```bash
# Generate Prisma Client and apply migrations
npm run db:migrate
```

### 3. Seed Database

```bash
# Seed with realistic data
npm run db:seed
```

### 4. Verify

```bash
# Open Prisma Studio to view data
npm run db:studio
```

## Detailed Setup

### Prerequisites

- Docker and Docker Compose
- Node.js 18+
- npm or yarn

### Step-by-Step Setup

1. **Create `.env` file** (if not exists):
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/nairobi_sculpt?schema=public"
   ```
   
   **Note**: We use port `5433` to avoid conflicts with existing PostgreSQL containers (e.g., `ehr-postgres` on port 5432).

2. **Start Docker container**:
   ```bash
   docker-compose up -d
   ```

3. **Wait for database to be ready** (check logs):
   ```bash
   docker-compose logs postgres
   ```

4. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

5. **Run migrations**:
   ```bash
   npx prisma migrate dev
   ```

6. **Seed database**:
   ```bash
   npm run db:seed
   ```

## Database Access

### Via Prisma Studio (Recommended)

```bash
npm run db:studio
```

Opens GUI at `http://localhost:5555`

### Via psql

```bash
docker exec -it nairobi-sculpt-db psql -U postgres -d nairobi_sculpt
```

### Connection String

```
postgresql://postgres:postgres@localhost:5433/nairobi_sculpt
```

**Note**: Port `5433` is used instead of `5432` to avoid conflicts with other PostgreSQL containers.

## Troubleshooting

### Database won't start

```bash
# Check if port 5432 is in use
lsof -i :5432

# Stop existing PostgreSQL if needed
sudo service postgresql stop
```

### Migration errors

```bash
# Reset database (WARNING: Deletes all data)
npm run db:reset

# Then re-run migrations
npm run db:migrate
```

### Seed script errors

```bash
# Check Prisma Client is generated
npx prisma generate

# Verify schema is valid
npx prisma validate
```

## Production Setup

1. **Use strong passwords** in `.env`
2. **Enable SSL** in DATABASE_URL
3. **Set up backups**
4. **Configure connection pooling**
5. **Monitor database performance**
