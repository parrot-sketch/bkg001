# Workflow Transition Matrix

## Purpose

This document provides the complete transition matrix for the Consultation Workflow State Machine, documenting every valid transition, guard condition, side effect, and clinical safety constraint.

**Status:** NOT CERTIFIED — The state machine is not enforced in production. This matrix documents the target state for PR-A04.

---

## 1. State Definitions

| State | Code | Purpose | Entry Condition | Exit Condition |
|-------|------|---------|-----------------|----------------|
| `IDLE` | `IDLE` | No patient selected, viewing queue | Initial state, dismissal of error | Load patient |
| `LOADING` | `LOADING` | Fetching patient/consultation data | Load initiated, patient switch | Data loaded or failed |
| `READY` | `READY` | Patient data loaded, can start consultation | Load success (non-active appointment) | Start consultation, switch patient |
| `ACTIVE` | `ACTIVE` | Consultation in progress, taking notes | Start/resume consultation, cancel completion | Open complete dialog, switch patient, complete |
| `COMPLETING` | `COMPLETING` | Completing consultation (dialog open) | Completion dialog opened | Confirm or cancel completion |
| `TRANSITIONING` | `TRANSITIONING` | Routing to next patient or hub | Completion confirmed | Load next patient, navigate to hub |
| `ERROR` | `ERROR` | Something went wrong | Load failure, network error, completion failure | Retry, dismiss, or switch |
| `COMPLETED` | `COMPLETED` | Consultation finalized (target) | Completion confirmed + no next patient | Reset / new session |
| `CONFLICT` | `CONFLICT` | Version conflict during save (target) | VERSION_CONFLICT detected | Resolve or discard |

---

## 2. Transition Matrix

### 2.1 IDLE Transitions

| Action | From | To | Guard | Side Effects | Clinical Safety |
|--------|------|----|-------|--------------|-----------------|
| `LOAD_PATIENT` | IDLE | LOADING | `appointmentId` is valid | Start loading indicator | None |

### 2.2 LOADING Transitions

| Action | From | To | Guard | Side Effects | Clinical Safety |
|--------|------|----|-------|--------------|-----------------|
| `LOAD_SUCCESS` | LOADING | READY | All required data loaded | Stop loading indicator, restore draft if newer | Patient identity verified |
| `LOAD_SUCCESS` | LOADING | ACTIVE | Appointment is `IN_CONSULTATION` or consultation is `IN_PROGRESS` | Same as above | Consultation integrity verified |
| `LOAD_ERROR` | LOADING | ERROR | Load failed | Show error toast, allow retry | No data loss — retry preserves request |

### 2.3 READY Transitions

| Action | From | To | Guard | Side Effects | Clinical Safety |
|--------|------|----|-------|--------------|-----------------|
| `START_CONSULTATION` | READY | ACTIVE | Appointment status is `CHECKED_IN` or `READY_FOR_CONSULTATION` | Close start dialog, invalidate queue queries | Doctor assignment validated |
| `SWITCH_PATIENT` | READY | LOADING | Current session is clean or user confirms | Save draft if dirty, navigate | Draft saved before switch |

### 2.4 ACTIVE Transitions

| Action | From | To | Guard | Side Effects | Clinical Safety |
|--------|------|----|-------|--------------|-----------------|
| `SAVE_DRAFT` | ACTIVE | ACTIVE | Consultation is `IN_PROGRESS` | Auto-save, localStorage backup, clear dirty flag | Draft integrity maintained |
| `OPEN_COMPLETE_DIALOG` | ACTIVE | COMPLETING | Consultation is `IN_PROGRESS`, appointment is not `COMPLETED`/`CANCELLED` | Open completion dialog | Prevents completing already-finished consultation |
| `SWITCH_PATIENT` | ACTIVE | LOADING | Current session is clean or user confirms | Save draft if dirty, clear timeout, navigate | Draft saved before switch |
| `CONFIRM_COMPLETE` | ACTIVE | TRANSITIONING | **MUST add:** Notes are saved or user confirms unsaved changes | Clear localStorage, invalidate caches | Prevents data loss on completion |

### 2.5 COMPLETING Transitions

| Action | From | To | Guard | Side Effects | Clinical Safety |
|--------|------|----|-------|--------------|-----------------|
| `CANCEL_COMPLETE` | COMPLETING | ACTIVE | User cancels dialog | Close dialog, return to editing | No side effects — reversible |
| `CONFIRM_COMPLETE` | COMPLETING | TRANSITIONING | Outcome selected, billing verified | Finalize notes, create billing, surgical case if needed | Audit log, notifications, billing integrity |

### 2.6 TRANSITIONING Transitions

| Action | From | To | Guard | Side Effects | Clinical Safety |
|--------|------|----|-------|--------------|-----------------|
| `LOAD_PATIENT` | TRANSITIONING | LOADING | Next patient exists in queue | Load next patient session | Queue integrity preserved |
| `GO_TO_SURGERY` | TRANSITIONING | TRANSITIONING | Case plan creation needed | Navigate to surgery planning | Surgical case integrity |
| `COMPLETE_SESSION` | TRANSITIONING | COMPLETED | No next patient exists | Navigate to hub | Session terminal state |

### 2.7 ERROR Transitions

| Action | From | To | Guard | Side Effects | Clinical Safety |
|--------|------|----|-------|--------------|-----------------|
| `RETRY` | ERROR | LOADING | User clicks retry | Reload appointment | Preserves appointment context |
| `DISMISS_ERROR` | ERROR | IDLE | User dismisses error | Clear error state | Allows fresh start |
| `SWITCH_PATIENT` | ERROR | LOADING | User selects different patient | Save draft if dirty, navigate | Draft saved before switch |

### 2.8 COMPLETED Transitions

| Action | From | To | Guard | Side Effects | Clinical Safety |
|--------|------|----|-------|--------------|-----------------|
| `RESET` | COMPLETED | IDLE | New session initiated | Clear all state | Ready for next patient |

### 2.9 CONFLICT Transitions

| Action | From | To | Guard | Side Effects | Clinical Safety |
|--------|------|----|-------|--------------|-----------------|
| `RESOLVE_WITH_SERVER` | CONFLICT | ACTIVE | User accepts server version | Replace notes with server version, clear dirty flag | Server wins — data integrity |
| `RESOLVE_WITH_LOCAL` | CONFLICT | ACTIVE | User keeps local version | Force save local notes | User override — logged for audit |
| `DISMISS_CONFLICT` | CONFLICT | ACTIVE | User dismisses without resolving | Keep both versions, mark for later | Non-blocking — user can continue |

---

## 3. Guard Conditions (Required for PR-A04)

| Transition | Guard | Current Status |
|------------|-------|----------------|
| `START_CONSULTATION` | Appointment is `CHECKED_IN` or `READY_FOR_CONSULTATION` | ✅ Implemented in backend |
| `START_CONSULTATION` | Doctor is assigned to appointment | ✅ Implemented in backend |
| `OPEN_COMPLETE_DIALOG` | Consultation is `IN_PROGRESS` | ⚠️ Checked in UI, not state machine |
| `OPEN_COMPLETE_DIALOG` | Appointment is not `COMPLETED` or `CANCELLED` | ⚠️ Checked in UI, not state machine |
| `CONFIRM_COMPLETE` | Notes are saved or user confirms | ❌ NOT checked — **data loss risk** |
| `CONFIRM_COMPLETE` | Outcome type selected | ⚠️ Checked in dialog, not state machine |
| `SAVE_DRAFT` | Consultation is `IN_PROGRESS` | ⚠️ Checked in UI, not state machine |
| `SWITCH_PATIENT` | Current session is clean or user confirms | ✅ Implemented in UI |
| `LOAD_SUCCESS → ACTIVE` | Appointment is `IN_CONSULTATION` or consultation is `IN_PROGRESS` | ✅ Implemented in loadAppointment |
| `RETRY` | Previous error is recoverable | ⚠️ Always allowed — should be restricted |

---

## 4. Side Effects Mapping

| Transition | Side Effects | Current Owner | Target Owner |
|------------|--------------|---------------|--------------|
| `IDLE → LOADING` | Show loading spinner | ConsultationContext | SessionProvider |
| `LOADING → READY` | Restore draft, restore notes | ConsultationContext | SessionProvider + DraftService |
| `LOADING → ACTIVE` | Start heartbeat interval | ConsultationContext | TimerProvider |
| `READY → ACTIVE` | Close start dialog, invalidate queue queries, success toast | ConsultationContext | SessionProvider + NotificationProvider |
| `ACTIVE → COMPLETING` | Open completion dialog | ConsultationContext | SessionProvider |
| `COMPLETING → TRANSITIONING` | Finalize notes, clear localStorage, invalidate caches, create billing/surgical case, send notifications, audit log | ConsultationContext | SessionService + NotificationService |
| `TRANSITIONING → LOADING` | Load next patient | ConsultationContext | SessionProvider |
| `TRANSITIONING → COMPLETED` | Navigate to hub | ConsultationContext | SessionProvider |
| `ERROR → LOADING` | Retry data fetch | ConsultationContext | SessionProvider |
| `ERROR → IDLE` | Clear error, allow fresh start | ConsultationContext | SessionProvider |
| `ACTIVE → ACTIVE (SAVE_DRAFT)` | Auto-save, localStorage backup, clear dirty flag | ConsultationContext | DraftService |
| `CONFLICT → ACTIVE` | Refetch, reconcile notes | useSaveConsultationDraft | DraftService |

---

## 5. Clinical Safety Constraints

| Constraint | Enforced By | Current Status |
|------------|-------------|----------------|
| Patient identity must survive all transitions | Appointment ID in workflow context | ✅ Always preserved |
| Consultation must not be completed without outcome | Backend validation | ✅ Enforced |
| Draft must not overwrite newer server version | Timestamp comparison in DraftService | ✅ Enforced |
| Queue order must be preserved | Priority: IN_CONSULTATION > CHECKED_IN > READY | ✅ Enforced |
| Audit log must record all clinical actions | Backend use cases | ✅ Enforced |
| Billing must be created on completion | Backend CompleteConsultationUseCase | ✅ Enforced |
| Notes must not be lost on switch | Draft save before navigation | ⚠️ Best effort — failure navigates anyway |
| Unsaved notes must not be lost on completion | **Missing guard** | ❌ NOT enforced |

---

## 6. Missing Clinical Safety Guards

### 6.1 Completion with Unsaved Notes

**Risk:** Doctor clicks "Complete" without saving notes. Notes are lost.

**Current behavior:** Completion proceeds. Notes are finalized by backend, but any locally edited but unsaved notes may be stale.

**Required guard:** `CONFIRM_COMPLETE` should only be allowed if `isDirty === false` OR user explicitly confirms "proceed without saving".

### 6.2 Completion with Active Auto-Save

**Risk:** Auto-save timer is running when completion is triggered. Race condition could result in stale data.

**Current behavior:** `completeConsultation()` clears the save timeout before proceeding.

**Required guard:** State machine should ensure save timeout is cleared before `COMPLETING` transition.

### 6.3 Switch with Dirty Notes

**Risk:** Doctor switches patient without saving. Notes are lost.

**Current behavior:** Confirmation dialog shown. If user confirms, save is attempted. If save fails, navigation proceeds anyway.

**Required guard:** State machine should prevent `SWITCH_PATIENT` if `isDirty === true` and save fails.

---

## 7. Production Bypass Map

Every `SET_WORKFLOW_STATE` dispatch in production that bypasses the state machine:

| Line | Dispatch | Should Use | Actual State |
|------|----------|------------|--------------|
| 391 | `SET_WORKFLOW_STATE, LOADING` | `LOAD_PATIENT` | ✅ LOADING |
| 478 | `SET_WORKFLOW_STATE, READY` | `LOAD_SUCCESS` | ✅ READY |
| 482 | `SET_WORKFLOW_STATE, ACTIVE` | `LOAD_SUCCESS` (resume) | ⚠️ Should be LOADING → ACTIVE via LOAD_SUCCESS, but LOAD_SUCCESS always maps to READY |
| 487 | `SET_WORKFLOW_STATE, READY` | `LOAD_SUCCESS` | ✅ READY |
| 490 | `SET_WORKFLOW_STATE, READY` | `LOAD_SUCCESS` | ✅ READY |
| 563 | `SET_WORKFLOW_STATE, ACTIVE` | `START_CONSULTATION` | ✅ ACTIVE |
| 685 | `SET_WORKFLOW_STATE, COMPLETING` | `OPEN_COMPLETE_DIALOG` | ✅ COMPLETING |
| 690 | `SET_WORKFLOW_STATE, ACTIVE` | `CANCEL_COMPLETE` | ✅ ACTIVE |
| 703 | `SET_WORKFLOW_STATE, TRANSITIONING` | `CONFIRM_COMPLETE` | ✅ TRANSITIONING |
| 717 | `SET_WORKFLOW_STATE, TRANSITIONING` | `CONFIRM_COMPLETE` | ✅ TRANSITIONING |
| 735 | `SET_WORKFLOW_STATE, ACTIVE` | `CANCEL_COMPLETE` | ✅ ACTIVE |
| 748 | `SET_WORKFLOW_STATE, ACTIVE` | `LOAD_SUCCESS` (after queue advance) | ⚠️ After loadAppointment in queue advance |

---

## 8. Implementation Requirements for PR-A04

To activate the workflow engine, the following must be implemented:

### Phase 1: State Machine Enforcement
1. Replace all `SET_WORKFLOW_STATE` dispatches with state machine actions
2. Add `getNextState()` call in reducer for `SET_WORKFLOW_STATE` action
3. Add `canPerformAction()` guard before every transition
4. Add missing transitions: TRANSITIONING → COMPLETED, READY → LOADING (switch), LOADING → ACTIVE (resume)

### Phase 2: DocumentationWorkflow
1. Create `DocumentationWorkflow` state machine per ADR-004
2. States: IDLE, EDITING, SAVING, SAVED, ERROR, CONFLICT
3. Integrate with ConsultationWorkflowState

### Phase 3: Guard Conditions
1. Add pre-transition guards for all clinical safety constraints
2. Add dirty notes check before completion
3. Add save-draft-before-switch enforcement

### Phase 4: Side Effect Mapping
1. Tie heartbeat start/stop to state transitions
2. Tie cache invalidation to state transitions
3. Tie toast notifications to state transitions

### Phase 5: Tests
1. Unit tests for all valid transitions
2. Unit tests for all invalid transitions
3. Behavioral parity tests against current reducer behavior
