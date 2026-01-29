# Seed File Safety Guide

**Last Updated:** January 23, 2025

---

## ⚠️ Important: Seed File Behavior

The seed file (`prisma/seed.ts`) **CLEARS ALL EXISTING DATA** before seeding new data.

This is intentional for development but **DANGEROUS in production**.

---

## 🛡️ Safety Features

### Production Protection

The seed file now includes safety checks:

1. **Production Block:** Seed will **FAIL** if run in production without explicit override
2. **Force Flag Required:** Must set `FORCE_CLEAR=true` to run in production
3. **Skip Clear Option:** Can add data without clearing using `SKIP_CLEAR=true`

### Environment Variables

| Variable | Purpose | Default | Production Safe? |
|----------|---------|---------|------------------|
| `NODE_ENV` | Environment detection | `development` | Auto-detected |
| `SKIP_CLEAR` | Skip data clearing | `false` | ✅ Safe |
| `FORCE_CLEAR` | Allow clearing in production | `false` | ⚠️ Dangerous |

---

## 📋 Usage Examples

### Development (Default Behavior)

```bash
# Clears all data and seeds fresh
npm run db:seed
```

**What happens:**
- ✅ Clears all existing data
- ✅ Seeds fresh test data
- ✅ Safe for development

---

### Development (Additive Seeding)

```bash
# Add data without clearing existing data
SKIP_CLEAR=true npm run db:seed
```

**What happens:**
- ✅ Keeps existing data
- ✅ Adds new seed data
- ✅ Useful for adding test patients without losing existing data

**Use cases:**
- Adding test data to existing database
- Testing with production-like data
- Incremental testing

---

### Production (Blocked by Default)

```bash
# This will FAIL in production
NODE_ENV=production npm run db:seed
```

**Error message:**
```
❌ ERROR: Cannot run seed in production without FORCE_CLEAR=true
   This is a safety measure to prevent accidental data deletion.
   If you really want to clear production data, set FORCE_CLEAR=true
```

---

### Production (Force Override - DANGEROUS)

```bash
# ⚠️ DANGER: This will DELETE ALL PRODUCTION DATA
NODE_ENV=production FORCE_CLEAR=true npm run db:seed
```

**What happens:**
- ⚠️ **DELETES ALL PRODUCTION DATA**
- ⚠️ Seeds fresh test data
- ⚠️ **IRREVERSIBLE**

**⚠️ WARNING:** Only use this if:
- You have a complete database backup
- You understand this will delete ALL patient records, appointments, consultations, etc.
- You have explicit approval from stakeholders
- You're setting up a fresh production environment

---

## 🔄 Alternative: Database Reset

For development, you can also use Prisma's built-in reset:

```bash
# Reset database (drops all tables, runs migrations, then seeds)
npm run db:reset
```

**What happens:**
- Drops all tables
- Runs all migrations
- Runs seed file
- **Also clears all data**

---

## 📊 What Gets Cleared

When seed runs (without `SKIP_CLEAR=true`), it deletes:

1. Notifications
2. Audit logs
3. Ratings
4. Patient bills
5. Payments
6. Services
7. Lab tests
8. Diagnoses
9. Vital signs
10. Medical records
11. Care notes
12. Nurse assignments
13. Consultations
14. Appointments
15. Working days
16. Refresh tokens
17. **Patients**
18. **Doctors**
19. **Users** (all roles)

**Order matters:** Deleted in reverse dependency order to avoid foreign key violations.

---

## ✅ Best Practices

### Development

1. **Use seed freely** - It's safe to reset dev data
2. **Use `SKIP_CLEAR=true`** when you want to add data incrementally
3. **Commit seed file changes** - Keep test data in sync with code

### Staging/QA

1. **Use `SKIP_CLEAR=true`** for additive seeding
2. **Backup before seeding** - Even in staging
3. **Test seed file** - Verify it works before running

### Production

1. **NEVER run seed in production** - Use migrations instead
2. **If absolutely necessary:**
   - Take full database backup
   - Get explicit approval
   - Use `FORCE_CLEAR=true`
   - Monitor closely
   - Have rollback plan ready

---

## 🔍 Verification

After seeding, verify:

```bash
# Check data was created
npm run db:studio

# Or query directly
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"User\";"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Patient\";"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Appointment\";"
```

---

## 🚨 Emergency: Restore from Backup

If you accidentally cleared production data:

1. **Stop the application immediately**
2. **Restore from latest backup:**
   ```bash
   # Example (adjust for your backup system)
   pg_restore -d $DATABASE_URL backup.dump
   ```
3. **Verify data integrity**
4. **Review audit logs** (if available)
5. **Document the incident**

---

## 📝 Seed File Structure

The seed file creates:

1. **Users:**
   - 1 Admin
   - 5 Doctors (Nairobi Sculpt surgeons)
   - 3 Nurses
   - 2 Frontdesk staff

2. **Patients:**
   - Sample patients from client data
   - **Test Patient** (TEST001) for consultation workflow testing

3. **Appointments:**
   - Various states (PENDING, SCHEDULED, COMPLETED)
   - Test appointments for Test Patient

4. **Supporting Data:**
   - Consultations
   - Nurse assignments
   - Care notes
   - Vital signs
   - Services
   - Audit logs
   - Notifications

---

## 🔐 Default Credentials

After seeding, you can login with:

- **Admin:** `admin@nairobisculpt.com` / `admin123`
- **Doctor:** `mukami.gathariki@nairobisculpt.com` / `doctor123`
- **Nurse:** `jane.wambui@nairobisculpt.com` / `nurse123`
- **Frontdesk:** `david.omondi@nairobisculpt.com` / `frontdesk123`
- **Test Patient:** `test.patient@test.com` / `patient123`

**⚠️ Change these in production!**

---

## 📚 Related Commands

```bash
# Seed database
npm run db:seed

# Reset database (drop, migrate, seed)
npm run db:reset

# Run migrations only
npm run db:migrate

# View database in Prisma Studio
npm run db:studio

# Generate Prisma client
npm run db:generate
```

---

## ✅ Checklist Before Seeding

- [ ] Verify you're in the correct environment
- [ ] Check `NODE_ENV` is set correctly
- [ ] If production: Have backup ready
- [ ] If production: Have `FORCE_CLEAR=true` set explicitly
- [ ] If adding data: Use `SKIP_CLEAR=true`
- [ ] Verify database connection is correct
- [ ] Review seed file changes (if any)

---

**Document Status:** Complete  
**Last Updated:** January 23, 2025
