# Provider Extraction Playbook

## Purpose

This playbook defines the exact steps, checks, and criteria for extracting each provider from `ConsultationContext`. Every provider extraction follows the same pattern to ensure consistency, safety, and reversibility.

---

## Universal Extraction Pattern

Every provider extraction follows these 6 steps:

1. **Prepare** — Create provider skeleton, feature flag, and shim adapter
2. **Extract** — Move state and logic from ConsultationContext to provider
3. **Wire** — Connect provider to Application Services and ports
4. **Shim** — Update ConsultationContext shim to delegate to new provider
5. **Validate** — Run parity tests, visual regression, and clinical validation
6. **Cutover** — Enable feature flag, monitor, then remove old code

---

## Provider 1: DraftService (Application Service)

### Preconditions

- Feature flags implemented
- Shim pattern validated
- `ConsultationApi` port exists
- `DraftStorage` interface + `LocalStorageDraftStorage` exist

### Inputs

- ConsultationContext lines 590-693 (`saveDraft`, `saveNotes`)
- ConsultationContext lines 476-497 (draft restoration)
- ConsultationContext lines 611-617, 675-681 (localStorage backup)
- ConsultationContext line 745 (draft cleanup on completion)
- `hooks/useSaveConsultationDraft.ts` (optimistic update logic)
- `hooks/useDraftStorage.ts` (draft persistence logic)

### Outputs

- `application/services/DraftService.ts`
- Behavioral parity tests
- Feature flag `USE_DRAFT_SERVICE`

### Day-by-Day Plan

**Day 1: Skeleton + Auto-save**
1. Create `DraftService` class with constructor accepting `ConsultationApi`, `DraftStorage`, `NotificationService`
2. Implement `autoSave()` method — extract debounce logic from ConsultationContext lines 820-845
3. Implement `manualSave()` method — extract save logic from lines 590-629 and 631-693
4. Write unit tests for auto-save debouncing (3s timeout)
5. Write unit tests for manual save

**Day 2: Draft Restoration + Cleanup**
1. Implement `restoreDraft()` — extract timestamp comparison logic from lines 476-497
2. Implement `clearDraft()` — extract localStorage cleanup from line 745
3. Implement `hasNewerDraft()` — extract from `useDraftStorage.ts`
4. Write unit tests for restore, clear, hasNewerDraft
5. Write behavioral parity test: simulate dirty notes → auto-save → verify backend call + localStorage backup

### Code Review Checklist

- [ ] `autoSave` debounce matches exactly 3s timeout
- [ ] `manualSave` preserves `generateFullText` format (ConsultationContext lines 967-984)
- [ ] `restoreDraft` compares timestamps correctly (draft > server)
- [ ] Corrupt draft removal matches current behavior (lines 493-496)
- [ ] Version conflict detection preserves current string matching (lines 32-35, 82-85)
- [ ] No React imports
- [ ] No direct `localStorage` access — uses `DraftStorage`
- [ ] Uses `ClinicalErrorCode` for error reporting, not strings
- [ ] Callbacks for success/error are injectable (for testability)

### Testing Requirements

1. **Unit tests:** Each method, success path, failure path, edge cases
2. **Behavioral parity:** Compare DraftService output against ConsultationContext for 10 simulated scenarios
3. **Integration test:** DraftService → ConsultationApi → mock backend
4. **Regression test:** Verify existing `useSaveConsultationDraft` tests still pass

### Rollback

Disable `USE_DRAFT_SERVICE` flag. ConsultationContext continues using inline logic.

### Maximum Acceptable Risk: LOW

Draft save is background operation. Failure shows error toast but does not block workflow.

---

## Provider 2: SessionService (Application Service)

### Preconditions

- DraftService implemented and tested
- Feature flags validated

### Inputs

- ConsultationContext lines 394-534 (`loadAppointment`)
- ConsultationContext lines 536-584 (`startConsultation`)
- ConsultationContext lines 725-789 (`completeConsultation`)
- ConsultationContext lines 791-810 (`switchToPatient`)
- ConsultationContext lines 847-870 (heartbeat)
- ConsultationContext lines 879-890 (beforeunload)
- ConsultationContext reducer lines 138-256
- ConsultationContext lines 379-390 (computed properties)

### Outputs

- `application/services/SessionService.ts`
- `application/commands/StartConsultationCommand.ts`
- `application/commands/CompleteConsultationCommand.ts`
- `application/commands/SwitchPatientCommand.ts`
- Behavioral parity tests

### Day-by-Day Plan

**Day 1: Session Lifecycle — Initialize + Start**
1. Implement `initialize()` — parallel API calls, draft restoration, workflow state determination (lines 394-534)
2. Implement `start()` — start consultation API call, cache invalidation (lines 536-584)
3. Write StartConsultation command
4. Write unit tests for initialize and start
5. Behavioral parity test: load appointment → verify state matches current context

**Day 2: Session Lifecycle — Complete + Switch**
1. Implement `complete()` — draft cleanup, cache invalidation, queue routing (lines 725-789)
2. Implement `switchTo()` — draft save before navigation (lines 791-810)
3. Implement `retire()`, `resume()`
4. Write CompleteConsultation and SwitchPatient commands
5. Write unit tests

**Day 3: Heartbeat + Derived State**
1. Implement `startHeartbeat()` / `stopHeartbeat()` — 30s interval (lines 847-870)
2. Implement `getDerivedState()` — isActive, isReadOnly, canSave, canComplete (lines 379-390)
3. Implement `checkBeforeUnload()` — dirty state warning (lines 879-890)
4. Write unit tests

### Code Review Checklist

- [ ] `initialize` makes 4 parallel API calls in same order as current code
- [ ] Draft restoration logic matches lines 476-497 exactly
- [ ] Workflow state determination matches lines 500-523 exactly
- [ ] Cache invalidation keys match existing `invalidateQueries` calls
- [ ] Queue-aware routing logic matches lines 760-782 exactly
- [ ] Heartbeat interval is exactly 30s
- [ ] `isActive`, `isReadOnly`, `canSave`, `canComplete` computed exactly as current
- [ ] No React imports
- [ ] No direct API client — uses ConsultationApi, PatientApi, QueueApi

### Testing Requirements

1. Unit tests for each lifecycle method
2. Behavioral parity tests for all session transitions
3. Heartbeat timing tests
4. beforeunload tests
5. Integration test: initialize → start → complete → switch flow

### Rollback

Disable `USE_SESSION_SERVICE` flag.

### Maximum Acceptable Risk: MEDIUM

Session lifecycle is core clinical workflow. Errors block all consultations.

---

## Provider 3: QueueService (Application Service)

### Preconditions

- SessionService implemented
- QueueApi port exists

### Inputs

- ConsultationContext lines 364-377 (queue lazy-loading, filtering)
- ConsultationContext lines 760-782 (queue routing)
- `hooks/doctor/useDoctorQueue.ts` (polling config)

### Outputs

- `application/services/QueueService.ts`
- `application/queries/RefreshQueueQuery.ts`
- `application/queries/FilterQueueQuery.ts`

### Day-by-Day Plan

**Day 1: Queue Filtering + Refresh**
1. Implement `getFilteredQueue()` — exclude current, filter by status (lines 364-370)
2. Implement `refreshQueue()` — trigger queue refetch (lines 372-377)
3. Implement `startPolling()` / `stopPolling()` — 60s interval from `query-config.ts`
4. Write unit tests

**Day 2: Queue Routing + Integration**
1. Implement `getNextPatient()` — priority logic IN_CONSULTATION > CHECKED_IN (lines 760-782)
2. Wire QueueService into SessionService.complete()
3. Write behavioral parity tests

### Code Review Checklist

- [ ] Filtering logic matches `waitingQueue` useMemo exactly
- [ ] Next patient priority matches ConsultationContext exactly
- [ ] Polling interval matches `policyDoctorQueue.refetchInterval` (60s)
- [ ] No React imports

### Testing Requirements

1. Unit tests for filtering (empty queue, single patient, multiple patients)
2. Unit tests for next patient routing (all priority combinations)
3. Behavioral parity test: complete consultation → verify next patient selection

### Rollback

Disable `USE_QUEUE_SERVICE` flag.

### Maximum Acceptable Risk: MEDIUM

Queue errors affect patient routing but do not corrupt clinical data.

---

## Provider 4: NotificationService (Application Service)

### Preconditions

- SessionService, DraftService, QueueService implemented

### Inputs

- All `toast.success`, `toast.error`, `toast.info` calls in ConsultationContext (14 locations)

### Outputs

- `application/services/NotificationService.ts`

### Day-by-Day Plan

**Day 1: Implementation**
1. Implement `showSuccess()`, `showError()`, `showInfo()`, `showWarning()`
2. Implement `formatClinicalError()` — map `ClinicalError` to user-friendly strings
3. Map all 14 existing toast calls to service methods
4. Write unit tests for each method and formatClinicalError edge cases

### Code Review Checklist

- [ ] All 14 toast calls are mapped
- [ ] `formatClinicalError` handles all ClinicalErrorCode values
- [ ] No direct `sonner` imports in ConsultationContext after shim

### Testing Requirements

1. Unit tests for each toast method
2. Snapshot tests for `formatClinicalError` output
3. Verify no toast calls remain in ConsultationContext after shim

### Rollback

Disable `USE_NOTIFICATION_SERVICE` flag.

### Maximum Acceptable Risk: LOW

Notifications are non-critical UI feedback.

---

## Provider 5: AuditService (Application Service)

### Preconditions

- Core services implemented

### Inputs

- Implicit audit events in ConsultationContext (start, save, complete, switch)

### Outputs

- `application/services/AuditService.ts`

### Day-by-Day Plan

**Day 1: Implementation**
1. Define `ClinicalAuditEvent` type
2. Implement `emitEvent()`, `generateCorrelationId()`
3. Map 5 implicit audit events from ConsultationContext
4. Write unit tests

### Testing Requirements

1. Unit tests for event emission
2. Correlation ID uniqueness tests

### Maximum Acceptable Risk: LOW

---

## Provider 6: PatientContextProvider

### Preconditions

- SessionService implemented
- PatientApi port exists

### Inputs

- ConsultationContext lines 338-351 (consultation history)
- ConsultationContext lines 418-452 (patient + vitals loading)

### Outputs

- `contexts/patients/PatientContext.tsx`
- `contexts/patients/usePatientContext.ts`

### Day-by-Day Plan

**Day 1: Provider Skeleton**
1. Create PatientContext with patient, vitals, consultationHistory state
2. Implement `loadPatient()` using PatientApi
3. Implement `loadVitals()` using vitals endpoint
4. Implement `loadHistory()` using ConsultationApi

**Day 2: Integration**
1. Wire PatientContext into SessionService.initialize()
2. Migrate PatientInfoSidebar to consume PatientContext
3. Write unit tests and behavioral parity tests

### Code Review Checklist

- [ ] Patient data loading matches current parallel Promise.all pattern
- [ ] Vitals mapping matches lines 428-442 exactly
- [ ] Consultation history sync matches lines 344-350

### Testing Requirements

1. Provider renders patient data correctly
2. Vitals display matches current behavior
3. Consultation history modal works

### Maximum Acceptable Risk: MEDIUM

Patient data is read-only in session context. Incorrect data is recoverable by refreshing.

---

## Provider 7: TimerService + TimerProvider

### Preconditions

- SessionService implemented

### Inputs**

- Timer display logic from components (elapsed time, remaining time)

### Outputs

- `application/services/TimerService.ts`
- `contexts/timer/TimerProvider.tsx`

### Day-by-Day Plan

**Day 1: TimerService**
1. Implement `start()`, `stop()`, `getElapsedSeconds()`, `getFormattedTime()`
2. Write unit tests

**Day 2: TimerProvider**
1. Create TimerProvider wrapping TimerService
2. Migrate timer display components
3. Write provider tests

### Maximum Acceptable Risk: LOW

Timer is computed display only. No data mutations.

---

## Provider 8: DocumentationProvider

### Preconditions

- DraftService implemented
- SOAPNote entity aligned with ConsultationNotes

### Inputs

- ConsultationContext notes state (lines 83-88, 103-105, 182-197)
- ConsultationContext outcome/decision state (lines 124-125, 209-217)
- Auto-save effect (lines 819-845)

### Outputs

- `domain/value-objects/SOAPNote.ts`
- `contexts/documentation/DocumentationProvider.tsx`

### Day-by-Day Plan

**Day 1-2: SOAPNote + Provider**
1. Create SOAPNote value object
2. Create DocumentationProvider with notes, outcomeType, patientDecision, saveStatus, isDirty
3. Wire DraftService into DocumentationProvider

**Day 3: Auto-save + Migration**
1. Wire auto-save effect into DocumentationProvider
2. Migrate SOAPWorkspace to consume DocumentationProvider
3. Write tests

### Maximum Acceptable Risk: HIGH

Documentation is the most complex provider. Auto-save behavior must match exactly.

---

## Provider 9: SessionProvider (Final Extraction)

### Preconditions

- All other providers extracted
- SessionService, DraftService, QueueService, PatientContextProvider, TimerProvider, DocumentationProvider all stable

### Inputs

- Remaining state in ConsultationContext: appointment, patient, consultation, doctorId, workflowState, loadingState, error
- Shim delegation logic

### Outputs

- `contexts/session/SessionProvider.tsx`

### Day-by-Day Plan

**Day 1-2: SessionProvider**
1. Create SessionProvider composing all other providers
2. Extract remaining state from ConsultationContext
3. Remove old context code

**Day 3: Validation**
1. Verify ConsultationsSessionPage renders correctly
2. Verify all components wired to SessionProvider
3. Remove ConsultationContext entirely (or reduce to 60-line shim)

### Maximum Acceptable Risk: HIGH

SessionProvider is the top-level orchestrator. Errors affect all clinical workflows.

---

## Provider 10: BillingProvider

### Preconditions

- BillingApi port exists (Week 0)

### Inputs

- Billing data loading from ConsultationContext (lines 93-119)
- Completion billing logic

### Outputs

- `contexts/billing/BillingProvider.tsx`
- `application/services/BillingService.ts`

### Maximum Acceptable Risk: MEDIUM

Billing is non-critical during active consultation. Errors can be retried.

---

## Provider 11: NotificationProvider

### Preconditions

- NotificationApi port exists (Week 0)
- Event bus interface exists

### Inputs

- All toast calls migrated to NotificationService

### Outputs

- `contexts/notifications/NotificationProvider.tsx`

### Maximum Acceptable Risk: LOW

Notifications are UI-only. No clinical impact.
