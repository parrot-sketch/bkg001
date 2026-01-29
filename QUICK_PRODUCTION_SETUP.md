# Quick Production Database Setup

## 🚀 Quick Start

Your production database needs migrations and seed data. Here's how to set it up:

### Option 1: Using the Setup Script (Recommended)

```bash
# Set your production DATABASE_URL from Vercel/Aiven
export DATABASE_URL="postgresql://avnadmin:YOUR_PASSWORD@pg-25182a71-mbuguamuiruri12-d78e.k.aivencloud.com:22630/defaultdb?sslmode=require"

# Run the setup script
./scripts/setup-production-db.sh
```

### Option 2: Manual Steps

```bash
# 1. Set DATABASE_URL
export DATABASE_URL="postgres://avnadmin:YOUR_PASSWORD_HERE@pg-25182a71-mbuguamuiruri12-d78e.k.aivencloud.com:22630/defaultdb?sslmode=require"

# 2. Generate Prisma Client
npx prisma generate

# 3. Apply migrations (creates all tables)
npx prisma migrate deploy

# 4. Seed database (creates doctors, users, sample data)
npm run db:seed
```

### Option 3: Using npm Script

```bash
export DATABASE_URL="your-production-connection-string"
npm run db:setup:production
```

## 📋 What Gets Created

The seed script creates:
- ✅ **5 Doctors** (Nairobi Sculpt surgeons) - **REQUIRED for system to work**
- ✅ Admin user
- ✅ 3 Nurses
- ✅ 2 Frontdesk staff
- ✅ Sample patients
- ✅ Sample appointments
- ✅ Services
- ✅ Working days for doctors

## 🔑 Default Login Credentials

After seeding, you can log in with:

- **Admin**: `admin@nairobisculpt.com` / `admin123`
- **Doctor**: `mukami.gathariki@nairobisculpt.com` / `doctor123`
- **Nurse**: `jane.wambui@nairobisculpt.com` / `nurse123`
- **Frontdesk**: `david.omondi@nairobisculpt.com` / `frontdesk123`

**⚠️ IMPORTANT**: Change these passwords in production!

## 🔍 Verify Setup

```bash
# Open Prisma Studio to view data
DATABASE_URL="your-connection-string" npx prisma studio
```

Or check via SQL:
```sql
SELECT COUNT(*) FROM "Doctor";  -- Should return 5
SELECT COUNT(*) FROM "User";    -- Should return 11+
```

## 🐛 Troubleshooting

### Error: "Migration failed"
- Ensure DATABASE_URL is correct
- Check Aiven service is running
- Verify SSL mode is set: `?sslmode=require`

### Error: "Table already exists"
- Database may have partial migrations
- Run: `npx prisma migrate resolve --applied <migration-name>`
- Or reset (⚠️ deletes data): `npx prisma migrate reset --force`

### Error: "Foreign key constraint"
- Ensure migrations completed successfully first
- Check seed script ran in correct order

## 📝 Next Steps

1. ✅ Run migrations and seed (you're here!)
2. ✅ Verify doctors were created
3. ✅ Test login with default credentials
4. ⚠️ Change default passwords
5. ✅ Configure Vercel environment variables (if not done)
6. ✅ Test the deployed application

## 🔗 Related Documentation

- Full setup guide: `PRODUCTION_DB_SETUP.md`
- Database schema: `docs/database/README.md`
- Seed script: `prisma/seed.ts`
