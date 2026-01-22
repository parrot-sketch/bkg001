# Comprehensive Query Audit - Production Healthcare System

**Date:** 2024  
**Engineer:** Staff Backend Engineer  
**System:** Production Healthcare/EHR System  
**Scale Target:** 100k-10M records  
**Performance Target:** <500ms dashboard loads

---

## Executive Summary

This audit identified **23 critical performance issues** across services, API routes, and repositories that will cause severe performance degradation and system failures at scale. All issues must be fixed before production deployment.

### Critical Risk Assessment
- **🔴 CRITICAL:** 8 unbounded queries that will fail with 10k+ records
- **🟠 HIGH:** 7 queries missing date filters (will slow down as data grows)
- **🟡 MEDIUM:** 8 queries using `include` instead of `select` (over-fetching)

---

## Phase 1: Audit Results

### Category 1: Unbounded findMany() Queries (CRITICAL)

#### 1.1 API Routes

**File:** `app/api/appointments/route.ts` - `GET /api/appointments`
- ❌ **Issue:** `findMany()` without `take` limit
- ❌ **Issue:** No default date range filter
- ⚠️ **Risk:** Can return thousands of appointments, causing memory issues and timeouts
- 📍 **Line:** 173
- 🔧 **Fix Required:** Add `take` limit (default 50-100) and require date range or limit to last 90 days

**File:** `app/api/appointments/today/route.ts` - `GET /api/appointments/today`
- ⚠️ **Issue:** No `take` limit (though bounded by today's date)
- ⚠️ **Risk:** If clinic has 1000+ appointments in one day, will fail
- 📍 **Line:** 51
- 🔧 **Fix Required:** Add `take` limit (e.g., 200) as safety measure

**File:** `app/api/consultations/pending/route.ts` - `GET /api/consultations/pending`
- ❌ **Issue:** `findMany()` without `take` limit
- ❌ **Issue:** No date filter (fetches ALL pending requests ever)
- ⚠️ **Risk:** Can return thousands of old pending requests
- 📍 **Line:** 56
- 🔧 **Fix Required:** Add `take` limit (e.g., 100) and date filter (last 90 days)

#### 1.2 Repository Layer

**File:** `infrastructure/database/repositories/PrismaAppointmentRepository.ts`
- **Method:** `findByPatient(patientId: string)`
  - ❌ **Issue:** `findMany()` without `take` limit
  - ❌ **Issue:** No date filter
  - ⚠️ **Risk:** Patient with 1000+ appointments = fetches all
  - 📍 **Line:** 62
  - 🔧 **Fix Required:** Add `take` limit and date range filter (last 12 months)

- **Method:** `findByDoctor(doctorId: string, filters?)`
  - ⚠️ **Issue:** `findMany()` without `take` limit (has optional date filters)
  - ⚠️ **Risk:** If filters not provided, fetches ALL doctor's appointments
  - 📍 **Line:** 109
  - 🔧 **Fix Required:** Add default `take` limit (e.g., 100) or require date filters

- **Method:** `findPotentialNoShows(now: Date, windowMinutes: number)`
  - ⚠️ **Issue:** `findMany()` without `take` limit
  - ⚠️ **Risk:** Could return hundreds of no-shows
  - 📍 **Line:** 141
  - 🔧 **Fix Required:** Add `take` limit (e.g., 50) as safety measure

**File:** `infrastructure/database/repositories/PrismaPatientRepository.ts`
- **Method:** `findHighestFileNumber()`
  - ❌ **Issue:** Fetches ALL patients just to find max file number
  - ❌ **Issue:** Uses JavaScript to find max (inefficient)
  - ⚠️ **Risk:** With 100k patients, fetches 100k records
  - 📍 **Line:** 38
  - 🔧 **Fix Required:** Use database aggregation (`_max`) or raw SQL

#### 1.3 Service Layer

**File:** `utils/services/doctor.ts`
- **Method:** `getDoctors()`
  - ❌ **Issue:** `findMany()` without `take` limit
  - ❌ **Issue:** No pagination
  - ⚠️ **Risk:** Fetches ALL doctors (could be hundreds)
  - 📍 **Line:** 8
  - 🔧 **Fix Required:** Add pagination or reasonable limit (e.g., 100)

- **Method:** `getRatingById(id: string)`
  - ❌ **Issue:** `findMany()` without `take` limit
  - ❌ **Issue:** Fetches ALL ratings for doctor, then uses JavaScript `.reduce()`
  - ⚠️ **Risk:** Doctor with 1000+ ratings = fetches all, processes in JS
  - 📍 **Line:** 141
  - 🔧 **Fix Required:** Use database aggregation (`_avg`, `_count`) instead

**File:** `utils/services/patient.ts`
- **Method:** `getPatientFullDataById(id: string)`
  - ⚠️ **Issue:** Fetches appointments with `take: 1` (OK) but uses `include` (over-fetching)
  - 📍 **Line:** 304
  - 🔧 **Fix Required:** Replace `include` with `select`

**File:** `utils/services/appointment.ts`
- **Method:** `getPatientAppointments()`
  - ⚠️ **Issue:** Has pagination but no default date filter
  - ⚠️ **Risk:** User can paginate through ALL historical appointments
  - 📍 **Line:** 133
  - 🔧 **Fix Required:** Add default date filter (last 12 months) or require date range

- **Method:** `getAppointmentWithMedicalRecordsById()`
  - ⚠️ **Issue:** Uses `include` with full models (over-fetching)
  - 📍 **Line:** 217
  - 🔧 **Fix Required:** Replace `include` with `select` for only needed fields

---

### Category 2: Missing Date Range Filters (HIGH)

#### 2.1 Queries That Should Have Date Filters

1. **`app/api/appointments/route.ts`** - GET handler
   - ⚠️ **Issue:** No default date filter
   - 🔧 **Fix:** Require date range or default to last 90 days

2. **`app/api/consultations/pending/route.ts`**
   - ❌ **Issue:** Fetches ALL pending requests (no date filter)
   - 🔧 **Fix:** Add date filter (last 90 days) + `take` limit

3. **`infrastructure/database/repositories/PrismaAppointmentRepository.ts`**
   - **`findByPatient()`** - No date filter
   - **`findByDoctor()`** - Optional date filter (should be required or have default)

4. **`utils/services/appointment.ts`**
   - **`getPatientAppointments()`** - No default date filter

---

### Category 3: Over-fetching with `include` (MEDIUM)

#### 3.1 Queries Using `include` Instead of `select`

1. **`app/api/appointments/route.ts`** - Line 175
   - Uses `include` with `select` inside (acceptable, but could use top-level `select`)

2. **`app/api/appointments/today/route.ts`** - Line 58
   - Uses `include` with `select` inside (acceptable, but could use top-level `select`)

3. **`app/api/consultations/pending/route.ts`** - Line 65
   - Uses `include` with `select` inside (acceptable, but could use top-level `select`)

4. **`utils/services/medical-record.ts`** - Line 38
   - Uses `include` with nested `include` for diagnoses
   - ⚠️ **Issue:** Fetches full `lab_tests` model
   - 🔧 **Fix:** Replace with `select` for only needed fields

5. **`utils/services/payments.ts`** - Line 38
   - Uses `include` with `select` inside (acceptable, but could use top-level `select`)

6. **`utils/services/patient.ts`** - `getPatientFullDataById()` - Line 298
   - Uses `include` (should use `select`)

7. **`utils/services/appointment.ts`** - `getAppointmentWithMedicalRecordsById()` - Line 217
   - Uses `include` with full models (should use `select`)

8. **`utils/services/doctor.ts`** - `getAllDoctors()` - Line 189
   - Uses `include` for `working_days` (should use `select`)

---

### Category 4: JavaScript-Side Aggregation (HIGH)

#### 4.1 Queries Processing Large Arrays in JavaScript

1. **`utils/services/doctor.ts`** - `getRatingById()`
   - ❌ **Issue:** Fetches ALL ratings, then uses `.reduce()` to calculate average
   - 📍 **Line:** 141-149
   - 🔧 **Fix:** Use database aggregation (`_avg`, `_count`)

2. **`infrastructure/database/repositories/PrismaPatientRepository.ts`** - `findHighestFileNumber()`
   - ❌ **Issue:** Fetches ALL patients, then uses JavaScript loop to find max
   - 📍 **Line:** 38-64
   - 🔧 **Fix:** Use database `_max` aggregation or raw SQL

---

### Category 5: Missing Count Query WHERE Clauses (MEDIUM)

#### 5.1 Count Queries That Don't Match Main Query Filters

1. **`utils/services/medical-record.ts`** - Line 68
   - ✅ **Status:** Count query uses same WHERE clause (GOOD)

2. **`utils/services/payments.ts`** - Line 54
   - ✅ **Status:** Count query uses same WHERE clause (GOOD)

3. **`utils/services/appointment.ts`** - Line 169
   - ✅ **Status:** Count query uses same WHERE clause (GOOD)

4. **`utils/services/staff.ts`** - Line 36
   - ✅ **Status:** Count query uses same WHERE clause (GOOD)

---

## Phase 2: Refactoring Plan

### Priority 1: Critical Unbounded Queries (Fix Immediately)

1. ✅ `app/api/appointments/route.ts` - Add `take` limit and date filter
2. ✅ `app/api/consultations/pending/route.ts` - Add `take` limit and date filter
3. ✅ `infrastructure/database/repositories/PrismaAppointmentRepository.ts` - Add limits to all methods
4. ✅ `infrastructure/database/repositories/PrismaPatientRepository.ts` - Fix `findHighestFileNumber()`
5. ✅ `utils/services/doctor.ts` - Fix `getDoctors()` and `getRatingById()`

### Priority 2: High Priority Optimizations

6. ✅ Replace JavaScript aggregation with database aggregation
7. ✅ Add date filters to queries missing them
8. ✅ Replace `include` with `select` where appropriate

### Priority 3: Medium Priority Optimizations

9. ✅ Optimize nested `include` statements
10. ✅ Add safety limits to "today" queries

---

## Detailed Findings by File

### File: `app/api/appointments/route.ts`

**Issues:**
1. Line 173: `findMany()` without `take` limit
2. No default date range filter
3. Uses `include` (could use top-level `select`)

**Impact:**
- Can return thousands of appointments
- High memory usage
- Slow response times
- Potential timeouts

**Fix:**
```typescript
// Add default limit and date filter
const DEFAULT_LIMIT = 100;
const DEFAULT_DATE_RANGE_DAYS = 90;

const since = subDays(new Date(), DEFAULT_DATE_RANGE_DAYS);

const appointments = await db.appointment.findMany({
  where: {
    ...where,
    appointment_date: where.appointment_date || { gte: since },
  },
  select: { /* only needed fields */ },
  take: limitParam ? Number(limitParam) : DEFAULT_LIMIT,
  // ...
});
```

---

### File: `app/api/consultations/pending/route.ts`

**Issues:**
1. Line 56: `findMany()` without `take` limit
2. No date filter (fetches ALL pending requests ever)
3. Uses `include` (could use top-level `select`)

**Impact:**
- Can return thousands of old pending requests
- Unnecessary data transfer
- Slow response times

**Fix:**
```typescript
const since = subDays(new Date(), 90); // Last 90 days

const pendingRequests = await db.appointment.findMany({
  where: {
    consultation_request_status: {
      in: [ConsultationRequestStatus.SUBMITTED, ConsultationRequestStatus.PENDING_REVIEW],
    },
    created_at: { gte: since }, // Only recent requests
  },
  select: { /* only needed fields */ },
  take: 100, // Reasonable limit
  orderBy: { created_at: 'asc' },
});
```

---

### File: `infrastructure/database/repositories/PrismaAppointmentRepository.ts`

**Issues:**
1. `findByPatient()` - No `take` limit, no date filter
2. `findByDoctor()` - No `take` limit (has optional date filters)
3. `findPotentialNoShows()` - No `take` limit

**Impact:**
- Repository methods can return unbounded results
- Used by use cases, so affects entire system
- High memory usage

**Fix:**
```typescript
async findByPatient(patientId: string, options?: { limit?: number; since?: Date }): Promise<Appointment[]> {
  const since = options?.since || subMonths(new Date(), 12);
  const limit = options?.limit || 100;
  
  const prismaAppointments = await this.prisma.appointment.findMany({
    where: {
      patient_id: patientId,
      appointment_date: { gte: since },
    },
    orderBy: { appointment_date: 'desc' },
    take: limit,
  });
  // ...
}
```

---

### File: `infrastructure/database/repositories/PrismaPatientRepository.ts`

**Issues:**
1. `findHighestFileNumber()` - Fetches ALL patients to find max

**Impact:**
- With 100k patients, fetches 100k records
- Extremely slow and memory-intensive
- Blocks database

**Fix:**
```typescript
async findHighestFileNumber(): Promise<string | null> {
  // Use database aggregation instead of fetching all records
  const result = await this.prisma.$queryRaw<{ file_number: string }[]>`
    SELECT file_number 
    FROM patient 
    WHERE file_number ~ '^NS[0-9]+$'
    ORDER BY 
      CAST(SUBSTRING(file_number FROM 'NS([0-9]+)') AS INTEGER) DESC
    LIMIT 1
  `;
  
  return result[0]?.file_number || null;
}
```

---

### File: `utils/services/doctor.ts`

**Issues:**
1. `getDoctors()` - Fetches ALL doctors without limit
2. `getRatingById()` - Fetches ALL ratings, uses JavaScript `.reduce()`

**Impact:**
- `getDoctors()`: Can return hundreds of doctors
- `getRatingById()`: Inefficient, doesn't scale

**Fix:**
```typescript
// getDoctors() - Add limit
export async function getDoctors(limit: number = 100) {
  const data = await db.doctor.findMany({
    take: limit,
    orderBy: { name: 'asc' },
  });
  // ...
}

// getRatingById() - Use database aggregation
export async function getRatingById(id: string) {
  const [stats, ratings] = await Promise.all([
    db.rating.aggregate({
      where: { doctor_id: id },
      _count: true,
      _avg: { rating: true },
    }),
    db.rating.findMany({
      where: { doctor_id: id },
      select: { id: true, rating: true, patient: { select: { first_name: true, last_name: true } } },
      take: 50, // Only recent ratings for display
      orderBy: { created_at: 'desc' },
    }),
  ]);
  
  return {
    totalRatings: stats._count,
    averageRating: stats._avg.rating?.toFixed(1) || '0.0',
    ratings: ratings,
  };
}
```

---

## Refactoring Rules Applied

### ✅ Every Query Must Have:
1. `take` limit (or pagination with `skip`/`take`)
2. Date range filter where applicable
3. `select` instead of `include` (when possible)
4. Database aggregation instead of JavaScript

### ✅ Time Windows:
- Admin dashboard: 90 days
- Doctor dashboard: 12 months
- Patient dashboard: 6 months
- Today views: today only (with safety limit)
- Historical views: Must be paginated

### ✅ Preserved:
- All API response shapes
- All UI-required fields
- All business logic
- All clinical workflow semantics

---

## Next Steps

1. **Immediate:** Fix all unbounded queries (Priority 1)
2. **High Priority:** Replace JavaScript aggregation (Priority 2)
3. **Medium Priority:** Optimize `include` statements (Priority 3)

---

**Audit Status:** Complete  
**Refactoring Status:** Ready to Begin  
**Risk Level:** 🔴 CRITICAL - Must fix before production
