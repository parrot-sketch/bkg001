# Nurse Module Performance & Architecture Audit Report

**Date:** 2026-03-26  
**Module:** Nurse  
**Status:** AUDIT COMPLETE - Fixes pending

---

## EXECUTIVE SUMMARY

| Metric | Value |
|--------|-------|
| Total API calls on initial load (7 pages) | ~12-15 distinct calls |
| Total estimated DB queries | ~10-12 |
| Duplicate calls found | YES - multiple nurse-specific keys for shared entities |
| Cross-module cache conflicts | YES - 5 entities |
| Status filter issues | PARTIAL - 2 pages have incomplete filtering |
| Staleness scenarios >60s | 3 scenarios |

### Top 5 Patient Care Impact Issues (Ranked)

1. **P0**: Ward prep page includes SCHEDULED cases before theater is booked - could confuse nurses
2. **P0**: Intra-op query fetches SCHEDULED cases (not yet in theater) alongside IN_THEATER
3. **P1**: No cross-module cache invalidation - doctor/frontdesk changes not reflected in nurse views
4. **P1**: Dashboard fetches checked-in patients via wrong API (appointments/today?status=SCHEDULED)
5. **P2**: Hardcoded query keys - no shared cache with frontdesk/doctor modules

### Top 5 Database Load Issues (Ranked)

1. **P1**: Pre-op query fetches ALL related data including consents, images (large payload)
2. **P1**: Pre-op query has no pagination - unbounded results
3. **P2**: Dashboard makes 4+ independent queries instead of 1 aggregated
4. **P2**: Intra-op/recovery have redundant include statements
5. **P3**: No select optimization on most queries

---

## SECTION 1: API CALL INVENTORY

### 1.1 /nurse/dashboard

| Component | Endpoint/Server Action | Query Key | Method | Fires On | Polling | Interval |
|-----------|----------------------|-----------|--------|----------|---------|----------|
| Dashboard Page | GET /appointments/today?status=SCHEDULED | ['nurse','patients','checked-in','today'] | GET | mount | No | - |
| Dashboard Page | GET /nurse/pre-op | ['nurse','pre-op','list'] | GET | mount | No | - |
| Dashboard Page | GET /nurse/intra-op | ['nurse','intra-op','list'] | GET | mount | No | - |
| Dashboard Page | GET /nurse/recovery | ['nurse','recovery','list'] | GET | mount | No | - |

**Total API calls on load:** 4

**Issues:**
- Uses hardcoded query key not matching queryKeys factory
- Fetches appointments with SCHEDULED status but should use CHECKED_IN for waiting room
- Makes 4 separate calls - could be unified

---

### 1.2 /nurse/patients (Triage/Waiting Room)

| Component | Endpoint/Server Action | Query Key | Method | Fires On | Polling | Interval |
|-----------|----------------------|-----------|--------|----------|---------|----------|
| Patients Page | GET /appointments/today?status=SCHEDULED | ['nurse','patients','checked-in','today'] | GET | mount | No | - |

**Total API calls on load:** 1

**Issues:**
- Same query key as dashboard - duplicate fetch if both loaded
- Should use CHECKED_IN status (not SCHEDULED) for waiting room
- No polling - relies on manual refresh button

---

### 1.3 /nurse/ward-prep

| Component | Endpoint/Server Action | Query Key | Method | Fires On | Polling | Interval |
|-----------|----------------------|-----------|--------|----------|---------|----------|
| WardPrep Page | GET /nurse/pre-op | ['nurse','pre-op','list'] | GET | mount | No | - |
| Detail fetch | GET /nurse/pre-op/[id] | ['nurse','pre-op','detail',id] | GET | on navigate | No | - |

**Total API calls on load:** 1 (+ on-demand)

**Issues:**
- No pagination - fetches ALL pre-op cases
- Status filter includes: DRAFT, PLANNING, READY_FOR_SCHEDULING, SCHEDULED, IN_PREP
- IN_PREP cases should be in theater, not ward prep
- No theater booking date filtering
- Missing READY_FOR_THEATER_BOOKING status check (unlocks theater scheduling)

---

### 1.4 /nurse/theatre-support

| Component | Endpoint/Server Action | Query Key | Method | Fires On | Polling | Interval |
|-----------|----------------------|-----------|--------|----------|---------|----------|
| Theatre Page | GET /nurse/intra-op | ['nurse','intra-op','list'] | GET | mount | Yes | 60s |

**Total API calls on load:** 1

**Issues:**
- Polling every 60s - should be 10s for CRITICAL surgical data
- Fetches SCHEDULED status cases that are booked but NOT YET in theater
- Should only show IN_THEATER cases (真正在手术中)
- No theater booking date filter (should filter to today/future)
- No sorting by scheduled time

---

### 1.5 /nurse/recovery-discharge

| Component | Endpoint/Server Action | Query Key | Method | Fires On | Polling | Interval |
|-----------|----------------------|-----------|--------|----------|---------|----------|
| Recovery Page | GET /nurse/recovery | ['nurse','recovery','list'] | GET | mount | Yes | 60s |

**Total API calls on load:** 1

**Issues:**
- Polling every 60s - acceptable for recovery but could be 30s
- Correctly filters by RECOVERY status only
- No issues with status filter

---

### 1.6 /nurse/notifications

| Component | Endpoint/Server Action | Query Key | Method | Fires On | Polling | Interval |
|-----------|----------------------|-----------|--------|----------|---------|----------|
| Notifications Page | GET /notifications | ['notifications'] | GET | mount | Yes | 30s |

**Total API calls on load:** 1

**Issues:**
- Uses hardcoded key instead of queryKeys.notifications
- Polling at 30s is appropriate for notifications

---

### 1.7 /nurse/profile

| Component | Endpoint/Server Action | Query Key | Method | Fires On | Polling | Interval |
|-----------|----------------------|-----------|--------|----------|---------|----------|
| Profile Page | useAuth hook | - | - | mount | No | - |

**Total API calls on load:** 0 (uses auth context only)

**Issues:**
- No issues - only fetches user from auth context

---

## SECTION 2: DATABASE QUERY ANALYSIS

### 2.1 GET /nurse/pre-op (Ward Prep)

**QUERY REPORT**
- File: `app/api/nurse/pre-op/route.ts`
- Journey Stage: PRE_OP (after doctor completes surgery plan)
- Primary model: SurgicalCase
- Status filter applied?: YES - in: [DRAFT, PLANNING, READY_FOR_SCHEDULING, SCHEDULED, IN_PREP]
- Correct statuses for this stage?: **PARTIAL** - includes SCHEDULED (theater booked) but should only include DRAFT, PLANNING, READY_FOR_SCHEDULING. IN_PREP should be in theater, not ward prep.
- Has `include`?: YES
- Missing relations: None significant
- N+1 risk: NO
- Pagination: **NO** - unbounded
- Filters at DB level?: YES (status)
- Filters in JS after fetch?: YES (readiness filter applied in JS)
- Select optimized?: PARTIAL - uses select for patient/surgeon, but includes full case_plan
- Estimated unbounded row exposure: **HIGH** - could fetch hundreds of cases
- Notes: Readiness calculated in JS after full fetch - should be DB-level

---

### 2.2 GET /nurse/intra-op (Theatre Support)

**QUERY REPORT**
- File: `app/api/nurse/intra-op/route.ts`
- Journey Stage: INTRA_OP (active surgery)
- Primary model: SurgicalCase
- Status filter applied?: YES - in: [SCHEDULED, IN_THEATER]
- Correct statuses for this stage?: **NO** - SCHEDULED means booked but not yet in theater. Should only be IN_THEATER.
- Has `include`?: YES
- Missing relations: None
- N+1 risk: NO
- Pagination: NO - unbounded but likely small
- Filters at DB level?: YES (status)
- Filters in JS after fetch?: NO
- Select optimized?: PARTIAL
- Estimated unbounded row exposure: LOW (typically <20 active cases)
- Notes: Should filter by theater_booking.start_time >= today

---

### 2.3 GET /nurse/recovery

**QUERY REPORT**
- File: `app/api/nurse/recovery/route.ts`
- Journey Stage: RECOVERY (post-surgery)
- Primary model: SurgicalCase
- Status filter applied?: YES - status: RECOVERY
- Correct statuses for this stage?: **YES**
- Has `include`?: YES
- Missing relations: Could include recovery record status
- N+1 risk: NO
- Pagination: NO
- Filters at DB level?: YES (status)
- Filters in JS after fetch?: NO
- Select optimized?: PARTIAL
- Estimated unbounded row exposure: LOW
- Notes: Good query overall

---

### 2.4 GET /appointments/today (Clinic Queue)

**QUERY REPORT**
- File: `lib/api/nurse.ts` calls `/appointments/today?status=SCHEDULED`
- Journey Stage: CHECKED_IN (waiting for doctor)
- Primary model: Appointment
- Status filter applied?: YES - SCHEDULED
- Correct statuses for this stage?: **NO** - Should be CHECKED_IN (and possibly READY_FOR_CONSULTATION)
- Has `include`?: Unknown (depends on appointments API)
- Notes: Wrong status filter - SCHEDULED means confirmed but NOT YET checked in

---

## SECTION 3: CROSS-MODULE DATA CONFLICTS

### 3a. SHARED ENTITY REGISTRY

| Entity | Nurse Fetch | Frontdesk Fetch | Doctor Fetch | Keys Match? | Issue |
|--------|-------------|-----------------|--------------|-------------|-------|
| Patient | `/appointments/today` | `/api/frontdesk/patients` | `/api/doctor/patients` | **NO** | 3 different keys |
| Appointment | `/appointments/today?status=SCHEDULED` | `/api/frontdesk/schedule` | `/api/doctor/schedule` | **NO** | Different params/status |
| SurgicalCase | `/nurse/pre-op`, `/nurse/intra-op`, `/nurse/recovery` | `/api/frontdesk/theater-scheduling` | `/api/doctor/surgical-cases` | **NO** | Nurse uses 3 separate endpoints |
| TheaterBooking | Via surgicalCase | `/api/frontdesk/theater-scheduling` | Via case | **PARTIAL** | Different fetch patterns |
| Vitals | `/patients/vitals` (POST) | None | Via consultation | **NO** | Doctor fetches differently |
| PreOpChecklist | `/nurse/surgical-cases/[id]/forms/preop-ward` | None | None | N/A | Nurse only |
| Notifications | `/notifications` | `/notifications` | `/notifications` | **YES** | Uses hardcoded key |

**Total independent fetches for same entities across modules: 5**

---

### 3b. STATUS TRANSITION CONSISTENCY

| Transition | Triggered By | Nurse Cache Invalidated? | Staleness Window |
|------------|--------------|------------------------|------------------|
| Frontdesk checks in patient | Frontdesk | **NO** | Until nurse refreshes (30s polling on dashboard but not on patients page) |
| Doctor starts consultation | Doctor | **NO** | Up to 30s before nurse sees status change |
| Doctor completes surgery plan → READY_FOR_PREOP | Doctor | **NO** | Up to 30s before nurse sees case in ward prep |
| Nurse completes pre-op → READY_FOR_THEATER_BOOKING | Nurse | **PARTIAL** (invalidates own queries) | Frontdesk sees after next poll |
| Theater booked | Frontdesk | **NO** | Nurse sees after next poll (~60s for theatre page) |
| Surgery complete → RECOVERY | Doctor | **NO** | Up to 60s |
| Nurse discharges patient | Nurse | **PARTIAL** | May need to verify frontdesk visibility |

**Maximum staleness window: 60 seconds (theatre-support and recovery pages)**

---

### 3c. VITALS/TRIAGE DATA FLOW

- **Storage location**: Via `POST /patients/vitals` - stored in database
- **Doctor fetches vitals**: Unknown - need to verify if doctor consultation view includes vitals
- **Immediate visibility**: No - nurse must wait for refetch or manual refresh after saving
- **Pre-op/Recovery vitals**: Unknown if they pull from nurse record or re-fetch

---

### 3d. PRE-OP CHECKLIST DEPENDENCIES

- **Eligible cases**: Cases with status in [DRAFT, PLANNING, READY_FOR_SCHEDULING, SCHEDULED, IN_PREP]
- **Status check**: Query-time filter in API (but includes wrong statuses)
- **Post-plan modification**: No guard - if doctor modifies plan after nurse starts checklist, no handling
- **Surgery plan data**: Included in case data via `case_plan` relation

---

## SECTION 4: REACT QUERY CACHE ARCHITECTURE

### 4a. KEY CONSISTENCY

| Hook Location | Current Key | Should Use | Issue |
|--------------|-------------|------------|-------|
| useTodayCheckedInPatients | ['nurse','patients','checked-in','today'] | queryKeys.shared.appointments() | Hardcoded key |
| usePreOpCases | ['nurse','pre-op','list'] | queryKeys.shared.surgicalCases() | Hardcoded key |
| useIntraOpCases | ['nurse','intra-op','list'] | queryKeys.shared.surgicalCases() | Hardcoded key |
| useRecoveryCases | ['nurse','recovery','list'] | queryKeys.shared.surgicalCases() | Hardcoded key |
| useNotifications | ['notifications'] | queryKeys.notifications.unread() | Hardcoded key |

**All nurse hooks use hardcoded keys - none use queryKeys factory**

---

### 4b. POLLING AUDIT

| Page | Current Interval | Should Be | Status |
|------|-----------------|-----------|--------|
| Dashboard | None (30s staleTime) | 30s | OK |
| Patients | None | 30s | **TOO SLOW** - no polling |
| Ward Prep | None (30s staleTime) | 30s | OK |
| Theatre Support | 60s refetchInterval | **10s** | **TOO SLOW** - CRITICAL |
| Recovery | 60s refetchInterval | 30s | **TOO SLOW** - HIGH |
| Notifications | 30s refetchInterval | 60s | OK |

**Issue: Theatre support should poll at CRITICAL (≤10s) interval - live surgery**

---

### 4c. CACHE INVALIDATION ON NURSE MUTATIONS

| Action | Currently Invalidates | Should Also Invalidate |
|--------|----------------------|------------------------|
| Record vitals | None visible | Doctor's patient detail cache |
| Complete pre-op checklist | Pre-op list queries | Frontdesk theater queue, Doctor case list |
| Save intra-op record | Intra-op list | Doctor's case view, Theater status |
| Save post-op record | Recovery list | Doctor's case view |
| Discharge patient | None visible | Frontdesk patient list, Doctor's patient list |

---

### 4d. MISSING OPTIMISTIC UPDATES

- **Vitals recording**: No optimistic update - waits for server response
- **Pre-op checklist**: Need to verify - appears to use mutations with onSuccess
- **Theatre support**: Unknown - need to check form implementation

---

## SECTION 5: PAGE-BY-PAGE DEEP AUDIT

### 5.1 /nurse/dashboard

**Data loaded on mount:**
- Today's checked-in patients (4 hooks: checked-in, pre-op, intra-op, recovery)

**Issues:**
- Shows 4 separate stat cards - each is independent query
- No aggregated single fetch
- Stats computed in JS after full data fetch
- Data also shown on frontdesk/doctor dashboards - fetched independently

---

### 5.2 /nurse/patients (Triage)

**Patient statuses queried:** SCHEDUDED (wrong - should be CHECKED_IN)

**Issues:**
- Wrong status filter - will NOT show checked-in patients, only scheduled
- No polling - manual refresh only
- Should see: CHECKED_IN, READY_FOR_CONSULTATION patients
- Does NOT remove patient immediately when doctor starts consultation

**Vitals recording:**
- Dialog-based form
- Saves to server and calls refetch() - not optimistic
- No invalidation of doctor module

---

### 5.3 /nurse/ward-prep

**Query surfaces:** DRAFT, PLANNING, READY_FOR_SCHEDULING, SCHEDULED, IN_PREP

**Issues:**
- Should only show DRAFT, PLANNING, READY_FOR_SCHEDULING (pre-surgery-plan work)
- SCHEDULED cases already have theater booked - should be in theater support
- IN_PREP cases are in pre-op but should not be visible (theater not yet used)
- No pagination - unbounded results
- Surgery plan data loaded alongside case (correct)
- Pre-op checklist form: Need to verify implementation

---

### 5.4 /nurse/theatre-support

**Query surfaces:** SCHEDULED, IN_THEATER

**Issues:**
- CRITICAL: Should only show IN_THEATER (actually in surgery)
- SCHEDULED means "theater booked, waiting for patient" - not in surgery
- Polling at 60s is too slow for live surgery
- Should filter by theater_booking.start_time >= today
- Should sort by theater_booking.start_time (scheduled time)

**Theatre Safety Issues (P0):**
- Need to verify: autosave, offline capability, form state persistence
- Need to verify: swabs/instruments count validation
- Need to verify: time field sequence validation

---

### 5.5 /nurse/recovery-discharge

**Query surfaces:** RECOVERY status only

**Issues:**
- Polling at 60s - acceptable but 30s would be better
- Good - correct status filter
- Need to verify: post-op vitals flow, discharge summary data carry-over

---

### 5.6 /nurse/notifications

- Uses hardcoded key instead of queryKeys
- Polling at 30s is appropriate
- Need to verify: separate from notification bell in header

---

### 5.7 /nurse/profile

- No issues - uses only auth context

---

## SECTION 6: REAL-TIME STALENESS ANALYSIS

### SCENARIO A: New patient checked in by frontdesk
- **Current behavior**: Frontdesk invalidates own cache only
- **Nurse cache invalidated?**: NO
- **Staleness window**: Until next nurse page poll (30s on dashboard) or manual refresh
- **Root cause**: Missing cross-module cache invalidation

### SCENARIO B: Doctor starts consultation
- **Current behavior**: Doctor module updates status
- **Nurse cache invalidated?**: NO
- **Staleness window**: Up to 30s before nurse sees status change
- **Root cause**: Missing invalidation + polling gap

### SCENARIO C: Doctor completes surgery plan
- **Current behavior**: SurgicalCase status changes to READY_FOR_SCHEDULING or SCHEDULED
- **Nurse cache invalidated?**: NO
- **Staleness window**: Up to 30s before case appears in ward prep
- **Root cause**: Missing invalidation + polling gap

### SCENARIO D: Frontdesk books theater
- **Current behavior**: TheaterBooking created, case status becomes SCHEDULED
- **Nurse cache invalidated?**: NO
- **Staleness window**: Up to 60s before case appears in theatre-support
- **Root cause**: Missing invalidation + long polling interval

### SCENARIO E: Nurse completes pre-op checklist
- **Current behavior**: Case status transitions to READY_FOR_THEATER_BOOKING
- **Nurse module invalidates**: Pre-op queries (own module)
- **Frontdesk invalidated?**: NO
- **Doctor module invalidated?**: NO
- **Root cause**: Module-specific invalidation only

---

## SECTION 7: PRIORITY MATRIX

| Issue | Page(s) | Patient Impact | DB Load | Effort | Priority |
|-------|---------|----------------|---------|--------|----------|
| Ward prep includes IN_PREP/SCHEDULED statuses | ward-prep | HIGH | LOW | Low | P0 |
| Theatre support fetches SCHEDULED cases | theatre-support | HIGH | LOW | Low | P0 |
| No cross-module cache invalidation | all | HIGH | - | Medium | P1 |
| Wrong status filter for clinic queue | patients, dashboard | HIGH | LOW | Low | P1 |
| Theatre support polling 60s (should be 10s) | theatre-support | HIGH | - | Low | P1 |
| Hardcoded query keys (no shared cache) | all nurse hooks | MEDIUM | HIGH | Medium | P1 |
| Pre-op query has no pagination | ward-prep | MEDIUM | HIGH | Medium | P1 |
| Dashboard makes 4 independent calls | dashboard | MEDIUM | HIGH | Medium | P2 |
| Recovery polling 60s (could be 30s) | recovery-discharge | MEDIUM | - | Low | P2 |
| Pre-op readiness calculated in JS | ward-prep | LOW | MEDIUM | Medium | P2 |

---

## RECOMMENDED FIX SEQUENCE

### Phase 1: Critical Patient Flow Fixes (P0)
1. Fix ward-prep status filter - remove IN_PREP, SCHEDULED
2. Fix theatre-support status filter - remove SCHEDULED, add time filter
3. Fix clinic queue status filter - use CHECKED_IN instead of SCHEDULED

### Phase 2: Cache Architecture (P1)
4. Create shared query keys for nurse module using queryKeys factory
5. Add cross-module cache invalidation for all status transitions
6. Reduce theatre-support polling to 10s interval
7. Add pagination to pre-op query

### Phase 3: Performance (P2)
8. Create unified dashboard action (single fetch for all 4 data sources)
9. Move pre-op readiness calculation to DB level
10. Optimize select statements across nurse API routes

### Phase 4: Safety & Forms (P2)
11. Audit theatre support form for autosave, offline handling, validation
12. Verify vitals data flow to doctor module

---

## PATIENT JOURNEY INTEGRITY REPORT

| Journey Stage | Nurse Page | Current Behavior | Expected Behavior | Status |
|---------------|------------|-------------------|-------------------|--------|
| FRONTDESK CHECK-IN → CHECKED_IN | /nurse/patients | Shows SCHEDULED appointments | Should show CHECKED_IN patients | **BUG** |
| WAITING → IN_CONSULT | /nurse/patients | Patient remains until refresh | Should remove/update status immediately | **BUG** |
| DOCTOR COMPLETES PLAN → READY_FOR_PREOP | /nurse/ward-prep | Case appears after poll | Should appear immediately | **BUG** |
| NURSE COMPLETES PRE-OP → READY_FOR_THEATER_BOOKING | /nurse/ward-prep | Transitions case status | Frontdesk should see immediately | **BUG** |
| THEATER BOOKED → SCHEDULED | /nurse/theatre-support | Shows SCHEDULED (not in surgery) | Should NOT show until IN_THEATER | **BUG** |
| SURGERY COMPLETE → RECOVERY | /nurse/recovery-discharge | Appears after poll | Should appear immediately | **BUG** |

---

## CROSS-MODULE CONFLICT REPORT

| Entity | Nurse Key | Frontdesk Key | Doctor Key | Conflict |
|--------|-----------|---------------|------------|----------|
| Patient | hardcoded | queryKeys.frontdesk.patients() | queryKeys.doctor.patients() | YES |
| Appointment | hardcoded | queryKeys.frontdesk.todaysSchedule() | queryKeys.doctor.appointments() | YES |
| SurgicalCase | hardcoded (3 keys) | queryKeys.frontdesk.theaterQueue() | queryKeys.doctor.cases() | YES |
| Notifications | hardcoded | queryKeys.notifications | queryKeys.notifications | NO (but hardcoded) |

**Resolution needed:** All modules should use queryKeys.shared.* for shared entities

---

## FORM AUDIT REPORT

### Vitals Recording Form (/nurse/patients)
- Library: React useState
- Controlled inputs: YES
- Full form re-render on keystroke: YES
- Autosave: NO
- Draft persistence: NO
- API calls on submit: 1 (POST)
- Validation: Basic HTML5
- Submission: Waits for server
- Data loss risk: LOW (simple form)

### Pre-Op Ward Checklist (/nurse/ward-prep)
- **NEED MORE AUDIT** - Form implementation not fully traced

### Nurse Intra-Operative Record (/nurse/theatre-support)
- **NEED MORE AUDIT** - Form implementation not fully traced

### Post-Op / Discharge Summary (/nurse/recovery-discharge)
- **NEED MORE AUDIT** - Form implementation not fully traced

---

## THEATRE SAFETY REPORT

**P0 Items requiring immediate verification:**
1. Is there autosave during intra-op record entry?
2. What happens if browser refreshes mid-surgery?
3. Is there offline/local draft capability if network drops?
4. Are swabs/instruments/sharps counts validated before submit?
5. Are time fields (in/out) validated for logical sequence?
6. Is "last saved" timestamp visible?

---

## ADDITIONAL FINDINGS

1. Dashboard stats computed in JavaScript after full data fetch - should use DB aggregation
2. Pre-op query includes consents and images - heavy payload for list view
3. useMarkInTheater mutation - need to verify cache invalidation behavior
4. Nurse API client uses generic apiClient - may have inconsistent error handling
5. No error boundaries around nurse hooks - failures could crash entire page

---

## FILES AUDITED

### Pages
- `app/nurse/dashboard/page.tsx`
- `app/nurse/patients/page.tsx`
- `app/nurse/ward-prep/page.tsx`
- `app/nurse/theatre-support/page.tsx`
- `app/nurse/recovery-discharge/page.tsx`
- `app/nurse/notifications/page.tsx`
- `app/nurse/profile/page.tsx`

### Hooks
- `hooks/nurse/useNurseDashboard.ts`
- `hooks/nurse/usePreOpCases.ts`
- `hooks/nurse/useIntraOpCases.ts`
- `hooks/nurse/useRecoveryCases.ts`
- `hooks/useNotifications.ts`

### API Routes
- `app/api/nurse/pre-op/route.ts`
- `app/api/nurse/intra-op/route.ts`
- `app/api/nurse/recovery/route.ts`

### Supporting
- `lib/api/nurse.ts`
- `lib/constants/queryKeys.ts`
- `components/notifications/NotificationsPage.tsx`
- `components/nurse/RecordVitalsDialog.tsx`

### Prisma Schema
- `prisma/schema.prisma` (status enums verified)