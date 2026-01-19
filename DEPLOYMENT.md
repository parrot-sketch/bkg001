# Deployment Guide
## GitHub Repository Setup & Vercel Deployment

This guide will help you set up a fresh GitHub repository and deploy to Vercel.

---

## Step 1: Create New GitHub Repository

1. **Go to GitHub** and create a new repository:
   - Visit: https://github.com/new
   - Repository name: `fullstack-healthcare` (or your preferred name)
   - Description: "Production-grade healthcare management system with event-driven architecture"
   - Visibility: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)

2. **Copy the repository URL** (you'll need it in the next step)

---

## Step 2: Connect Local Repository to GitHub

Run these commands in your terminal:

```bash
# Navigate to project directory
cd /home/bkg/fullstack-healthcare

# Verify remote is removed (should show nothing)
git remote -v

# Add new GitHub remote (replace with your actual repo URL)
git remote add origin git@github.com:YOUR_USERNAME/fullstack-healthcare.git

# Or if using HTTPS:
# git remote add origin https://github.com/YOUR_USERNAME/fullstack-healthcare.git

# Verify remote is added
git remote -v

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Step 3: Environment Variables Setup

Before deploying to Vercel, you'll need to set up environment variables.

### Required Environment Variables

Create a `.env.example` file (already in .gitignore) or document these:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/healthcare_db"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-min-32-characters"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-characters"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email/Notifications (if using)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your-email@example.com"
SMTP_PASSWORD="your-password"
```

### For Vercel Deployment

You'll add these in the Vercel dashboard (see Step 4).

---

## Step 4: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. **Go to Vercel**: https://vercel.com/new
2. **Import your GitHub repository**:
   - Click "Import Project"
   - Select your GitHub repository
   - Authorize Vercel to access your GitHub if needed

3. **Configure Project**:
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

4. **Environment Variables**:
   - Add all required environment variables from Step 3
   - **Important**: Set `DATABASE_URL` to your production database
   - Set `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL

5. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from project root)
cd /home/bkg/fullstack-healthcare
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No (first time)
# - Project name? fullstack-healthcare
# - Directory? ./
# - Override settings? No

# For production deployment:
vercel --prod
```

---

## Step 5: Database Setup for Production

### Option A: Vercel Postgres (Recommended)

1. **Add Vercel Postgres**:
   - In Vercel dashboard, go to your project
   - Click "Storage" → "Create Database" → "Postgres"
   - Follow setup instructions

2. **Get Connection String**:
   - Copy the `POSTGRES_URL` from Vercel dashboard
   - Add it as `DATABASE_URL` in environment variables

3. **Run Migrations**:
   ```bash
   # Using Vercel CLI
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

### Option B: External PostgreSQL Database

1. **Use a service like**:
   - Supabase (free tier available)
   - Neon (free tier available)
   - Railway (free tier available)
   - AWS RDS
   - Heroku Postgres

2. **Get Connection String** and add as `DATABASE_URL`

3. **Run Migrations**:
   ```bash
   # Set DATABASE_URL in your environment
   export DATABASE_URL="your-production-database-url"
   npx prisma migrate deploy
   ```

---

## Step 6: Post-Deployment Checklist

- [ ] Environment variables configured in Vercel
- [ ] Database migrations run successfully
- [ ] Database seeded (if needed): `npx prisma db seed`
- [ ] Application accessible at Vercel URL
- [ ] Authentication working (test login)
- [ ] API endpoints responding correctly
- [ ] Database connections working

---

## Step 7: Continuous Deployment

Vercel automatically deploys on every push to `main` branch:

1. **Make changes locally**
2. **Commit and push**:
   ```bash
   git add .
   git commit -m "your changes"
   git push origin main
   ```
3. **Vercel automatically builds and deploys**

---

## Troubleshooting

### Build Fails

- Check build logs in Vercel dashboard
- Verify all environment variables are set
- Ensure `package.json` has correct build scripts
- Check for TypeScript errors: `npm run build` locally

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Check database allows connections from Vercel IPs
- Ensure database is accessible (not localhost)

### Environment Variables Not Working

- Restart deployment after adding env vars
- Check variable names match exactly (case-sensitive)
- Verify `NEXT_PUBLIC_*` prefix for client-side variables

### Migration Issues

- Run migrations manually: `npx prisma migrate deploy`
- Check Prisma schema is valid: `npx prisma validate`
- Verify database connection string

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)
- [Environment Variables in Vercel](https://vercel.com/docs/concepts/projects/environment-variables)

---

## Security Notes

1. **Never commit** `.env` files or secrets
2. **Use Vercel Environment Variables** for all secrets
3. **Rotate JWT secrets** regularly
4. **Use strong database passwords**
5. **Enable Vercel's security features** (DDoS protection, etc.)

---

**Ready to deploy!** 🚀
