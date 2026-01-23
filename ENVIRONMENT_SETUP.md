# Environment Variables Setup Guide

## Quick Fix for Current Error

The authentication system requires `JWT_REFRESH_SECRET` environment variable. Add it to your `.env` file:

```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
```

## Required Environment Variables

### Authentication (REQUIRED)

These are **required** for the application to start:

```env
# JWT Secret for access tokens
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# JWT Secret for refresh tokens (must be different from JWT_SECRET)
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
```

### Database (REQUIRED)

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/nairobi_sculpt?schema=public"
```

## Optional Environment Variables

These have sensible defaults but can be customized:

```env
# Access token expiration (default: 900 seconds = 15 minutes)
JWT_ACCESS_EXPIRES_IN=900

# Refresh token expiration (default: 604800 seconds = 7 days)
JWT_REFRESH_EXPIRES_IN=604800

# Bcrypt salt rounds (default: 10)
BCRYPT_SALT_ROUNDS=10

# Application environment
NODE_ENV=development

# API base URL
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Generating Secure Secrets

### Using OpenSSL (Recommended)

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate JWT_REFRESH_SECRET (different from JWT_SECRET)
openssl rand -base64 32
```

### Using Node.js

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Setup Steps

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and add your values:**
   ```bash
   # Add at minimum:
   JWT_SECRET=<generated-secret>
   JWT_REFRESH_SECRET=<generated-secret>
   DATABASE_URL="postgresql://..."
   ```

3. **Restart your development server:**
   ```bash
   npm run dev
   ```

## Security Best Practices

1. **Never commit `.env` to version control**
   - `.env` is already in `.gitignore`
   - Only commit `.env.example` (with placeholder values)

2. **Use different secrets for different environments**
   - Development: Use simple secrets (but still secure)
   - Production: Use strong, randomly generated secrets

3. **Rotate secrets regularly**
   - Change JWT secrets periodically
   - When rotating, all users will need to re-authenticate

4. **Minimum secret length**
   - JWT secrets should be at least 32 characters
   - Use base64-encoded random bytes for best security

## Troubleshooting

### Error: "JWT_SECRET environment variable is required"
- **Solution:** Add `JWT_SECRET` to your `.env` file

### Error: "JWT_REFRESH_SECRET environment variable is required"
- **Solution:** Add `JWT_REFRESH_SECRET` to your `.env` file

### Error: "JWT secret is required" or "JWT refresh secret is required"
- **Solution:** Ensure the values in `.env` are not empty or just whitespace

### Application won't start after adding variables
- **Solution:** Restart the development server completely:
  ```bash
  # Stop the server (Ctrl+C)
  # Then restart
  npm run dev
  ```

## Example .env File

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/nairobi_sculpt?schema=public"

# JWT Authentication (REQUIRED)
JWT_SECRET=dev-secret-key-minimum-32-characters-long-for-development
JWT_REFRESH_SECRET=dev-refresh-secret-key-minimum-32-characters-long-for-development

# Optional JWT Settings
JWT_ACCESS_EXPIRES_IN=900
JWT_REFRESH_EXPIRES_IN=604800
BCRYPT_SALT_ROUNDS=10

# Application
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Production Deployment

For production, ensure:

1. **Strong, randomly generated secrets:**
   ```bash
   # Generate production secrets
   openssl rand -base64 64
   ```

2. **Set environment variables in your hosting platform:**
   - Vercel: Project Settings → Environment Variables
   - Railway: Variables tab
   - AWS: Parameter Store or Secrets Manager
   - Docker: Use secrets management

3. **Never use development secrets in production**

4. **Use different secrets for each environment:**
   - Development
   - Staging
   - Production
