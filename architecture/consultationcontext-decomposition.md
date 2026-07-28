# ConsultationContext Decomposition

## Overview

This document provides a line-by-line decomposition of `contexts/ConsultationContext.tsx` (1004 lines) and related hooks, mapping every responsibility to its target owner in the Application Layer.

---

## 1. ConsultationContext.tsx Responsibility Map

### 1.1 Types and Interfaces (Lines 70-132)

| Lines | Artifact | Target Owner | Migration |
|-------|----------|--------------|-----------|
| 70-81 | `VitalsData` interface | `application/dto/patient/PatientVitalsResponse.ts` | Move to Application DTO |
| 83-88 | `StructuredNotes` interface | `domain/value-objects/SOAPNote.ts` | Align with blueprint SOAPNote or keep as ConsultationNotes |
| 90-113 | `ConsultationProviderState` interface | Split among providers | Decompose — each provider owns its slice |
| 115-132 | `ConsultationAction` union type | ConsultationContext reducer (internal) | Keep in context during extraction; move to SessionService later |

### 1.2 Reducer (Lines 138-276)

| Lines | Responsibility | Target Use Case / Service | Target Provider | Migration Complexity |
|-------|---------------|--------------------------|-----------------|---------------------|
| 138-256 | `consultationReducer` — state transitions | SessionService (workflow state) | SessionProvider | Medium |
| 258-276 | `createInitialState` | SessionService.initialize | SessionProvider | Low |

**Reducer actions to map:**
| Action | Current Owner | Target Owner | Notes |
|--------|--------------|--------------|-------|
| `SET_WORKFLOW_STATE` | consultationReducer | SessionService | Workflow state machine |
| `SET_LOADING` | consultationReducer | SessionService | Loading state |
| `SET_SAVING` | consultationReducer | DraftService | Saving state |
| `SET_DATA` | consultationReducer | SessionService | Appointment/patient/doctor data |
| `SET_CONSULTATION` | consultationReducer | SessionService | Consultation record |
| `SET_CONSULTATION_HISTORY` | consultationReducer | SessionService / PatientContextProvider | History data |
| `SET_NOTES` | consultationReducer | DocumentationProvider | Notes state |
| `UPDATE_NOTE_FIELD` | consultationReducer | DocumentationProvider | Notes state |
| `SET_OUTCOME` | consultationReducer | DocumentationProvider | Outcome state |
| `SET_PATIENT_DECISION` | consultationReducer | DocumentationProvider | Decision state |
| `SET_AUTO_SAVE_STATUS` | consultationReducer | DraftService | Auto-save status |
| `SET_DIRTY` | consultationReducer | DraftService | Dirty tracking |
| `SHOW_COMPLETE_DIALOG` | consultationReducer | SessionProvider | UI state |
| `SHOW_START_DIALOG` | consultationReducer | SessionProvider | UI state |
| `SET_ERROR` | consultationReducer | SessionService | Error state |
| `CLEAR_ERROR` | consultationReducer | SessionService | Error state |
| `RESET` | consultationReducer | SessionService | State reset |

### 1.3 Context Value Interface (Lines 282-311)

| Lines | Property | Type | Target Provider | Notes |
|-------|----------|------|-----------------|-------|
| 284 | `state` | `ConsultationProviderState` | Split among providers | Each provider owns its slice |
| 287 | `isActive` | boolean | SessionProvider | Derived |
| 288 | `isReadOnly` | boolean | SessionProvider | Derived |
| 289 | `canSave` | boolean | DocumentationProvider | Derived |
| 290 | `canComplete` | boolean | SessionProvider | Derived |
| 291 | `waitingQueue` | `AppointmentResponseDto[]` | QueueProvider | Derived |
| 292 | `refetchQueue` | function | QueueProvider | Action |
| 293 | `isQueueRefetching` | boolean | QueueProvider | Derived |
| 294 | `loadWaitingQueue` | function | QueueProvider | Action |
| 297 | `loadAppointment` | function | SessionProvider | Use Case: InitializeSession |
| 298 | `startConsultation` | function | SessionProvider | Use Case: StartConsultation |
| 299 | `closeStartDialog` | function | SessionProvider | UI state |
| 300 | `saveDraft` | function | DocumentationProvider | Use Case: SaveDraft |
| 301 | `saveNotes` | function | DocumentationProvider | Use Case: SaveDraft |
| 302 | `updateNotes` | function | DocumentationProvider | Action |
| 303 | `setOutcome` | function | DocumentationProvider | Action |
| 304 | `setPatientDecision` | function | DocumentationProvider | Action |
| 305 | `openCompleteDialog` | function | SessionProvider | UI state |
| 306 | `closeCompleteDialog` | function | SessionProvider | UI state |
| 307 | `completeConsultation` | function | SessionProvider | Use Case: CompleteConsultation |
| 308 | `switchToPatient` | function | SessionProvider | Use Case: SwitchPatient |
| 309 | `goToSurgeryPlanning` | function | SessionProvider | Navigation |
| 310 | `consultationHistory` | array | PatientContextProvider | Derived |

### 1.4 Provider Component (Lines 319-948)

| Lines | Responsibility | Target | Migration Complexity |
|-------|---------------|--------|---------------------|
| 319-332 | Provider props, state initialization | SessionProvider | Low |
| 334-335 | External hooks (`useSaveConsultationDraft`) | Replace with DraftService | Medium |
| 336 | `queueLoaded` state | QueueProvider | Low |
| 338-351 | Consultation history fetching + sync | PatientContextProvider + LoadPatientHistory use case | Low |
| 353-354 | Auto-save timeout ref | DraftService | Medium |
| 356-377 | Queue lazy-loading + filtering | QueueProvider + QueueService | Medium |
| 379-390 | Computed properties (isActive, isReadOnly, canSave, canComplete) | SessionProvider / DocumentationProvider | Low |
| 394-534 | `loadAppointment` (async, 140 lines) | SessionService.initialize | High — 4 parallel API calls, draft restoration, workflow state determination |
| 536-584 | `startConsultation` (async, 50 lines) | SessionService.start + StartConsultation use case | Medium |
| 586-588 | `closeStartDialog` | SessionProvider | Low |
| 590-629 | `saveDraft` (async, 40 lines) | DraftService.autoSave / manualSave | Medium |
| 631-693 | `saveNotes` (async, 63 lines) | DraftService.manualSave | Medium |
| 695-697 | `updateNotes` | DocumentationProvider | Low |
| 699-709 | `setOutcome` | DocumentationProvider | Low |
| 711-713 | `setPatientDecision` | DocumentationProvider | Low |
| 715-723 | `openCompleteDialog` / `closeCompleteDialog` | SessionProvider | Low |
| 725-789 | `completeConsultation` (async, 65 lines) | SessionService.complete + CompleteConsultation use case | High — draft cleanup, cache invalidation, queue routing |
| 791-810 | `switchToPatient` (async, 20 lines) | SessionService.switchTo + SwitchPatient use case | Medium |
| 812-815 | `goToSurgeryPlanning` | SessionProvider | Low |
| 819-845 | Auto-save useEffect | DraftService | Medium |
| 847-870 | Heartbeat useEffect | SessionService | Low |
| 872-877 | Initial appointment load useEffect | SessionProvider | Low |
| 879-890 | beforeunload useEffect | SessionService | Low |
| 894-942 | Context value memoization | Split among providers | Medium |
| 944-948 | Provider render | Split into nested providers | Medium |
| 955-961 | `useConsultationContext` hook | Keep as convenience hook | Low |
| 967-984 | `generateFullText` helper | DraftService or documentation utility | Low |
| 986-1004 | `parseLegacyNotes` helper | DraftService | Low |

### 1.5 Side Effects Summary

| Side Effect | Location | Lines | Target Service | Target Provider |
|-------------|----------|-------|----------------|-----------------|
| `toast.error('Failed to load appointment')` | loadAppointment catch | 530 | NotificationService | SessionProvider |
| `toast.success('Consultation started')` | startConsultation success | 576 | NotificationService | SessionProvider |
| `toast.error(error.message \|\| 'Failed to start consultation')` | startConsultation catch | 580 | NotificationService | SessionProvider |
| `toast.success('Draft saved')` | saveNotes success | 652 (commented out) | NotificationService | DocumentationProvider |
| `toast.error(result.error \|\| 'Failed to save notes')` | saveNotes error | 658 | NotificationService | DocumentationProvider |
| `toast.error('Failed to save draft. Please try again.')` | saveNotes VERSION_CONFLICT | 688 | NotificationService | DocumentationProvider |
| `toast.success('Consultation completed')` | completeConsultation success | 758 | NotificationService | SessionProvider |
| `toast.info('Loading next patient')` | completeConsultation advance | 777 | NotificationService | SessionProvider |
| `toast.error(error.message \|\| 'Failed to finalize session')` | completeConsultation catch | 786 | NotificationService | SessionProvider |
| `queryClient.invalidateQueries(['doctor', user.id, 'appointments'])` | startConsultation success | 574 | QueueService | SessionProvider |
| `queryClient.invalidateQueries(['consultation', id])` | completeConsultation | 751 | SessionService | SessionProvider |
| `queryClient.invalidateQueries(['consultation'])` | completeConsultation | 752 | SessionService | SessionProvider |
| `queryClient.invalidateQueries(['doctor'])` | completeConsultation | 753 | QueueService | SessionProvider |
| `queryClient.invalidateQueries(['appointments'])` | completeConsultation | 754 | QueueService | SessionProvider |
| `queryClient.invalidateQueries(['billing'])` | completeConsultation | 755 | BillingService | SessionProvider |
| `queryClient.invalidateQueries(['appointment-billing'])` | completeConsultation | 756 | BillingService | SessionProvider |
| `router.push('/doctor/consultations')` | completeConsultation no-queue | 780 | SessionProvider | SessionProvider |
| `router.push('/doctor/consultations/session/${id}')` | switchToPatient | 801, 808 | SessionProvider | SessionProvider |
| `router.push('/doctor/operative/plan/${id}/new')` | goToSurgeryPlanning | 814 | SessionProvider | SessionProvider |
| `localStorage.setItem` | saveDraft, saveNotes | 611, 675 | DraftService | DocumentationProvider |
| `localStorage.removeItem` | completeConsultation cleanup | 745 | DraftService | SessionProvider |
| `localStorage.removeItem` | draft restoration failure | 490, 495 | DraftService | SessionProvider |
| `apiClient.post('/consultations/${id}/heartbeat')` | heartbeat effect | 854 | SessionService | SessionProvider |
| `window.addEventListener('beforeunload')` | dirty warning | 888 | SessionService | SessionProvider |

### 1.6 API Calls Summary

| API Call | Method | Lines | Current Client | Target Port | Target Use Case |
|----------|--------|-------|----------------|-------------|-----------------|
| `GET /appointments/{id}` | GET | 403 | `doctorApi.getAppointment` | ConsultationApi | InitializeSession |
| `GET /doctors/user/{userId}` | GET | 404 | `doctorApi.getDoctorByUserId` | PatientApi (or ConsultationApi) | InitializeSession |
| `GET /appointments/{id}/consultation` | GET | 405 | `consultationApi.getConsultation` | ConsultationApi | InitializeSession, ResumeConsultation |
| `GET /patients/{patientId}` | GET | 419 | `doctorApi.getPatient` | PatientApi | InitializeSession |
| `GET /patients/{patientId}/vitals?appointmentId={id}` | GET | 420 | `apiClient.get` | PatientApi (or future VitalsApi) | LoadPatientVitals |
| `POST /consultations/{id}/start` | POST | 542 | `doctorApi.startConsultation` | ConsultationApi | StartConsultation |
| `GET /appointments/{id}/consultation` (retry) | GET | 565 | `consultationApi.getConsultation` | ConsultationApi | StartConsultation |
| `PUT /appointments/{id}/consultation/draft` | PUT | 597, 661 | `saveDraftMutation.mutateAsync` | ConsultationApi | SaveDraft |
| `POST /consultations/{id}/heartbeat` | POST | 854 | `apiClient.post` | ConsultationApi (or future SessionApi) | (SessionService internal) |
| `POST /appointments/{id}/end-consultation` | POST | 854 (useDoctorConsultation hook) | `apiClient.post` | ConsultationApi | CompleteConsultation |

---

## 2. Related Hooks Decomposition

### 2.1 `hooks/consultation/useConsultation.ts` (62 lines)

| Lines | Responsibility | Target | Migration |
|-------|---------------|--------|-----------|
| 21-44 | React Query config for consultation fetch | `shared-kernel/query-config.ts` + hook | Use `policyConsultation` (already defined) |
| 46-61 | Derived state computation | SessionProvider / DocumentationProvider | Move derived state to providers |

**Migration:** Replace with a custom hook `useConsultationQuery(appointmentId)` that uses `policyConsultation` from `query-config.ts`. The hook remains in Presentation Layer but depends on the policy.

### 2.2 `hooks/consultation/useSaveConsultationDraft.ts` (131 lines)

| Lines | Responsibility | Target | Migration |
|-------|---------------|--------|-----------|
| 21-105 | React Query mutation for save draft | DraftService | Move mutation logic to DraftService; hook becomes thin wrapper |
| 108-131 | `formatStructuredNotes` helper | DraftService or documentation utility | Move to Application Layer utility |

**Migration:** `useSaveConsultationDraft` becomes `useSaveDraftMutation()` that calls `DraftService.manualSave()`. The optimistic update logic moves into DraftService.

### 2.3 `hooks/doctor/useConsultation.ts` (182 lines)

| Lines | Responsibility | Target | Migration |
|-------|---------------|--------|-----------|
| 15-45 | `useStartConsultation` mutation | SessionService + StartConsultation use case | Move to SessionService |
| 50-88 | `useEndConsultation` mutation | SessionService + CompleteConsultation use case | Move to SessionService |
| 95-138 | `useConfirmAppointment` mutation | Separate use case (out of consultation scope) | Leave in place or move to AppointmentService |
| 143-182 | `useRescheduleAppointment` mutation | Separate use case (out of consultation scope) | Leave in place or move to AppointmentService |

**Migration:** Extract `useStartConsultation` and `useEndConsultation` into SessionService. Remove from ConsultationContext.

### 2.4 `hooks/doctor/useDoctorQueue.ts` (65 lines)

| Lines | Responsibility | Target | Migration |
|-------|---------------|--------|-----------|
| 17-35 | `QueuePatient` interface | Move to `application/dto/queue/QueueEntryResponse.ts` | Fix Domain layer pollution |
| 37-43 | `fetchDoctorQueue` function | QueueService | Move to QueueService |
| 45-65 | `useDoctorQueue` hook | QueueProvider | Wrap QueueService in React Query |

**Migration:** Hook becomes `useQueueQuery(doctorId)` that uses `QueueService` internally.

### 2.5 `hooks/useDraftStorage.ts` (146 lines)

| Lines | Responsibility | Target | Migration |
|-------|---------------|--------|-----------|
| 11-14 | `DraftData<T>` interface | `shared-kernel/interfaces/draft-storage.ts` | Already defined as `DraftRecord<T>` |
| 16-19 | `UseDraftStorageOptions<T>` interface | DraftService constructor options | Move to Application Layer |
| 21-26 | `UseDraftStorageReturn<T>` interface | DraftService public API | Move to Application Layer |
| 31-53 | `useDraftStorage` hook | DraftService | Replace with DraftService methods |
| 55-71 | `loadDraft` function | DraftService.loadDraft | Already implemented in LocalStorageDraftStorage |
| 73-79 | `clearDraft` function | DraftService.clearDraft | Already implemented in LocalStorageDraftStorage |
| 81-92 | `isDraftNewerThan` function | DraftService.hasNewerDraft | Already implemented in LocalStorageDraftStorage |
| 113-135 | `hasNewerDraft` utility | DraftService.hasNewerDraft | Move to DraftService |
| 140-146 | `formatDraftTimestamp` utility | DraftService or TimerService | Move to utility |

**Migration:** `useDraftStorage` is fully superseded by `DraftService` + `LocalStorageDraftStorage`. The hook should be removed after all consumers migrate.

### 2.6 `hooks/useConsultationHeartbeat.ts` (60 lines)

| Lines | Responsibility | Target | Migration |
|-------|---------------|--------|-----------|
| 16-60 | `useConsultationHeartbeat` hook | SessionService | Move heartbeat logic to SessionService |

**Migration:** SessionService manages the heartbeat interval internally. The hook becomes `useSessionHeartbeat(sessionId)` that delegates to SessionService.

---

## 3. Decomposition Summary

### 3.1 Ownership Transfer Matrix

| Current Owner | Lines | Target Owner | Priority |
|--------------|-------|--------------|----------|
| ConsultationContext | 394-534 (loadAppointment) | SessionService | HIGH |
| ConsultationContext | 536-584 (startConsultation) | SessionService | HIGH |
| ConsultationContext | 590-629 (saveDraft) | DraftService | HIGH |
| ConsultationContext | 631-693 (saveNotes) | DraftService | HIGH |
| ConsultationContext | 725-789 (completeConsultation) | SessionService + QueueService | HIGH |
| ConsultationContext | 791-810 (switchToPatient) | SessionService | HIGH |
| ConsultationContext | 590-693 (auto-save debounce) | DraftService | HIGH |
| ConsultationContext | 847-870 (heartbeat) | SessionService | MEDIUM |
| ConsultationContext | 879-890 (beforeunload) | SessionService | MEDIUM |
| ConsultationContext | 476-497 (draft restoration) | DraftService | MEDIUM |
| ConsultationContext | 364-370 (queue filtering) | QueueService | MEDIUM |
| ConsultationContext | 760-782 (queue routing) | QueueService | MEDIUM |
| ConsultationContext | 338-351 (consultation history) | PatientContextProvider | LOW |
| ConsultationContext | 879-890 (all toasts) | NotificationService | LOW |
| ConsultationContext | 750-756 (all invalidateQueries) | Respective services | LOW |
| useSaveConsultationDraft | entire file | DraftService | HIGH |
| useDoctorConsultation | start/end mutations | SessionService | MEDIUM |
| useDoctorQueue | fetch + hook | QueueService | MEDIUM |
| useDraftStorage | entire file | DraftService | HIGH |
| useConsultationHeartbeat | entire file | SessionService | MEDIUM |

### 3.2 Lines That Remain in ConsultationContext

After extraction, ConsultationContext should only contain:

| Lines | Responsibility | Reason to Keep |
|-------|---------------|----------------|
| 313-948 | React Context boilerplate | Shim layer during migration |
| 894-942 | Context value memoization | Shim layer |
| 944-948 | Provider render | Shim layer |
| 955-961 | `useConsultationContext` hook | Convenience hook for Presentation Layer |

**Target post-extraction size:** ~60 lines (Context boilerplate only)

### 3.3 Lines That Belong to Presentation Layer

| Lines | Responsibility | Target |
|-------|---------------|--------|
| 228-230, 711-723 | Dialog visibility state | SessionProvider (state) + UI components (rendering) |
| 286-290 (`isActive`, `isReadOnly`, `canSave`, `canComplete`) | Derived display state | Providers compute these from Application Service state |

---

## 4. Extraction Order

### Phase 2 Week 1: DraftService + SessionService (High Priority)

1. Extract `DraftService` from ConsultationContext lines 590-693, 819-845
2. Extract `SessionService` from ConsultationContext lines 394-534, 536-584, 725-789, 791-810, 847-870, 879-890
3. Rewire ConsultationContext to delegate to new services (shim pattern)
4. Write behavioral parity tests

### Phase 2 Week 2: QueueService + NotificationService (Medium Priority)

1. Extract `QueueService` from ConsultationContext lines 364-377, 760-782
2. Extract `NotificationService` from all toast calls
3. Rewire ConsultationContext to delegate
4. Write tests

### Phase 2 Week 3: PatientContextProvider (Low Priority)

1. Extract patient data loading from ConsultationContext lines 338-351, 418-452
2. Create `PatientContextProvider`
3. Rewire ConsultationContext to consume PatientContextProvider
4. Write tests

### Phase 2 Week 4+: DocumentationProvider, TimerProvider, BillingProvider, NotificationProvider

These depend on the Phase 2 Week 1-3 services being stable.
