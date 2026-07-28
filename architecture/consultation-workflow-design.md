# Consultation Workflow Design

## Purpose

This document defines the complete Consultation Workflow State Machine that replaces direct `SET_WORKFLOW_STATE` dispatches in `ConsultationContext.tsx`. It is the single authority for all session lifecycle transitions per ADR-004 and INV-005.

## Design Principles

1. **Every transition flows through a validated state machine** — no direct state assignment outside the engine
2. **Clinical safety is enforced at transition boundaries** — guards run before every state change
3. **Side effects are tied to transitions** — heartbeats, cache invalidation, and toasts emit from transition handlers, not from reducer actions
4. **DocumentationWorkflow is a parallel sub-workflow** — Consultations and docs transition together without tightly coupling their state machines
5. **No behavioral changes to existing workflows** — every current production path is represented here with identical outcomes

## State Inventory

| # | State | Terminal | Purpose |
|---|-------|----------|---------|
| 1 | IDLE | No | No patient selected; queue is visible; awaiting load |
| 2 | LOADING | No | Fetching appointment, patient, consultation, vitals, and draft |
| 3 | READY | No | Patient data loaded; consultation not started; start dialog may be shown |
| 4 | ACTIVE | No | Consultation in progress; notes can be edited; auto-save active |
| 5 | PAUSED | No | Session temporarily interrupted; no auto-save; resume required |
| 6 | SAVING | No | Draft save in progress; transient overlay on ACTIVE |
| 7 | COMPLETING | No | Completion confirmation dialog open |
| 8 | TRANSITIONING | No | Post-completion routing (next patient or hub) |
| 9 | COMPLETED | Yes | Terminal session end point |
| 10 | CONFLICT | No | Version conflict detected during save; resolution required |
| 11 | ERROR | No | Load failure, network error, or completion failure |

## State Definitions

### IDLE

- **Purpose:** Initial queue state. No patient is selected. No session data exists.
- **Allowed Actions:** LOAD_PATIENT
- **Allowed Transitions:** IDLE → LOADING
- **Forbidden Transitions:** Any transition other than LOAD_PATIENT
- **Entry Conditions:** Application mount without `initialAppointmentId`, or RESET after COMPLETED
- **Exit Conditions:** `appointmentId` is valid and user is authenticated
- **Failure Conditions:** None — initial state
- **Recovery Path:** None needed
- **Terminal:** No

### LOADING

- **Purpose:** Parallel data fetch for appointment, doctor, patient, vitals, consultation, and draft restoration.
- **Allowed Actions:** LOAD_SUCCESS, LOAD_ERROR
- **Allowed Transitions:**
  - LOADING → READY (appointment not active)
  - LOADING → ACTIVE (appointment already IN_CONSULTATION or consultation IN_PROGRESS)
  - LOADING → ERROR (fetch failure)
- **Forbidden Transitions:** Any action other than LOAD_SUCCESS or LOAD_ERROR
- **Entry Conditions:** LOAD_PATIENT action dispatched; `appointmentId` present
- **Exit Conditions:** Tier 1 + Tier 2 fetches complete or fail
- **Failure Conditions:** Appointment not found, patient not found, network unavailable
- **Recovery Path:** ERROR → RETRY → LOADING (re-attempt load); ERROR → SWITCH_PATIENT → LOADING (load different patient)
- **Terminal:** No

### READY

- **Purpose:** Session data loaded. Consultation has not started. Doctor can begin or select a different patient.
- **Allowed Actions:** START_CONSULTATION, SWITCH_PATIENT
- **Allowed Transitions:**
  - READY → ACTIVE (start confirmed)
  - READY → LOADING (switch patient)
- **Forbidden Transitions:** SAVE_DRAFT, OPEN_COMPLETE_DIALOG, PAUSE, CONFIRM_COMPLETE
- **Entry Conditions:** LOAD_SUCCESS with appointment status CHECKED_IN or READY_FOR_CONSULTATION
- **Exit Conditions:** Doctor clicks start (START_CONSULTATION) or clicks different patient (SWITCH_PATIENT)
- **Failure Conditions:** Doctor not assigned to appointment (guard blocks start, routes to ERROR)
- **Recovery Path:** If start fails, error toast displayed, remains in READY
- **Terminal:** No

### ACTIVE

- **Purpose:** Core consultation session. Notes editable. Auto-save and heartbeat active.
- **Allowed Actions:** SAVE_DRAFT, OPEN_COMPLETE_DIALOG, SWITCH_PATIENT, PAUSE, CONFIRM_COMPLETE
- **Allowed Transitions:**
  - ACTIVE → SAVING (save initiated)
  - ACTIVE → COMPLETING (complete dialog opened)
  - ACTIVE → LOADING (switch patient)
  - ACTIVE → PAUSED (explicit pause)
  - ACTIVE → TRANSITIONING (direct confirm complete, bypassing dialog — if already confirmed)
  - ACTIVE → CONFLICT (conflict detected during save — error path from SAVING routes here)
- **Forbidden Transitions:** Any completion or load transition without passing through COMPLETING or SAVING first
- **Entry Conditions:** LOAD_SUCCESS with IN_CONSULTATION/IN_PROGRESS, or START_CONSULTATION/CANCEL_COMPLETE/RESOLVE_CONFLICT/DISMISS_CONFLICT
- **Exit Conditions:** Explicit user action (save, complete, switch, pause)
- **Failure Conditions:** Completion API failure (reverts to ACTIVE)
- **Recovery Path:** From CONFLICT → resolve → ACTIVE; from ERROR → COMPLETION_RETRY → ACTIVE
- **Terminal:** No

### PAUSED

- **Purpose:** Session temporarily suspended. Auto-save paused. Doctor is away from keyboard but intends to return to same patient.
- **Allowed Actions:** RESUME, SWITCH_PATIENT
- **Allowed Transitions:**
  - PAUSED → ACTIVE (resume)
  - PAUSED → LOADING (switch patient)
- **Forbidden Transitions:** SAVE_DRAFT, OPEN_COMPLETE_DIALOG, CONFIRM_COMPLETE, PAUSE
- **Entry Conditions:** User explicitly triggers PAUSE; save timeout cleared; heartbeat paused
- **Exit Conditions:** User clicks resume or switches patient
- **Failure Conditions:** None — state is safe
- **Recovery Path:** Resume restores full ACTIVE behavior
- **Terminal:** No

### SAVING

- **Purpose:** Transient state indicating draft persistence in progress. UI shows saving indicator. Auto-save timer blocked.
- **Allowed Actions:** SAVE_SUCCESS, SAVE_CONFLICT, SAVE_ERROR
- **Allowed Transitions:**
  - SAVING → ACTIVE (save successful)
  - SAVING → CONFLICT (version conflict)
  - SAVING → ERROR (save failed)
- **Forbidden Transitions:** Any user-initiated navigation or completion action
- **Entry Conditions:** Auto-save timer expires, manual save button clicked, or force-save after conflict resolution
- **Exit Conditions:** Mutation completes (success, conflict, or error)
- **Failure Conditions:** Network timeout, VERSION_CONFLICT, server error
- **Recovery Path:** ERROR → retry save → SAVING; CONFLICT → user resolves → ACTIVE
- **Terminal:** No

### COMPLETING

- **Purpose:** Completion confirmation dialog is open. Session is still active but terminal action is pending.
- **Allowed Actions:** CANCEL_COMPLETE, CONFIRM_COMPLETE
- **Allowed Transitions:**
  - COMPLETING → ACTIVE (dialog cancelled)
  - COMPLETING → TRANSITIONING (dialog confirmed)
- **Forbidden Transitions:** Any action other than CANCEL_COMPLETE or CONFIRM_COMPLETE
- **Entry Conditions:** OPEN_COMPLETE_DIALOG action from ACTIVE; all pre-completion guards pass
- **Exit Conditions:** User confirms or cancels
- **Failure Conditions:** Dialog cancelled (returns to ACTIVE)
- **Recovery Path:** None required — returns to ACTIVE
- **Terminal:** No

### TRANSITIONING

- **Purpose:** Routing after completion. Next patient being loaded or hub navigation pending.
- **Allowed Actions:** LOAD_NEXT_PATIENT, COMPLETE_SESSION
- **Allowed Transitions:**
  - TRANSITIONING → LOADING (next patient exists in queue)
  - TRANSITIONING → COMPLETED (no next patient)
- **Forbidden Transitions:** Any action that modifies session data
- **Entry Conditions:** CONFIRM_COMPLETE succeeds; billing, surgical case, and notifications dispatched
- **Exit Conditions:** Next patient loaded (LOAD_NEXT_PATIENT) or no queue (COMPLETE_SESSION)
- **Failure Conditions:** Load failure for next patient (routes to ERROR)
- **Recovery Path:** If next patient fails to load, ERROR → RETRY → LOADING
- **Terminal:** No

### COMPLETED

- **Purpose:** Final terminal state. Consultation is finalized. No further mutations allowed.
- **Allowed Actions:** RESET
- **Allowed Transitions:**
  - COMPLETED → IDLE (new session initiated)
- **Forbidden Transitions:** Any action other than RESET
- **Entry Conditions:** CONFIRM_COMPLETE succeeds AND no next patient exists
- **Exit Conditions:** RESET action dispatched (or new page navigation)
- **Failure Conditions:** None — terminal
- **Recovery Path:** None — must start fresh session
- **Terminal:** Yes

### CONFLICT

- **Purpose:** Version conflict detected during save. Local notes diverge from server version.
- **Allowed Actions:** RESOLVE_WITH_SERVER, RESOLVE_WITH_LOCAL, DISMISS_CONFLICT
- **Allowed Transitions:**
  - CONFLICT → ACTIVE (server wins)
  - CONFLICT → SAVING (local forced save)
  - CONFLICT → ACTIVE (user dismisses without resolving)
- **Forbidden Transitions:** SAVE_DRAFT, OPEN_COMPLETE_DIALOG, SWITCH_PATIENT
- **Entry Conditions:** Mutation returns VERSION_CONFLICT; optimistic update rolled back; consultation refetched
- **Exit Conditions:** User resolves or dismisses conflict
- **Failure Conditions:** None — state is recoverable
- **Recovery Path:** RESOLVE_WITH_SERVER replaces notes with server version; RESOLVE_WITH_LOCAL preserves local version; DISMISS_CONFLICT lets user manually merge
- **Terminal:** No

### ERROR

- **Purpose:** Unrecoverable or recoverable failure. Load failure, completion failure, or save failure that blocks user progress.
- **Allowed Actions:** RETRY, DISMISS_ERROR, SWITCH_PATIENT, COMPLETION_RETRY
- **Allowed Transitions:**
  - ERROR → LOADING (RETRY)
  - ERROR → IDLE (DISMISS_ERROR)
  - ERROR → LOADING (SWITCH_PATIENT)
  - ERROR → ACTIVE (COMPLETION_RETRY — only after completion failure)
- **Forbidden Transitions:** SAVE_DRAFT, OPEN_COMPLETE_DIALOG, CONFIRM_COMPLETE
- **Entry Conditions:** API call throws, network unavailable, or non-recoverable mutation failure
- **Exit Conditions:** Retry succeeds, user dismisses, or switches patient
- **Failure Conditions:** Persistent network failure (user must dismiss)
- **Recovery Path:** Retry re-attempts failed operation; switch abandons current patient
- **Terminal:** No

## Complete Transition Table

| # | From | Action | To | Guard | Side Effects | Clinical Safety |
|---|------|--------|----|-------|--------------|-----------------|
| 1 | IDLE | LOAD_PATIENT | LOADING | `appointmentId` valid; user authenticated | Start loading spinner | None |
| 2 | LOADING | LOAD_SUCCESS | READY | Tier 1 + Tier 2 fetches complete; appointment not IN_CONSULTATION | Stop spinner; restore draft if newer | Patient identity verified |
| 3 | LOADING | LOAD_SUCCESS | ACTIVE | Tier 1 + Tier 2 fetches complete; appointment IN_CONSULTATION or consultation IN_PROGRESS | Start heartbeat; show workspace | Consultation integrity verified |
| 4 | LOADING | LOAD_ERROR | ERROR | Fetch throws or returns non-success | Show error toast; allow retry | No data loss — retry preserves request |
| 5 | READY | START_CONSULTATION | ACTIVE | Appointment CHECKED_IN or READY_FOR_CONSULTATION; doctor assigned | Start dialog closes; invalidate queue queries; success toast | Doctor assignment validated |
| 6 | READY | SWITCH_PATIENT | LOADING | Current session clean or user confirms switch | Save draft if dirty; navigate | Draft saved before switch |
| 7 | ACTIVE | SAVE_DRAFT | SAVING | Consultation IN_PROGRESS; not already saving | Debounce timer cleared; show saving badge | Draft integrity maintained |
| 8 | ACTIVE | OPEN_COMPLETE_DIALOG | COMPLETING | Consultation IN_PROGRESS; not COMPLETED/CANCELLED | Show completion dialog | Prevents completing finished consultation |
| 9 | ACTIVE | SWITCH_PATIENT | LOADING | Current session clean or user confirms switch | Save draft if dirty; clear heartbeat; navigate | Draft saved before switch |
| 10 | ACTIVE | PAUSE | PAUSED | No pending save; user explicitly pauses | Clear auto-save timer; pause heartbeat | Safe interruption point |
| 11 | PAUSED | RESUME | ACTIVE | User explicitly resumes | Restore auto-save timer; resume heartbeat | Session continuity |
| 12 | PAUSED | SWITCH_PATIENT | LOADING | Same as ACTIVE switch | Save draft if dirty; navigate | Draft saved before switch |
| 13 | SAVING | SAVE_SUCCESS | ACTIVE | Mutation returns 200 | Clear saving badge; set dirty=false; localStorage backup | Draft integrity |
| 14 | SAVING | SAVE_CONFLICT | CONFLICT | Mutation returns VERSION_CONFLICT | Rollback optimistic update; refetch; show conflict indicator | Server version preserved |
| 15 | SAVING | SAVE_ERROR | ERROR | Mutation throws non-conflict error | Show error toast; keep dirty state | Data not lost — retryable |
| 16 | COMPLETING | CANCEL_COMPLETE | ACTIVE | User cancels dialog | Close dialog; return to editing | Reversible |
| 17 | COMPLETING | CONFIRM_COMPLETE | TRANSITIONING | Outcome selected; no pending save (or user confirmed unsaved changes); billing verified | Finalize notes; clear localStorage; invalidate caches; create billing; send notifications; audit | Billing integrity |
| 18 | TRANSITIONING | LOAD_NEXT_PATIENT | LOADING | Next patient exists in queue (IN_CONSULTATION preferred, then CHECKED_IN/READY) | Load next patient; info toast | Queue integrity |
| 19 | TRANSITIONING | COMPLETE_SESSION | COMPLETED | No next patient exists | Navigate to hub | Terminal state |
| 20 | COMPLETED | RESET | IDLE | User initiates new session | Clear all state; clear localStorage | Ready for next patient |
| 21 | CONFLICT | RESOLVE_WITH_SERVER | ACTIVE | User accepts server version | Replace notes with server version; clear dirty flag | Server wins — data integrity |
| 22 | CONFLICT | RESOLVE_WITH_LOCAL | SAVING | User keeps local version | Force save local notes; audit logged | User override |
| 23 | CONFLICT | DISMISS_CONFLICT | ACTIVE | User dismisses without resolution | Keep both versions; mark for later | Non-blocking |
| 24 | ERROR | RETRY | LOADING | Previous error is recoverable; user clicks retry | Re-attempt failed operation | Preserves request context |
| 25 | ERROR | DISMISS_ERROR | IDLE | User dismisses error | Clear error state; allow fresh start | Clean slate |
| 26 | ERROR | SWITCH_PATIENT | LOADING | User selects different patient | Save draft if dirty; navigate | Draft saved before switch |
| 27 | ERROR | COMPLETION_RETRY | ACTIVE | Previous error was from COMPLETING/TRANSITIONING; user retries | Re-attempt completion | Reversible terminal attempt |

## Forbidden Transitions

The following transitions are explicitly forbidden and must be rejected by the engine:

| From | To | Reason |
|------|----|--------|
| IDLE | Any except LOADING | No session data exists |
| LOADING | COMPLETING, SAVING, PAUSED, COMPLETED, CONFLICT | Data load cannot complete or save until loaded |
| READY | COMPLETING, SAVING, PAUSED, COMPLETED, CONFLICT | No active consultation to complete or save |
| ACTIVE | TRANSITIONING, COMPLETED | Must complete dialog first |
| ACTIVE | READY | Must complete or switch |
| PAUSED | COMPLETING, SAVING, CONFLICT, TRANSITIONING, COMPLETED | Must resume before terminal actions |
| SAVING | COMPLETING, PAUSED, TRANSITIONING, COMPLETED, CONFLICT | Save must finish before any other transition |
| COMPLETING | Any except ACTIVE, TRANSITIONING | Dialog must resolve |
| TRANSITIONING | ACTIVE, COMPLETING, SAVING, COMPLETED (except COMPLETE_SESSION) | Routing cannot reverse |
| COMPLETED | Any except IDLE | Terminal state |
| CONFLICT | COMPLETING, TRANSITIONING, COMPLETED, LOADING, READY | Must resolve before navigation |
| ERROR | ACTIVE (except COMPLETION_RETRY), SAVING, COMPLETING, TRANSITIONING, COMPLETED | Error must be handled before continuing |

## Failure and Recovery Matrix

| State | Failure | Recovery Action | Recovery Target |
|-------|---------|-----------------|-----------------|
| LOADING | Network error | RETRY | LOADING |
| LOADING | Appointment not found | DISMISS_ERROR | IDLE |
| LOADING | Patient not found | DISMISS_ERROR | IDLE |
| READY | Start API returns "already started" | Treat as success | ACTIVE |
| READY | Start API returns assignment error | Show error toast | READY |
| ACTIVE | Completion API throws | COMPLETION_RETRY | ACTIVE |
| ACTIVE | Draft mutation VERSION_CONFLICT | Automatic | CONFLICT |
| ACTIVE | Draft mutation network error | Automatic | SAVING → ERROR |
| PAUSED | User inactivity timeout | None (user must resume) | PAUSED |
| SAVING | VERSION_CONFLICT | Automatic | CONFLICT |
| SAVING | Network error | Retry or manual | ERROR → SAVING |
| SAVING | STORAGE_UNAVAILABLE (localStorage) | Non-blocking | SAVING → ACTIVE |
| COMPLETING | User cancels | CANCEL_COMPLETE | ACTIVE |
| TRANSITIONING | Next patient load fails | RETRY | ERROR → LOADING |
| TRANSITIONING | No next patient | COMPLETE_SESSION | COMPLETED |
| CONFLICT | User dismisses | DISMISS_CONFLICT | ACTIVE |
| CONFLICT | User resolves with server | RESOLVE_WITH_SERVER | ACTIVE |
| CONFLICT | User resolves with local | RESOLVE_WITH_LOCAL | SAVING |
| ERROR | Persistent failure | DISMISS_ERROR | IDLE |
| ERROR | Switch patient | SWITCH_PATIENT | LOADING |

## Side Effect Hooks

The workflow engine exposes lifecycle hooks that run on entry and exit of every state:

| Hook | Trigger | Responsibilities |
|------|---------|------------------|
| onEnterLoading | Enter LOADING | Dispatch loading spinner |
| onEnterReady | Enter READY | Restore draft if newer than server; show start dialog if applicable |
| onEnterActive | Enter ACTIVE | Start heartbeat interval; enable auto-save; enable beforeunload warning |
| onEnterPaused | Enter PAUSED | Pause heartbeat; clear auto-save timer |
| onEnterSaving | Enter SAVING | Show saving indicator; block navigation |
| onEnterCompleting | Enter COMPLETING | Block all edits; show confirmation dialog |
| onEnterTransitioning | Enter TRANSITIONING | Clear localStorage draft; invalidate React Query caches |
| onEnterCompleted | Enter COMPLETED | Clear session memory; disable all interactions |
| onEnterConflict | Enter CONFLICT | Refetch consultation; show conflict banner; pause ambient auto-save |
| onEnterError | Enter ERROR | Show error toast; allow retry |
| onExitActive | Exit ACTIVE | Stop heartbeat; clear auto-save timer; disable beforeunload |
| onExitSaving | Exit SAVING | Hide saving indicator |
| onExitCompleting | Exit COMPLETING | Close dialog |
| onExitLoading | Exit LOADING | Stop loading spinner |
| onExitTransitioning | Exit TRANSITIONING | None |
| onExitConflict | Exit CONFLICT | Hide conflict banner; resume ambient auto-save |
| onExitError | Exit ERROR | Clear error toast |

## Relationship to DocumentationWorkflow

ConsultationWorkflowState and DocumentationWorkflow run in parallel:

- When ConsultationWorkflowState is ACTIVE, DocumentationWorkflow may be Document, Draft, Dirty, Saving, Saved, Conflict, Restoring, or Failed
- When ConsultationWorkflowState is SAVING, DocumentationWorkflow is guaranteed to be Saving
- When ConsultationWorkflowState is CONFLICT, DocumentationWorkflow is guaranteed to be Conflict
- When ConsultationWorkflowState is PAUSED, DocumentationWorkflow is frozen (no auto-save transitions)
- When ConsultationWorkflowState is COMPLETING or later, DocumentationWorkflow transitions to Document (locked)

The `WorkflowEngine` orchestrates both state machines. A single user command (e.g., `saveDraft()`) may trigger transitions in both machines.
