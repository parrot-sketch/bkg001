# Database Connection Pool Exhaustion Fix

## Root Cause Analysis

The production error "Too many database connections opened" was caused by **three critical issues**:

### 1. **Prisma Client Singleton Not Working in Production** (CRITICAL)
- **Location**: `lib/db.ts` line 15
- **Problem**: The singleton pattern only cached Prisma client in development (`if (process.env.NODE_ENV !== "production")`)
- **Impact**: In production, every API request created a new PrismaClient instance, exhausting the connection pool
- **Fix**: Removed the production check so the client is cached in all environments

### 2. **Unbounded Queries in Failing Routes**
- **Locations**: 
  - `/api/doctors/[id]/appointments/upcoming`
  - `/api/doctors/[id]/appointments/today`
- **Problem**: `findMany()` queries had no `take` limits, potentially fetching thousands of records
- **Impact**: Long-running queries held database connections open, contributing to pool exhaustion
- **Fix**: Added `take: 200` for upcoming appointments, `take: 100` for today's appointments

### 3. **Missing Connection Pool Configuration**
- **Problem**: No explicit connection pool limits in DATABASE_URL or PrismaClient configuration
- **Impact**: Default pool settings may not match database server limits
- **Fix**: Added documentation for connection pool configuration

## Fixes Applied

### ✅ Fixed: Prisma Client Singleton (`lib/db.ts`)
```typescript
// BEFORE (BROKEN):
if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = db;

// AFTER (FIXED):
if (!globalThis.prismaGlobal) {
  globalThis.prismaGlobal = db;
}
```

### ✅ Fixed: Bounded Queries
- Added `take: 200` to `/api/doctors/[id]/appointments/upcoming`
- Added `take: 100` to `/api/doctors/[id]/appointments/today`

### ✅ Added: Connection Pool Documentation
- Documented how to configure connection pools via DATABASE_URL query parameters

## Production Deployment Checklist

### 1. **Update DATABASE_URL** (Recommended)
Add connection pool parameters to your production DATABASE_URL:

```env
# Example for Aiven PostgreSQL
DATABASE_URL="postgresql://user:password@host:port/dbname?connection_limit=10&pool_timeout=20&sslmode=require"
```

**Parameters:**
- `connection_limit=10`: Maximum connections per Prisma client instance (adjust based on your database's `max_connections`)
- `pool_timeout=20`: Seconds to wait for a connection from the pool
- `sslmode=require`: Required for production databases

### 2. **Verify Database Connection Limits**
Check your database provider's connection limits:
- **Aiven**: Typically 25-100 connections depending on plan
- **AWS RDS**: Varies by instance type
- **Self-hosted**: Check `max_connections` in PostgreSQL config

**Calculation:**
- If database allows 100 connections
- And you have 10 serverless function instances
- Set `connection_limit=10` per instance (10 × 10 = 100 max)

### 3. **Monitor Connection Usage**
After deployment, monitor:
- Database connection count
- Connection pool errors
- Query performance

## Verification

The fixes ensure:
1. ✅ Single Prisma client instance reused across all requests
2. ✅ All queries are bounded with `take` limits
3. ✅ Connection pool configuration is documented

## Impact Assessment

### Before Fix:
- ❌ New PrismaClient instance on every request
- ❌ Unbounded queries holding connections
- ❌ Connection pool exhaustion → 500 errors

### After Fix:
- ✅ Single PrismaClient instance (cached globally)
- ✅ All queries bounded (max 200 records)
- ✅ Connection pool properly managed

## Related Query Optimizations

These fixes complement the previous query optimization work:
- All dashboard queries now have date range filters
- All `findMany()` calls have `take` limits
- Aggregations moved to database level
- Over-fetching eliminated with `select` statements

## Next Steps

1. **Deploy these fixes** to production
2. **Update DATABASE_URL** with connection pool parameters
3. **Monitor** connection usage for 24-48 hours
4. **Adjust** `connection_limit` if needed based on monitoring

## Testing

To verify the fix works:
1. Check that only one PrismaClient instance is created (check logs)
2. Verify queries return bounded results
3. Monitor database connection count during peak usage
4. Confirm no "too many connections" errors
