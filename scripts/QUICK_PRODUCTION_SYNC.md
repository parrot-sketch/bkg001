# Quick Production Database Sync

## ✅ One-command patch (NO DATA LOSS — recommended for real production)

```bash
pnpm tsx scripts/apply-production-migrations.ts
```

This will:
1. ✅ Generate Prisma Client
2. ✅ Run read-only safety checks
3. ✅ Apply only allowlisted idempotent SQL patches (no truncation, no seeding)

## 🚫 Demo scripts (DATA LOSS — do not use on client data)

These are only for fresh demo environments:
- `npm run db:sync:production`
- `npm run db:reset:production`

## ⚠️ Important

- **Data Loss**: demo scripts will DELETE all existing data
- **Verify**: make sure `.env.production` points to the correct database
- **Network**: Ensure you have access to the production database

## 🔧 Alternative: Manual Steps

If the automated script fails, run these manually:

```bash
# 1. Generate Prisma Client
npx prisma generate

# 2. Baseline all migrations (mark as applied)
bash scripts/baseline-all-migrations.sh

# 3. Deploy any new migrations
npx prisma migrate deploy

# 4. Seed database
npm run db:seed
```

## ✅ Verification

After sync, verify with:

```bash
npx prisma studio
```

You should see:
- Users (admin, frontdesk, nurses, doctors)
- Patients (test data)
- Doctors (real profiles)
- Theaters (3 theaters)
- Clinic (Nairobi Sculpt)

## 🎯 Demo Ready Checklist

- [ ] Database synced (`npm run db:sync:production`)
- [ ] Test users can login
- [ ] Patients visible
- [ ] Doctor schedules configured
- [ ] Appointments can be booked
