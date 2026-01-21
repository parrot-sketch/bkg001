# Environment Variables Guide

## Required vs Optional Variables

### 🔴 REQUIRED (Must Set)

These variables are **required** for the application to work:

1. **`DATABASE_URL`** - PostgreSQL connection string
2. **`JWT_SECRET`** - Secret for signing JWT access tokens
3. **`JWT_REFRESH_SECRET`** - Secret for signing JWT refresh tokens
4. **`NEXT_PUBLIC_APP_URL`** - Your application URL (for production)

### 🟡 OPTIONAL (Nice to Have)

These variables have defaults but should be set for production:

1. **`NEXT_PUBLIC_API_URL`** - API base URL (defaults to `/api`)
2. **`NODE_ENV`** - Environment mode (defaults to `development`)

### 🟢 OPTIONAL (Feature-Specific)

These are only needed if using specific features:

1. **Cloudinary variables** - Only if uploading images programmatically
2. **Email notification variables** - Required for production email notifications
   - `RESEND_API_KEY` - Resend API key (recommended)
   - `EMAIL_FROM` or `RESEND_FROM_EMAIL` - Sender email address
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - SMTP fallback (if not using Resend)
3. **Docker variables** - Only if using Docker Compose locally

---

## Quick Setup

### 1. Copy Example File

```bash
cp .env.example .env
```

### 2. Fill in Required Values

Edit `.env` and set:

```env
# Database (from Aiven)
DATABASE_URL="postgresql://avnadmin:YOUR_PASSWORD@pg-25182a71-mbuguamuiruri12-d78e.k.aivencloud.com:22630/defaultdb?sslmode=require"

# JWT Secrets (generate strong random strings)
JWT_SECRET="your-strong-secret-here-min-32-chars"
JWT_REFRESH_SECRET="your-strong-refresh-secret-here-min-32-chars"

# App URL
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

### 3. Generate Strong Secrets

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate JWT_REFRESH_SECRET (different from above)
openssl rand -base64 32
```

---

## Variable Descriptions

### DATABASE_URL

**Type:** String (PostgreSQL connection string)  
**Required:** ✅ Yes  
**Example:**
```env
DATABASE_URL="postgresql://avnadmin:password@host:port/database?sslmode=require"
```

**For Aiven:**
- Get from Aiven dashboard → Service URI
- Click "Reveal Password" to see full connection string
- Format: `postgresql://avnadmin:PASSWORD@HOST:PORT/DATABASE?sslmode=require`

**For Local Development:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/nairobi_sculpt?schema=public"
```

---

### JWT_SECRET

**Type:** String (minimum 32 characters)  
**Required:** ✅ Yes  
**Purpose:** Secret key for signing JWT access tokens  
**Security:** Must be strong and unique

**Generate:**
```bash
openssl rand -base64 32
```

**Example:**
```env
JWT_SECRET="aB3dEf9gHiJkLmNoPqRsTuVwXyZ1234567890abcdefghijklmnop"
```

---

### JWT_REFRESH_SECRET

**Type:** String (minimum 32 characters)  
**Required:** ✅ Yes  
**Purpose:** Secret key for signing JWT refresh tokens  
**Security:** Must be different from `JWT_SECRET` and strong

**Generate:**
```bash
openssl rand -base64 32
```

**Example:**
```env
JWT_REFRESH_SECRET="xYz987AbC654DeF321GhI012JkL345MnO678PqR901StU234VwX"
```

---

### NEXT_PUBLIC_APP_URL

**Type:** String (URL)  
**Required:** ✅ Yes (for production)  
**Purpose:** Base URL of your application (used for email links, redirects)

**For Production:**
```env
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

**For Local Development:**
```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Note:** `NEXT_PUBLIC_*` variables are exposed to the browser.

---

### NEXT_PUBLIC_API_URL

**Type:** String (URL)  
**Required:** ❌ No (defaults to `/api`)  
**Purpose:** Base URL for API requests

**Default:** `/api` (relative URL, works automatically)

**Only set if:**
- Using a separate API server
- Using a different API path

**Example:**
```env
NEXT_PUBLIC_API_URL="https://api.yourdomain.com"
```

---

### NODE_ENV

**Type:** String (`development` | `production` | `test`)  
**Required:** ❌ No (defaults to `development`)  
**Purpose:** Environment mode

**Values:**
- `development` - Local development
- `production` - Production deployment
- `test` - Running tests

**Example:**
```env
NODE_ENV="production"
```

---

### Cloudinary Variables (Optional)

**Only needed if:** Uploading images programmatically via script

```env
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

**Get from:** Cloudinary Dashboard → Settings → Product Environment Credentials

**Note:** If uploading via Cloudinary dashboard, you don't need these.

---

### SMTP Variables (Optional)

**Only needed if:** Implementing email notifications

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="noreply@nairobisculpt.com"
```

**Currently:** Not implemented (future feature)

---

## Environment-Specific Configuration

### Local Development

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/nairobi_sculpt?schema=public"
JWT_SECRET="dev-secret-change-in-production"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### Production (Vercel)

Set these in **Vercel Dashboard → Project → Settings → Environment Variables**:

```env
DATABASE_URL="postgresql://avnadmin:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
JWT_SECRET="strong-production-secret-min-32-chars"
JWT_REFRESH_SECRET="strong-production-refresh-secret-min-32-chars"
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
NODE_ENV="production"
```

**Important:** 
- Mark variables for **Production**, **Preview**, and **Development** as needed
- Never commit production secrets to git
- Use Vercel's environment variable encryption

---

## Security Best Practices

### ✅ DO:

1. **Use strong secrets** (minimum 32 characters, random)
2. **Use different secrets** for development and production
3. **Rotate secrets regularly** (especially if compromised)
4. **Store secrets securely** (Vercel Environment Variables, not in code)
5. **Never commit `.env`** (already in `.gitignore`)
6. **Use HTTPS** in production URLs

### ❌ DON'T:

1. **Don't use weak secrets** (like "password123")
2. **Don't reuse secrets** across environments
3. **Don't commit secrets** to git
4. **Don't share secrets** in plain text
5. **Don't use default values** in production
6. **Don't expose secrets** in client-side code (except `NEXT_PUBLIC_*`)

---

## Verification

### Check if variables are set:

```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Check JWT_SECRET (be careful - don't expose in production)
echo $JWT_SECRET | wc -c  # Should be at least 32 characters
```

### Test database connection:

```bash
# Using Prisma
npx prisma db pull

# Using psql
psql "$DATABASE_URL"
```

### Test JWT configuration:

The app will fail to start if JWT secrets are missing or invalid.

---

## Troubleshooting

### "JWT secret is required" error

- ✅ Check `JWT_SECRET` is set in `.env`
- ✅ Check `JWT_REFRESH_SECRET` is set in `.env`
- ✅ Restart development server after adding variables

### Database connection fails

- ✅ Check `DATABASE_URL` is correct
- ✅ Verify database is accessible (not blocked by firewall)
- ✅ Check SSL mode is correct (`sslmode=require` for Aiven)
- ✅ Verify password is correct (reveal in Aiven dashboard)

### Images not loading

- ✅ Check `next.config.mjs` has Cloudinary hostname
- ✅ Verify image URLs are correct
- ✅ Check Cloudinary account is active

---

## Quick Reference

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | ✅ Yes | - | PostgreSQL connection |
| `JWT_SECRET` | ✅ Yes | - | JWT access token secret |
| `JWT_REFRESH_SECRET` | ✅ Yes | - | JWT refresh token secret |
| `NEXT_PUBLIC_APP_URL` | ✅ Yes | - | Application base URL |
| `NEXT_PUBLIC_API_URL` | ❌ No | `/api` | API base URL |
| `NODE_ENV` | ❌ No | `development` | Environment mode |
| `CLOUDINARY_*` | ❌ No | - | Image hosting (optional) |
| `RESEND_API_KEY` | ❌ No | - | Email via Resend (recommended) |
| `EMAIL_FROM` | ❌ No | `noreply@nairobi-sculpt.com` | Sender email address |
| `SMTP_*` | ❌ No | - | Email via SMTP (fallback) |

---

**See `.env.example` for a complete template!**
