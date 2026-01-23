# Vercel Environment Variables Setup

## Important: NODE_ENV Warning

If you see this warning in Vercel production logs:
```
Warning: NODE_ENV was incorrectly set to "development", this value is being overridden to "production"
```

**This means you have `NODE_ENV=development` set in your Vercel environment variables.**

### Fix

1. Go to your Vercel project settings
2. Navigate to **Settings** → **Environment Variables**
3. **Remove** any `NODE_ENV` variable if it exists
4. Vercel automatically sets `NODE_ENV=production` in production builds
5. You should **NOT** manually set `NODE_ENV` in Vercel

### Why This Matters

- Vercel automatically sets `NODE_ENV` based on the deployment environment
- Setting it manually can cause:
  - Build warnings
  - Incorrect caching behavior
  - Development code running in production
  - Performance issues

### Correct Environment Variables for Vercel

**DO NOT SET:**
- ❌ `NODE_ENV` (Vercel sets this automatically)

**DO SET:**
- ✅ `DATABASE_URL` (your production database connection string)
- ✅ `JWT_SECRET` (your JWT secret key)
- ✅ `JWT_REFRESH_SECRET` (your JWT refresh secret key)
- ✅ `JWT_ACCESS_EXPIRES_IN` (optional, defaults to 900)
- ✅ `JWT_REFRESH_EXPIRES_IN` (optional, defaults to 604800)
- ✅ `BCRYPT_SALT_ROUNDS` (optional, defaults to 10)
- ✅ Any other application-specific environment variables

### Checking Current Environment

In your code, you can check the environment using:
```typescript
const isProduction = process.env.NODE_ENV === 'production' || 
                     process.env.VERCEL_ENV === 'production';
```

This checks both `NODE_ENV` (set by Vercel) and `VERCEL_ENV` (also set by Vercel) for maximum reliability.

## Connection Closed Error Fix

If you're experiencing "Connection closed" errors with the `/api/doctors` endpoint:

1. **Ensure the API route has proper cache headers** (already implemented)
2. **Check Vercel Edge Network caching** - The route uses `force-dynamic` to prevent static generation
3. **Verify no service workers** are caching the API responses
4. **Clear browser cache** if testing locally

The current implementation:
- Uses `cache: 'no-store'` in fetch requests
- Sets `Cache-Control: no-store` headers in API responses
- Includes Vercel-specific cache headers (`CDN-Cache-Control`, `Vercel-CDN-Cache-Control`)
- Uses `force-dynamic` route segment config
