# Quick Start: Aiven Database Setup

## Your Aiven Database Details

- **Host**: `pg-25182a71-mbuguamuiruri12-d78e.k.aivencloud.com`
- **Port**: `22630`
- **Database**: `defaultdb`
- **User**: `avnadmin`
- **Password**: [Reveal in Aiven dashboard]
- **SSL Mode**: `require`

---

## Step 1: Get Your Connection String

1. Go to your Aiven dashboard
2. Click **"Reveal Password"** next to the Service URI
3. Copy the full connection string

It should look like:
```
postgresql://avnadmin:YOUR_PASSWORD@pg-25182a71-mbuguamuiruri12-d78e.k.aivencloud.com:22630/defaultdb?sslmode=require
```

---

## Step 2: Run Setup Script (Easiest Method)

```bash
# Replace YOUR_PASSWORD with the actual password from Aiven
./setup-production-db.sh "postgresql://avnadmin:YOUR_PASSWORD@pg-25182a71-mbuguamuiruri12-d78e.k.aivencloud.com:22630/defaultdb?sslmode=require"
```

This will:
1. ✅ Generate Prisma Client
2. ✅ Run all migrations (create tables)
3. ✅ Seed database with 5 doctors + all initial data

---

## Step 3: Manual Setup (Alternative)

If you prefer to run commands manually:

```bash
# 1. Set your database URL
export DATABASE_URL="postgresql://avnadmin:YOUR_PASSWORD@pg-25182a71-mbuguamuiruri12-d78e.k.aivencloud.com:22630/defaultdb?sslmode=require"

# 2. Generate Prisma Client
npx prisma generate

# 3. Run migrations (create all tables)
npx prisma migrate deploy

# 4. Seed the database (creates doctors, patients, etc.)
npm run db:seed
```

---

## Step 4: Verify Doctors Were Created

```bash
# Open Prisma Studio to view data
DATABASE_URL="postgresql://avnadmin:YOUR_PASSWORD@pg-25182a71-mbuguamuiruri12-d78e.k.aivencloud.com:22630/defaultdb?sslmode=require" npx prisma studio
```

Or check via SQL:
```sql
SELECT name, email, specialization, onboarding_status 
FROM "Doctor" 
ORDER BY name;
```

You should see 5 doctors:
- Dr. Mukami Gathariki
- Dr. Ken Aluora
- Dr. John Paul Ogalo
- Dr. Angela Muoki
- Dr. Dorsi Jowi

All with `onboarding_status = 'ACTIVE'` ✅

---

## Step 5: Default Login Credentials

After seeding, you can login with:

**Admin:**
- Email: `admin@nairobisculpt.com`
- Password: `admin123`

**Doctors:**
- Email: `mukami.gathariki@nairobisculpt.com` (or any doctor email)
- Password: `doctor123`

**⚠️ IMPORTANT:** Change these passwords before production!

---

## Step 6: For Vercel Deployment

1. **Add Environment Variable in Vercel:**
   - Go to: Project → Settings → Environment Variables
   - Add: `DATABASE_URL` = your full Aiven connection string
   - Mark for: Production, Preview, Development

2. **Vercel will automatically:**
   - Run `prisma generate` during build
   - Connect to your Aiven database

3. **After first deploy, seed the database:**
   ```bash
   # Using Vercel CLI
   vercel env pull .env.local
   npm run db:seed
   ```

---

## Troubleshooting

**Connection fails?**
- ✅ Verify password is correct (reveal in Aiven dashboard)
- ✅ Check service is "Running" in Aiven dashboard
- ✅ Ensure `sslmode=require` is in connection string

**Migrations fail?**
- ✅ Make sure database is empty or use `--force` carefully
- ✅ Check Prisma schema is up to date

**Seed fails?**
- ✅ Ensure migrations completed successfully first
- ✅ Check all tables exist: `npx prisma db pull`

---

## What Gets Seeded

✅ **5 Doctors** (Nairobi Sculpt surgeons) - **CRITICAL**
✅ 1 Admin user
✅ 3 Nurses
✅ 2 Frontdesk staff
✅ 5 Sample patients
✅ 20 Sample appointments
✅ 8 Services
✅ Working days for all doctors (Mon-Fri, 9 AM - 5 PM)

---

**That's it! Your production database is ready.** 🎉

For detailed instructions, see `PRODUCTION_DB_SETUP.md`
