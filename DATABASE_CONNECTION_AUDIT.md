# Database Connection Bottleneck Audit

**Date:** 2026-04-14  
**Status:** CRITICAL - Production Impact  
**Database:** Aiven Postgres (15 max_connections)

---

## Executive Summary

The production database crashed due to connection pool exhaustion. With only **15 max_connections**, the application has **21 polling endpoints** that continuously query the database. When a user visits the surgical case workspace page (`/doctor/surgical-cases/[caseId]?tab=case-plan`), multiple polling hooks activate simultaneously, rapidly consuming available connections.

---

## Root Cause Analysis

### The Connection Math

| Metric | Value |
|--------|-------|
| Aiven Postgres max_connections | 15 |
| Prisma default pool_timeout | 10s |
| Available slots (non-superuser) | ~12-13 |

### Active Polling Per User Session

When a doctor opens the surgical case workspace page, the following hooks activate:

```
1. useNotifications      → /api/notifications          (15s interval)
2. useDoctorDashboard    → /api/doctors/me/dashboard   (15s interval)
3. useDoctorQueue         → /api/doctors/me/queue       (30s interval)
4. useTodaysSchedule      → /api/doctors/me/schedule    (30s interval)
5. useDoctorSurgicalCases → /api/doctor/surgical-cases  (60s interval)

Surgical Case Workspace also triggers:
6. /api/doctor/surgical-cases/surgeons
7. /api/doctor/surgical-cases/[caseId]/plan (HEAVY - 15+ joins)
```

### Timeline of Failure (from logs)

```
08:41:33.251 [info] JwtMiddleware.verifyToken - User authenticated
08:41:35.255 [error] prisma:error - Too many database connections opened
08:41:35.256 [error] API GET /api/notifications - FATAL: remaining connection slots reserved
```

The 2-second gap between auth and the error shows the system was already near capacity when this request arrived.

---

## Polling Inventory

### Critical Polling (10-15 second intervals)

| Hook | Interval | File | Impact |
|------|----------|------|--------|
| `useIntraOpCases` | 10s | `hooks/nurse/useIntraOpCases.ts:27` | **CRITICAL** - Live surgery monitoring |
| `useNotifications` | 15s | `hooks/useNotifications.ts:34` | **HIGH** - Every user has notification bell |
| `useDoctorDashboard` | 15s | `hooks/doctor/useDoctorDashboard.ts:92` | **HIGH** - Dashboard page |
| `useDoctorQueue` | 30s→15s | `hooks/doctor/useDoctorQueue.ts:61` | **HIGH** - Queue monitoring |

### High Frequency Polling (30 second intervals)

| Hook | Interval | File | Impact |
|------|----------|------|--------|
| `useNurseDashboard` | 30s | `hooks/nurse/useNurseDashboard.ts` (3 queries) | **HIGH** - All nurse views |
| `usePreOpCases` | 30s | `hooks/nurse/usePreOpCases.ts:38` | **MEDIUM** - Pre-op monitoring |
| `useRecoveryCases` | 30s | `hooks/nurse/useRecoveryCases.ts:20` | **MEDIUM** - Recovery monitoring |
| `useTodaysSchedule` | 30s | `hooks/frontdesk/useTodaysSchedule.ts:33` | **HIGH** - Frontdesk daily view |
| `useDayboard` | 30s | `hooks/theater-tech/useDayboard.ts:41` | **HIGH** - Theater scheduling |

### Medium Frequency Polling (60+ second intervals)

| Hook | Interval | File | Impact |
|------|----------|------|--------|
| `useDoctorSurgicalCasesPipeline` | 60s | `hooks/doctor/useDoctorSurgicalCasesPipeline.ts:138` | **MEDIUM** - Case pipeline |
| `useDoctorDashboardStats` | 60s | `hooks/doctor/useDoctorDashboardStats.ts:91` | **LOW** - Stats only |
| `useAppointments` | 5min | `hooks/useAppointments.ts:74` | **LOW** - Appointment list |

### Extreme Polling (Dangerous)

| Hook | Interval | File | Impact |
|------|----------|------|--------|
| `use-intake-session` | 4s | `hooks/frontdesk/use-intake-session.ts:51` | **DANGEROUS** - Patient intake form |

---

## Heavy Query Analysis

### The Surgical Case Plan Query

**File:** `app/api/doctor/surgical-cases/[caseId]/plan/route.ts:286-397`

This single query loads a surgical case with **8 nested includes**:

```typescript
const sc = await db.surgicalCase.findUnique({
  where: { id: caseId },
  select: {
    id, status, urgency, diagnosis, ...
    patient: { select: { ... } },                    // JOIN 1
    primary_surgeon: { select: { ... } },          // JOIN 2
    consultation: { select: { ... } },             // JOIN 3
    theater_booking: { 
      select: { ... },
      theater: { select: { ... } }                  // JOIN 4 (nested)
    },
    case_plan: {
      select: { ... },
      consents: { select: { ... } },                // JOIN 5
      images: { select: { ... } },                 // JOIN 6
      procedure_record: {
        select: { ... },
        staff: {
          select: { ... },
          user: { select: { ... } }               // JOIN 7 (deeply nested)
        }
      }
    },
    staff_invites: { select: { ... } },            // JOIN 8
    team_members: { select: { ... } },             // JOIN 9
    billing_estimate: {
      include: { line_items: { ... } }            // JOIN 10
    }
  }
});
```

**Estimated connection time:** 100-500ms depending on network latency to Aiven

---

## Code Locations

### Key Files to Modify

1. **`lib/db.ts`** - Connection management (single PrismaClient singleton)
2. **`hooks/useNotifications.ts:34`** - Reduce from 15s to 60s
3. **`hooks/doctor/useDoctorDashboard.ts:92`** - Reduce from 15s to 30s
4. **`hooks/nurse/useNurseDashboard.ts`** - 3 separate queries at 30s
5. **`hooks/nurse/useIntraOpCases.ts:27`** - Keep at 10s (surgical critical)
6. **`hooks/frontdesk/use-intake-session.ts:51`** - Reduce from 4s to 15s
7. **`app/api/doctor/surgical-cases/[caseId]/plan/route.ts`** - Optimize query

---

## Recommendations

### Immediate Fixes (Deploy Now)

1. **Reduce notification polling:** `15s → 60s`
2. **Reduce dashboard polling:** `15s → 30s`
3. **Fix intake session polling:** `4s → 15s`
4. **Add connection limit to DATABASE_URL:** `?connection_limit=3`

### Short Term (This Week)

1. Implement query caching with React Query's `staleTime`
2. Add `gcTime` (garbage collection) to prevent memory leaks
3. Use `refetchOnWindowFocus: false` for non-critical queries
4. Add `networkMode: 'offlineFirst'` to prevent connection spam

### Medium Term (This Month)

1. Implement a connection pooler (PgBouncer) in front of Aiven
2. Move to Prisma Accelerate with connection pooling (requires Aiven key)
3. Add database connection monitoring to dashboard
4. Implement request coalescing - multiple tab views share one request

### Long Term (Infrastructure)

1. **Increase Aiven plan** to 25+ connections, OR
2. **Deploy PgBouncer** as a connection pooler layer
3. Add Redis caching layer for frequently accessed data
4. Consider GraphQL with DataLoader for batched queries

---

## Quick Fix Commands

```bash
# 1. Check current database connections
psql "YOUR_DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'nairobi_sculpt';"

# 2. Monitor connection pool
psql "YOUR_DATABASE_URL" -c "SHOW max_connections;"

# 3. Kill idle connections (emergency)
psql "YOUR_DATABASE_URL" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '5 minutes';"
```

---

## Appendix: All Polling Locations

```
hooks/useNotifications.ts                              - 15s
hooks/doctor/useDoctorDashboard.ts                      - 15s
hooks/doctor/useDoctorQueue.ts                          - 30s
hooks/doctor/useDoctorDashboardStats.ts                 - 60s
hooks/doctor/useDoctorSurgicalCasesPipeline.ts         - 60s
hooks/nurse/useNurseDashboard.ts (3 queries)           - 30s
hooks/nurse/usePreOpCases.ts                           - 30s
hooks/nurse/useRecoveryCases.ts                        - 30s
hooks/nurse/useIntraOpCases.ts                         - 10s
hooks/useAppointments.ts                               - 5min
hooks/frontdesk/use-frontdesk-dashboard.ts             - varies
hooks/frontdesk/use-intake-session.ts                  - 4s
hooks/frontdesk/useTodaysSchedule.ts                   - 30s
hooks/frontdesk/useTheaterScheduling.ts                - 60s
hooks/consultation/useConsultation.ts                  - commented out
hooks/theater-tech/useDayboard.ts                      - 30s
```
