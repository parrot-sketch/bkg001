# Running Migrations with Docker Database

## Current Setup

**Database:** Running in Docker container `nairobi-sculpt-db`  
**Port Mapping:** `localhost:5433` (host) → `5432` (container)  
**Database Name:** `nairobi_sculpt`  
**Status:** ✅ Container is running and healthy

## Migration Process

### ❌ Do NOT run migrations inside Docker

**Wrong:**
```bash
docker exec -it nairobi-sculpt-db prisma migrate dev  # ❌ Don't do this
```

### ✅ Run migrations from your local machine

**Correct:**
```bash
# From your project root
npm run db:migrate

# Or directly
npx prisma migrate dev --name add_patient_file_number_and_fields
```

## Why This Works

1. **Docker exposes port 5433** on your host machine
2. **Prisma reads `DATABASE_URL`** from your `.env` file
3. **DATABASE_URL** points to `localhost:5433` (the Docker container)
4. **Prisma connects** from your local machine to the Docker database
5. **Migrations run** and modify the database inside Docker

## Environment Variable

Your `.env` file should have:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/nairobi_sculpt?schema=public"
```

**Note:** Port `5433` on host → maps to `5432` inside Docker container.

## Complete Migration Workflow

### 1. Ensure Docker is Running

```bash
# Check container status
docker ps | grep nairobi-sculpt-db

# Start if not running
npm run docker:up
# or
docker-compose up -d
```

### 2. Verify Database Connection

```bash
# Check migration status
npx prisma migrate status
```

### 3. Create and Apply Migration

```bash
# Create migration for schema changes
npx prisma migrate dev --name add_patient_file_number_and_fields
```

This will:
- Generate migration SQL file
- Apply migration to Docker database
- Generate Prisma Client with new schema

### 4. Verify Migration

```bash
# Check status
npx prisma migrate status

# Or view in Prisma Studio
npm run db:studio
```

## When to Run Migrations

**Run migrations after:**
- Adding new fields to schema
- Modifying existing fields
- Changing relationships
- Creating new models

**Run from:** Your local machine (not inside Docker)

## Troubleshooting

### If migration fails:

1. **Check Docker container is running:**
   ```bash
   docker ps | grep nairobi-sculpt-db
   ```

2. **Check DATABASE_URL:**
   ```bash
   echo $DATABASE_URL
   # Should be: postgresql://postgres:postgres@localhost:5433/nairobi_sculpt
   ```

3. **Check database connection:**
   ```bash
   npx prisma db pull  # Should connect successfully
   ```

4. **View Docker logs:**
   ```bash
   npm run docker:logs
   # or
   docker-compose logs postgres
   ```

### Common Issues

**Port conflict:**
- If port 5433 is in use, change `DB_PORT` in `.env` and `docker-compose.yml`

**Connection refused:**
- Ensure Docker container is running: `docker ps`
- Check DATABASE_URL matches Docker port mapping

**Migration already applied:**
- If schema changes are detected but migration says "up to date", use `prisma migrate dev --create-only` to create migration manually
