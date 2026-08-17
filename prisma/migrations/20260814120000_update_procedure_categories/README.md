# Production Deployment: Procedure Category Update

## Overview
This deployment updates the `ProcedureCategory` enum from 11 granular values to 5 broad categories and seeds the new procedure catalogue.

## Prerequisites
- `PROD_DIRECT_URL` must be set in `.env` (e.g., `postgresql://user:pass@prod-host:5432/dbname`)
- Database backup should be taken before running migrations
- All code changes should be deployed before running the migration

## Step 1: Verify Connection (Dry Run)

First, verify the script connects to the correct database:

```bash
npx tsx scripts/deploy-procedure-category-migration.ts --dry-run
```

This will show:
- Which database it's connected to
- Current enum values
- Current procedure counts by category
- No changes will be made

**Important:** The script explicitly overrides `DATABASE_URL` with `PROD_DIRECT_URL`, so it will connect to production even if your local `.env` has a different `DATABASE_URL`.

## Step 2: Apply Database Migration

Once you've confirmed the connection is correct:

```bash
npx tsx scripts/deploy-procedure-category-migration.ts
```

You will be prompted to type `yes` to confirm before any changes are made.

This script:
- Creates a new `ProcedureCategory_new` enum with the 5 new values
- Maps all existing procedure categories to the new structure
- Replaces the old enum type

## Step 3: Seed Production Procedure Catalogue

After the migration completes, seed the production database with the new procedure catalogue:

```bash
npx tsx prisma/seeds/surgical-procedures.prod.seed.ts
```

This will:
- Clear any existing procedure options
- Insert 75 procedures across 5 categories:
  - **Facial Procedures** (19)
  - **Body Procedures** (31)
  - **Breast Procedures** (7)
  - **Skin and Scar Treatments** (6)
  - **Non-Surgical Treatments** (12)

## Step 4: Verify Deployment

```bash
# Check procedure counts by category
node -e "
const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const count = await prisma.surgicalProcedureOption.count();
  const categories = await prisma.surgicalProcedureOption.groupBy({
    by: ['category'],
    _count: { category: true }
  });
  console.log('Total procedures:', count);
  categories.forEach(c => console.log(\`  \${c.category}: \${c._count.category}\`));
}
check().finally(() => prisma.\$disconnect());
"
```

## Category Mapping Reference

| Old Value | New Value |
|-----------|-----------|
| `FACE` | `FACIAL` |
| `FACE_AND_NECK` | `FACIAL` |
| `HAIR_RESTORATION` | `FACIAL` |
| `BODY` | `BODY` |
| `BODY_CONTOURING` | `BODY` |
| `INTIMATE_AESTHETIC` | `BODY` |
| `POST_WEIGHT_LOSS` | `BODY` |
| `BREAST` | `BREAST` |
| `RECONSTRUCTIVE` | `OTHER` |
| `NON_SURGICAL` | `NON_SURGICAL` |
| `OTHER` | `OTHER` |

## Safety Features

- **Dry-run mode**: Use `--dry-run` flag to preview changes without applying them
- **Database verification**: Script shows the connected database name before proceeding
- **Confirmation prompt**: Requires typing `yes` to confirm before making changes
- **Explicit connection**: Overrides `DATABASE_URL` with `PROD_DIRECT_URL` to ensure production connection

## Rollback Plan

If issues occur:
1. The migration is logged in `prisma/migrations/20260814120000_update_procedure_categories/`
2. To rollback manually, you would need to:
   - Create the old enum type
   - Convert data back
   - Drop the new enum type
3. Contact the development team for assistance

## Notes

- The `SurgicalCase.procedure_category` field is a nullable String, so it is not affected by this enum change
- Only `SurgicalProcedureOption.category` uses the `ProcedureCategory` enum
- The frontend forms, API routes, and seed files have all been updated to use the new 5-category structure
