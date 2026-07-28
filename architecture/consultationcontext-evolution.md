# ConsultationContext Evolution

## Purpose

This document defines the target architecture for `ConsultationContext.tsx` and the migration path from its current state as a God Object to its final state as a thin orchestration shim.

---

## Current State

**File:** `contexts/ConsultationContext.tsx`
**Lines:** 1019

### Responsibility Inventory

| # | Responsibility | Lines | Complexity |
|---|---------------|-------|------------|
| 1 | `VitalsData` interface | 70-85 | Low |
| 2 | `StructuredNotes` interface | 87-92 | Low |
| 3 | `ConsultationProviderState` interface | 94-117 | Medium |
| 4 | `ConsultationAction` union type | 119-136 | Medium |
| 5 | `consultationReducer` | 138-260 | High — 16 action types |
| 6 | `createInitialState` | 262-280 | Low |
| 7 | `ConsultationContextValue` interface | 286-315 | Medium — 18 properties |
| 8 | `ConsultationProvider` component | 328-1010 | Very High |
| 9 | `loadAppointment` | 401-552 | Very High — 4 parallel API calls, draft restoration, workflow state |
| 10 | `startConsultation` | 554-602 | Medium |
| 11 | `saveDraft` | 608-668 | Medium — dual path behind flag |
| 12 | `saveNotes` | 670-751 | High — 3 paths (completed, DraftService, legacy) |
| 13 | `updateNotes` | 753-755 | Low |
| 14 | `setOutcome` | 757-767 | Low |
| 15 | `setPatientDecision` | 769-771 | Low |
| 16 | `completeConsultation` | 783-851 | High — cleanup, cache invalidation, queue routing, navigation |
| 17 | `switchToPatient` | 853-872 | Medium |
| 18 | `goToSurgeryPlanning` | 874-877 | Low |
| 19 | Auto-save useEffect | 881-907 | Medium |
| 20 | Heartbeat useEffect | 909-932 | Medium |
| 21 | Initial load useEffect | 934-939 | Low |
| 22 | beforeunload useEffect | 941-952 | Low |
| 23 | Context value memoization | 957-1004 | Medium |
| 24 | `useConsultationContext` hook | 1013-1019 | Low |
| 25 | `generateFullText` helper | 1028-1045 | Low |
| 26 | `parseLegacyNotes` helper | 1051-1065 | Low |

**Total:** 26 distinct responsibilities in a single 1019-line file.

---

## Target State

**File:** `contexts/ConsultationContext.tsx` (or deleted entirely)
**Lines:** ≤60

### Responsibility Inventory (Target)

| # | Responsibility | Owner | Lines |
|---|---------------|-------|-------|
| 1 | Context boilerplate | SessionProvider | ~5 |
| 2 | Context value interface | SessionProvider | ~10 |
| 3 | Provider render | SessionProvider | ~3 |
| 4 | `useConsultationContext` convenience hook | Keep or delete | ~8 |
| 5 | Legacy shim (optional, during transition) | SessionProvider | ~30 |

**Total:** ≤60 lines, zero business logic.

---

## Evolution Path

### Phase 2 Week 1: DraftService Extraction (COMPLETE)

**Status:** Implemented with dual-path preservation (flawed pattern).

**Actual result:**
- ConsultationContext: 1004 → 1019 lines (+15)
- Draft logic relocated but not removed
- 4 feature flag checks added
- `generateFullText`, `parseLegacyNotes`, `StructuredNotes` duplicated

**Corrective action required:** Remove old draft path before SessionService extraction.

### Phase 2 Week 2: QueueService + NotificationService

**Target:** Extract queue filtering and toast calls.

**Approach:** Replace Pattern — no dual paths.

| What Moves | Target | Lines Removed |
|-----------|--------|---------------|
| Queue lazy-loading + filtering | QueueService | ~22 |
| Toast calls (14 locations) | NotificationService | ~20 |
| Cache invalidations | Respective services | ~15 |

**Expected ConsultationContext after Week 2:** ~960 lines

### Phase 2 Week 3: PatientContextProvider + TimerService

**Target:** Extract patient data loading and timer display.

**Approach:** Migrate-Then-Remove Pattern for PatientContextProvider.

| What Moves | Target | Lines Removed |
|-----------|--------|---------------|
| Consultation history effect | PatientContextProvider | ~14 |
| Patient/vitals loading | PatientContextProvider | ~35 |
| Timer display logic | TimerProvider | ~10 |

**Expected ConsultationContext after Week 3:** ~900 lines

### Phase 2 Week 4: DocumentationProvider

**Target:** Extract notes state, auto-save status, outcome/decision.

**Approach:** Migrate-Then-Remove Pattern with shadow mode.

| What Moves | Target | Lines Removed |
|-----------|--------|---------------|
| Notes state + reducer actions | DocumentationProvider | ~80 |
| Outcome/decision state | DocumentationProvider | ~30 |
| Auto-save effect | DocumentationProvider | ~30 |
| `saveDraft` / `saveNotes` old path | Remove entirely | ~100 |

**Critical:** This extraction must remove the old draft path that was preserved in Week 1.

**Expected ConsultationContext after Week 4:** ~660 lines

### Phase 2 Week 5: SessionService + SessionProvider

**Target:** Extract session lifecycle, workflow state, computed properties.

**Approach:** Replace Pattern for SessionService, Migrate-Then-Remove for SessionProvider.

| What Moves | Target | Lines Removed |
|-----------|--------|---------------|
| Reducer + actions | SessionService | ~140 |
| `loadAppointment` | SessionService | ~150 |
| `startConsultation` | SessionService | ~50 |
| `completeConsultation` | SessionService | ~70 |
| `switchToPatient` | SessionService | ~20 |
| Heartbeat + beforeunload | SessionService | ~30 |
| Computed properties | SessionProvider | ~15 |

**Expected ConsultationContext after Week 5:** ~185 lines

### Phase 2 Week 6: Remaining Providers

**Target:** Extract BillingProvider, QueueProvider, NotificationProvider.

| What Moves | Target | Lines Removed |
|-----------|--------|---------------|
| Remaining queue state | QueueProvider | ~25 |
| Toast logic | NotificationProvider | ~20 |
| Billing data loading | BillingProvider | ~20 |
| Context value memoization | Split among providers | ~50 |

**Expected ConsultationContext after Week 6:** ≤60 lines

---

## State Ownership Transfer

### Current State Ownership

| State Field | Current Owner | Target Owner |
|-------------|--------------|--------------|
| `workflow` | ConsultationContext | SessionProvider |
| `appointment` | ConsultationContext | SessionProvider |
| `patient` | ConsultationContext | PatientContextProvider |
| `vitals` | ConsultationContext | PatientContextProvider |
| `consultation` | ConsultationContext | SessionProvider |
| `doctorId` | ConsultationContext | SessionProvider |
| `consultationHistory` | ConsultationContext | PatientContextProvider |
| `notes` | ConsultationContext | DocumentationProvider |
| `outcomeType` | ConsultationContext | DocumentationProvider |
| `patientDecision` | ConsultationContext | DocumentationProvider |
| `isLoading` | ConsultationContext | SessionProvider |
| `isSaving` | ConsultationContext | DocumentationProvider |
| `showCompleteDialog` | ConsultationContext | SessionProvider |
| `showStartDialog` | ConsultationContext | SessionProvider |
| `autoSaveStatus` | ConsultationContext | DocumentationProvider |

### Derived State Ownership

| Derived Property | Current Owner | Target Owner |
|-----------------|--------------|--------------|
| `isActive` | ConsultationContext | SessionProvider |
| `isReadOnly` | ConsultationContext | SessionProvider |
| `canSave` | ConsultationContext | DocumentationProvider |
| `canComplete` | ConsultationContext | SessionProvider |
| `waitingQueue` | ConsultationContext | QueueProvider |
| `refetchQueue` | ConsultationContext | QueueProvider |
| `isQueueRefetching` | ConsultationContext | QueueProvider |
| `loadWaitingQueue` | ConsultationContext | QueueProvider |

---

## Reducer Decomposition

### Current Reducer Actions

| Action | Current Lines | Target Service | Target Provider |
|--------|--------------|----------------|----------------|
| `SET_WORKFLOW_STATE` | 140-148 | SessionService | SessionProvider |
| `SET_LOADING` | 150-152 | SessionService | SessionProvider |
| `SET_SAVING` | 154-156 | DraftService | DocumentationProvider |
| `SET_DATA` | 156-168 | SessionService | SessionProvider |
| `SET_CONSULTATION` | 170-178 | SessionService | SessionProvider |
| `SET_CONSULTATION_HISTORY` | 180-184 | SessionService | PatientContextProvider |
| `SET_NOTES` | 186-191 | DraftService | DocumentationProvider |
| `UPDATE_NOTE_FIELD` | 193-201 | DraftService | DocumentationProvider |
| `SET_OUTCOME` | 203-211 | DraftService | DocumentationProvider |
| `SET_PATIENT_DECISION` | 213-221 | DraftService | DocumentationProvider |
| `SET_AUTO_SAVE_STATUS` | 223-225 | DraftService | DocumentationProvider |
| `SET_DIRTY` | 227-230 | DraftService | DocumentationProvider |
| `SHOW_COMPLETE_DIALOG` | 232-234 | SessionService | SessionProvider |
| `SHOW_START_DIALOG` | 236-238 | SessionService | SessionProvider |
| `SET_ERROR` | 239-246 | SessionService | SessionProvider |
| `CLEAR_ERROR` | 248-252 | SessionService | SessionProvider |
| `RESET` | 254-256 | SessionService | SessionProvider |

**Target:** Each provider owns its slice of the reducer. No single reducer remains after Phase 2.

---

## Side Effect Distribution

### Current Side Effects in ConsultationContext

| Side Effect | Target Service | Target Provider | When to Extract |
|-------------|----------------|-----------------|-----------------|
| `toast.error('Failed to load appointment')` | NotificationService | SessionProvider | Week 2 |
| `toast.success('Consultation started')` | NotificationService | SessionProvider | Week 2 |
| `toast.error('Failed to start consultation')` | NotificationService | SessionProvider | Week 2 |
| `toast.error('Failed to save notes')` | NotificationService | DocumentationProvider | Week 2 |
| `toast.success('Consultation completed')` | NotificationService | SessionProvider | Week 2 |
| `toast.info('Loading next patient')` | NotificationService | SessionProvider | Week 2 |
| `toast.error('Failed to finalize session')` | NotificationService | SessionProvider | Week 2 |
| `queryClient.invalidateQueries` (start) | QueueService | SessionProvider | Week 2 |
| `queryClient.invalidateQueries` (complete) | SessionService | SessionProvider | Week 5 |
| `router.push` | SessionService | SessionProvider | Week 5 |
| `localStorage.setItem` | DraftService | DocumentationProvider | Week 1 (DONE) |
| `localStorage.removeItem` | DraftService | SessionProvider | Week 1 (DONE) |
| `apiClient.post('/heartbeat')` | SessionService | SessionProvider | Week 5 |
| `window.addEventListener('beforeunload')` | SessionService | SessionProvider | Week 5 |

---

## API Call Distribution

### Current API Calls in ConsultationContext

| API Call | Target Port | Target Use Case |
|----------|------------|----------------|
| `GET /appointments/{id}` | ConsultationApi | InitializeSession |
| `GET /doctors/user/{userId}` | PatientApi | InitializeSession |
| `GET /appointments/{id}/consultation` | ConsultationApi | InitializeSession, ResumeConsultation |
| `GET /patients/{patientId}` | PatientApi | InitializeSession |
| `GET /patients/{patientId}/vitals` | PatientApi | LoadPatientVitals |
| `POST /consultations/{id}/start` | ConsultationApi | StartConsultation |
| `PUT /appointments/{id}/consultation/draft` | ConsultationApi | SaveDraft |
| `POST /appointments/{id}/end-consultation` | ConsultationApi | CompleteConsultation |
| `POST /consultations/{id}/heartbeat` | ConsultationApi | (SessionService internal) |

**Target:** All API calls flow through Application Services (Use Cases). ConsultationContext never calls an API directly.

---

## Hook Migration

### Current Hooks Used by ConsultationContext

| Hook | Lines Used | Target | Migration |
|------|-----------|--------|-----------|
| `useSaveConsultationDraft` | 339 | DraftService | Remove hook — superseded by DraftService |
| `usePatientConsultationHistory` | 343-355 | PatientContextProvider | Replace with PatientContext |
| `useDoctorTodayAppointments` | 364-377 | QueueProvider | Replace with QueueProvider |
| `useConsultation` | 44 | SessionProvider | Replace with SessionProvider |
| `useAuth` | 327 | SessionProvider | Pass user ID to SessionProvider |
| `useQueryClient` | 326 | SessionProvider | Pass to SessionService |
| `useRouter` | 325 | SessionProvider | Pass to SessionService |
| `LocalStorageDraftStorage` | 360-361 | DraftService | Pass via constructor |

### Target Hook Usage

After Phase 2, ConsultationContext (or SessionProvider) should use only:
- `useAuth` — for user identity
- React hooks for state/effects (useReducer, useMemo, etc.)
- Application Services via constructor injection

All data-fetching hooks should be internal to their respective providers/services.

---

## Complexity Metrics Tracking

| Week | Lines | Responsibilities | Cyclomatic Complexity | Feature Flags | Dual Paths |
|------|-------|-----------------|----------------------|---------------|------------|
| Current | 1019 | 26 | ~55 | 1 | 4 |
| After DraftService cutover | ~810 | 24 | ~45 | 0 | 0 |
| After QueueService | ~790 | 22 | ~40 | 0 | 0 |
| After PatientContextProvider | ~755 | 20 | ~38 | 0 | 0 |
| After DocumentationProvider | ~660 | 16 | ~30 | 0 | 0 |
| After SessionService | ~185 | 6 | ~15 | 0 | 0 |
| After remaining Providers | ≤60 | ≤3 | ≤5 | 0 | 0 |

---

## Final State: SessionProvider Composition

After all extractions, the provider tree should look like:

```
SessionProvider
    ├── owns: appointment, consultation, doctorId, workflow, loading, error
    ├── delegates to: SessionService
    │
    ├── PatientContextProvider
    │   ├── owns: patient, vitals, consultationHistory
    │   └── delegates to: PatientApi
    │
    ├── DocumentationProvider
    │   ├── owns: notes, outcomeType, patientDecision, saveStatus, autoSaveStatus
    │   └── delegates to: DraftService
    │
    ├── QueueProvider
    │   ├── owns: waitingQueue, refetchQueue, isQueueRefetching, queueLoaded
    │   └── delegates to: QueueService
    │
    ├── TimerProvider
    │   ├── owns: elapsedSeconds, formattedTime, isOvertime
    │   └── delegates to: TimerService
    │
    └── (optional) BillingProvider + NotificationProvider
```

**ConsultationContext.tsx becomes:** A ~7-line convenience export or is deleted entirely.

---

## God Object Decomposition Checklist

ConsultationContext is no longer a God Object when:

- [ ] It owns zero state fields (all delegated to providers)
- [ ] It contains zero reducer actions (all in SessionService)
- [ ] It makes zero API calls directly (all through Application Services)
- [ ] It has zero `localStorage` access (all through DraftStorage)
- [ ] It has zero `toast` calls (all through NotificationService)
- [ ] It has zero `router.push` calls (all through SessionService)
- [ ] It has zero `queryClient.invalidateQueries` calls (all through Application Services)
- [ ] It has zero `useEffect` hooks (all in providers/services)
- [ ] It contains zero business logic (all in Application Layer)
- [ ] It is ≤60 lines

**Current progress:** 0/10 criteria met.

**Target completion:** End of Phase 2 Week 6.

---

## Summary

ConsultationContext is currently a God Object containing 26 responsibilities in 1019 lines. The DraftService extraction proved that Application Services can be cleanly extracted, but the flawed dual-path strategy temporarily increased context complexity. The evolution plan defines a clear path to ≤60 lines through 6 weeks of Replace and Migrate-Then-Remove extractions. The key correction for future extractions is: **remove the old path before or immediately after validating the new path, never preserve both indefinitely.**
