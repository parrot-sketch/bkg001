# Workflow State Machine Audit

## Purpose

This document audits the proposed `ConsultationWorkflowState` machine against the full production consultation workflow, from patient queue entry through consultation completion, to determine whether it is complete, deterministic, and ready for activation in PR-A04.

**Scope:** `domain/workflows/ConsultationWorkflowState.ts`, `contexts/ConsultationContext.tsx`, and all clinical workflow documentation.

**Constraint:** This audit does not modify production code. It only verifies readiness.

---

## 1. Audit Methodology

Every clinical workflow was traced from entry to exit:

1. Patient enters queue → Consultation completed
2. Session initialization
3. Consultation start / resume
4. Draft restoration
5. Documentation / auto-save / manual save
6. Queue progression
7. Patient switching
8. Completion
9. Cancellation
10. Failure recovery
11. Version conflict
12. Retry
13. Timeout / heartbeat
14. Recovery after refresh

For each workflow, the following were verified:
- Every state is reachable
- Every transition is deterministic
- Every guard condition is present
- Every side effect is mapped
- Every failure path is represented
- Every retry path is represented
- Every recovery path is represented
- Every terminal state is represented

---

## 2. Documented State Machine (Current)

### States

| State | Purpose |
|-------|---------|
| `IDLE` | No patient selected, viewing queue |
| `LOADING` | Fetching patient/consultation data |
| `READY` | Patient data loaded, can start consultation |
| `ACTIVE` | Consultation in progress, taking notes |
| `COMPLETING` | Completing consultation (dialog open) |
| `TRANSITIONING` | Switching to next patient or surgery workflow |
| `ERROR` | Something went wrong |

### Actions

| Action | Purpose |
|--------|---------|
| `LOAD_PATIENT` | Initiate session data fetch |
| `LOAD_SUCCESS` | Session data loaded successfully |
| `LOAD_ERROR` | Session data load failed |
| `START_CONSULTATION` | Begin active consultation |
| `SAVE_DRAFT` | Persist notes (auto or manual) |
| `OPEN_COMPLETE_DIALOG` | Open completion confirmation |
| `CANCEL_COMPLETE` | Cancel completion, return to editing |
| `CONFIRM_COMPLETE` | Confirm completion |
| `SWITCH_PATIENT` | Navigate to different patient |
| `GO_TO_SURGERY` | Navigate to surgery planning |
| `RETRY` | Retry after error |
| `DISMISS_ERROR` | Dismiss error, return to idle |

### Transitions

```
IDLE ──LOAD_PATIENT──► LOADING
LOADING ──LOAD_SUCCESS──► READY
LOADING ──LOAD_ERROR──► ERROR
READY ──START_CONSULTATION──► ACTIVE
ACTIVE ──SAVE_DRAFT──► ACTIVE
ACTIVE ──OPEN_COMPLETE_DIALOG──► COMPLETING
COMPLETING ──CANCEL_COMPLETE──► ACTIVE
COMPLETING ──CONFIRM_COMPLETE──► TRANSITIONING
TRANSITIONING ──LOAD_PATIENT──► LOADING
TRANSITIONING ──GO_TO_SURGERY──► TRANSITIONING (self-loop)
ERROR ──RETRY──► LOADING
ERROR ──DISMISS_ERROR──► IDLE
ERROR ──SWITCH_PATIENT──► LOADING
```

---

## 3. Production Workflow Trace

### Workflow 1: Load Consultation (Patient enters queue → workspace ready)

**Entry:** Page mounts with `initialAppointmentId` and authenticated user

**Production path:**
```
1. ConsultationProvider mounts
2. loadAppointment() called
3. dispatch(SET_LOADING, true)
4. dispatch(SET_WORKFLOW_STATE, LOADING)
5. Tier 1 Parallel:
   - getAppointment(appointmentId)
   - getDoctorByUserId(user.id)
   - getConsultation(appointmentId) [soft-fail]
6. If appointment not found → ERROR
7. Tier 2 Parallel:
   - getPatient(apt.patientId)
   - getVitals(apt.patientId, appointmentId) [soft-fail]
8. dispatch(SET_DATA, ...)
9. If consultation exists:
   - dispatch(SET_CONSULTATION, consultation)
   - Restore notes (structured or parsed legacy)
   - Restore outcome, patient decision
   - Check localStorage draft → if newer, restore silently
10. Determine workflow state:
    - COMPLETED/CANCELLED → READY (read-only, no dialogs)
    - IN_CONSULTATION or consultation IN_PROGRESS → ACTIVE
    - CHECKED_IN/READY_FOR_CONSULTATION → READY + show start dialog
    - Otherwise → READY
11. dispatch(SET_DIRTY, false)
12. dispatch(SET_LOADING, false)
```

**State machine coverage:** ✅ Partial
- `IDLE → LOADING` via `LOAD_PATIENT` ✅
- `LOADING → READY` via `LOAD_SUCCESS` ✅
- `LOADING → ERROR` via `LOAD_ERROR` ✅
- `READY → ACTIVE` via `START_CONSULTATION` — but production jumps directly from LOADING to ACTIVE if appointment is IN_CONSULTATION, bypassing READY. ❌

**Gaps:**
- Logic that determines initial state based on appointment/consultation status is NOT in the state machine. It's in loadAppointment.
- `LOAD_SUCCESS` always maps to `READY` in `getNextState()`, but production can go to `ACTIVE`.

### Workflow 2: Start Consultation

**Entry:** Doctor clicks "Begin Consultation"

**Production path:**
```
1. startConsultation() called
2. dispatch(SET_LOADING, true)
3. doctorApi.startConsultation(dto)
4. POST /api/consultations/:id/start
5. If "already in progress" → treat as success (idempotent)
6. Refetch consultation
7. dispatch(SET_CONSULTATION, consultation)
8. dispatch(SET_WORKFLOW_STATE, ACTIVE)
9. dispatch(SHOW_START_DIALOG, false)
10. queryClient.invalidateQueries(['doctor', user.id, 'appointments'])
11. toast.success('Consultation started')
12. dispatch(SET_LOADING, false)
```

**State machine coverage:** ✅ Complete
- `READY → ACTIVE` via `START_CONSULTATION` ✅

**Gaps:** None for state transition. But the state machine doesn't include:
- Side effects: cache invalidation, toast notification
- Idempotency handling ("already in progress")

### Workflow 3: Resume Consultation

**Entry:** Doctor clicks "Continue" on existing IN_CONSULTATION appointment

**Production path:**
```
1. startConsultation() called (same API as start)
2. Returns existing data (idempotent)
3. Refetch consultation
4. dispatch(SET_WORKFLOW_STATE, ACTIVE)
5. Restore notes from consultation or localStorage
```

**State machine coverage:** ✅ Same as Workflow 2

### Workflow 4: Auto-Save

**Entry:** Notes change + 3s debounce expires

**Production path:**
```
1. useEffect detects notes change
2. setTimeout 3000ms
3. saveDraft() called
4. useSaveConsultationDraft mutation:
   a. Snapshot cache
   b. OnMutate: optimistic update
   c. PUT /appointments/:id/consultation/draft
5. On success:
   dispatch(SET_DIRTY, false)
   dispatch(SET_AUTO_SAVE_STATUS, 'saved')
   localStorage.setItem(draft)
   setTimeout → SET_AUTO_SAVE_STATUS('idle')
6. On error:
   dispatch(SET_AUTO_SAVE_STATUS, 'error')
   Rollback
   If VERSION_CONFLICT: refetch + reconcile
```

**State machine coverage:** ❌ Not represented
- `SAVE_DRAFT` action exists in state machine and maps to `ACTIVE → ACTIVE` (self-loop)
- But the state machine doesn't track save status transitions: `idle → saving → saved → error`

**Gaps:**
- DocumentationWorkflow (ADR-004) is not implemented
- Save lifecycle states are not in the state machine
- Version conflict detection is not in the state machine

### Workflow 5: Manual Save

**Entry:** Doctor clicks "Save" button

**Production path:**
```
1. saveDraft() or saveNotes() called
2. Guard: if (!canSave) return
3. dispatch(SET_SAVING, true)
4. dispatch(SET_AUTO_SAVE_STATUS, 'saving')
5. Call saveDraftMutation.mutateAsync(...)
6. On success: same as auto-save success
7. On error: same as auto-save error
8. dispatch(SET_SAVING, false)
```

**State machine coverage:** ❌ Same gap as Auto-Save

### Workflow 6: Complete Consultation

**Entry:** Doctor clicks "Complete" → confirms in dialog

**Production path:**
```
1. openCompleteDialog() → dispatch(SHOW_COMPLETE_DIALOG, true)
                         → dispatch(SET_WORKFLOW_STATE, COMPLETING)
2. Doctor reviews, clicks "Finalize"
3. completeConsultation() called
4. dispatch(SET_WORKFLOW_STATE, TRANSITIONING)
5. dispatch(SHOW_COMPLETE_DIALOG, false)
6. localStorage.removeItem(draft)
7. dispatch(RESET) — full state clear
8. queryClient.invalidateQueries (7 keys)
9. toast.success('Consultation completed')
10. Queue-aware routing:
    - nextInConsultation = todayAppointments.find(IN_CONSULTATION, not current)
    - nextWaiting = waitingQueue.find(CHECKED_IN or READY_FOR_CONSULTATION)
    - nextPatient = nextInConsultation || nextWaiting
    - If nextPatient:
        await loadAppointment(nextPatient.id)
        toast.info(`Loading next patient: ${name}`)
    - Else:
        router.push('/doctor/consultations')
```

**State machine coverage:** ⚠️ Partial
- `ACTIVE → COMPLETING` via `OPEN_COMPLETE_DIALOG` ✅
- `COMPLETING → TRANSITIONING` via `CONFIRM_COMPLETE` ✅
- `COMPLETING → ACTIVE` via `CANCEL_COMPLETE` ✅
- `TRANSITIONING → LOADING` via `SWITCH_PATIENT` — but only if next patient exists
- **Gap:** No state machine transition for `TRANSITIONING → IDLE` or `TRANSITIONING → READY`. Production uses `RESET` which bypasses the state machine.

**Missing:**
- No terminal state in the state machine. After completion, the state machine has no way to represent "session completed".
- `RESET` is not a state machine transition.

### Workflow 7: Switch Patient

**Entry:** Doctor clicks patient card in queue

**Production path:**
```
1. switchToPatient(appointmentId) called
2. Clear auto-save timeout
3. If dirty:
   a. saveDraft() [await]
   b. If save fails → log error, navigate anyway
   c. router.push(`/doctor/consultations/session/${appointmentId}`)
4. If clean:
   a. router.push(`/doctor/consultations/session/${appointmentId}`)
5. New page mounts with new ConsultationProvider
```

**State machine coverage:** ⚠️ Partial
- `ACTIVE → LOADING` via `SWITCH_PATIENT` ✅
- `ERROR → LOADING` via `SWITCH_PATIENT` ✅
- But switch can happen from READY too (if currently viewing read-only consultation)
- **Gap:** READY → LOADING via SWITCH_PATIENT is NOT in VALID_TRANSITIONS

### Workflow 8: Restore Draft

**Entry:** On consultation load, after server data available

**Production path:**
```
1. localStorage.getItem(`consultation-draft-${appointmentId}`)
2. If draft exists:
   a. Parse JSON
   b. Compare draft.timestamp vs consultation.updatedAt
   c. If draft.timestamp > consultation.updatedAt:
      dispatch(SET_NOTES, draft.structured) [SILENT]
   d. Else:
      localStorage.removeItem(`consultation-draft-${appointmentId}`)
```

**State machine coverage:** ❌ Not represented
- There's no state or transition for draft restoration
- This happens inside loadAppointment but is invisible to the state machine

### Workflow 9: Heartbeat

**Entry:** `isActive && consultation.id` → 30s interval

**Production path:**
```
1. useEffect sets up setInterval(sendHeartbeat, 30000)
2. Immediately calls sendHeartbeat() once
3. Every 30s: apiClient.post(`/consultations/${id}/heartbeat`, {})
4. Errors caught silently
5. On unmount or dependency change: clearInterval
```

**State machine coverage:** ❌ Not represented
- No timer or heartbeat state in the state machine
- Heartbeat is a side effect of ACTIVE state, but not modeled

### Workflow 10: Queue Progression

**Entry:** After consultation completion

**Production path:**
```
1. Find nextInConsultation: todayAppointments.find(apt =>
     apt.id !== completedId && apt.status === IN_CONSULTATION)
2. Find nextWaiting: waitingQueue.find(apt =>
     apt.status === CHECKED_IN or READY_FOR_CONSULTATION)
3. nextPatient = nextInConsultation || nextWaiting
4. If nextPatient:
   a. await loadAppointment(nextPatient.id)
   b. toast.info(`Loading next patient: ${name}`)
5. If no nextPatient:
   a. router.push('/doctor/consultations')
```

**State machine coverage:** ⚠️ Partial
- This happens in TRANSITIONING state
- `TRANSITIONING → LOADING` via `loadAppointment` (which dispatches LOAD_PATIENT)
- But the decision logic (which patient to pick) is NOT in the state machine

### Workflow 11: Previous Consultation View

**Entry:** Doctor clicks history card in sidebar

**Production path:**
```
1. setSelectedConsultation(consultation)
2. Modal renders
3. Doctor closes modal
4. setSelectedConsultation(null)
```

**State machine coverage:** ✅ N/A (UI-only, doesn't affect workflow state)

---

## 4. Error Recovery Workflows

### 4.1 Load Error Recovery

```
ERROR state
    ↓
User clicks "Try again"
    ↓
window.location.reload()
    ↓
Full reload from scratch
```

**State machine coverage:** ✅ Complete
- `ERROR → LOADING` via `RETRY` ✅
- But production uses `window.location.reload()`, not a state machine transition

### 4.2 Draft Conflict Recovery

```
VERSION_CONFLICT on save
    ↓
Rollback to snapshot
Refetch consultation
Reconcile notes (server wins, draft discarded)
Dispatch(SET_NOTES, serverNotes)
```

**State machine coverage:** ❌ Not represented
- No conflict state
- No conflict resolution action

### 4.3 Switch Patient with Dirty State

```
Dirty state + switch requested
    ↓
Confirmation dialog
    ↓
If confirmed:
   saveDraft() [await]
   If save fails: log error, navigate anyway
   navigate to new patient
```

**State machine coverage:** ⚠️ Partial
- `ACTIVE → LOADING` via `SWITCH_PATIENT` ✅
- But "save before switch" guard is not in the state machine

### 4.4 Completion Error Recovery

```
CompleteConsultationUseCase throws
    ↓
Caught in completeConsultation()
dispatch(SET_WORKFLOW_STATE, ACTIVE) — revert
toast.error('Failed to finalize session')
User can retry completion
```

**State machine coverage:** ✅ Complete
- `COMPLETING → ACTIVE` via `CANCEL_COMPLETE` — but production uses direct SET_WORKFLOW_STATE in catch block, not CANCEL_COMPLETE action

---

## 5. State Machine Bypass Analysis

### Bypass 1: Direct state assignment in reducer

**Location:** `ConsultationContext.tsx:131-135`
```typescript
case 'SET_WORKFLOW_STATE':
  return {
    ...state,
    workflow: { ...state.workflow, state: action.payload },
  };
```

**Impact:** Any code can dispatch `SET_WORKFLOW_STATE` with any state, bypassing `getNextState()` validation.

### Bypass 2: Initial state determination not in state machine

**Location:** `ConsultationContext.tsx:468-491`
```typescript
if (apt.status === AppointmentStatus.COMPLETED || apt.status === AppointmentStatus.CANCELLED) {
  dispatch({ type: 'SET_WORKFLOW_STATE', payload: ConsultationWorkflowState.READY });
} else if (apt.status === AppointmentStatus.IN_CONSULTATION || hasActiveConsultation) {
  dispatch({ type: 'SET_WORKFLOW_STATE', payload: ConsultationWorkflowState.ACTIVE });
} else if (...) {
  dispatch({ type: 'SET_WORKFLOW_STATE', payload: ConsultationWorkflowState.READY });
} else {
  dispatch({ type: 'SET_WORKFLOW_STATE', payload: ConsultationWorkflowState.READY });
}
```

**Impact:** The logic that decides between READY and ACTIVE based on server state is outside the state machine.

### Bypass 3: RESET bypasses state machine

**Location:** `ConsultationContext.tsx:717`
```typescript
dispatch({ type: 'RESET' });
```

**Impact:** After completion, the state resets to initial state without going through any state machine transition.

### Bypass 4: Error recovery uses direct assignment

**Location:** `ConsultationContext.tsx:735`
```typescript
dispatch({ type: 'SET_WORKFLOW_STATE', payload: ConsultationWorkflowState.ACTIVE });
```

**Impact:** Completion error recovery reverts to ACTIVE directly, bypassing `CANCEL_COMPLETE` action.

---

## 6. Missing States

| Missing State | Purpose | Impact |
|---------------|---------|--------|
| `PAUSED` | Temporary interruption (e.g., doctor steps away but intends to resume) | Medium — currently handled as ACTIVE + beforeunload |
| `CONFLICT` | Version conflict during draft save | Medium — handled inline in mutation |
| `SAVING` / `SAVED` | Draft save lifecycle states | Low — tracked via `autoSaveStatus` in reducer, not workflow state |
| `COMPLETED` | Terminal state after successful completion | High — currently represented as RESET (state cleared) |
| `CANCELLED` | Appointment cancelled (different from ERROR) | Medium — currently maps to READY |

---

## 7. Missing Transitions

| Missing Transition | Current Handling | Impact |
|--------------------|-----------------|--------|
| `TRANSITIONING → READY` | `RESET` bypass | High |
| `TRANSITIONING → IDLE` | `RESET` bypass | High |
| `READY → LOADING` (switch patient) | Direct `SET_WORKFLOW_STATE` | Medium |
| `LOADING → ACTIVE` (resume existing) | Direct `SET_WORKFLOW_STATE` | Medium |
| `ERROR → ACTIVE` (completion error revert) | Direct `SET_WORKFLOW_STATE` | Medium |
| `ANY → COMPLETING` (if dirty notes exist) | Direct `SET_WORKFLOW_STATE` | Medium — no guard preventing completion with unsaved notes |

---

## 8. Clinical Safety Verification

### 8.1 Patient Identity
✅ Preserved — patientId is carried through all state transitions
✅ Not lost during switch or completion

### 8.2 Consultation Integrity
✅ Appointment status gates transitions (READY → ACTIVE only if CHECKED_IN)
⚠️ No guard preventing completion if notes are not dirty/saved
⚠️ No guard preventing switch if notes are dirty (handled at UI level)

### 8.3 Draft Integrity
✅ Version conflict detection exists
✅ Draft restoration compares timestamps
⚠️ Conflict recovery is not in state machine
⚠️ No state for "conflict detected"

### 8.4 Queue Integrity
✅ Queue progression logic exists and is deterministic
⚠️ Queue routing decision is not in state machine
⚠️ No state for "advancing queue"

### 8.5 Audit Integrity
✅ Audit events emitted on start, complete, switch
⚠️ Not modeled in state machine

### 8.6 Billing Integrity
✅ Billing created on completion
⚠️ Not modeled in state machine

---

## 9. Test Coverage

### 9.1 State Machine Tests
**Status:** ❌ None exist

No unit tests verify:
- Valid transitions are accepted
- Invalid transitions are rejected
- `getNextState()` returns correct next state for all state/action pairs
- `canPerformAction()` returns correct boolean for all state/action pairs
- Initial state creation is correct

### 9.2 Reducer Tests
**Status:** ❌ None exist

No tests verify:
- `SET_WORKFLOW_STATE` produces correct state
- All production transitions match documented transitions

### 9.3 Integration Tests
**Status:** ⚠️ Placeholder only

`tests/e2e/integration/workflow-integration.spec.ts` contains placeholder tests only.

---

## 10. Completeness Assessment

### 10.1 States Coverage

| Clinical State | Represented? |
|----------------|-------------|
| No patient selected | ✅ IDLE |
| Loading session data | ✅ LOADING |
| Ready to start consultation | ✅ READY |
| Consultation in progress | ✅ ACTIVE |
| Completion dialog open | ✅ COMPLETING |
| Transitioning after completion | ✅ TRANSITIONING |
| Error state | ✅ ERROR |
| Session completed | ❌ COMPLETED (missing) |
| Appointment cancelled | ⚠️ Maps to READY (semantic mismatch) |
| Version conflict | ❌ CONFLICT (missing) |
| Temporary pause | ❌ PAUSED (missing) |

### 10.2 Transition Coverage

| Production Transition | In State Machine? | Validated? |
|----------------------|-------------------|------------|
| IDLE → LOADING | ✅ | ❌ Not enforced |
| LOADING → READY | ✅ | ❌ Not enforced |
| LOADING → ACTIVE (resume) | ❌ Direct bypass | ❌ |
| LOADING → ERROR | ✅ | ❌ Not enforced |
| READY → ACTIVE | ✅ | ❌ Not enforced |
| ACTIVE → COMPLETING | ✅ | ❌ Not enforced |
| COMPLETING → ACTIVE (cancel) | ✅ | ❌ Not enforced |
| COMPLETING → TRANSITIONING | ✅ | ❌ Not enforced |
| TRANSITIONING → LOADING | ✅ | ❌ Not enforced |
| TRANSITIONING → IDLE | ❌ RESET bypass | ❌ |
| TRANSITIONING → READY | ❌ RESET bypass | ❌ |
| ERROR → LOADING | ✅ | ❌ Not enforced |
| ERROR → IDLE | ✅ | ❌ Not enforced |
| ERROR → ACTIVE (completion revert) | ❌ Direct bypass | ❌ |

**Enforcement rate:** 0%. Every transition bypasses the state machine.

---

## 11. Deterministic Completeness

### 11.1 Is every runtime branch represented?

**No.** The following runtime branches are NOT in the state machine:

1. **Draft restoration branch** — happens during LOADING but is not a state machine transition
2. **Version conflict branch** — happens during save but is not a state machine transition
3. **Queue progression branch** — happens during TRANSITIONING but is not a state machine transition
4. **Completion with next patient vs. hub** — both map to TRANSITIONING but have different outcomes
5. **Resume existing consultation** — can skip READY and go directly to ACTIVE
6. **Cancelled/Completed appointment** — maps to READY but should be a distinct state

### 11.2 Is the state machine deterministic?

**Partially.** The transition table is deterministic (each state+action has exactly one next state), but:

1. `LOAD_SUCCESS` always maps to `READY`, while production can go to `ACTIVE`
2. `GO_TO_SURGERY` maps to `TRANSITIONING` (self-loop), which is unreachable from any state in practice
3. `RESET` is not in the transition table, making terminal states impossible

### 11.3 Are all guard conditions present?

**No.** Missing guards:

1. **Start guard:** `START_CONSULTATION` should only be allowed from `READY` if appointment is `CHECKED_IN` or `READY_FOR_CONSULTATION`
2. **Complete guard:** `CONFIRM_COMPLETE` should only be allowed if notes are saved/dirty flag is clear
3. **Switch guard:** `SWITCH_PATIENT` should only be allowed from `READY` or `ACTIVE` (currently allowed from `ERROR` too)
4. **Auto-save guard:** `SAVE_DRAFT` should only be allowed if consultation is `IN_PROGRESS`

---

## 12. Clinical Safety Gap Analysis

| Safety Property | Status | Gap |
|-----------------|--------|-----|
| Patient identity preserved | ✅ | No gap |
| Consultation integrity | ⚠️ | No guard preventing completion with unsaved notes |
| Draft integrity | ⚠️ | Conflict recovery not in state machine |
| Queue integrity | ✅ | No gap |
| Audit integrity | ✅ | No gap |
| Billing integrity | ✅ | No gap |
| No data loss on switch | ⚠️ | Guard exists at UI level, not state machine level |
| No data loss on completion | ⚠️ | No guard ensuring draft is saved before completion |

---

## 13. Summary of Findings

### What the State Machine Does Well

1. **Defines all major UI states** — IDLE, LOADING, READY, ACTIVE, COMPLETING, TRANSITIONING, ERROR
2. **Defines valid transitions** — the VALID_TRANSITIONS map covers all major transitions
3. **Implements getNextState() and canPerformAction()** — the infrastructure exists
4. **Is pure TypeScript** — no React dependency, testable in isolation

### What the State Machine Is Missing

1. **Enforcement:** Every transition in production bypasses the state machine via `SET_WORKFLOW_STATE`
2. **Terminal state:** No COMPLETED state; RESET bypasses the state machine
3. **DocumentationWorkflow:** ADR-004 specifies it but it doesn't exist
4. **Guard conditions:** No pre-condition validation in transition logic
5. **Side effects mapping:** Heartbeat, cache invalidation, toast notifications not tied to state transitions
6. **Tests:** Zero unit tests for state machine transitions
7. **Missing transitions:** READY→ACTIVE from resume, ERROR→ACTIVE from completion revert, TRANSITIONING→READY/IDLE
8. **Clinical safety gaps:** No guards for unsaved notes, no draft integrity state

---

## 14. Certification Verdict

**NOT CERTIFIED**

The `ConsultationWorkflowState` state machine is a **well-designed but unused artifact**. It defines the correct states and transitions, but:

1. **Zero enforcement** — every production transition bypasses it
2. **Missing terminal state** — COMPLETED is not represented
3. **Missing DocumentationWorkflow** — save lifecycle states are absent
4. **Missing guard conditions** — no pre-condition validation
5. **No tests** — cannot prove correctness

### Required Before PR-A04 Implementation

The following must be designed and tested before the workflow engine can be activated:

| # | Missing Artifact | Priority | Required By |
|---|-----------------|----------|-------------|
| 1 | COMPLETED terminal state | HIGH | PR-A04 |
| 2 | DocumentationWorkflow states (IDLE, EDITING, SAVING, SAVED, ERROR, CONFLICT) | HIGH | PR-A04 |
| 3 | Guard conditions for all transitions | HIGH | PR-A04 |
| 4 | Unit tests for all valid transitions | HIGH | PR-A04 |
| 5 | Unit tests for all invalid transitions | HIGH | PR-A04 |
| 6 | Side effect mapping (heartbeat, cache invalidation, toast) | MEDIUM | PR-A04 |
| 7 | TRANSITIONING → READY/IDLE transitions | MEDIUM | PR-A04 |
| 8 | LOADING → ACTIVE transition (resume path) | MEDIUM | PR-A04 |
| 9 | ERROR → ACTIVE transition (completion error revert) | MEDIUM | PR-A04 |
| 10 | PAUSED state for temporary interruption | LOW | PR-A05+ |
