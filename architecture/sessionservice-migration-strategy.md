# SessionService Migration Strategy

## Purpose

This document defines the migration strategy for introducing SessionService into the production codebase following the canonical Shim-First Replacement pattern from Migration Architecture v2.

---

## 1. Migration Pattern

### Canonical Pattern: Shim-First Replacement

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: CREATE                                             │
│  - Implement SessionService                                  │
│  - Implement LegacySessionOperations (frozen copy)           │
│  - Implement SessionOperationsShim (routes between them)     │
│  - Wire shim into ConsultationContext via single useMemo     │
│  - Feature flag consumed ONLY inside shim                    │
├─────────────────────────────────────────────────────────────┤
│  STEP 2: VALIDATE                                           │
│  - Unit tests for SessionService                             │
│  - Behavioral parity tests: flag OFF vs ON                   │
│  - ConsultationContext does NOT branch on flag               │
│  - ConsultationContext does NOT increase in lines             │
├─────────────────────────────────────────────────────────────┤
│  STEP 3: CUT OVER                                           │
│  - Enable USE_SESSION_SERVICE flag                           │
│  - All traffic routes to SessionService                      │
│  - Monitor for 1-2 days in staging                           │
│  - LegacySessionOperations is frozen                          │
├─────────────────────────────────────────────────────────────┤
│  STEP 4: REMOVE LEGACY                                      │
│  - Delete LegacySessionOperations                            │
│  - Delete SessionOperationsShim                              │
│  - Delete USE_SESSION_SERVICE flag                           │
│  - Update ConsultationContext → direct SessionService calls  │
│  - VERIFY: Context is SMALLER than before extraction         │
└─────────────────────────────────────────────────────────────┘
```

**Result: Zero embedded legacy branches. Zero feature flags. ConsultationContext shrinks.**

---

## 2. Why This Differs from DraftService

### DraftService Migration (Incorrect)

| Aspect | DraftService | SessionService (Target) |
|--------|--------------|-------------------------|
| Feature flag placement | Scattered across 4 locations in ConsultationContext | Single flag inside SessionOperationsShim only |
| Legacy logic location | Inline `else` branches in ConsultationContext | Isolated in LegacySessionOperations class |
| Line count impact | +15 lines | 0 lines (constant size during validation) |
| Rollback complexity | Must verify 4 separate paths | Single flag toggle |
| Cleanup complexity | Remove 4 flag checks + inline branches | Delete 2 files + 1 flag |

### Key Difference

**DraftService used scattered flags. SessionService uses a single shim boundary.**

---

## 3. Shim Architecture

### 3.1 SessionOperationsShim

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

  // ... one method per SessionService public method ...
}
```

### 3.2 LegacySessionOperations

```typescript
export class LegacySessionOperations {
  constructor(
    private readonly dispatch: WorkflowDispatch,
    private readonly consultationApi: ConsultationApi,
    private readonly doctorApi: DoctorApi,
    private readonly patientApi: PatientApi,
    private readonly draftService: DraftService,
  ) {}

  async initializeSession(appointmentId: number, dispatch: WorkflowDispatch) {
    // EXACT COPY of current ConsultationContext.loadAppointment logic
    // NO modifications after creation
    // NO refactoring
    // NO bug fixes
  }

  // ... exact copies of startConsultation, completeConsultation, etc. ...
}
```

**Rule:** Once created, `LegacySessionOperations` is never modified. Bug fixes go only to `SessionService`.

---

## 4. ConsultationContext Integration

### 4.1 Before Extraction

```typescript
// ConsultationContext.tsx — inline logic everywhere
const loadAppointment = useCallback(async (id: number) => {
  dispatch({ type: 'SET_LOADING', payload: true });
  // ... 140 lines of inline logic ...
}, [user]);
```

### 4.2 During Validation (Phase 1-3)

```typescript
// ConsultationContext.tsx — shim wired, flag OFF by default
const sessionOps = useMemo(() => {
  const service = new SessionService(...);
  const legacy = new LegacySessionOperations(...);
  return new SessionOperationsShim(service, legacy, dispatch);
}, []);

const loadAppointment = useCallback(async (id: number) => {
  const result = await sessionOps.initializeSession(id);
  // Minimal orchestration: map result to existing reducer actions
  if (result.success) {
    dispatch({ type: 'SET_DATA', payload: result.data });
  }
}, [sessionOps]);
```

**Critical:** ConsultationContext never imports `isFeatureEnabled`. The flag is consumed only inside the shim.

### 4.3 After Removal (Phase 4)

```typescript
// ConsultationContext.tsx — direct service calls
const sessionService = useMemo(() => new SessionService(...), []);

const loadAppointment = useCallback(async (id: number) => {
  const result = await sessionService.initializeSession(id);
  // Minimal orchestration: map result to existing reducer actions
  if (result.success) {
    dispatch({ type: 'SET_DATA', payload: result.data });
  }
}, [sessionService]);
```

---

## 5. Feature Flag Lifecycle

| Phase | Flag State | Code Path |
|-------|------------|-----------|
| CREATE | `false` | LegacySessionOperations |
| VALIDATE | `false` (primary) | LegacySessionOperations |
| VALIDATE | `true` (parallel) | SessionService |
| CUT OVER | `true` | SessionService |
| REMOVE | deleted | SessionService (direct) |

**Total flag lifetime: 3-4 weeks maximum.**

---

## 6. Rollback Strategy

### 6.1 Rollback Mechanisms

| Phase | Rollback Action | Time |
|-------|-----------------|------|
| CREATE | Delete SessionService, Shim, LegacySessionOperations | < 5 min |
| VALIDATE | Toggle flag to `false` | < 1 min |
| CUT OVER | Toggle flag to `false` | < 1 min |
| REMOVE | Git revert to pre-PR-A05 commit | < 5 min |

### 6.2 Zero-Embedding Verification

After every phase, verify:

- [ ] Zero `if (isFeatureEnabled(...))` in ConsultationContext
- [ ] Zero `LegacySessionOperations` in production path (after Phase 4)
- [ ] Zero commented-out legacy code
- [ ] Zero dormant feature flags
- [ ] ConsultationContext line count ≤ current count

### 6.3 Rollback Safety

Rollback must not restore duplicated logic. After Phase 4, rollback occurs entirely at the composition root (delete PR branch, revert to main). No embedded legacy branches remain.

---

## 7. Dependency Injection Strategy

### 7.1 During Migration (Phases 1-3)

```typescript
// ConsultationContext creates shim via useMemo
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
  const legacy = new LegacySessionOperations(
    dispatch,
    consultationApi,
    doctorApi,
    patientApi,
    draftService,
  );
  return new SessionOperationsShim(service, legacy, dispatch);
}, [dispatch, consultationApi, doctorApi, patientApi, draftService, draftStorage]);
```

### 7.2 After Cutover (Phase 4)

```typescript
// SessionProvider (future) creates SessionService directly
const sessionService = useMemo(() => {
  return new SessionService(
    coordinatorFactory.create(),
    coordinatorFactory,
    consultationApi,
    doctorApi,
    patientApi,
    draftService,
    draftStorage,
  );
}, [coordinatorFactory, consultationApi, doctorApi, patientApi, draftService, draftStorage]);
```

---

## 8. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| SessionService has different behavior | Low | High | Behavioral parity tests; flag toggle for instant rollback |
| Performance regression | Low | Medium | Baseline measurements; coordinator already optimized |
| Clinical data loss | Very Low | Critical | WorkflowGuardEngine validates all transitions; DraftService handles dirty save |
| Rollback complexity | Low | Medium | Single flag toggle; zero embedded legacy branches |
| Parallel testing overhead | Medium | Low | Automated parity test suite; CI runs both paths |

---

## 9. Timeline

| Week | Phase | Deliverable |
|------|-------|-------------|
| 1 | CREATE | SessionService + LegacySessionOperations + Shim + unit tests |
| 2 | CREATE | Parity tests + architecture compliance tests |
| 3 | VALIDATE + CUT OVER | Enable flag, monitor, freeze legacy |
| 4 | REMOVE | Delete legacy, remove flag, update context, final certification |

**Total: 4 weeks**
