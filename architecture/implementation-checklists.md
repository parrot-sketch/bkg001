# Implementation Checklists

## How to use this document

Every checklist below corresponds to a concrete deliverable in the Phase 2 execution plan. Developers must check off every item before marking the task complete. A checklist is not complete until all items are checked.

---

## Week 0 Checklist

### Day 1-2: Feature Flag System

- [ ] **Create `lib/feature-flags.ts`**
  - [ ] `FEATURE_FLAGS` typed constant with all Phase 2 flags
  - [ ] `isFeatureEnabled(flagKey)` function
  - [ ] Defaults all flags to `false`
  - [ ] Supports `localStorage` client toggle
  - [ ] Supports cookie-based SSR toggle
  - [ ] Flag keys follow naming convention: `USE_<SERVICE>_SERVICE`

- [ ] **Create `lib/flags/useFeatureFlag.ts`**
  - [ ] Hook reads from feature flag context
  - [ ] Falls back to localStorage if context unavailable
  - [ ] SSR-safe (checks `typeof window !== 'undefined'`)
  - [ ] Returns `boolean`
  - [ ] Type-safe flag keys (no magic strings)

- [ ] **Create `lib/contexts/FeatureFlagProvider.tsx`**
  - [ ] Provider wraps app layout
  - [ ] Loads flags from cookies on server
  - [ ] Hydrates with localStorage on client
  - [ ] Propagates flag changes to all consumers

- [ ] **Tests**
  - [ ] `tests/unit/lib/feature-flags.test.ts`
    - [ ] Flag registration test
    - [ ] Default values test
    - [ ] Toggle persistence test
  - [ ] `tests/unit/lib/useFeatureFlag.test.ts`
    - [ ] Hook returns default when flag unset
    - [ ] Hook returns overridden value when flag set
    - [ ] Hook does not throw on SSR

- [ ] **Documentation**
  - [ ] `docs/feature-flags.md` lists all flags and their defaults
  - [ ] Each flag has description, owner, and planned removal date

- [ ] **Code review**
  - [ ] No flags default to `true`
  - [ ] All flags have a clear removal condition
  - [ ] No flag is used in more than 2 places (suggests wrong abstraction)

- [ ] **Deploy**
  - [ ] Feature flag provider added to layout
  - [ ] Zero console errors in production build
  - [ ] Flag state persists across page navigation

---

### Day 3-5: Compatibility Shim Prototype

- [ ] **Create `contexts/ConsultationContext.shim.ts`**
  - [ ] Accepts same constructor arguments as `ConsultationContext`
  - [ ] Implements identically named methods (startConsultation, saveDraft, etc.)
  - [ ] Delegates to `SessionService`, `DraftService`, `QueueService`, `NotificationService`
  - [ ] Exposes `ConsultationContextValue` interface
  - [ ] Feature-flag controlled: old vs shim path

- [ ] **Wire shim into ConsultationContext**
  - [ ] `ConsultationContext.tsx` conditionally renders shim based on flag
  - [ ] Import cycle check: context → services → ports → adapters
  - [ ] Shim returns identical values to old context for all getters

- [ ] **Tests**
  - [ ] `tests/integration/context-shim-parity.test.ts`
    - [ ] Shim produces same state as old context for empty appointment
    - [ ] Shim produces same state as old context for active consultation
    - [ ] Shim produces same state after draft save
    - [ ] Shim produces same state after completion
  - [ ] Regression: existing components using `useConsultationContext` still compile
  - [ ] Regression: existing tests still pass (1274 unit tests)

- [ ] **Performance**
  - [ ] Shim does not add measurable render time
  - [ ] No infinite re-render loops in shim

- [ ] **Code review**
  - [ ] Every shim method documented with which ConsultationContext method it replaces
  - [ ] Shim does not duplicate business logic (delegates only)
  - [ ] Error paths match old context exactly

---

### Day 6-7: Missing API Ports + Adapters

- [ ] **BillingApi**
  - [ ] `domain/interfaces/services/BillingApi.ts`
  - [ ] `lib/api/billing-adapter.ts`
  - [ ] Contract tests
- [ ] **NotificationApi**
  - [ ] `domain/interfaces/services/NotificationApi.ts`
  - [ ] `lib/api/notification-adapter.ts`
  - [ ] Contract tests
- [ ] **AuditApi**
  - [ ] `domain/interfaces/services/AuditApi.ts`
  - [ ] `lib/api/audit-adapter.ts`
  - [ ] Contract tests
- [ ] **Shared patterns**
  - [ ] All adapters reuse `adapter-utils.ts`
  - [ ] All adapters map errors to `ClinicalErrorCode` consistently
  - [ ] All adapters have identical method names per port

- [ ] **Tests**
  - [ ] Each adapter has contract tests: success, 401, 404, 500, network error
  - [ ] Existing tests for consultation-api, patient-api, queue-api still pass
  - [ ] Import graph has no cycles (`madge` or equivalent)

---

### Day 8: QueuePatient DTO Refactor

- [ ] **DTO changes**
  - [ ] `QueuePatient` removed from `domain/interfaces/services/QueueApi.ts`
  - [ ] `QueueSummary` added with business-meaningful fields only
  - [ ] `application/dto/queue/QueueEntryResponse.ts` created with API-shaped fields
  - [ ] `lib/api/queue-adapter.ts` maps between them

- [ ] **Tests**
  - [ ] QueueApi tests updated
  - [ ] Queue contract tests pass
  - [ ] QueueService tests (if any) pass

---

### Day 9-10: Adapter Dependency Direction Fix

- [ ] **consultation-adapter.ts**
  - [ ] Does not import from `application/dtos/`
  - [ ] Uses port-defined types or generics
- [ ] **patient-adapter.ts**
  - [ ] Does not import from `application/dtos/`
  - [ ] Uses port-defined types or generics

- [ ] **Validation**
  - [ ] Import graph cycle check passes
  - [ ] All adapter tests pass

---

## Week 1 Checklist

### Day 1-2: DraftService

- [ ] **Implementation**
  - [ ] `application/services/DraftService.ts` created
  - [ ] Constructor accepts `ConsultationApi`, `DraftStorage`, `NotificationService`
  - [ ] `autoSave()` implementation extracted from ConsultationContext
  - [ ] `manualSave()` implementation extracted
  - [ ] `restoreDraft()` implementation extracted
  - [ ] `clearDraft()` implementation extracted
  - [ ] `hasNewerDraft()` implementation extracted

- [ ] **Tests**
  - [ ] `application/services/__tests__/DraftService.test.ts`
    - [ ] autoSave debounces at exactly 3s
    - [ ] manualSave calls backend with correct payload
    - [ ] restoreDraft compares timestamps correctly
    - [ ] clearDraft removes from both DraftStorage locations
    - [ ] hasNewerDraft returns true when draft > server
    - [ ] hasNewerDraft handles missing draft gracefully
  - [ ] Behavioral parity test: dirty notes → auto-save → verify save
  - [ ] Behavioral parity test: manual save during auto-save debounce → verify single save
  - [ ] Regression: `useSaveConsultationDraft` tests still pass

- [ ] **Code review**
  - [ ] Debounce implementation matches `useRef` + `setTimeout` from old code
  - [ ] No React imports
  - [ ] No direct `localStorage` access
  - [ ] Uses `ClinicalErrorCode` for errors

- [ ] **Feature flag**
  - [ ] `USE_DRAFT_SERVICE` added
  - [ ] Flag toggles shim between old and new path
  - [ ] Default: false

- [ ] **Deploy**
  - [ ] Canary: 5% of users, 1 day
  - [ ] Expand: 25%, 1 day
  - [ ] Full: 100%, 1 day
  - [ ] Rollback trigger: >0.1% draft save error rate
  - [ ] Monitoring: draft save success rate, localStorage write errors

---

### Day 3-4: SessionService

- [ ] **Implementation**
  - [ ] `application/services/SessionService.ts` created
  - [ ] `initialize()` extracts loadAppointment logic
  - [ ] `start()` extracts startConsultation logic
  - [ ] `complete()` extracts completeConsultation logic
  - [ ] `switchTo()` extracts switchToPatient logic
  - [ ] `retire()` implemented
  - [ ] `resume()` implemented
  - [ ] `getDerivedState()` computes isActive, isReadOnly, canSave, canComplete
  - [ ] `startHeartbeat()` / `stopHeartbeat()` at 30s interval
  - [ ] `checkBeforeUnload()` returns boolean for dirty state

- [ ] **Tests**
  - [ ] Unit tests for each lifecycle method
  - [ ] Heartbeat timing test (30s ± 500ms)
  - [ ] beforeunload test (dirty → warning, clean → no warning)
  - [ ] Behavioral parity test: full session lifecycle
  - [ ] Workflow state transition test: IDLE → ACTIVE → COMPLETING → COMPLETED

- [ ] **Code review**
  - [ ] Cache invalidation keys match existing `invalidateQueries` calls
  - [ ] Queue-aware routing matches current logic exactly
  - [ ] Draft restoration in initialize matches old code
  - [ ] No React imports

- [ ] **Feature flag**
  - [ ] `USE_SESSION_SERVICE` added
  - [ ] Default: false
  - [ ] Rollback trigger: >0.5% session transition error rate

---

### Day 5: Commands + Queries

- [ ] **Commands created**
  - [ ] `StartConsultationCommand`
  - [ ] `SaveDraftCommand`
  - [ ] `CompleteConsultationCommand`
  - [ ] `SwitchPatientCommand`

- [ ] **Queries created**
  - [ ] `GetConsultationQuery`
  - [ ] `GetPatientProfileQuery`
  - [ ] `GetQueueQuery`

- [ ] **DTOs created**
  - [ ] `application/dto/consultation/` — all request/response types
  - [ ] `application/dto/patient/` — all request/response types
  - [ ] `application/dto/queue/` — all request/response types

- [ ] **Code review**
  - [ ] Commands are thin wrappers (no business logic)
  - [ ] Queries have no side effects
  - [ ] DTOs use `readonly`
  - [ ] DTOs do not import from Domain layer
  - [ ] Error types use `ClinicalErrorCode`

---

## Week 2 Checklist

### Day 6-7: QueueService

- [ ] **Implementation**
  - [ ] `getFilteredQueue()` matches current filtering logic
  - [ ] `refreshQueue()` implemented
  - [ ] `startPolling()` / `stopPolling()` at 60s interval
  - [ ] `getNextPatient()` priority: IN_CONSULTATION > CHECKED_IN

- [ ] **Tests**
  - [ ] Filtering: empty queue, single patient, multiple patients
  - [ ] Next patient: all priority combinations
  - [ ] Behavioral parity: complete → verify same patient selected

- [ ] **Feature flag**
  - [ ] `USE_QUEUE_SERVICE` added
  - [ ] Default: false

---

### Day 8: NotificationService

- [ ] **Implementation**
  - [ ] `showSuccess()`, `showError()`, `showInfo()`, `showWarning()`
  - [ ] `formatClinicalError()` handles all `ClinicalErrorCode` values

- [ ] **Tests**
  - [ ] Each toast method test
  - [ ] `formatClinicalError` snapshot test for all error codes
  - [ ] Verify all 14 toast calls mapped to service

- [ ] **Feature flag**
  - [ ] `USE_NOTIFICATION_SERVICE` added
  - [ ] Default: false

---

### Day 9-10: AuditService + Commands

- [ ] **Implementation**
  - [ ] `ClinicalAuditEvent` type defined
  - [ ] `emitEvent()` implemented
  - [ ] `generateCorrelationId()` returns unique ID
  - [ ] 5 audit events mapped from ConsultationContext

- [ ] **Commands**
  - [ ] SaveDraftCommand
  - [ ] CompleteConsultationCommand
  - [ ] SwitchPatientCommand
  - [ ] AdvanceQueueCommand

---

## Week 3 Checklist

### Day 11-12: PatientContextProvider

- [ ] **Implementation**
  - [ ] Provider state: patient, vitals, consultationHistory
  - [ ] `loadPatient()` using PatientApi
  - [ ] `loadVitals()` using vitals endpoint
  - [ ] `loadHistory()` using ConsultationApi
  - [ ] `usePatientContext()` hook exported

- [ ] **Tests**
  - [ ] Provider renders patient data correctly
  - [ ] Vitals mapping matches current shape
  - [ ] Consultation history syncs correctly

- [ ] **Feature flag**
  - [ ] `USE_PATIENT_CONTEXT` added
  - [ ] Default: false

---

### Day 13: TimerService

- [ ] **Implementation**
  - [ ] `start()`, `stop()`, `getElapsedSeconds()`, `getFormattedTime()`

- [ ] **Tests**
  - [ ] Timer accuracy test (±1s over 60s)
  - [ ] Format test (MM:SS)

---

### Day 14-15: Integration Tests

- [ ] **Behavioral parity**
  - [ ] All 11 use cases tested against current ConsultationContext
  - [ ] All 7 services tested against current ConsultationContext
  - [ ] Provider composition tests

- [ ] **End-to-end**
  - [ ] Start consultation → save draft → complete → advance queue
  - [ ] Patient switch with draft save
  - [ ] Concurrent save + completion (no data loss)

- [ ] **Regression**
  - [ ] Full 1274 unit test suite passes
  - [ ] Frontend tests pass
  - [ ] TypeScript compiles without errors

---

## Week 4 Checklist

### Day 16-17: DocumentationProvider + SOAPNote

- [ ] **Domain**
  - [ ] `SOAPNote` value object created
  - [ ] `ConsultationNotes` migration path to SOAPNote

- [ ] **Provider**
  - [ ] `DocumentationProvider` state: notes, outcomeType, patientDecision, saveStatus, isDirty
  - [ ] Auto-save effect wired to DraftService
  - [ ] Version conflict detection

- [ ] **Tests**
  - [ ] SOAPNote construction and immutability
  - [ ] DocumentationProvider renders notes correctly
  - [ ] Auto-save triggers within 3s of last keystroke
  - [ ] Draft restoration works
  - [ ] Version conflict detection works

- [ ] **Deployment**
  - [ ] Feature flag `USE_DOCUMENTATION_PROVIDER`
  - [ ] Gradual rollout with monitoring

---

## Week 5 Checklist

### Day 18-19: BillingProvider

- [ ] **Implementation**
  - [ ] Provider state: billingData, isSubmitting, error
  - [ ] BillingApi integration
  - [ ] BillingService methods

- [ ] **Tests**
  - [ ] Billing data loading
  - [ ] Submission success/failure
  - [ ] Retry logic

---

### Day 20-21: SessionProvider Extraction

- [ ] **Implementation**
  - [ ] `SessionProvider` composes all providers
  - [ ] Extracts remaining state from ConsultationContext
  - [ ] SessionService integration

- [ ] **Tests**
  - [ ] SessionProvider renders all child providers correctly
  - [ ] Render count reduced by 30%+ on session start
  - [ ] Visual regression: page renders identically

- [ ] **Deployment**
  - [ ] Feature flag `USE_SESSION_PROVIDER`
  - [ ] Rollout: 5% → 50% → 100% over 5 days

---

## Week 6 Checklist

### Day 22-23: QueueProvider

- [ ] **Tests**
  - [ ] Queue panel renders identically
  - [ ] Background polling continues at 60s
  - [ ] Patient switching saves draft before navigation

---

### Day 24-25: NotificationProvider

- [ ] **Tests**
  - [ ] All toast calls routed through NotificationProvider
  - [ ] Provider failure does not crash core UI

---

### Day 26-27: Integration + Burndown Validation

- [ ] **Regression**
  - [ ] Full regression suite passes
  - [ ] ConsultationContext reduced to target lines
  - [ ] All feature flags toggleable

- [ ] **Performance**
  - [ ] Render profile within 10% of baseline
  - [ ] Bundle size increase <5% (or documented code splitting plan)
  - [ ] No new console warnings

- [ ] **Clinical**
  - [ ] End-to-end workflow tests pass (start → draft → complete → switch)
  - [ ] Offline recovery works
  - [ ] Concurrent clinician scenario tested (if applicable)

---

## Universal Quality Gates

Every PR must pass ALL of these gates before merge:

- [ ] **Tests**
  - [ ] All new tests pass
  - [ ] All existing tests pass (1274 unit + 10 frontend)
  - [ ] Code coverage ≥ 80% for new code
  - [ ] No skipped or `todo` tests in new files

- [ ] **TypeScript**
  - [ ] `tsc --noEmit` passes with zero errors
  - [ ] No `any` types in new code (unless explicitly justified)

- [ ] **Lint**
  - [ ] Linter passes with zero warnings
  - [ ] No unused imports or variables

- [ ] **Documentation**
  - [ ] Every new public function/class has JSDoc
  - [ ] Architecture docs updated if design changes

- [ ] **Security**
  - [ ] No secrets or keys in code
  - [ ] No direct API key access in business logic
  - [ ] All external calls go through ports

- [ ] **Code review**
  - [ ] Minimum 1 approving review (2 for HIGH risk)
  - [ ] All review comments addressed
  - [ ] Reviewer confirms checklist complete

- [ ] **Deployment**
  - [ ] Feature flag tested (on/off both work)
  - [ ] Rollback plan documented in PR description
  - [ ] Monitoring dashboards verified
  - [ ] Clinical validation checklist completed (if applicable)

---

## Checklist Completion Criteria

A checklist item is only "completed" when:
1. The code change is merged to `main`
2. All tests pass on CI
3. The feature flag has been validated in staging
4. Documentation has been updated

Do not mark items complete based on local testing alone.
