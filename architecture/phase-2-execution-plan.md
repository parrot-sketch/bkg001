# Phase 2 Execution Plan

## Executive Summary

Phase 2 executes the Application Layer design and extracts 7 providers from the `ConsultationContext` monolith. The phase spans 10 weeks (50 working days) and follows a strict sequence designed to minimize clinical risk while maximizing architectural progress.

**Total lines removed from ConsultationContext:** 944 lines → 0 lines (100% decomposition)
**Total providers extracted:** 7
**Total services created:** 7
**Total use cases created:** 11
**Total new files:** ~60
**Total PRs:** ~40

---

## Phase 2 Overtew

| Week | Sprint | Objective | Deployable | Rollback Ready |
|------|--------|-----------|------------|----------------|
| 0 | Remediation | Feature flags, shim, missing ports, DTO cleanup | No | N/A |
| 1 | Session Foundation | DraftService, SessionService, core commands/queries | Yes | Yes |
| 2 | Queue + Notifications | QueueService, NotificationService, AuditService | Yes | Yes |
| 3 | Patient + Timer | PatientContextProvider, TimerService, TimerProvider | Yes | Yes |
| 4 | Documentation | DocumentationProvider, SOAPNote migration | Yes | Yes |
| 5 | Billing + SessionProvider | BillingProvider, SessionProvider extraction | Yes | Yes |
| 6 | Queue + Notification Providers | QueueProvider, NotificationProvider extraction | Yes | Yes |

---

## Week 0: Remediation (10 days)

**Prerequisite for all subsequent work.**

### Day 1-2: Feature Flag System

**Owner:** Infrastructure lead

**Files changed:**
- `lib/feature-flags.ts` (new, 80 lines)
- `lib/flags/useFeatureFlag.ts` (new, 30 lines)
- `app/layout.tsx` (modify, +5 lines for flag provider)

**Maximum lines changed:** 120

**Tests required:**
- `tests/unit/lib/feature-flags.test.ts` — flag registration, retrieval, defaults
- `tests/unit/lib/useFeatureFlag.test.ts` — hook behavior, SSR safety

**Acceptance criteria:**
1. `FEATURE_FLAGS` object contains all Phase 2 flags
2. Flags can be toggled via localStorage (client) and cookie (SSR)
3. `useFeatureFlag` hook reads from Context and falls back to localStorage
4. No runtime errors when flag is undefined (defaults to false)

**Rollback plan:** Remove feature flag provider from layout; all flags default to false.

**Deployment risk:** LOW — purely additive, no behavior change.

**Regression focus:** Login flow, page hydration, SSR consistency.

---

### Day 3-5: Compatibility Shim Prototype

**Owner:** Application lead

**Files changed:**
- `contexts/ConsultationContext.shim.ts` (new, 200 lines)
- `contexts/ConsultationContext.tsx` (modify, shim wired in behind flag)
- `tests/integration/context-shim-parity.test.ts` (new, 150 lines)

**Maximum lines changed:** 400

**Tests required:**
- Behavioral parity tests: shim produces identical state to old context for all 11 use cases
- Regression tests: existing components using `useConsultationContext` continue to work

**Acceptance criteria:**
1. Shim wraps `SessionService`, `DraftService`, `QueueService`, `NotificationService`
2. Shim exposes identical interface to `ConsultationContextValue`
3. All 11 use cases pass behavioral parity tests
4. Feature flag `USE_SHIM` toggles between old and shim

**Rollback plan:** Disable `USE_SHIM` flag; old context resumes full control.

**Deployment risk:** LOW — shim is behind feature flag, not yet in production path.

**Regression focus:** All components consuming `useConsultationContext`.

---

### Day 6-7: Missing API Ports + Adapters

**Owner:** Infrastructure lead

**Files changed:**
- `domain/interfaces/services/BillingApi.ts` (new, 60 lines)
- `lib/api/billing-adapter.ts` (new, 80 lines)
- `domain/interfaces/services/NotificationApi.ts` (new, 50 lines)
- `lib/api/notification-adapter.ts` (new, 60 lines)
- `domain/interfaces/services/AuditApi.ts` (new, 40 lines)
- `lib/api/audit-adapter.ts` (new, 50 lines)
- `tests/unit/domain/interfaces/services/*.test.ts` (new, 3 files × 40 lines)

**Maximum lines changed:** 400

**Tests required:**
- Adapter contract tests for each port (success, 401, 404, network error)
- Verify existing `consultation-api`, `patient-api`, `queue-api` tests still pass

**Acceptance criteria:**
1. All 6 API ports exist with consistent naming
2. All 6 adapters implement ports with identical error-mapping pattern
3. All adapters have contract tests
4. `adapter-utils.ts` is reused by all 6 adapters

**Rollback plan:** New ports are unused; removal has zero runtime impact.

**Deployment risk:** ZERO — no production code imports new ports yet.

---

### Day 8: QueuePatient DTO Refactor

**Owner:** Application lead

**Files changed:**
- `domain/interfaces/services/QueueApi.ts` (modify: remove `QueuePatient`, replace with `QueueSummary`)
- `application/dto/queue/QueueEntryResponse.ts` (new, 40 lines)
- `lib/api/queue-adapter.ts` (modify: map to `QueueSummary`)

**Maximum lines changed:** 100

**Tests required:**
- Update QueueApi tests to use new types
- Verify QueueApi contract tests still pass

**Acceptance criteria:**
1. `QueueApi.ts` defines only business-meaningful `QueueSummary` type
2. `QueueEntryResponse.ts` contains API-shaped fields
3. `HttpQueueApi` maps between them
4. No API-shaped fields in Domain interface

**Rollback plan:** Revert QueueApi.ts and queue-adapter.ts; DTO returns to previous state.

**Deployment risk:** LOW — only affects tests, not production code.

---

### Day 9-10: Adapter Dependency Direction Fix

**Owner:** Infrastructure lead

**Files changed:**
- `lib/api/consultation-adapter.ts` (modify: remove Application DTO imports)
- `lib/api/patient-adapter.ts` (modify: remove Application DTO imports)

**Maximum lines changed:** 60

**Tests required:**
- Verify adapter tests still pass
- Verify no circular dependencies in import graph

**Acceptance criteria:**
1. `consultation-adapter.ts` does not import from `application/dtos/`
2. `patient-adapter.ts` does not import from `application/dtos/`
3. Ports define/export their own response types or use generics
4. Import graph has no cycles

**Rollback plan:** Revert adapter files to pre-fix state.

**Deployment risk:** ZERO — adapters are not yet consumed.

---

## Week 1: Session Foundation (5 days)

**Theme:** Extract the core session and draft services that form the backbone of the consultation workflow.

### Day 1-2: DraftService

**Owner:** Application lead

**Files created:**
- `application/services/DraftService.ts` (250 lines)
- `application/services/__tests__/DraftService.test.ts` (200 lines)

**Files modified:**
- `contexts/ConsultationContext.tsx` (shim delegates to DraftService, +20/-40 lines)
- `shared-kernel/index.ts` (no changes)

**Maximum lines changed:** 500

**Preconditions:**
- Feature flags implemented (Week 0)
- Shim pattern validated (Week 0)
- `ConsultationApi`, `DraftStorage` exist

**Inputs:**
- ConsultationContext lines 590-693 (saveDraft, saveNotes)
- ConsultationContext lines 476-497 (draft restoration)
- ConsultationContext lines 611-617, 675-681 (localStorage backup)
- ConsultationContext line 745 (draft cleanup on completion)

**Outputs:**
- `DraftService.autoSave()`
- `DraftService.manualSave()`
- `DraftService.restoreDraft()`
- `DraftService.clearDraft()`
- `DraftService.hasNewerDraft()`

**Dependencies:**
- `ConsultationApi` (saveConsultationDraft)
- `DraftStorage` (localStorage backup)
- `NotificationService` (toast callbacks)

**Feature flag:** `USE_DRAFT_SERVICE`

**Testing requirements:**
1. Unit tests for each method (save, restore, clear, conflict detection)
2. Behavioral parity tests against current ConsultationContext save logic
3. Edge cases: rapid typing, save during completion, version conflict, corrupt draft
4. Verify localStorage backup format matches existing `consultation-draft-{id}` keys

**Code review checklist:**
- [ ] Method signatures match design document
- [ ] Debounce behavior matches 3s timeout in current code
- [ ] Version conflict detection matches current string matching
- [ ] localStorage backup format is byte-for-byte compatible
- [ ] No React imports in DraftService
- [ ] No direct `localStorage` access — uses `DraftStorage`

**Merge criteria:**
1. All tests pass
2. Behavioral parity tests pass
3. Feature flag enables/disables without errors
4. No regressions in existing 1274 tests

**Deployment criteria:**
1. Feature flag defaults to false (old code path active)
2. Monitoring confirms zero errors in old path
3. Gradual rollout: 5% → 25% → 100% over 3 days
4. Rollback trigger: >0.1% error rate in draft saves

**Expected PR size:** 500 lines changed, 3 files

**Expected reviewer:** Application lead + senior frontend engineer

**Regression focus:** Auto-save, draft recovery, version conflict handling, localStorage format

---

### Day 3-4: SessionService

**Owner:** Application lead

**Files created:**
- `application/services/SessionService.ts` (350 lines)
- `application/services/__tests__/SessionService.test.ts` (250 lines)

**Files modified:**
- `contexts/ConsultationContext.tsx` (shim delegates to SessionService, +30/-60 lines)

**Maximum lines changed:** 600

**Preconditions:**
- DraftService implemented (Day 1-2)
- Feature flags validated

**Inputs:**
- ConsultationContext lines 394-534 (loadAppointment)
- ConsultationContext lines 536-584 (startConsultation)
- ConsultationContext lines 725-789 (completeConsultation)
- ConsultationContext lines 791-810 (switchToPatient)
- ConsultationContext lines 847-870 (heartbeat)
- ConsultationContext lines 879-890 (beforeunload)
- ConsultationContext reducer lines 138-256 (workflow state)
- ConsultationContext lines 379-390 (computed properties)

**Outputs:**
- `SessionService.initialize()`
- `SessionService.start()`
- `SessionService.complete()`
- `SessionService.switchTo()`
- `SessionService.retire()`
- `SessionService.getDerivedState()`
- `SessionService.startHeartbeat()` / `stopHeartbeat()`
- `SessionService.checkBeforeUnload()`

**Dependencies:**
- `ConsultationApi` (loadConsultation, saveConsultationDraft)
- `PatientApi` (loadPatient)
- `QueueApi` (loadQueue for next patient lookup)
- `DraftService` (draft operations during switch/complete)
- `NotificationService` (toast callbacks)
- `QueryPersistence` (React Query cache invalidation)

**Feature flag:** `USE_SESSION_SERVICE`

**Testing requirements:**
1. Unit tests for each session lifecycle method
2. Behavioral parity tests against current ConsultationContext session logic
3. Heartbeat timing tests (30s interval)
4. beforeunload warning tests
5. Workflow state transition tests

**Code review checklist:**
- [ ] Session lifecycle methods match design spec
- [ ] Heartbeat interval matches 30s
- [ ] Cache invalidation keys match existing `invalidateQueries` calls
- [ ] Queue-aware routing logic matches lines 760-782 exactly
- [ ] No React imports in SessionService
- [ ] No direct API client imports — uses ConsultationApi

**Merge criteria:**
1. All tests pass
2. Behavioral parity tests pass
3. Feature flag toggles without errors
4. No regressions in existing 1274 tests

**Deployment criteria:**
1. Feature flag defaults to false
2. Monitoring confirms session start/complete/switch work correctly
3. Gradual rollout: 5% → 50% → 100% over 5 days
4. Rollback trigger: >0.5% error rate in session transitions

**Expected PR size:** 600 lines changed, 4 files

**Expected reviewer:** Application lead + senior frontend engineer + clinical SME

**Regression focus:** Session start, completion, patient switching, heartbeat, workflow state transitions

---

### Day 5: Commands + Queries

**Owner:** Application lead

**Files created:**
- `application/commands/StartConsultationCommand.ts` (60 lines)
- `application/commands/SaveDraftCommand.ts` (50 lines)
- `application/commands/CompleteConsultationCommand.ts` (70 lines)
- `application/commands/SwitchPatientCommand.ts` (50 lines)
- `application/queries/GetConsultationQuery.ts` (40 lines)
- `application/queries/GetPatientProfileQuery.ts` (40 lines)
- `application/queries/GetQueueQuery.ts` (40 lines)
- `application/dto/consultation/` (8 files, ~200 lines total)
- `application/dto/patient/` (4 files, ~100 lines total)
- `application/dto/queue/` (2 files, ~60 lines)

**Files modified:**
- `application/services/SessionService.ts` (wires commands into methods)
- `application/services/DraftService.ts` (wires commands into methods)

**Maximum lines changed:** 800

**Preconditions:**
- DraftService and SessionService implemented (Day 1-4)

**Inputs:**
- ConsultationContext command methods (startConsultation, saveDraft, completeConsultation, switchToPatient)
- Existing backend DTOs in `application/dtos/`

**Outputs:**
- 4 Command classes with `execute()` methods
- 3 Query classes with `execute()` methods
- Request/response DTOs for all use cases

**Feature flag:** None — commands are internal to services

**Testing requirements:**
1. Unit tests for each command (input validation, delegation to service)
2. Unit tests for each query (output shape, error propagation)

**Code review checklist:**
- [ ] Commands are thin wrappers — no business logic
- [ ] Queries have no side effects
- [ ] DTOs use `readonly` for all fields
- [ ] DTOs do not import from Domain layer
- [ ] Error types use `ClinicalErrorCode`, not strings

**Merge criteria:**
1. All tests pass
2. DTOs compile without errors
3. No circular dependencies

**Deployment criteria:**
1. Commands are internal only — not exposed to Presentation Layer yet
2. Can be deployed without feature flag

**Expected PR size:** 800 lines added, 2 files modified

**Expected reviewer:** Application lead

**Regression focus:** None — purely additive

---

## Week 2: Queue + Notifications (5 days)

### Day 6-7: QueueService

**Owner:** Application lead

**Files created:**
- `application/services/QueueService.ts` (200 lines)
- `application/services/__tests__/QueueService.test.ts` (150 lines)

**Files modified:**
- `contexts/ConsultationContext.tsx` (shim delegates to QueueService, +15/-30 lines)

**Maximum lines changed:** 400

**Preconditions:**
- SessionService implemented (Week 1)
- QueueApi port exists (P1-008)

**Inputs:**
- ConsultationContext lines 364-377 (queue lazy-loading, filtering)
- ConsultationContext lines 760-782 (queue routing in completeConsultation)
- `useDoctorQueue.ts` (polling configuration)

**Outputs:**
- `QueueService.getFilteredQueue()`
- `QueueService.getNextPatient()`
- `QueueService.refreshQueue()`
- `QueueService.startPolling()` / `stopPolling()`

**Dependencies:**
- `QueueApi`
- `ConsultationApi`
- `NotificationService`

**Feature flag:** `USE_QUEUE_SERVICE`

**Testing requirements:**
1. Unit tests for filtering logic (exclude current, by status)
2. Unit tests for next-patient routing (IN_CONSULTATION priority)
3. Behavioral parity tests against current queue logic

**Code review checklist:**
- [ ] Filtering logic matches `waitingQueue` useMemo exactly
- [ ] Next patient priority matches ConsultationContext lines 762-772
- [ ] Polling interval matches `query-config.ts` policy (60s)
- [ ] No React imports

**Merge criteria:** Same as Week 1

**Deployment criteria:**
1. Feature flag defaults to false
2. Gradual rollout: 5% → 100% over 5 days
3. Rollback trigger: >0.5% queue display errors

---

### Day 8: NotificationService

**Owner:** Application lead

**Files created:**
- `application/services/NotificationService.ts` (100 lines)
- `application/services/__tests__/NotificationService.test.ts` (80 lines)

**Files modified:**
- `contexts/ConsultationContext.tsx` (shim delegates toasts to NotificationService, +10/-30 lines)

**Maximum lines changed:** 200

**Inputs:**
- All `toast.success`, `toast.error`, `toast.info` calls in ConsultationContext (14 locations)

**Outputs:**
- `NotificationService.showSuccess()`
- `NotificationService.showError()`
- `NotificationService.showInfo()`
- `NotificationService.formatClinicalError()`

**Feature flag:** `USE_NOTIFICATION_SERVICE`

**Testing requirements:**
1. Unit tests for each toast method
2. Map all 14 existing toast calls to service methods
3. Verify `formatClinicalError` produces user-friendly strings

---

### Day 9-10: AuditService + Remaining Commands

**Owner:** Application lead

**Files created:**
- `application/services/AuditService.ts` (80 lines)
- `application/commands/SaveDraftCommand.ts` (50 lines)
- `application/commands/CompleteConsultationCommand.ts` (70 lines)
- `application/commands/SwitchPatientCommand.ts` (50 lines)
- `application/commands/AdvanceQueueCommand.ts` (60 lines)

**Maximum lines changed:** 400

---

## Week 3: Patient + Timer (5 days)

### Day 11-12: PatientContextProvider

**Owner:** Presentation lead

**Files created:**
- `contexts/patients/PatientContext.tsx` (150 lines)
- `contexts/patients/__tests__/PatientContext.test.ts` (100 lines)

**Files modified:**
- `contexts/ConsultationContext.tsx` (shim reads patient from PatientContext, +10/-20 lines)

**Maximum lines changed:** 300

**Preconditions:**
- SessionService implemented (Week 1)
- PatientApi port exists (P1-007)

**Inputs:**
- ConsultationContext lines 338-351 (consultation history)
- ConsultationContext lines 418-452 (patient + vitals loading)

**Outputs:**
- `PatientContextProvider` with `patient`, `vitals`, `consultationHistory` state
- `usePatientContext()` hook

**Dependencies:**
- `PatientApi`
- `ConsultationApi` (for consultation history)

**Feature flag:** `USE_PATIENT_CONTEXT`

**Testing requirements:**
1. Provider renders patient data correctly
2. Vitals mapping matches current shape
3. Consultation history syncs correctly

---

### Day 13: TimerService

**Owner:** Application lead

**Files created:**
- `application/services/TimerService.ts` (100 lines)
- `application/services/__tests__/TimerService.test.ts` (80 lines)

**Maximum lines changed:** 200

**Inputs:**
- Timer display logic from components (elapsed time, remaining time)

**Outputs:**
- `TimerService.start()`, `stop()`, `getElapsedSeconds()`, `getFormattedTime()`

---

### Day 14-15: Integration + Behavioral Parity Tests

**Owner:** QA lead

**Files created:**
- `tests/integration/application-layer-parity.test.ts` (300 lines)
- `tests/integration/provider-composition.test.ts` (200 lines)

**Maximum lines changed:** 500

**Tests required:**
1. All 11 use cases vs. current ConsultationContext behavior
2. All 7 services vs. current ConsultationContext behavior
3. Provider composition (SessionProvider wrapping PatientContextProvider + QueueProvider)
4. End-to-end: start consultation → save draft → complete → advance queue

---

## Week 4: DocumentationProvider (5 days)

### Day 16-17: DocumentationProvider + SOAPNote

**Owner:** Application lead

**Files created:**
- `domain/value-objects/SOAPNote.ts` (80 lines)
- `domain/value-objects/ConsultationNotesMigration.ts` (100 lines)
- `contexts/documentation/DocumentationProvider.tsx` (200 lines)
- `contexts/documentation/__tests__/DocumentationProvider.test.ts` (150 lines)

**Files modified:**
- `domain/value-objects/ConsultationNotes.ts` (add migration path to SOAPNote)
- `contexts/ConsultationContext.tsx` (shim reads notes from DocumentationProvider)

**Maximum lines changed:** 600

**Preconditions:**
- DraftService implemented (Week 1)
- SOAPNote entity aligned

**Acceptance criteria:**
1. SOAPNote matches blueprint shape (chiefComplaint, examination, assessment, plan)
2. DocumentationProvider owns notes, outcomeType, patientDecision, saveStatus
3. Auto-save triggers within 3s of last keystroke
4. Draft restoration works correctly
5. Version conflict detection works

**Deployment risk:** MEDIUM — affects core clinical workflow

---

## Week 5: BillingProvider + SessionProvider (5 days)

### Day 22-23: BillingProvider

**Owner:** Application lead

**Files created:**
- `contexts/billing/BillingProvider.tsx` (150 lines)
- `contexts/billing/__tests__/BillingProvider.test.ts` (100 lines)

**Preconditions:**
- BillingApi port exists (Week 0)

**Maximum lines changed:** 300

### Day 24-25: SessionProvider Extraction

**Owner:** Application lead

**Files created:**
- `contexts/session/SessionProvider.tsx` (200 lines)
- `contexts/session/__tests__/SessionProvider.test.ts` (150 lines)

**Files modified:**
- `contexts/ConsultationContext.tsx` (shim reduces to delegation only, -200 lines)

**Maximum lines changed:** 400

**Acceptance criteria:**
1. SessionProvider owns appointment, patient, consultation, doctorId, workflowState
2. SessionProvider delegates to SessionService
3. All components using SessionProvider render identically
4. Render count reduced by 30%+

**Deployment risk:** HIGH — core session management

---

## Week 6: QueueProvider + NotificationProvider (5 days)

### Day 26-27: QueueProvider

**Owner:** Presentation lead

**Files created:**
- `contexts/queue/QueueProvider.tsx` (180 lines)
- `contexts/queue/__tests__/QueueProvider.test.ts` (120 lines)

**Maximum lines changed:** 350

**Acceptance criteria:**
1. QueueProvider owns todayAppointments, waitingQueue, isRefetching
2. QueueProvider delegates to QueueService
3. Queue panel renders identically
4. Background polling continues at 60s

### Day 28-29: NotificationProvider

**Owner:** Application lead

**Files created:**
- `contexts/notifications/NotificationProvider.tsx` (100 lines)
- `contexts/notifications/__tests__/NotificationProvider.test.ts` (80 lines)

**Maximum lines changed:** 250

### Day 30: Phase 2 Integration + Burndown Validation

**Owner:** QA lead

**Activities:**
1. Run full regression suite
2. Verify ConsultationContext size reduction
3. Validate all feature flags can be toggled
4. Performance profiling (render counts, bundle size)
5. Clinical workflow end-to-end tests

---

## ConsultationContext Burndown

| Week | Extraction | Lines Removed | Cumulative Removed | Remaining Lines |
|------|-----------|---------------|-------------------|-----------------|
| 0 | Shim prototype, DTO cleanup | 0 | 0 | 1004 |
| 1 | DraftService, SessionService delegation | -100 | 100 | 904 |
| 2 | QueueService, NotificationService delegation | -50 | 150 | 854 |
| 3 | PatientContextProvider delegation | -30 | 180 | 824 |
| 4 | DocumentationProvider extraction | -200 | 380 | 624 |
| 5 | BillingProvider, SessionProvider extraction | -300 | 680 | 324 |
| 6 | QueueProvider, NotificationProvider extraction | -200 | 880 | 124 |
| Post-Phase 2 | Shim cleanup | -124 | 1004 | 0 |

**Target:** ConsultationContext reduced to 0 lines by end of Phase 2.

---

## Critical Path Summary

```
Week 0: Remediation (10 days)
    │
Week 1: DraftService + SessionService (5 days)
    │
Week 2: QueueService + NotificationService + AuditService (5 days)
    │
Week 3: PatientContextProvider + TimerService (5 days)
    │
Week 4: DocumentationProvider (5 days)
    │
Week 5: BillingProvider + SessionProvider (5 days)
    │
Week 6: QueueProvider + NotificationProvider + Integration (5 days)
    │
Phase 2 Complete: ConsultationContext = 0 lines
```

**Total duration:** 40 working days (8 weeks) after 10-day remediation.
