# Migration Quick Reference

## 🚀 Quick Commands

### Local Development (Docker)

```bash
# 1. Make schema changes in prisma/schema.prisma

# 2. Create and apply migration
npx prisma migrate dev --name descriptive_migration_name

# 3. Verify
npx prisma migrate status
npx prisma studio
```

### Production Deployment

**⚠️ IMPORTANT:** `migrate deploy` uses `DATABASE_URL` from your environment. If your `.env` points to local, it will deploy to local!

**Method 1: Inline (Safest for one-time)**
```bash
# Set DATABASE_URL inline - targets production
DATABASE_URL="postgresql://user:pass@prod-host:port/db?sslmode=require" \
  npx prisma migrate deploy

# Verify
DATABASE_URL="postgresql://user:pass@prod-host:port/db?sslmode=require" \
  npx prisma migrate status
```

**Method 2: Export (Session-based)**
```bash
# Export for current session
export DATABASE_URL="postgresql://user:pass@prod-host:port/db?sslmode=require"

# Deploy
npx prisma migrate deploy

# Verify
npx prisma migrate status

# ⚠️ IMPORTANT: Unset when done!
unset DATABASE_URL
```

**See:** `docs/database/PRODUCTION_MIGRATION_GUIDE.md` for complete guide

## ⚠️ Important Differences

| Command | Use Case | Creates Migration | Applies Migration | Regenerates Client |
|---------|----------|-------------------|-------------------|-------------------|
| `migrate dev` | **Local only** | ✅ Yes | ✅ Yes | ✅ Yes |
| `migrate deploy` | **Production** | ❌ No | ✅ Yes | ❌ No |

## 📋 Pre-Production Checklist

- [ ] Migration tested locally in Docker
- [ ] All tests pass
- [ ] Production database backup created
- [ ] Migration SQL reviewed
- [ ] Breaking changes documented
- [ ] Team notified

## 🔄 Workflow Summary

```
1. Edit prisma/schema.prisma (local)
   ↓
2. npx prisma migrate dev --name migration_name (local)
   ↓
3. Test thoroughly (local)
   ↓
4. Commit migration files
   ↓
5. npx prisma migrate deploy (production)
   ↓
6. Deploy application code
```

## 🆘 Emergency

If migration fails in production:
1. Check status: `npx prisma migrate status`
2. Review error logs
3. Don't deploy code changes
4. Fix or rollback migration
5. Document issue

---

**Full Documentation:** See `docs/database/MIGRATION_WORKFLOW.md`
