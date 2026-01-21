# Production Migration Guide

## ⚠️ Critical Understanding

**`npx prisma migrate deploy` uses the `DATABASE_URL` environment variable from your current environment.**

If your `.env` file points to local Docker, running `migrate deploy` will deploy to **local**, not production!

---

## How Prisma Reads DATABASE_URL

Prisma reads `DATABASE_URL` in this order:
1. **Environment variable** (highest priority)
2. `.env` file in current directory
3. `.env.local` file
4. System environment variables

---

## Methods to Deploy to Production

### Method 1: Inline Environment Variable (Recommended for One-Time)

```bash
# Set DATABASE_URL inline for this command only
DATABASE_URL="postgresql://avnadmin:PASSWORD@host:port/db?sslmode=require" \
  npx prisma migrate deploy
```

**Pros:**
- ✅ No file changes needed
- ✅ Clear what database you're targeting
- ✅ Safe (doesn't affect other commands)

**Cons:**
- ❌ Need to type full connection string each time
- ❌ Password visible in command history

---

### Method 2: Export Environment Variable (Session-Based)

```bash
# Export for current terminal session
export DATABASE_URL="postgresql://avnadmin:PASSWORD@host:port/db?sslmode=require"

# Now all Prisma commands use production
npx prisma migrate deploy
npx prisma migrate status

# Unset when done (important!)
unset DATABASE_URL
```

**Pros:**
- ✅ Can run multiple commands
- ✅ Easy to verify with `prisma migrate status`

**Cons:**
- ❌ Affects all commands in that terminal session
- ❌ Easy to forget to unset
- ⚠️ **DANGER:** Could accidentally run other commands against production

---

### Method 3: Separate .env File (Recommended for Regular Use)

Create `.env.production` file (add to `.gitignore`):

```bash
# Create production env file
cat > .env.production << EOF
DATABASE_URL="postgresql://avnadmin:PASSWORD@host:port/db?sslmode=require"
EOF
```

Then use it:

```bash
# Load production env and run migration
env $(cat .env.production | xargs) npx prisma migrate deploy

# Or with dotenv-cli (if installed)
npx dotenv -e .env.production -- npx prisma migrate deploy
```

**Pros:**
- ✅ Keeps production credentials separate
- ✅ Can be version controlled (if encrypted) or kept secure
- ✅ Easy to reuse

**Cons:**
- ❌ Requires additional setup
- ❌ Need to manage multiple env files

---

### Method 4: CI/CD Pipeline (Best for Automated Deployments)

In your CI/CD (GitHub Actions, Vercel, etc.):

```yaml
# Example: GitHub Actions
- name: Deploy Migrations
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: npx prisma migrate deploy
```

**Pros:**
- ✅ Automated
- ✅ Secure (secrets management)
- ✅ Consistent
- ✅ No manual intervention

**Cons:**
- ❌ Requires CI/CD setup
- ❌ Less control for one-off migrations

---

## Recommended Workflow

### For Local Development

```bash
# Your .env file points to local Docker
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/nairobi_sculpt"

# Create and test migrations
npx prisma migrate dev --name my_migration
```

### For Production Deployment

**Option A: One-time migration (Safest)**

```bash
# Verify you're targeting production (check the URL!)
DATABASE_URL="postgresql://avnadmin:PASSWORD@prod-host:port/db?sslmode=require" \
  npx prisma migrate deploy

# Verify it worked
DATABASE_URL="postgresql://avnadmin:PASSWORD@prod-host:port/db?sslmode=require" \
  npx prisma migrate status
```

**Option B: Using .env.production file**

```bash
# 1. Create .env.production (once)
echo 'DATABASE_URL="postgresql://avnadmin:PASSWORD@prod-host:port/db?sslmode=require"' > .env.production

# 2. Use it for migrations
env $(cat .env.production | xargs) npx prisma migrate deploy

# 3. Verify
env $(cat .env.production | xargs) npx prisma migrate status
```

---

## Safety Checklist

Before running `migrate deploy`:

- [ ] **Verify DATABASE_URL** - Check the connection string points to production
- [ ] **Backup production database** - Always backup before migrations
- [ ] **Test migration locally** - Run `migrate dev` locally first
- [ ] **Check migration status** - Run `migrate status` to see what will be applied
- [ ] **Have rollback plan** - Know how to fix if migration fails
- [ ] **Coordinate with team** - Don't run migrations during peak hours

---

## Verification Commands

### Check Current DATABASE_URL

```bash
# See what Prisma will use
echo $DATABASE_URL

# Or check in Node
node -e "console.log(process.env.DATABASE_URL)"
```

### Check Migration Status

```bash
# For local
npx prisma migrate status

# For production (with inline env)
DATABASE_URL="postgresql://..." npx prisma migrate status
```

### Test Connection

```bash
# Test production connection
DATABASE_URL="postgresql://..." npx prisma db execute --stdin <<< "SELECT 1;"
```

---

## Common Mistakes

### ❌ Mistake 1: Running migrate deploy with local .env

```bash
# Your .env has: DATABASE_URL="postgresql://postgres:postgres@localhost:5433/..."
npx prisma migrate deploy  # ⚠️ This deploys to LOCAL, not production!
```

**Fix:** Always set DATABASE_URL explicitly for production

### ❌ Mistake 2: Forgetting to unset DATABASE_URL

```bash
export DATABASE_URL="postgresql://prod..."
npx prisma migrate deploy  # ✅ Good
npm run dev  # ⚠️ Now dev server connects to production!
```

**Fix:** Always `unset DATABASE_URL` after production commands

### ❌ Mistake 3: Using migrate dev in production

```bash
# ⚠️ NEVER do this in production!
npx prisma migrate dev  # Creates new migration files - wrong for production!
```

**Fix:** Use `migrate deploy` for production

---

## Example: Complete Production Migration Workflow

```bash
# 1. Create migration locally (with local .env)
npx prisma migrate dev --name add_new_feature

# 2. Test locally
npm run dev
# Test your changes...

# 3. Commit migration files
git add prisma/migrations/
git commit -m "feat: add new feature migration"

# 4. Deploy to production (with production DATABASE_URL)
DATABASE_URL="postgresql://avnadmin:PASSWORD@prod-host:port/db?sslmode=require" \
  npx prisma migrate deploy

# 5. Verify production migration
DATABASE_URL="postgresql://avnadmin:PASSWORD@prod-host:port/db?sslmode=require" \
  npx prisma migrate status

# 6. Deploy application code
# (Your normal deployment process)
```

---

## Security Best Practices

1. **Never commit production DATABASE_URL** to git
2. **Use secrets management** in CI/CD
3. **Rotate passwords** regularly
4. **Use SSL** (`sslmode=require`) for production
5. **Limit access** - Only authorized personnel should run migrations
6. **Audit logs** - Keep track of who ran what migrations when

---

## Troubleshooting

### "Migration already applied" error

```bash
# Check what migrations are applied
DATABASE_URL="postgresql://..." npx prisma migrate status

# If migration is already applied, mark it as resolved
DATABASE_URL="postgresql://..." npx prisma migrate resolve --applied migration_name
```

### "Database is out of sync" error

```bash
# Check migration history
DATABASE_URL="postgresql://..." npx prisma migrate status

# May need to manually fix database state
# Or create a new migration to sync
```

### Connection timeout

- Check network connectivity
- Verify DATABASE_URL is correct
- Check firewall rules
- Verify SSL settings

---

## Quick Reference

| Command | Database Used | Creates Migration | Applies Migration |
|---------|--------------|-------------------|-------------------|
| `npx prisma migrate dev` | From `.env` (local) | ✅ Yes | ✅ Yes |
| `DATABASE_URL="..." npx prisma migrate deploy` | From env var | ❌ No | ✅ Yes |
| `npx prisma migrate deploy` | From `.env` | ❌ No | ✅ Yes |

**Key Point:** Always verify which database you're targeting!

---

**Last Updated:** 2024-12-19  
**Maintained By:** Development Team
