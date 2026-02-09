# Production Database Setup Guide
## Aiven PostgreSQL Database Configuration

This guide will help you connect your production Aiven database and seed it with initial data, especially doctors.

---

## Step 1: Get Your Aiven Database Credentials

From your Aiven dashboard, you need:

1. **Service URI** (full connection string) - Click "Reveal Password" to see it
2. **Host**: `pg-25182a71-mbuguamuiruri12-d78e.k.aivencloud.com`
3. **Port**: `22630`
4. **Database**: `defaultdb`
5. **User**: `avnadmin`
6. **Password**: (reveal in Aiven dashboard)
7. **SSL Mode**: `require`
8. **CA Certificate**: (download from Aiven dashboard)

---

## Step 2: Set Up Environment Variables

### Option A: Create `.env.production` file (for local testing)

```bash
# Create production environment file
cp .env .env.production
```

Add your Aiven connection string:

```env
# Aiven PostgreSQL Database
DATABASE_URL="postgresql://avnadmin:YOUR_PASSWORD@pg-25182a71-mbuguamuiruri12-d78e.k.aivencloud.com:22630/defaultdb?sslmode=require"

# JWT Secrets (generate strong random strings)
JWT_SECRET="your-super-secret-jwt-key-min-32-characters-long"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-characters-long"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Next.js
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

**Important:** Replace `YOUR_PASSWORD` with the actual password from Aiven dashboard.

### Option B: For Vercel Deployment

Add these as environment variables in Vercel dashboard:
- Go to your project → Settings → Environment Variables
- Add each variable individually

---

## Step 3: Download CA Certificate (Optional but Recommended)

1. In Aiven dashboard, find the **CA certificate** section
2. Click **"Show"** or **"Download"** to get the certificate
3. Save it as `ca-certificate.crt` in your project root (or a secure location)

**Note:** For most connections, SSL mode `require` is sufficient without the CA cert file.

---

## Step 4: Test Database Connection

```bash
# Test connection (using psql if installed)
psql "postgresql://avnadmin:YOUR_PASSWORD@pg-25182a71-mbuguamuiruri12-d78e.k.aivencloud.com:22630/defaultdb?sslmode=require"

# Or test with Prisma
DATABASE_URL="postgresql://avnadmin:YOUR_PASSWORD@pg-25182a71-mbuguamuiruri12-d78e.k.aivencloud.com:22630/defaultdb?sslmode=require" npx prisma db pull
```

---

## Step 5: Run Database Migrations

**Important:** Run migrations BEFORE seeding to create all tables.

```bash
# Set your DATABASE_URL
export DATABASE_URL="postgres://avnadmin:YOUR_PASSWORD_HERE@pg-25182a71-mbuguamuiruri12-d78e.k.aivencloud.com:22630/defaultdb?sslmode=require&connection_limit=3&pool_timeout=10"

# Generate Prisma Client
npx prisma generate

# Run migrations (this creates all tables)
npx prisma migrate deploy
```

**Note:** `migrate deploy` is for production (doesn't create new migration files).  
Use `migrate dev` only for development.

---

## Step 6: Seed the Database

The seed script includes:
- ✅ **5 Doctors** (Nairobi Sculpt surgeons) - **CRITICAL for system to work**
- ✅ Admin user
- ✅ Nurses
- ✅ Frontdesk staff
- ✅ Sample patients
- ✅ Sample appointments
- ✅ Services
- ✅ Working days for doctors

### Run Seed Script

```bash
# Make sure DATABASE_URL is set
export DATABASE_URL="postgresql://avnadmin:YOUR_PASSWORD@pg-25182a71-mbuguamuiruri12-d78e.k.aivencloud.com:22630/defaultdb?sslmode=require&connection_limit=3&pool_timeout=10"

# Run seed
npm run db:seed
# or
npx tsx prisma/seed.ts
```

### Expected Output

```
🌱 Starting database seed...

🧹 Clearing existing data...
✅ Cleared existing data

👥 Creating users...
  ✓ Created admin: admin@nairobisculpt.com
  ✓ Created doctor: Dr. Mukami Gathariki
  ✓ Created doctor: Dr. Ken Aluora
  ✓ Created doctor: Dr. John Paul Ogalo
  ✓ Created doctor: Dr. Angela Muoki
  ✓ Created doctor: Dr. Dorsi Jowi
  ✓ Created nurse: Jane Wambui
  ✓ Created nurse: Lucy Akinyi
  ✓ Created nurse: Esther Muthoni
  ✓ Created frontdesk: David Omondi
  ✓ Created frontdesk: Susan Chebet
✅ Created 11 users

🏥 Creating patients...
✅ Created 5 patients

📅 Creating appointments...
✅ Created 20 appointments

💬 Creating consultations...
✅ Created 5 consultations

🏥 Creating pre/post-op workflows...
✅ Created pre/post-op workflows

📊 Creating vital signs records...
✅ Created vital signs records

💼 Creating services...
✅ Created 8 services

📝 Creating audit logs...
✅ Created audit logs

🔔 Creating notifications...
✅ Created notifications

🎉 Database seeding completed successfully!

📊 Summary:
  - Users: 11
  - Doctors: 5
  - Nurses: 3
  - Frontdesk: 2
  - Patients: 5
  - Appointments: 20
  - Services: 8

🔑 Default Passwords:
  - Admin: admin123
  - Doctor: doctor123
  - Nurse: nurse123
  - Frontdesk: frontdesk123
```

---

## Step 7: Verify Doctors Were Created

```bash
# Connect to database and verify
DATABASE_URL="postgresql://avnadmin:YOUR_PASSWORD@pg-25182a71-mbuguamuiruri12-d78e.k.aivencloud.com:22630/defaultdb?sslmode=require" npx prisma studio
```

Or use a SQL query:

```sql
SELECT 
  d.id,
  d.name,
  d.email,
  d.specialization,
  d.onboarding_status,
  u.status as user_status
FROM "Doctor" d
JOIN "User" u ON d.user_id = u.id
ORDER BY d.name;
```

You should see 5 doctors, all with `onboarding_status = 'ACTIVE'`.

---

## Step 8: Update Default Passwords (Security)

**⚠️ IMPORTANT:** Change default passwords before going to production!

```bash
# Connect to database
DATABASE_URL="postgresql://avnadmin:YOUR_PASSWORD@pg-25182a71-mbuguamuiruri12-d78e.k.aivencloud.com:22630/defaultdb?sslmode=require" npx prisma studio
```

Or create a script to update passwords:

```typescript
// scripts/update-passwords.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function updatePasswords() {
  const newAdminPassword = await bcrypt.hash('NEW_ADMIN_PASSWORD', 10);
  const newDoctorPassword = await bcrypt.hash('NEW_DOCTOR_PASSWORD', 10);
  
  // Update admin
  await prisma.user.updateMany({
    where: { email: 'admin@nairobisculpt.com' },
    data: { password_hash: newAdminPassword },
  });
  
  // Update all doctors
  const doctors = await prisma.doctor.findMany();
  for (const doctor of doctors) {
    await prisma.user.update({
      where: { id: doctor.user_id },
      data: { password_hash: newDoctorPassword },
    });
  }
  
  console.log('✅ Passwords updated');
}

updatePasswords();
```

---

## Troubleshooting

### Connection Issues

**Error: "Connection refused"**
- Check if Aiven service is running (should show "Running" in dashboard)
- Verify host, port, and database name
- Check IP allowlist (should be "Open to all" or include your IP)

**Error: "SSL connection required"**
- Ensure `?sslmode=require` is in connection string
- For stricter SSL, download CA certificate and use `?sslmode=verify-full&sslcert=ca-certificate.crt`

**Error: "Authentication failed"**
- Verify password (click "Reveal Password" in Aiven dashboard)
- Check username is `avnadmin`

### Migration Issues

**Error: "Migration failed"**
- Ensure database is empty or use `--force` flag carefully
- Check Prisma schema matches migrations
- Verify connection string is correct

**Error: "Table already exists"**
- Database may already have tables
- Use `prisma migrate reset --force` (⚠️ DELETES ALL DATA) or manually drop tables

### Seeding Issues

**Error: "Foreign key constraint"**
- Ensure migrations ran successfully first
- Check seed script order (users before doctors, etc.)

**Error: "Doctor creation failed"**
- Verify User is created first
- Check `user_id` matches
- Ensure `onboarding_status` is set correctly

---

## Quick Setup Script

Save this as `setup-production-db.sh`:

```bash
#!/bin/bash

# Production Database Setup Script
# Usage: ./setup-production-db.sh

set -e

echo "🚀 Production Database Setup"
echo "============================"
echo ""

# Get database URL
read -p "Enter your Aiven DATABASE_URL: " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL is required"
  exit 1
fi

export DATABASE_URL

echo ""
echo "📦 Generating Prisma Client..."
npx prisma generate

echo ""
echo "🔄 Running migrations..."
npx prisma migrate deploy

echo ""
echo "🌱 Seeding database..."
npm run db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 Verify doctors were created:"
echo "   DATABASE_URL=\"$DATABASE_URL\" npx prisma studio"
```

Make it executable:
```bash
chmod +x setup-production-db.sh
```

Run it:
```bash
./setup-production-db.sh
```

---

## For Vercel Deployment

1. **Add DATABASE_URL in Vercel:**
   - Go to Project → Settings → Environment Variables
   - Add: `DATABASE_URL` = your Aiven connection string
   - Mark as "Production", "Preview", and "Development"

2. **Add Build Command:**
   - Vercel will auto-detect Next.js
   - Ensure build command includes: `prisma generate`

3. **Run Migrations on Deploy:**
   - Add to `package.json`:
   ```json
   "postinstall": "prisma generate"
   ```
   - Or use Vercel's build command: `prisma generate && next build`

4. **Seed After First Deploy:**
   - Connect to Vercel's environment
   - Run seed script manually or via Vercel CLI

---

## Security Checklist

- [ ] Default passwords changed
- [ ] DATABASE_URL stored securely (not in code)
- [ ] SSL connection enabled (`sslmode=require`)
- [ ] IP allowlist configured (if needed)
- [ ] Database backups enabled in Aiven
- [ ] Environment variables secured in Vercel
- [ ] JWT secrets are strong and unique

---

**Your production database is now ready!** 🎉

The system has 5 active doctors and is ready for use.





