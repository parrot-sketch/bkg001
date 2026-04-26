# Production DB runbook (no data loss)

This system is deployed on Vercel and uses a hosted Aiven Postgres database.

**Important:** production currently does **not** have Prisma migration tracking (`public._prisma_migrations`). Do **not** run `prisma migrate deploy` against production unless you have a verified baseline strategy.

## Goal for this release

Enable Theater Tech “Upcoming Procedures → Create Surgical Case” by adding:

- `SurgicalCase.appointment_id` (nullable, unique)
- index + FK to `Appointment(id)`

Migration file (idempotent SQL):

- `prisma/migrations/20260426000000_link_surgical_case_to_appointment/migration.sql`

## 0) Backup first (Aiven)

Create a snapshot/backup in Aiven before any schema changes.

## 1) Audit (read-only)

```bash
set -a && source .env.production && set +a
psql "$DATABASE_URL" --no-psqlrc -X -v ON_ERROR_STOP=1 -P pager=off -f scripts/production/audit-production.sql
```

Proceed only if:
- `SurgicalCase.appointment_id` is missing (or present but missing FK/indexes you want)
- No duplicate `appointment_id` values exist in `SurgicalCase` (should be empty set)

## 2) Apply the idempotent patch

```bash
set -a && source .env.production && set +a
psql "$DATABASE_URL" --no-psqlrc -X -v ON_ERROR_STOP=1 -P pager=off \
  -f prisma/migrations/20260426000000_link_surgical_case_to_appointment/migration.sql
```

## 3) Verify

Re-run the audit (Step 1). Confirm:
- `appointment_id` column exists
- unique index exists
- FK `SurgicalCase_appointment_id_fkey` exists

## 4) Deploy the app

Deploy to Vercel after the DB patch is applied (otherwise the new API routes will error on missing column/relation).

## Notes / next hardening step

Because production has schema drift and no `_prisma_migrations`, the scalable fix is:
- create a staging database from a production snapshot
- generate and review a full drift diff (`prisma migrate diff --from-url ... --to-schema-datamodel prisma/schema.prisma --script`)
- apply changes deliberately in safe, reviewed, idempotent migrations (or formalize a baseline + migrate strategy)

