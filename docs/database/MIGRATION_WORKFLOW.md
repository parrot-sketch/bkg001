# Database Migration Workflow

## Overview

This document outlines the proper workflow for handling database migrations in both **local (Docker)** and **production** environments.

## Important Principles

1. **Never modify production schema directly** - Always use migrations
2. **Test migrations locally first** - Always test in Docker before production
3. **Keep migrations reversible** - When possible, make migrations reversible
4. **Document breaking changes** - Clearly document any breaking changes
5. **Coordinate deployments** - Migrations must run before code deployment

---

## Migration Workflow

### Step 1: Local Development (Docker)

#### 1.1 Make Schema Changes

Edit `prisma/schema.prisma` with your changes:

```prisma
model Doctor {
  // ... existing fields
  years_of_experience Int?  // NEW FIELD
  consultation_types   String[]  // NEW FIELD
}
```

#### 1.2 Create Migration

```bash
# Create a new migration
npx prisma migrate dev --name add_doctor_experience_fields

# This will:
# - Create migration SQL file
# - Apply migration to local Docker database
# - Regenerate Prisma Client
```

#### 1.3 Verify Migration

```bash
# Check migration status
npx prisma migrate status

# View database in Prisma Studio
npx prisma studio

# Test your application locally
npm run dev
```

#### 1.4 Test Thoroughly

- Test all affected features
- Verify data integrity
- Check for breaking changes
- Test rollback if needed

---

### Step 2: Commit and Review

#### 2.1 Commit Migration Files

```bash
# Migration files are in prisma/migrations/
git add prisma/migrations/
git add prisma/schema.prisma
git commit -m "feat: add doctor experience and consultation types fields"
```

#### 2.2 Code Review Checklist

- [ ] Migration SQL is correct
- [ ] No data loss in migration
- [ ] Migration is reversible (if possible)
- [ ] Prisma Client regenerated
- [ ] Tests pass locally
- [ ] Documentation updated

---

### Step 3: Production Deployment

#### 3.1 Pre-Deployment Checklist

- [ ] All tests pass
- [ ] Migration tested in staging (if available)
- [ ] Backup production database
- [ ] Verify DATABASE_URL is correct
- [ ] Check migration status: `npx prisma migrate status`

#### 3.2 Deploy Migration

**⚠️ CRITICAL:** `migrate deploy` uses `DATABASE_URL` from your environment. If your `.env` points to local Docker, it will deploy to **local**, not production!

**Option A: Inline Environment Variable (Recommended for Manual)**

```bash
# Set DATABASE_URL inline - this ensures you target production
DATABASE_URL="postgresql://user:pass@prod-host:port/db?sslmode=require" \
  npx prisma migrate deploy

# Verify it worked
DATABASE_URL="postgresql://user:pass@prod-host:port/db?sslmode=require" \
  npx prisma migrate status
```

**Option B: Export Environment Variable**

```bash
# 1. Set production DATABASE_URL
export DATABASE_URL="postgresql://user:pass@prod-host:port/db?sslmode=require"

# 2. Deploy migrations
npx prisma migrate deploy

# 3. Verify
npx prisma migrate status

# 4. ⚠️ IMPORTANT: Unset when done to avoid accidents!
unset DATABASE_URL
```

**Option C: CI/CD Pipeline (Recommended for Automated)**

If your deployment pipeline includes migration step:

```bash
# In your CI/CD pipeline (GitHub Actions, Vercel, etc.)
# DATABASE_URL is set as a secret/environment variable
npx prisma migrate deploy
```

**See:** `docs/database/PRODUCTION_MIGRATION_GUIDE.md` for complete production migration guide

#### 3.3 Verify Production Migration

```bash
# Check migration status
npx prisma migrate status

# Should show all migrations as applied
```

#### 3.4 Deploy Application Code

**IMPORTANT:** Deploy application code AFTER migrations are applied.

```bash
# Your deployment process
npm run build
# Deploy to production
```

---

## Environment-Specific Commands

### Local Development (Docker)

```bash
# Start Docker database
docker-compose up -d

# Create and apply migration
npx prisma migrate dev --name migration_name

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# View database
npx prisma studio
```

### Production

```bash
# Deploy migrations (read-only, applies pending migrations)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Generate Prisma Client (if needed)
npx prisma generate
```

**Key Difference:**
- `migrate dev` - Creates migration AND applies it (development)
- `migrate deploy` - Only applies existing migrations (production)

---

## Common Scenarios

### Scenario 1: Adding New Fields

**Schema Change:**
```prisma
model Doctor {
  years_of_experience Int?
}
```

**Migration Generated:**
```sql
ALTER TABLE "Doctor" ADD COLUMN "years_of_experience" INTEGER;
```

**Workflow:**
1. Edit schema locally
2. Run `npx prisma migrate dev --name add_doctor_experience`
3. Test locally
4. Commit migration
5. Deploy to production with `npx prisma migrate deploy`

### Scenario 2: Adding New Models

**Schema Change:**
```prisma
model AvailabilityOverride {
  id         String   @id @default(uuid())
  doctor_id  String
  // ... fields
}
```

**Workflow:**
1. Edit schema locally
2. Run `npx prisma migrate dev --name add_availability_override`
3. Verify model in Prisma Studio
4. Test application
5. Commit migration
6. Deploy to production

### Scenario 3: Modifying Existing Fields

**Schema Change:**
```prisma
model Doctor {
  specialization String  // Changed from optional to required
}
```

**⚠️ WARNING:** This is a breaking change!

**Workflow:**
1. **First:** Make field optional and add default values
2. **Then:** Update existing data
3. **Finally:** Make field required
4. Test thoroughly
5. Document breaking change
6. Deploy with caution

### Scenario 4: Removing Fields

**⚠️ WARNING:** Data loss risk!

**Workflow:**
1. Verify field is not used in application
2. Create migration to remove column
3. Test thoroughly
4. Document data loss
5. Consider data export before removal

---

## Troubleshooting

### Migration Fails in Production

**Step 1: Don't Panic**
- Migrations are transactional (rollback on failure)
- Production database is safe

**Step 2: Check Error**
```bash
npx prisma migrate status
```

**Step 3: Common Issues**

1. **Migration already applied:**
   ```bash
   # Mark migration as applied (if safe)
   npx prisma migrate resolve --applied migration_name
   ```

2. **Database out of sync:**
   ```bash
   # Check current state
   npx prisma migrate status
   # Manually fix if needed
   ```

3. **Connection issues:**
   - Verify DATABASE_URL
   - Check network connectivity
   - Verify SSL settings

**Step 4: Rollback (if needed)**

Prisma doesn't have automatic rollback. You need to:
1. Create a new migration to reverse changes
2. Or manually fix the database
3. Document the issue

### Local Database Out of Sync

```bash
# Reset local database (WARNING: Deletes all data)
npx prisma migrate reset

# Or manually reset
docker-compose down -v
docker-compose up -d
npx prisma migrate dev
```

### Prisma Client Out of Sync

```bash
# Regenerate Prisma Client
npx prisma generate

# Clear cache and regenerate
rm -rf node_modules/.prisma
npx prisma generate
```

---

## Best Practices

### 1. Migration Naming

Use descriptive names:
```bash
# Good
npx prisma migrate dev --name add_doctor_experience_fields
npx prisma migrate dev --name add_availability_override_model

# Bad
npx prisma migrate dev --name update1
npx prisma migrate dev --name fix
```

### 2. Migration Size

Keep migrations small and focused:
- One logical change per migration
- Easier to review and rollback
- Faster to apply

### 3. Data Migrations

For data changes, use separate migrations:

```sql
-- Migration 1: Add column
ALTER TABLE "Doctor" ADD COLUMN "years_of_experience" INTEGER;

-- Migration 2: Populate data (separate migration)
UPDATE "Doctor" SET "years_of_experience" = 5 WHERE "years_of_experience" IS NULL;
```

### 4. Testing

Always test migrations:
- Test in local Docker first
- Test with production-like data
- Test rollback procedure
- Test application after migration

### 5. Documentation

Document:
- What the migration does
- Why it's needed
- Breaking changes
- Rollback procedure
- Dependencies

---

## Production Deployment Checklist

Before deploying migrations to production:

- [ ] Migration tested locally in Docker
- [ ] Migration tested with production-like data
- [ ] All tests pass
- [ ] Code review completed
- [ ] Production database backup created
- [ ] Migration SQL reviewed
- [ ] Breaking changes documented
- [ ] Rollback procedure documented
- [ ] Deployment window scheduled
- [ ] Team notified
- [ ] Monitoring in place

---

## Emergency Procedures

### If Migration Fails in Production

1. **Stop deployment** - Don't deploy code changes
2. **Check status** - `npx prisma migrate status`
3. **Review error** - Check logs and error message
4. **Assess impact** - Is database in valid state?
5. **Fix or rollback** - Create fix migration or rollback
6. **Document** - Document what happened and why

### If Application Breaks After Migration

1. **Check Prisma Client** - Regenerate if needed
2. **Check application logs** - Look for schema errors
3. **Verify migration** - Check migration was applied correctly
4. **Rollback code** - Deploy previous code version
5. **Fix migration** - Create new migration to fix issue

---

## Environment Variables

### Local Development

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/nairobi_sculpt?schema=public"
```

### Production

```env
DATABASE_URL="postgresql://user:password@prod-host:5432/dbname?schema=public&sslmode=require"
```

**Important:** Never commit production DATABASE_URL to git!

---

## Related Documentation

- [Database Setup Guide](./SETUP.md)
- [Schema Documentation](./SCHEMA_SUMMARY.md)
- [Production Setup](../setup/PRODUCTION.md)

---

**Last Updated:** 2024-12-19  
**Maintained By:** Development Team
