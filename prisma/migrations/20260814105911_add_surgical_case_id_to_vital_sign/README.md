# Production Deployment: VitalSign Surgical Case ID

## Overview
Adds the `surgical_case_id` column to the `VitalSign` table in production.

## Prerequisites
- `PROD_DIRECT_URL` must be set in `.env`
- Database backup should be taken before running migrations

## Step 1: Verify Connection (Dry Run)

```bash
npx tsx scripts/deploy-vital-sign-surgical-case-migration.ts --dry-run
```

This will show:
- Which database it's connected to
- Whether the `surgical_case_id` column already exists
- No changes will be made

## Step 2: Apply Database Migration

```bash
npx tsx scripts/deploy-vital-sign-surgical-case-migration.ts
```

You will be prompted to type `yes` to confirm before any changes are made.

This script:
- Adds `surgical_case_id` column to `VitalSign`
- Creates an index on `surgical_case_id`
- Adds a foreign key constraint to `SurgicalCase`

## Notes
- This migration was already applied to the local database
- This script is specifically for applying it to production
- The `surgical_case_id` field is nullable, so existing vital signs are unaffected
