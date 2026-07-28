# SessionService Extraction Plan

## Purpose

This document specifies the exact, step-by-step procedure for extracting SessionService from ConsultationContext. It follows the canonical Shim-First Replacement pattern defined in Migration Architecture v2.

---

## 1. Extraction Phases

### Phase 1: CREATE (Weeks 1-2)

**Goal:** Implement SessionService and its migration shim without modifying ConsultationContext behavior.

#### Step 1.1: Define Ports

Create or verify the following Domain ports:

| Port | Location | Action |
|------|----------|--------|
| `ConsultationApi` | `domain/interfaces/services/ConsultationApi.ts` | Already exists — verify methods |
| `DoctorApi` | `domain/interfaces/services/DoctorApi.ts` | Already exists — verify methods |
| `PatientApi` | `domain/interfaces/services/PatientApi.ts` | Create if missing |
| `DraftStorage` | `shared-kernel/interfaces/draft-storage.ts` | Already exists — verify methods |

#### Step 1.2: Define Error Types

Create `shared-kernel/errors/session-codes.ts`:

```typescript
export enum SessionErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  CONFLICT = 'CONFLICT',
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  CLINICAL_VIOLATION = 'CLINICAL_VIOLATION',
  STATE_CONFLICT = 'STATE_CONFLICT',
  UNKNOWN = 'UNKNOWN',
}
```

#### Step 1.3: Implement SessionService

Create `application/services/SessionService.ts`:

- Constructor with all required dependencies (see `sessionservice-dependency-analysis.md`)
- Implement all 10 public methods (see `sessionservice-public-api.md`)
- Each method:
  - Validates inputs
  - Issues workflow command via coordinator
  - Calls infrastructure via ports
  - Returns `SessionResult<T>`
  - Never imports React

#### Step 1.4: Implement LegacyOperations

Create `application/shim/LegacySessionOperations.ts`:

- Exact frozen copy of session-related logic from ConsultationContext
- Methods: `loadAppointment`, `startConsultation`, `completeConsultation`, `switchToPatient`, `sendHeartbeat`
- No modifications after creation
- Marked with `@legacy` JSDoc tag

#### Step 1.5: Implement Shim

Create `application/shim/SessionOperationsShim.ts`:

```typescript
export class SessionOperationsShim {
  constructor(
    private readonly service: SessionService,
    private readonly legacy: LegacySessionOperations,
    private readonly dispatch: WorkflowDispatch,
  ) {}

  async initializeSession(appointmentId: number) {
    if (isFeatureEnabled('USE_SESSION_SERVICE')) {
      return this.service.initializeSession(appointmentId);
    }
    return this.legacy.initializeSession(appointmentId, this.dispatch);
  }

  // ... one method per SessionService method ...
}
```

**Critical:** The shim is the ONLY consumer of the feature flag.

#### Step 1.6: Wire Shim into ConsultationContext

Modify `contexts/ConsultationContext.tsx`:

```typescript
// Add ONE useMemo:
const sessionOps = useMemo(() => {
  const service = new SessionService(
    coordinatorFactory.create(),
    coordinatorFactory,
    consultationApi,
    doctorApi,
    patientApi,
    draftService,
    draftStorage,
  );
  const legacy = new LegacySessionOperations(...);
  return new SessionOperationsShim(service, legacy, dispatch);
}, []);

// Replace inline method calls:
// OLD: await workflowShim.transitionTo(...)
// NEW: await sessionOps.startSession(...)

// OLD: dispatch({ type: 'SET_DATA', payload: ... })
// NEW: const result = await sessionOps.initializeSession(id); if (result.success) dispatchSetData(result.data);
```

**Critical:** ConsultationContext must NOT expand in lines. Every line of old logic removed must be replaced by one line of shim delegation.

#### Step 1.7: Add Unit Tests

- `tests/unit/application/services/SessionService.test.ts`
- `tests/unit/application/shim/LegacySessionOperations.test.ts`
- `tests/unit/application/shim/SessionOperationsShim.test.ts`

---

### Phase 2: VALIDATE (Weeks 2-3)

**Goal:** Prove behavioral parity and ensure no regressions.

#### Step 2.1: Parallel Testing

- Set feature flag `USE_SESSION_SERVICE = false` → run full test suite
- Set feature flag `USE_SESSION_SERVICE = true` → run full test suite
- Compare results: identical outputs for identical inputs

#### Step 2.2: Behavioral Parity Tests

Create `tests/unit/application/services/SessionService.parity.test.ts`:

```typescript
describe('SessionService behavioral parity', () => {
  it('initializeSession produces identical result to legacy for valid appointment', async () => {
    const legacyResult = await legacy.initializeSession(1, dispatch);
    const serviceResult = await service.initializeSession(1);
    expect(serviceResult.success).toBe(legacyResult.success);
    // ... deep comparison of all fields
  });

  // One test per method × one test per failure mode
});
```

#### Step 2.3: Architecture Compliance Tests

- Verify ConsultationContext does NOT import `isFeatureEnabled`
- Verify ConsultationContext line count did NOT increase
- Verify SessionService does NOT import React
- Verify SessionService does NOT call `getNextState` or `canPerformAction` directly

#### Step 2.4: Certification Tests

- Re-run all 338 workflow tests — must pass
- Re-run full suite — no regressions

---

### Phase 3: CUT OVER (Week 3)

**Goal:** Promote SessionService to canonical implementation.

#### Step 3.1: Enable Feature Flag

Set `USE_SESSION_SERVICE = true` in `shared-kernel/feature-flags.ts`.

#### Step 3.2: Monitor

- Run full test suite with flag enabled
- Manual smoke test in staging:
  - Load appointment
  - Start consultation
  - Switch patient
  - Complete consultation
  - Pause/resume
  - Queue advancement

#### Step 3.3: Freeze Legacy

`LegacySessionOperations` is now frozen. No modifications. Bug fixes go to SessionService only.

---

### Phase 4: REMOVE (Week 4)

**Goal:** Clean up all temporary artifacts.

#### Step 4.1: Delete LegacySessionOperations

Delete `application/shim/LegacySessionOperations.ts`.

#### Step 4.2: Delete SessionOperationsShim

Delete `application/shim/SessionOperationsShim.ts`.

#### Step 4.3: Delete Feature Flag

Remove `USE_SESSION_SERVICE` from `shared-kernel/feature-flags.ts`.

#### Step 4.4: Update ConsultationContext

Replace shim delegation with direct SessionService calls:

```typescript
// Before: await sessionOps.initializeSession(id)
// After:  await sessionService.initializeSession(id)
```

**Verify:** ConsultationContext has FEWER lines than before extraction started.

#### Step 4.5: Remove Shim from Barrel

Remove `export * from './SessionOperationsShim'` from `application/shim/index.ts`.

#### Step 4.6: Final Certification

- Run full test suite
- TypeScript compilation
- Architecture compliance check

---

## 2. File Inventory

### Files Created

| File | Lines | Lifetime |
|------|-------|----------|
| `application/services/SessionService.ts` | ~450 | Permanent |
| `application/shim/LegacySessionOperations.ts` | ~400 | Temporary — deleted in Phase 4 |
| `application/shim/SessionOperationsShim.ts` | ~150 | Temporary — deleted in Phase 4 |
| `tests/unit/application/services/SessionService.test.ts` | ~300 | Permanent |
| `tests/unit/application/services/SessionService.parity.test.ts` | ~200 | Permanent |
| `tests/unit/application/shim/LegacySessionOperations.test.ts` | ~100 | Deleted with legacy |
| `tests/unit/application/shim/SessionOperationsShim.test.ts` | ~80 | Deleted with shim |

### Files Modified

| File | Change |
|------|--------|
| `contexts/ConsultationContext.tsx` | Replace inline logic with shim calls → direct service calls |
| `shared-kernel/feature-flags.ts` | Add `USE_SESSION_SERVICE` → Remove after cutover |
| `application/shim/index.ts` | Add shim export → Remove after cutover |

### Files Deleted

| File | Lines Removed |
|------|---------------|
| `LegacySessionOperations.ts` | ~400 |
| `SessionOperationsShim.ts` | ~150 |

---

## 3. ConsultationContext Evolution

| Phase | Lines | Description |
|-------|-------|-------------|
| **Current** | 926 | Session logic + UI logic mixed |
| **After Phase 1** | 926 | Same — shim wired but legacy path active |
| **After Phase 3** | 926 | Same — flag enabled but shim still in place |
| **After Phase 4** | ~650 | Session logic removed, direct service calls |

**Net reduction: ~276 lines (-30%)**

---

## 4. Rollback Triggers

| Trigger | Action |
|---------|--------|
| Parity tests fail | Disable flag → legacy path active → debug |
| Production regression | Disable flag → shim routes to legacy → investigate |
| Clinical safety event | Disable flag → revert to proven path → emergency hotfix |
| Performance regression | Disable flag → compare latency → fix service or abandon |

**Maximum rollback time: < 1 minute** (single flag toggle).
