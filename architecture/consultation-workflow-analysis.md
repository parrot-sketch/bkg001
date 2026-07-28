# Consultation Module — Workflow Analysis

## 1. Workflow Inventory

The consultation module implements the following workflows:

| # | Workflow | Trigger | Outcome |
|---|----------|---------|---------|
| 1 | Load Consultation | Page mount with appointmentId | Consultation room ready |
| 2 | Start Consultation | "Begin Consultation" button | Appointment → IN_CONSULTATION, workspace active |
| 3 | Resume Consultation | "Continue" on existing IN_CONSULTATION | Workspace active (idempotent) |
| 4 | Auto-Save | Notes change + 3s debounce | Draft persisted |
| 5 | Manual Save | "Save" button click | Draft persisted |
| 6 | Complete Consultation | "Complete" button + confirmation | Appointment → COMPLETED, next patient or hub |
| 7 | Switch Patient | Queue panel patient selection | New patient loaded, draft saved |
| 8 | Restore Draft | Consultation load + localStorage check | Notes restored if newer than server |
| 9 | Heartbeat | 30s interval during active consultation | Session kept alive |
| 10 | Queue Progression | Completion → check queue | Load next patient or navigate to hub |
| 11 | Previous Consultation View | Click history card | Modal overlay with details |

---

## 2. Workflow 1: Load Consultation

### Trigger
Page component mounts with `initialAppointmentId` and authenticated user

### Sequence
```
1. ConsultationProvider mounts
2. useEffect: if (initialAppointmentId && user) → loadAppointment()
3. dispatch(SET_LOADING, true)
4. dispatch(SET_WORKFLOW_STATE, LOADING)
5. Tier 1 Parallel:
   - getAppointment(appointmentId)
   - getDoctorByUserId(user.id)
   - getConsultation(appointmentId) [soft-fail]
6. If appointment not found → throw error
7. Tier 2 Parallel:
   - getPatient(apt.patientId)
   - getVitals(apt.patientId, appointmentId) [soft-fail]
8. dispatch(SET_DATA, { appointment, patient, vitals, doctorId })
9. If consultation exists:
   - dispatch(SET_CONSULTATION, consultation)
   - Restore notes (structured or parsed legacy)
   - Restore outcome, patient decision
10. Check localStorage draft:
    - If newer than server → restore silently
    - If older → discard
11. Determine workflow state:
    - COMPLETED/CANCELLED → READY (read-only)
    - IN_CONSULTATION or consultation IN_PROGRESS → ACTIVE
    - CHECKED_IN/READY_FOR_CONSULTATION → READY + show start dialog
    - Otherwise → READY
12. dispatch(SET_DIRTY, false)
13. dispatch(SET_LOADING, false)
```

### Participants
- `ConsultationSessionPageOptimized`
- `ConsultationProvider`
- `useAuth`
- `doctorApi`, `consultationApi`, `apiClient`

### API Calls
- `GET /appointments/:id`
- `GET /doctors/by-user/:userId`
- `GET /appointments/:id/consultation`
- `GET /patients/:id`
- `GET /patients/:id/vitals?appointmentId=:id`

### State Transitions
`IDLE` → `LOADING` → `READY` or `ACTIVE` or `ERROR`

### Error Handling
- Appointment not found → `DomainException` → `ERROR` state
- Patient not found → `DomainException` → `ERROR` state
- Consultation fetch failure → soft-fail (null consultation)
- Vitals fetch failure → soft-fail (null vitals)

---

## 3. Workflow 2: Start Consultation

### Trigger
Doctor clicks "Begin Consultation" in StartConsultationDialog or QueuePanel

### Sequence
```
1. Doctor submits dialog / clicks queue button
2. doctorApi.startConsultation(dto)
3. POST /api/consultations/:id/start
4. JWT authentication
5. StartConsultationUseCase.execute():
   a. Auto-heal stale IN_CONSULTATION appointments (non-blocking)
   b. Validate doctor assignment (allow queue reconciliation)
   c. Validate state transition via AppointmentStateTransitionService
   d. Update appointment → IN_CONSULTATION
   e. Create consultation if not exists (NOT_STARTED)
   f. Start consultation → IN_PROGRESS
   g. Update PatientQueue → IN_CONSULTATION
   h. Ensure DoctorPatientAssignment
   i. Audit log
6. Return AppointmentResponseDto
7. revalidateDoctorDashboard(doctorId)
8. revalidateFrontdeskDashboard()
9. Client receives response
10. ConsultationContext.startConsultation():
    a. Refetch consultation
    b. dispatch(SET_CONSULTATION)
    c. Restore notes
    d. dispatch(SET_WORKFLOW_STATE, ACTIVE)
    e. dispatch(SHOW_START_DIALOG, false)
    f. queryClient.invalidateQueries(['doctor', user.id, 'appointments'])
    g. toast.success('Consultation started')
11. UI: Start dialog closes, workspace becomes interactive
```

### Participants
- `StartConsultationDialog` / `ConsultationQueuePanel`
- `ConsultationContext`
- `doctorApi`
- `StartConsultationUseCase`
- `JwtMiddleware`
- `PrismaAppointmentRepository`, `PrismaConsultationRepository`

### API Calls
- `POST /api/consultations/:id/start`

### State Transitions
`READY` → `ACTIVE`

### Error Handling
- "already in progress" → handled as success (idempotent)
- State transition invalid → `DomainException` → error toast
- Network error → error toast

---

## 4. Workflow 3: Resume Consultation (Continue)

### Trigger
Doctor clicks "Continue" on an existing IN_CONSULTATION appointment in queue

### Sequence
```
1. doctorApi.startConsultation(dto)
2. POST /api/consultations/:id/start
3. StartConsultationUseCase detects appointment.status === IN_CONSULTATION
4. Returns existing AppointmentResponseDto (no mutation)
5. Client receives success response
6. ConsultationContext.startConsultation():
   a. Refetch consultation
   b. Notes restored from consultation or localStorage
   c. Workflow → ACTIVE
7. UI loads workspace with existing notes
```

### Participants
- `ConsultationQueuePanel`
- `ConsultationContext`
- `StartConsultationUseCase`

### API Calls
- `POST /api/consultations/:id/start` (idempotent)

### State Transitions
`READY` → `ACTIVE` (same as start, but no actual mutation)

### Error Handling
Previously returned 400 error. **Fixed** to return 200 with existing data.

---

## 5. Workflow 4: Auto-Save

### Trigger
`isActive && isDirty` → 3-second debounce expires

### Sequence
```
1. useEffect detects notes change
2. Save timeout set for 3000ms
3. If another change occurs before timeout:
   - Clear previous timeout
   - Set new 3000ms timeout
4. Timeout expires
5. saveDraft() called
6. useSaveConsultationDraft mutation:
   a. Snapshot current React Query cache
   b. Optimistic update with mutation response
   c. PUT /appointments/:id/consultation/draft
7. On success:
   dispatch(SET_DIRTY, false)
   dispatch(SET_AUTO_SAVE_STATUS, 'saved')
   localStorage.setItem(draft)
   setTimeout(() => SET_AUTO_SAVE_STATUS, 'idle', 2000)
8. On error:
   dispatch(SET_AUTO_SAVE_STATUS, 'error')
   Rollback to snapshot
   If VERSION_CONFLICT:
     Refetch consultation
     Reconcile notes
```

### Participants
- `ConsultationContext` (debounce effect)
- `useSaveConsultationDraft`
- `consultationApi`

### API Calls
- `PUT /appointments/:id/consultation/draft`

### State Transitions
`ACTIVE` + `dirty` → `ACTIVE` + `clean` (with transient 'saving'/'saved' states)

### Error Handling
- Network error → status → 'error', rollback
- Version conflict → refetch + reconcile
- Other errors → status → 'error', keep dirty state

---

## 6. Workflow 5: Manual Save

### Trigger
Doctor clicks "Save" button in header

### Sequence
```
1. Header button calls onSaveDraft() prop
2. ConsultationContext.saveDraft():
   a. Guard: if (!canSave) return
   b. dispatch(SET_SAVING, true)
   c. dispatch(SET_AUTO_SAVE_STATUS, 'saving')
   c. Call saveDraftMutation.mutateAsync(...)
   d. On success: same as auto-save success path
   e. On error: same as auto-save error path
   f. Finally: dispatch(SET_SAVING, false)
```

### Participants
- `ConsultationSessionHeader`
- `ConsultationContext`
- `useSaveConsultationDraft`

### API Calls
- `PUT /appointments/:id/consultation/draft`

### Differences from Auto-Save
- Immediate (no debounce)
- Explicit user action
- Always runs if canSave (ignores debounce timer)
- Sets `isSaving` flag for UI feedback

---

## 7. Workflow 6: Complete Consultation

### Trigger
Doctor clicks "Complete" → CompleteConsultationDialog confirms

### Sequence
```
1. Header button calls onComplete() prop
2. dispatch(SHOW_COMPLETE_DIALOG, true)
3. dispatch(SET_WORKFLOW_STATE, COMPLETING)
4. CompleteConsultationDialog opens
5. Doctor reviews/adjusts summary, checks billing
6. Doctor clicks "Finalize"
7. doctorApi.completeConsultation(dto)
8. POST /api/consultations/:id/complete
9. CompleteConsultationUseCase.execute():
   a. Validate appointment not completed/cancelled
   b. Finalize consultation notes
   c. Update appointment → COMPLETED
   d. Set consultation_ended_at, consultation_duration
   e. Optionally create follow-up appointment
   f. Create billing + payment (UNPAID)
   g. If PROCEDURE_RECOMMENDED + YES:
      - Create SurgicalCase
      - Create CasePlan
   h. Send email to patient
   i. Send in-app notifications to frontdesk/nurses
   j. Update PatientQueue
   k. Update DoctorPatientAssignment
   l. Audit log
10. Response returns
11. ConsultationContext.completeConsultation():
    a. Clear save timeout
    b. dispatch(SET_WORKFLOW_STATE, TRANSITIONING)
    c. dispatch(SHOW_COMPLETE_DIALOG, false)
    d. localStorage.removeItem(draft)
    e. dispatch(RESET) — full state clear
    f. Aggressive cache invalidation (7 query keys)
    g. toast.success('Consultation completed')
    h. Queue-aware routing:
       - nextInConsultation = todayAppointments.find(IN_CONSULTATION, not current)
       - nextWaiting = waitingQueue.find(CHECKED_IN or READY_FOR_CONSULTATION)
       - nextPatient = nextInConsultation || nextWaiting
       - If nextPatient:
           await loadAppointment(nextPatient.id)
           toast.info(`Loading next patient: ${nextPatient.patient?.firstName}`)
       - Else:
           router.push('/doctor/consultations')
12. UI: Context resets, new patient loads or hub renders
```

### Participants
- `ConsultationSessionHeader`
- `CompleteConsultationDialog`
- `ConsultationContext`
- `CompleteConsultationUseCase`
- Multiple repositories

### API Calls
- `POST /api/consultations/:id/complete`

### State Transitions
`ACTIVE` → `COMPLETING` → `TRANSITIONING` → `READY` (new patient) or navigation away

### Error Handling
- Error caught → `COMPLETING` → `ACTIVE` (revert)
- Error toast displayed

---

## 8. Workflow 7: Switch Patient

### Trigger
Doctor clicks patient card in `ConsultationQueuePanel`

### Sequence
```
1. QueuePanel calls onSwitchPatient(appointmentId)
2. Check state.workflow.isDirty
3. If dirty:
   a. Show confirmation dialog
   b. If confirmed:
      i. Call onSaveDraft()
      ii. If save fails → log error, navigate anyway
      iii. router.push(`/doctor/consultations/session/${appointmentId}`)
4. If clean:
   a. router.push(`/doctor/consultations/session/${appointmentId}`)
5. New page component mounts
6. New ConsultationProvider with new initialAppointmentId
7. loadAppointment(newId) fetches new patient data
8. Old state completely replaced
```

### Participants
- `ConsultationQueuePanel`
- `PatientSwitchConfirmation` (sub-component)
- `ConsultationContext`

### API Calls
- None directly (delegates to context for save draft)

### State Transitions
`ACTIVE` → (navigate away) → new `READY`/`ACTIVE` for new patient

### Error Handling
- Save draft failure → log error, navigate anyway
- No blocking errors

---

## 9. Workflow 8: Restore Draft

### Trigger
On consultation load, after server consultation data is available

### Sequence
```
1. localStorage.getItem(`consultation-draft-${appointmentId}`)
2. If draft exists:
   a. Parse JSON
   b. Compare draft.timestamp vs consultation.updatedAt
   c. If draft.timestamp > consultation.updatedAt:
      - dispatch(SET_NOTES, draft.structured) [SILENT - no toast]
   d. Else:
      - localStorage.removeItem(`consultation-draft-${appointmentId}`)
```

### Participants
- `ConsultationContext` (useEffect inside loadAppointment)

### API Calls
- None (localStorage only)

### Purpose
Crash recovery: if browser crashes, unsaved notes are preserved in localStorage and restored on reload, but only if they're newer than the server version.

### Error Handling
- JSON parse failure → clear localStorage, log error
- Missing/invalid timestamp → default to epoch, discard draft

---

## 10. Workflow 9: Heartbeat

### Trigger
`isActive && consultation.id` → 30-second interval

### Sequence
```
1. useEffect sets up setInterval(sendHeartbeat, 30000)
2. Immediately calls sendHeartbeat() once
3. Every 30 seconds:
   apiClient.post(`/consultations/${id}/heartbeat`, {})
4. Errors caught silently (no UI impact)
5. On unmount or dependency change:
   clearInterval(heartbeat)
```

### Participants
- `ConsultationContext`

### API Calls
- `POST /consultations/:id/heartbeat`

### Purpose
- Prevent session timeout on proxy/load balancer
- Enable backend cleanup of abandoned sessions
- No user-facing effect

---

## 11. Workflow 10: Queue Progression

### Trigger
Consultation completion

### Sequence
```
1. completeConsultation() after success
2. Find nextInConsultation:
   todayAppointments.find(apt =>
     apt.id !== completedId &&
     apt.status === IN_CONSULTATION
   )
3. Find nextWaiting:
   waitingQueue.find(apt =>
     apt.status === CHECKED_IN or READY_FOR_CONSULTATION
   )
4. nextPatient = nextInConsultation || nextWaiting
5. If nextPatient:
   a. await loadAppointment(nextPatient.id)
   b. toast.info(`Loading next patient: ${name}`)
   c. Current session data wiped, new patient loaded
6. If no nextPatient:
   a. router.push('/doctor/consultations')
```

### Participants
- `ConsultationContext`

### Decision Logic
- Prioritizes `IN_CONSULTATION` over `CHECKED_IN`
- `IN_CONSULTATION` allows resumption without re-start
- `CHECKED_IN` requires explicit start

---

## 12. Workflow 11: Previous Consultation View

### Trigger
Doctor clicks consultation card in PatientInfoSidebar

### Sequence
```
1. setSelectedConsultation(consultation)
2. Modal overlay renders with:
   - Date, time, doctor, duration, outcome, status
   - Notes summary
   - Photo count, before/after photos, case plan
   - Link to full appointment details
3. Doctor can close modal (X button or backdrop click)
4. setSelectedConsultation(null)
5. Modal unmounts
```

### Participants
- `PatientInfoSidebar`

### API Calls
- None (data already loaded via consultationHistory)

### Purpose
Reference previous encounters without interrupting current consultation

---

## 13. Workflow State Machine Diagram

```
                    ┌─────────────┐
                    │   IDLE       │
                    └──────┬──────┘
                           │
                    [Provider mounts]
                           │
                    ┌──────▼──────┐
                    │  LOADING    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         [Success]     [Error]     [Retry]
              │            │            │
       ┌──────▼──────┐     │     ┌──────▼──────┐
       │   READY     │◄────┘     │    ERROR    │
       └──────┬──────┘           └─────────────┘
              │
       ┌──────┴────────┐
       │               │
  [Start]         [Load existing]
       │               │
       ▼               ▼
┌─────────────┐  ┌─────────────┐
│   ACTIVE    │  │   ACTIVE    │
│ (new start) │  │ (resume)    │
└──────┬──────┘  └──────┬──────┘
       │                │
  ┌────┴────────┐        │
  │             │        │
[Edit]     [Complete]    │
  │             │        │
  ▼             ▼        │
┌──────────┐ ┌───────────┐◄──┐
│  ACTIVE  │ │COMPLETING │    │
│ (dirty)  │ └─────┬─────┘    │
└──────────┘       │          │
                   │          │
              ┌────▼────┐     │
              │TRANSITION│    │
              │  ING    │     │
              └────┬────┘     │
                   │          │
          ┌────────┼────────┐ │
          │        │        │ │
     [Success]  [Error] [No Queue] │
          │        │        │ │
          ▼        ▼        ▼ │
    ┌─────────┐ ┌─────┐ ┌─────▼─────┐
    │  READY  │ │ERROR │ │  HUB      │
    │(next pt)│ │(revert│ │(no queue) │
    └─────────┘ │to ACTIVE)└──────────┘
                └──────────────────┘
```

---

## 14. Error Recovery Workflows

### 14.1 Load Error Recovery
```
ERROR state
    ↓
User clicks "Try again"
    ↓
window.location.reload()
    ↓
Full reload from scratch
```

### 14.2 Draft Conflict Recovery
```
VERSION_CONFLICT on save
    ↓
Rollback to snapshot
Refetch consultation
Reconcile notes (server wins, draft discarded)
Dispatch(SET_NOTES, serverNotes)
```

### 14.3 Switch Patient with Dirty State
```
Dirty state + switch requested
    ↓
Confirmation dialog
    ↓
If confirmed:
  saveDraft() [await]
  ↓
  If save fails:
    log error
    navigate anyway
  ↓
  navigate to new patient
```

### 14.4 Completion Error Recovery
```
CompleteConsultationUseCase throws
    ↓
Caught in completeConsultation()
dispatch(SET_WORKFLOW_STATE, ACTIVE) — revert
toast.error('Failed to finalize session')
User can retry completion
```

---

## 15. Side Effect Workflows

### 15.1 Auto-Save Cleanup
```
Component unmount or dependency change
    ↓
useEffect cleanup:
  clearTimeout(saveTimeoutRef)
```

### 15.2 Heartbeat Cleanup
```
isActive becomes false OR consultation.id changes
    ↓
useEffect cleanup:
  clearInterval(heartbeatInterval)
```

### 15.3 BeforeUnload Warning
```
User attempts to close tab with unsaved changes
    ↓
beforeunload event listener:
  if (workflow.isDirty):
    e.preventDefault()
    e.returnValue = ''
```

### 15.4 Queue Loading Trigger
```
appointment prop changes
    ↓
useEffect dependency [appointment, loadWaitingQueue]
    ↓
loadWaitingQueue()
    ↓
if (!queueLoaded):
  setQueueLoaded(true)
  refetchQueue()
```

---

## 16. Summary

The consultation module implements 11 distinct workflows with clear triggers, sequences, and state transitions. The most complex workflows are:

1. **Complete Consultation** — triggers a cascade of backend operations (billing, surgical case, notifications) followed by cache clearing and queue-aware routing
2. **Load Consultation** — orchestrates parallel data fetching with fallback strategies
3. **Auto-Save** — debounced background synchronization with version safety

Error handling is present at each workflow boundary, with appropriate rollback, retry, or user notification strategies. The workflow state machine (`ConsultationWorkflowState`) cleanly separates UI concerns from domain entity state (`ConsultationState`).
