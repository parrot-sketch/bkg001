# Phase 1: Theater Tech Feature Audit

**Date:** 2024-12-19  
**Scope:** Theater Tech day-of-operations feature (dayboard, case transitions, checklists, timeline)  
**Goal:** Map all code, identify code smells, performance issues, and create refactoring plan

---

## A) FEATURE SURFACE AREA MAPPING

### UI Pages
| File Path | Purpose | Lines | Status |
|-----------|---------|-------|--------|
| `app/theater-tech/dayboard/page.tsx` | Main dayboard UI (cases grouped by theater) | **2,051** | ⚠️ **TOO LARGE** |
| `app/theater-tech/dashboard/page.tsx` | Theater tech dashboard (likely redirects or summary) | ? | ✅ Keep |
| `app/theater-tech/profile/page.tsx` | User profile page | ? | ✅ Keep |
| `app/theater-tech/layout.tsx` | Layout wrapper | ? | ✅ Keep |
| `components/theater-tech/TheaterTechSidebar.tsx` | Sidebar navigation | ? | ✅ Keep |

### API Routes
| File Path | Purpose | Status | Notes |
|-----------|---------|--------|-------|
| `app/api/theater-tech/dayboard/route.ts` | GET dayboard data | ✅ Good | Uses service, has Zod validation |
| `app/api/theater-tech/cases/[id]/transition/route.ts` | POST case status transition | ✅ Good | Uses Zod, calls service |
| `app/api/theater-tech/surgical-cases/[caseId]/checklist/route.ts` | GET/PUT checklist | ✅ Good | Uses Zod validation |
| `app/api/theater-tech/surgical-cases/[caseId]/checklist/sign-in/finalize/route.ts` | POST finalize Sign-In | ✅ Good | Uses Zod |
| `app/api/theater-tech/surgical-cases/[caseId]/checklist/time-out/finalize/route.ts` | POST finalize Time-Out | ✅ Good | Uses Zod |
| `app/api/theater-tech/surgical-cases/[caseId]/checklist/sign-out/finalize/route.ts` | POST finalize Sign-Out | ✅ Good | Uses Zod |
| `app/api/theater-tech/surgical-cases/[caseId]/timeline/route.ts` | GET/PATCH timeline | ✅ Good | Uses Zod |
| `app/api/theater-tech/today/route.ts` | Legacy "today" endpoint | ⚠️ **CHECK** | May be duplicate of dayboard |
| `app/api/theater-tech/cases/[id]/checklist/route.ts` | Legacy checklist endpoint | ⚠️ **CHECK** | May be duplicate |
| `app/api/theater-tech/cases/[id]/procedure-record/timestamps/route.ts` | Legacy timestamps endpoint | ⚠️ **CHECK** | May be duplicate of timeline |

### Services
| File Path | Purpose | Lines | Status |
|-----------|---------|-------|--------|
| `application/services/TheaterTechService.ts` | Main orchestration service | 554 | ✅ Good structure |
| `application/services/TheaterDashboardService.ts` | Dayboard query builder | ~500 | ✅ Good |
| `application/services/SurgicalChecklistService.ts` | Checklist operations | ~250 | ✅ Good |
| `application/services/ProcedureTimelineService.ts` | Timeline operations | ~240 | ✅ Good |

### Repositories
| File Path | Purpose | Status |
|-----------|---------|--------|
| `infrastructure/database/repositories/PrismaSurgicalChecklistRepository.ts` | Checklist persistence | ✅ Keep |
| `infrastructure/database/repositories/PrismaClinicalAuditRepository.ts` | Audit logging | ✅ Keep |

### DTOs
| File Path | Purpose | Status |
|-----------|---------|--------|
| `application/dtos/TheaterTechDtos.ts` | All Theater Tech DTOs | ✅ Keep |

### Domain Helpers
| File Path | Purpose | Status |
|-----------|---------|--------|
| `domain/clinical-forms/WhoSurgicalChecklist.ts` | WHO checklist schemas + validation | ✅ Keep |
| `domain/helpers/operativeTimeline.ts` | Timeline validation + duration computation | ✅ Keep |
| `domain/clinical-forms/NurseIntraOpRecord.ts` | Intra-op gate helpers | ✅ Keep |
| `domain/clinical-forms/NurseRecoveryRecord.ts` | Recovery gate helpers | ✅ Keep |

### Factory
| File Path | Purpose | Status |
|-----------|---------|--------|
| `lib/factories/theaterTechFactory.ts` | Service factory (singleton) | ✅ Keep |

---

## B) DEPENDENCY MAP

```
UI Layer (app/theater-tech/dayboard/page.tsx)
  ↓
API Layer (app/api/theater-tech/*)
  ↓
Service Layer (application/services/TheaterTechService.ts)
  ├── TheaterDashboardService (getDayboard)
  ├── SurgicalCaseService (transitionTo)
  ├── SurgicalChecklistService (checklist operations)
  ├── ProcedureTimelineService (timeline operations)
  └── Repositories
      ├── ISurgicalChecklistRepository
      └── IClinicalAuditRepository
  ↓
Prisma (database queries)
```

---

## C) CODE SMELLS IDENTIFIED

### 🔴 CRITICAL ISSUES

1. **Giant Page Component** (`app/theater-tech/dayboard/page.tsx`)
   - **Lines:** 2,051 (should be < 500)
   - **Issues:**
     - Contains all UI logic, API helpers, constants, and components in one file
     - Multiple responsibilities: data fetching, mutations, rendering, dialogs
     - Hard to test, maintain, and understand
   - **Action:** Split into:
     - `hooks/theater-tech/useDayboard.ts` - Data fetching
     - `hooks/theater-tech/useCaseTransition.ts` - Transition mutations
     - `hooks/theater-tech/useChecklist.ts` - Checklist mutations
     - `hooks/theater-tech/useTimeline.ts` - Timeline mutations
     - `components/theater-tech/DayboardCaseCard.tsx` - Case card component
     - `components/theater-tech/TransitionDialog.tsx` - Transition dialog
     - `components/theater-tech/ChecklistDialog.tsx` - Checklist dialog
     - `components/theater-tech/TimelineDialog.tsx` - Timeline dialog
     - `components/theater-tech/BlockersDialog.tsx` - Blockers dialog
     - `lib/theater-tech/dayboard-helpers.ts` - Pure helper functions (CTA mapping, blocker rendering)

2. **Unsafe Type Casting** (`TheaterTechService.ts`)
   - **Lines:** 395, 468
   - **Issue:** `data as any` used for gate compliance checks
   - **Action:** Use Zod parsing with proper schemas

3. **Inconsistent Response Shapes**
   - Some routes return `{ success: true, data: ... }` ✅
   - Some routes return `{ success: false, error: ..., missingItems: ... }` (transition route)
   - Some routes return `{ success: false, error: ..., metadata: ... }` (checklist routes)
   - **Action:** Standardize to `ApiResponse<T>` with structured error metadata

4. **Legacy/Duplicate Routes**
   - `app/api/theater-tech/today/route.ts` - May duplicate dayboard
   - `app/api/theater-tech/cases/[id]/checklist/route.ts` - May duplicate surgical-cases route
   - `app/api/theater-tech/cases/[id]/procedure-record/timestamps/route.ts` - May duplicate timeline route
   - **Action:** Audit and delete if unused

### 🟡 MODERATE ISSUES

5. **Business Logic in UI** (`dayboard/page.tsx`)
   - **Lines:** 562-572 (filtering logic), 1131-1231 (blocker chip rendering logic)
   - **Issue:** Complex filtering and blocker classification in component
   - **Action:** Move to pure helper functions

6. **Long Functions in Service**
   - `TheaterTechService.enforceChecklistGates()` - 94 lines
   - `TheaterTechService.enforceIntraOpRecoveryGate()` - 61 lines
   - `TheaterTechService.enforceRecoveryCompletedGate()` - 61 lines
   - **Action:** Split into smaller, testable helpers

7. **JSON Parsing Without Validation**
   - `TheaterTechService.ts` lines 387, 460: `JSON.parse()` then `as any`
   - `TheaterDashboardService.ts` lines 152, 157: `JSON.parse()` without validation
   - **Action:** Use Zod schemas to parse and validate

8. **Duplicate Service Methods**
   - `TheaterTechService.getChecklistStatus()`, `getChecklist()`, `getChecklistByCaseId()` all do the same thing
   - **Action:** Keep one, remove duplicates

### 🟢 MINOR ISSUES

9. **Error Handling Inconsistency**
   - Some routes catch `DomainException` and return 422
   - Some routes catch generic `Error` and return 500
   - **Action:** Standardize error handling with structured responses

10. **Missing Type Safety**
    - `TransitionError` class defined in UI file (should be in shared types)
    - `ChecklistFinalizeError` class defined in UI file
    - `TimelineUpdateError` class defined in UI file
    - **Action:** Move to shared error types file

---

## D) PERFORMANCE AUDIT

### Prisma Queries

#### `TheaterDashboardService.getDayboard()`
- **Query Type:** `findMany` with nested `select`
- **Optimization:** ✅ Uses `select` (not `include`) - good
- **Potential N+1:** ❌ **YES** - Two queries:
  1. First query: `theaterBooking.findMany` with nested selects
  2. Second query: `clinicalFormResponse.findMany` for blocker forms
- **Index Usage:**
  - `theaterBooking.start_time` - ✅ Likely indexed
  - `theaterBooking.status` - ✅ Likely indexed
  - `clinicalFormResponse.surgical_case_id` - ✅ Likely indexed
  - `clinicalFormResponse.template_key` - ✅ Likely indexed
- **Action:** Consider combining into single query with proper joins, or verify indexes exist

#### `TheaterTechService.transitionCase()`
- **Query Type:** `findUnique` (case lookup)
- **Optimization:** ✅ Single query
- **N+1:** ✅ No

#### `TheaterTechService.enforceChecklistGates()`
- **Query Type:** Multiple `findUnique` calls
- **Optimization:** ⚠️ Could be optimized with single query
- **N+1:** ⚠️ Multiple sequential queries for checklist, intra-op, recovery records

#### `ProcedureTimelineService.getTimeline()`
- **Query Type:** `findUnique` with nested `select`
- **Optimization:** ✅ Uses `select` - good
- **N+1:** ✅ No

### Index Recommendations
Verify these indexes exist in `prisma/schema.prisma`:
- `theaterBooking.start_time` (for date range queries)
- `theaterBooking.status` (for filtering)
- `clinicalFormResponse.surgical_case_id` (for blocker queries)
- `clinicalFormResponse.template_key` (for template filtering)
- `clinicalFormResponse.status` (for status filtering)

---

## E) RESPONSE SHAPE ANALYSIS

### Current Patterns

1. **Success Response:**
   ```typescript
   { success: true, data: T }
   ```

2. **Error Response (Transition):**
   ```typescript
   { success: false, error: string, missingItems?: string[], blockingCategory?: string }
   ```

3. **Error Response (Checklist):**
   ```typescript
   { success: false, error: string, metadata?: { missingItems?: string[] } }
   ```

4. **Error Response (Generic):**
   ```typescript
   { success: false, error: string }
   ```

### Target Pattern (Phase 2)
```typescript
// Success
{ success: true, data: T }

// Structured Error (Gate Blocked)
{ 
  success: false, 
  error: string,
  code: 'GATE_BLOCKED' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'INTERNAL_ERROR',
  metadata?: {
    blockingCategory?: string,
    missingItems?: string[],
    errors?: Array<{ field: string; message: string }>
  }
}
```

---

## F) FILE COUNT SUMMARY

- **Total Files:** 15+ API routes, 4 services, 1 large UI page, multiple components
- **Total Lines:** ~4,513 (UI + services + routes)
- **Largest File:** `dayboard/page.tsx` (2,051 lines) ⚠️
- **Services:** Well-structured, but some long functions
- **API Routes:** Generally good, but inconsistent error responses

---

## G) ACTION PLAN

### Phase 2: Target Clean Design
1. Define `ApiResponse<T>` with structured error codes
2. Define `GateBlockedError` type with `{ code, blockingCategory, missingItems[] }`
3. Ensure one service entry point per action
4. Document canonical patterns

### Phase 3: Refactor
1. **Split dayboard page** into hooks + components (highest priority)
2. **Remove `any` types** - use Zod parsing
3. **Standardize error responses** - use `ApiResponse<T>`
4. **Extract business logic** from UI to helpers
5. **Split long service methods** into smaller helpers
6. **Delete duplicate/legacy routes** after verification
7. **Move error classes** to shared types

### Phase 4: Tests
1. Unit tests for gate helpers
2. Unit tests for blocker classification
3. Integration tests for transitions
4. Integration tests for checklist finalize
5. Integration tests for timeline updates

### Phase 5: Verify
1. Run TypeScript check
2. Run build
3. Run all tests
4. Fix any issues

---

## H) PRIORITY RANKING

1. **P0 (Critical):** Split dayboard page (2,051 lines → multiple files)
2. **P0 (Critical):** Remove `any` types, use Zod parsing
3. **P1 (High):** Standardize error responses to `ApiResponse<T>`
4. **P1 (High):** Extract business logic from UI
5. **P2 (Medium):** Split long service methods
6. **P2 (Medium):** Delete duplicate routes
7. **P3 (Low):** Move error classes to shared types

---

**Next Step:** Proceed to Phase 2 (Target Clean Design) to define canonical patterns before refactoring.
