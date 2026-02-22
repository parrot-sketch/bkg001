# Quick Production Database Sync

## 🚀 One-Command Sync (Recommended)

Since your production database already has a schema, run:

```bash
npm run db:sync:production
```

This will:
1. ✅ Generate Prisma Client
2. ✅ Baseline existing migrations (mark as applied)
3. ✅ Deploy any new migrations
4. ✅ Seed test data

## 📋 What Happens

1. **Baseline**: Marks all existing migrations as "applied" (since your DB already has the schema)
2. **Deploy**: Applies any new migrations that don't exist yet
3. **Seed**: Clears all data and seeds fresh test data for your demo

## ⚠️ Important

- **Data Loss**: The seed script will DELETE all existing data
- **Verify .env**: Make sure `DATABASE_URL` points to production
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
