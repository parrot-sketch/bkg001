# Phase 2: Theater Tech Canonical Design Patterns

**Date:** 2024-12-19  
**Status:** Design Complete - Ready for Phase 3 Refactoring

---

## Overview

This document defines the canonical patterns for Theater Tech API endpoints, error handling, and service interfaces. All Phase 3 refactoring must adhere to these patterns.

---

## 1. API Response Standard

### Type Definition

All Theater Tech endpoints return `ApiResponse<T>`:

```typescript
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code: ApiErrorCode; metadata?: ApiErrorMetadata }
```

### Error Codes

```typescript
enum ApiErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',  // 400
  NOT_FOUND = 'NOT_FOUND',                // 404
  FORBIDDEN = 'FORBIDDEN',                 // 403
  UNAUTHORIZED = 'UNAUTHORIZED',           // 401
  GATE_BLOCKED = 'GATE_BLOCKED',           // 422
  CONFLICT = 'CONFLICT',                   // 409
  INTERNAL_ERROR = 'INTERNAL_ERROR',      // 500
}
```

### Helper Functions

```typescript
// Success response
ok<T>(data: T): ApiSuccess<T>

// Error response
fail(code: ApiErrorCode, error: string, metadata?: ApiErrorMetadata): ApiError

// Zod error conversion
fromZodError(zodError: ZodError): ApiErrorMetadata
```

### Usage in Routes

```typescript
// ✅ CORRECT
import { ok } from '@/lib/http/apiResponse';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';

export async function GET(...) {
  try {
    const data = await service.getData();
    return handleApiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}

// ❌ WRONG - Inconsistent response shape
return NextResponse.json({ success: true, data }, { status: 200 });
return NextResponse.json({ success: false, error }, { status: 400 });
```

---

## 2. Application Error Classes

### Error Hierarchy

All application errors extend `DomainException` and include a `code` property:

```typescript
// Gate blocked (business rule violation)
GateBlockedError(message, blockingCategory, missingItems[])

// Validation failed
ValidationError(message, errors[])

// Resource not found
NotFoundError(message, resourceType?, resourceId?)

// Access denied
ForbiddenError(message, requiredRole?)

// State conflict
ConflictError(message, conflictReason?)
```

### Error Mapping to HTTP Status

| Error Class | HTTP Status | ApiErrorCode |
|------------|-------------|--------------|
| `GateBlockedError` | 422 | `GATE_BLOCKED` |
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `ConflictError` | 409 | `CONFLICT` |
| Other | 500 | `INTERNAL_ERROR` |

### Usage in Services

```typescript
// ✅ CORRECT
import { GateBlockedError } from '@/application/errors';

if (!signInDone) {
  throw new GateBlockedError(
    'Cannot transition to IN_THEATER: WHO Sign-In checklist must be finalized',
    'WHO_CHECKLIST',
    missingItems
  );
}

// ❌ WRONG - Generic DomainException
throw new DomainException('Cannot transition', { gate: 'WHO_CHECKLIST' });
```

---

## 3. TheaterTechService Public Interface

### Canonical Methods (Final)

```typescript
class TheaterTechService {
  // Dayboard
  getDayboard(date: Date, theaterId?: string): Promise<DayboardDto>
  getTodayBoard(date: Date): Promise<TheaterBoardDto>  // Legacy, deprecated

  // Case Transitions
  transitionCase(
    caseId: string,
    action: string,
    userId: string,
    userRole: string,
    reason?: string
  ): Promise<CaseTransitionResultDto>

  // Checklist Operations
  getChecklistStatus(caseId: string): Promise<ChecklistStatusDto>
  saveChecklistDraft(
    caseId: string,
    phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT',
    items: ChecklistItem[],
    userId: string,
    userRole: string
  ): Promise<ChecklistStatusDto>
  finalizeChecklistPhase(
    caseId: string,
    phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT',
    items: ChecklistItem[],
    userId: string,
    userRole: string
  ): Promise<ChecklistStatusDto>

  // Timeline Operations
  getTimeline(caseId: string): Promise<TimelineResultDto>
  updateTimeline(
    caseId: string,
    timestamps: TimelinePatchInput,
    userId: string,
    userRole: string
  ): Promise<TimelineResultDto>
}
```

### Deprecated Methods (Remove in Phase 3)

```typescript
// ❌ DEPRECATED - Use getChecklistStatus() instead
getChecklist(caseId: string): Promise<ChecklistStatusDto>
getChecklistByCaseId(caseId: string): Promise<ChecklistStatusDto>

// ❌ DEPRECATED - Use updateTimeline() instead
updateProcedureTimestamps(...): Promise<ProcedureTimestampResultDto>

// ❌ DEPRECATED - Use finalizeChecklistPhase() instead
completeChecklistPhase(...): Promise<ChecklistStatusDto>
```

---

## 4. JSON Parsing Rule

### Rule: No `JSON.parse()` Without Zod Validation

**All JSON parsing must use Zod schemas for validation.**

### Parser Functions

```typescript
// ✅ CORRECT - Use parser functions
import { parseIntraOpRecordForGate, parseRecoveryRecordForGate } from '@/lib/parsers/clinicalFormParsers';

const data = parseIntraOpRecordForGate(form.data_json);
const missingItems = checkNurseRecoveryGateCompliance(data);

// ❌ WRONG - Unsafe parsing
const data = JSON.parse(form.data_json) as any;
const missingItems = checkNurseRecoveryGateCompliance(data);
```

### Available Parsers

- `parseIntraOpRecordData(jsonString, strict?)` - Parse intra-op record (draft or final)
- `parseIntraOpRecordForGate(jsonString)` - Parse intra-op record for gate checks (strict)
- `parseRecoveryRecordData(jsonString, strict?)` - Parse recovery record (draft or final)
- `parseRecoveryRecordForGate(jsonString)` - Parse recovery record for gate checks (strict)

### Error Handling

All parsers throw `ValidationError` on invalid data:

```typescript
try {
  const data = parseIntraOpRecordForGate(jsonString);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
    console.error('Invalid data:', error.errors);
  }
  throw error;
}
```

---

## 5. Route Error Mapping Contract

### Standard Pattern

All routes must use `handleApiError()`:

```typescript
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ok } from '@/lib/http/apiResponse';

export async function POST(request: NextRequest, { params }) {
  try {
    // 1. Authenticate
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return handleApiError(new ForbiddenError('Authentication required'));
    }

    // 2. Authorize
    if (!ALLOWED_ROLES.has(authResult.user.role)) {
      return handleApiError(new ForbiddenError('Access denied'));
    }

    // 3. Validate input (Zod)
    const body = await request.json();
    const validation = schema.safeParse(body);
    if (!validation.success) {
      return handleApiError(validation.error);
    }

    // 4. Call service
    const result = await service.method(validation.data);

    // 5. Return success
    return handleApiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Error Mapping Table

| Error Type | HTTP Status | Response Shape |
|------------|-------------|----------------|
| `GateBlockedError` | 422 | `{ success: false, error, code: 'GATE_BLOCKED', metadata: { blockingCategory, missingItems } }` |
| `ValidationError` | 400 | `{ success: false, error, code: 'VALIDATION_ERROR', metadata: { errors } }` |
| `NotFoundError` | 404 | `{ success: false, error, code: 'NOT_FOUND' }` |
| `ForbiddenError` | 403 | `{ success: false, error, code: 'FORBIDDEN' }` |
| `ConflictError` | 409 | `{ success: false, error, code: 'CONFLICT' }` |
| `ZodError` | 400 | `{ success: false, error, code: 'VALIDATION_ERROR', metadata: { errors } }` |
| `DomainException` (legacy) | 422 | `{ success: false, error, code: 'VALIDATION_ERROR' }` |
| Unknown | 500 | `{ success: false, error, code: 'INTERNAL_ERROR' }` |

---

## 6. Legacy Route Deprecation List

### Routes to Audit and Remove (Phase 3)

1. **`app/api/theater-tech/today/route.ts`**
   - **Status:** Check if used
   - **Replacement:** `app/api/theater-tech/dayboard/route.ts`
   - **Action:** Search codebase for imports, delete if unused

2. **`app/api/theater-tech/cases/[id]/checklist/route.ts`**
   - **Status:** Check if used
   - **Replacement:** `app/api/theater-tech/surgical-cases/[caseId]/checklist/route.ts`
   - **Action:** Search codebase for imports, delete if unused

3. **`app/api/theater-tech/cases/[id]/procedure-record/timestamps/route.ts`**
   - **Status:** Check if used
   - **Replacement:** `app/api/theater-tech/surgical-cases/[caseId]/timeline/route.ts`
   - **Action:** Search codebase for imports, delete if unused

### Verification Steps (Phase 3)

```bash
# Search for imports
grep -r "theater-tech/today" app/ components/ hooks/
grep -r "theater-tech/cases" app/ components/ hooks/
grep -r "procedure-record/timestamps" app/ components/ hooks/

# If no matches, safe to delete
```

---

## 7. Phase 3 Refactor Checklist

### High Priority (P0)

- [ ] **Split dayboard page** (`app/theater-tech/dayboard/page.tsx`)
  - Extract hooks: `useDayboard`, `useCaseTransition`, `useChecklist`, `useTimeline`
  - Extract components: `DayboardCaseCard`, `TransitionDialog`, `ChecklistDialog`, `TimelineDialog`, `BlockersDialog`
  - Extract helpers: `dayboard-helpers.ts` (CTA mapping, blocker rendering)

- [ ] **Remove `any` types**
  - Replace `JSON.parse() as any` with parser functions
  - Update `TheaterTechService.enforceIntraOpRecoveryGate()` (line 395)
  - Update `TheaterTechService.enforceRecoveryCompletedGate()` (line 468)
  - Update `TheaterDashboardService.getDayboard()` (lines 152, 157)

- [ ] **Standardize error responses**
  - Update all routes to use `handleApiError()` and `handleApiSuccess()`
  - Replace `DomainException` with specific error classes where appropriate

### Medium Priority (P1)

- [ ] **Extract business logic from UI**
  - Move filtering logic to `dayboard-helpers.ts`
  - Move blocker chip rendering to `dayboard-helpers.ts`

- [ ] **Split long service methods**
  - Split `enforceChecklistGates()` into smaller helpers
  - Split `enforceIntraOpRecoveryGate()` into smaller helpers
  - Split `enforceRecoveryCompletedGate()` into smaller helpers

- [ ] **Remove duplicate service methods**
  - Remove `getChecklist()` (use `getChecklistStatus()`)
  - Remove `getChecklistByCaseId()` (use `getChecklistStatus()`)
  - Remove `updateProcedureTimestamps()` (use `updateTimeline()`)
  - Remove `completeChecklistPhase()` (use `finalizeChecklistPhase()`)

### Low Priority (P2)

- [ ] **Delete legacy routes** (after verification)
  - Delete `app/api/theater-tech/today/route.ts`
  - Delete `app/api/theater-tech/cases/[id]/checklist/route.ts`
  - Delete `app/api/theater-tech/cases/[id]/procedure-record/timestamps/route.ts`

- [ ] **Move error classes from UI to shared types**
  - Remove `TransitionError`, `ChecklistFinalizeError`, `TimelineUpdateError` from UI
  - Use `ApiResponse` error handling instead

---

## 8. Testing Requirements

### Unit Tests (Phase 4)

- [ ] `lib/http/apiResponse.ts` - Test `ok()`, `fail()`, `fromZodError()`
- [ ] `app/api/_utils/handleApiError.ts` - Test error mapping for all error types
- [ ] `lib/parsers/clinicalFormParsers.ts` - Test parsers with valid/invalid JSON
- [ ] Application error classes - Test error creation and properties

### Integration Tests (Phase 4)

- [ ] Route error handling - Verify all routes return `ApiResponse<T>` shape
- [ ] Error code mapping - Verify correct HTTP status codes
- [ ] Gate blocking - Verify `GateBlockedError` returns 422 with metadata

---

## 9. Migration Notes

### Breaking Changes

1. **Error Response Shape**
   - Old: `{ success: false, error: string, missingItems?: string[] }`
   - New: `{ success: false, error: string, code: ApiErrorCode, metadata?: ApiErrorMetadata }`
   - **Impact:** Frontend must update error handling to use `code` and `metadata`

2. **Service Method Names**
   - Old: `getChecklist()`, `getChecklistByCaseId()`
   - New: `getChecklistStatus()`
   - **Impact:** Update all service calls

### Backward Compatibility

- Legacy `DomainException` is still handled by `handleApiError()` (maps to 422)
- Existing routes continue to work during migration
- New routes must use canonical patterns

---

## 10. Verification Checklist

Before considering Phase 2 complete:

- [x] `lib/http/apiResponse.ts` created with all types and helpers
- [x] Application error classes created in `application/errors/`
- [x] JSON parsers created in `lib/parsers/clinicalFormParsers.ts`
- [x] Error handler utility created in `app/api/_utils/handleApiError.ts`
- [x] Design document created
- [ ] `pnpm tsc --noEmit` passes
- [ ] Unit tests for new helpers pass
- [ ] No UI refactoring performed (Phase 2 scope)

---

**Next Step:** Proceed to Phase 3 (Refactor) using these canonical patterns.
