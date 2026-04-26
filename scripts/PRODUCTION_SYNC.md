# Production Database Sync Guide

This repo contains scripts that were originally written for **demo seeding** (data-loss) and **production patching** (no data loss).

If your production database contains real client data, follow the **no data loss** runbook:

- `scripts/production/PRODUCTION_DB_RUNBOOK.md`

## Prerequisites

1. ✅ You've updated `.env` to point to the production database
2. ✅ You have network access to the production database
3. ✅ You have the necessary permissions to modify the production database

## Quick Sync (NO DATA LOSS — Recommended for real production)

Run the safe production patch runner:

```bash
pnpm tsx scripts/apply-production-migrations.ts
```

This will **not** truncate or seed data. It only applies explicit allowlisted idempotent patches required by the current release.

## Demo Sync (DATA LOSS — For fresh demo environments only)

### Option 1: Automated TypeScript Script (Handles Existing Database)

Run the baseline and sync script:

```bash
npm run db:sync:production
```

Or directly:

```bash
npx tsx scripts/baseline-and-sync-production.ts
```

### Option 2: Bash Script (Alternative)

```bash
bash scripts/baseline-production.sh
```

Both demo scripts will:
1. Generate Prisma Client
2. Handle existing database schema (baseline if needed)
3. Deploy all migrations
4. Verify database connection
5. Seed the database with test data
6. Verify the seeded data

## Manual Sync (Step by Step)

If you prefer to run each step manually:

### Step 1: Generate Prisma Client
```bash
npx prisma generate
```

### Step 2: Check Migration Status
```bash
npx prisma migrate status
```

This will show you which migrations are pending.

### Step 3: Deploy Migrations
```bash
npx prisma migrate deploy
```

This applies all pending migrations to production. **This is safe** - it only applies migrations that haven't been run yet.

### Step 4: Seed Database
```bash
npm run db:seed
```

This will:
- Clear existing data (TRUNCATE)
- Seed fresh test data including:
  - Clinic configuration
  - Theaters
  - Doctor profiles
  - Staff users (Admin, Frontdesk, Nurses)
  - Test patients
  - Consent templates
  - Services

### Step 5: Verify
```bash
npx prisma studio
```

Open Prisma Studio to verify the data was seeded correctly.

## Using the Package.json Scripts

### For New/Empty Database:
```bash
npm run db:setup:production
```
This runs: `prisma generate && prisma migrate deploy && npm run db:seed`

### For Existing Database (Recommended):
```bash
npm run db:sync:production
```
This handles baselining and syncing an existing production database.

## What Gets Seeded

The seed script creates:

- **1 Clinic**: Nairobi Sculpt Aesthetic Centre
- **3 Theaters**: Theater A (Major), Theater B (Minor), Procedure Room
- **Multiple Doctors**: Real doctor profiles from nairobisculpt.com
- **Staff Users**: 
  - Admin user
  - Frontdesk users
  - Nurse users
- **Test Patients**: Sample patients for testing
- **Consent Templates**: Pre-configured consent forms
- **Services**: Service price list

## Important Notes

⚠️ **Data Loss Warning**: The demo seed script uses `TRUNCATE` which will **delete all existing data**. Do not run on a production database that contains real client data.

⚠️ **Production Drift Warning**: If production has **no** `public._prisma_migrations` table, `prisma migrate deploy` is *not* safe to run without a verified baseline plan.

🔒 **Production Safety**: Always verify your `.env` file points to the correct database before running.

## Troubleshooting

### Error: "Environment variable not found: DATABASE_URL"
- Check that your `.env` file exists and contains `DATABASE_URL`
- Verify the connection string is correct

### Error: "P3005 - Database schema is not empty"
This means the database already has tables but no migration history. You need to baseline:

```bash
# Option 1: Use the baseline script
bash scripts/baseline-all-migrations.sh

# Option 2: Manual baseline (mark all migrations as applied)
for migration in $(ls -1 prisma/migrations | grep -E '^[0-9]' | sort); do
  npx prisma migrate resolve --applied "$migration"
done

# Then deploy any new migrations
npx prisma migrate deploy
```

### Error: "Migration failed"
- Check the migration logs for specific errors
- Ensure the database user has necessary permissions
- Verify the database is accessible

### Error: "Connection timeout"
- Check network connectivity to production database
- Verify firewall rules allow your IP
- Check database credentials

## After Sync

After successful sync, you should have:
- ✅ All migrations applied
- ✅ Fresh test data seeded
- ✅ Ready for demo

Test the application to ensure everything works:
- Login with seeded users
- View patients
- Check doctor schedules
- Test appointment booking
