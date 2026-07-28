# Documentation Workflow Design

## Purpose

This document defines `DocumentationWorkflow`, the second state machine required by ADR-004. It manages the lifecycle of consultation notes (draft creation, auto-save, manual save, conflict recovery, and completion locking). It runs in parallel with `ConsultationWorkflowState` and is owned by the `DocumentationProvider` (target) or the `DocumentationEngine` inside `SessionProvider` (PR-A04 implementation).

## Design Principles

1. **Single source of truth for draft status** — `DocumentationWorkflow` is the only authority on whether notes are saved, dirty, or conflicted
2. **Auto-save and manual save share one engine** — no duplicate save paths
3. **Conflict is a first-class state** — not an inline error handler
4. **Draft recovery is a transition** — not a side effect
5. **Completion locks the documentation** — no further edits after completion

## State Inventory

| # | State | Terminal | Purpose |
|---|-------|----------|---------|
| 1 | Document | No | Idle; no draft exists or consultation not started |
| 2 | Draft | No | Draft exists on server/local; not dirty since last save |
| 3 | Dirty | No | Local changes exist that are not persisted |
| 4 | Saving | No | Draft save in progress |
| 5 | Saved | No | Save succeeded; auto-save indicator will clear after delay |
| 6 | Conflict | No | Version conflict detected; user intervention required |
| 7 | Restoring | No | Restoring draft from localStorage or server after conflict |
| 8 | Failed | No | Save failed; notes remain local; retry possible |

## State Definitions

### Document

- **Purpose:** Initial idle state. No draft exists on the server. Consultation is not started or consultation record has no notes yet.
- **Allowed Actions:** CREATE_DRAFT, RESTORE_DRAFT
- **Allowed Transitions:**
  - Document → Draft (consultation started / server draft created)
  - Document → Restoring (localStorage draft found on load)
- **Forbidden Transitions:** SAVE, RESOLVE_CONFLICT, RETRY_SAVE
- **Entry Conditions:** Consultation created or loaded; no server drafted notes
- **Exit Conditions:** First save occurs or draft is restored
- **Failure Conditions:** None — initial state for documentation
- **Recovery Path:** None needed
- **Terminal:** No

### Draft

- **Purpose:** A saved draft exists and the user has not made changes since the last save.
- **Allowed Actions:** EDIT_NOTES, SAVE, RESTORE_DRAFT
- **Allowed Transitions:**
  - Draft → Dirty (user edits notes)
  - Draft → Saving (manual save triggered)
  - Draft → Restoring (crash recovery found newer local draft)
- **Forbidden Transitions:** RESOLVE_CONFLICT, RETRY_SAVE
- **Entry Conditions:** Server save succeeds; notes marked clean
- **Exit Conditions:** User types or triggers save
- **Failure Conditions:** None — stable state
- **Recovery Path:** None needed
- **Terminal:** No

### Dirty

- **Purpose:** Local notes diverge from the last saved version. Auto-save timer is running.
- **Allowed Actions:** SAVE, SWITCH_PATIENT, COMPLETE, PAUSE
- **Allowed Transitions:**
  - Dirty → Saving (auto-save timer expires or manual save)
  - Dirty → Restoring (local draft newer than server on reload)
  - Dirty → Document (consultation completed)
- **Forbidden Transitions:** RESOLVE_CONFLICT, RETRY_SAVE, EDIT_NOTES (implicitly causes self-loop; same state)
- **Entry Conditions:** `UPDATE_NOTE_FIELD` dispatched; `setOutcome` dispatched
- **Exit Conditions:** Save starts, patient switches, consultation completes, or consultation pauses
- **Failure Conditions:** None — this is the normal working state
- **Recovery Path:** None needed; auto-save eventually resolves
- **Terminal:** No

### Saving

- **Purpose:** Draft mutation is in flight. UI must show saving indicator. No further mutations allowed.
- **Allowed Actions:** SAVE_SUCCESS, SAVE_CONFLICT, SAVE_ERROR
- **Allowed Transitions:**
  - Saving → Saved (mutation succeeds)
  - Saving → Conflict (mutation returns VERSION_CONFLICT)
  - Saving → Failed (mutation throws non-conflict error)
- **Forbidden Transitions:** Any user-initiated save, edit, or navigation action
- **Entry Conditions:** Auto-save timer expires; manual save button clicked; force-save after conflict resolution
- **Exit Conditions:** Mutation resolves (success, conflict, or error)
- **Failure Conditions:** Network timeout, server error, version conflict
- **Recovery Path:** Failed → retry or manual edit → Saving; Conflict → user resolves → Saved or Saving
- **Terminal:** No

### Saved

- **Purpose:** Save succeeded. Notes are synchronized with server. UI will transition back to Dirty or Draft after the auto-save status timeout clears.
- **Allowed Actions:** EDIT_NOTES
- **Allowed Transitions:**
  - Saved → Draft (timeout expires, no edits made)
  - Saved → Dirty (user edits before timeout)
- **Forbidden Transitions:** SAVE, RESOLVE_CONFLICT, RETRY_SAVE
- **Entry Conditions:** Mutation `onSuccess`; dirty flag cleared; localStorage backup written
- **Exit Conditions:** User edits or timeout expires
- **Failure Conditions:** None — stable state
- **Recovery Path:** None needed
- **Terminal:** No

### Conflict

- **Purpose:** Server version is newer than client version. Data loss risk if local changes are silently overwritten.
- **Allowed Actions:** RESOLVE_WITH_SERVER, RESOLVE_WITH_LOCAL, DISMISS_CONFLICT
- **Allowed Transitions:**
  - Conflict → Saved (server wins; notes replaced with server version)
  - Conflict → Saving (local wins; force-save preserves local changes)
  - Conflict → Active (user dismisses; keeps dirty local notes)
- **Forbidden Transitions:** SAVE, EDIT_NOTES (must resolve first), COMPLETE
- **Entry Conditions:** Mutation returns VERSION_CONFLICT; optimistic update rolled back; consultation refetched
- **Exit Conditions:** User resolves or dismisses conflict
- **Failure Conditions:** None — state is recoverable
- **Recovery Path:** RESOLVE_WITH_SERVER preserves server truth; RESOLVE_WITH_LOCAL preserves user intent; DISMISS_CONFLICT defers resolution
- **Terminal:** No

### Restoring

- **Purpose:** Recovering from localStorage backup after crash or after conflict resolution. Notes are being applied to the session.
- **Allowed Actions:** RESTORE_SUCCESS, RESTORE_NOOP
- **Allowed Transitions:**
  - Restoring → Dirty (local draft newer than server; notes applied)
  - Restoring → Document (local draft older or corrupt; discarded)
- **Forbidden Transitions:** SAVE, EDIT_NOTES, RESOLVE_CONFLICT
- **Entry Conditions:** Consultation load finds localStorage draft; or server refetch after conflict yields base for restore
- **Exit Conditions:** Draft applied or discarded
- **Failure Conditions:** Corrupt JSON in localStorage; missing timestamp
- **Recovery Path:** Corrupt draft → discard → Document; missing draft → Document
- **Terminal:** No

### Failed

- **Purpose:** Save operation failed. Local notes are still present but not synchronized. User must retry or continue editing.
- **Allowed Actions:** RETRY_SAVE, EDIT_NOTES
- **Allowed Transitions:**
  - Failed → Saving (manual retry)
  - Failed → Dirty (user edits notes — implicit retry on next auto-save)
- **Forbidden Transitions:** RESOLVE_CONFLICT, COMPLETE (unless guard allows proceed despite failed save)
- **Entry Conditions:** Mutation throws non-conflict error; localStorage backup failure
- **Exit Conditions:** User retries or continues editing
- **Failure Conditions:** Persistent STORAGE_UNAVAILABLE; local backup quota exceeded
- **Recovery Path:** Retry → Saving; edit → Dirty → auto-save → Saving
- **Terminal:** No

## Complete Transition Table

| # | From | Action | To | Guard | Side Effects |
|---|------|--------|----|-------|--------------|
| 1 | Document | CREATE_DRAFT | Draft | Consultation started; doctor authenticated | Emit DocumentCreated event |
| 2 | Document | RESTORE_DRAFT | Restoring | localStorage draft exists | Emit DraftRestoreInitiated event |
| 3 | Draft | EDIT_NOTES | Dirty | Notes actually changed | Set dirty flag; start auto-save timer |
| 4 | Draft | SAVE | Saving | Not already Saving | Clear auto-save timer |
| 5 | Draft | RESTORE_DRAFT | Restoring | localStorage draft newer than server | Emit DraftRestoreInitiated event |
| 6 | Dirty | SAVE | Saving | Consultation IN_PROGRESS | Clear auto-save timer |
| 7 | Dirty | SWITCH_PATIENT | Document | Consultation transitions to LOADING | Emit DocumentationCleared event |
| 8 | Dirty | COMPLETE | Document | Consultation completes | Emit DocumentationLocked event |
| 9 | Dirty | PAUSE | Document | Consultation pauses | Emit DocumentationFrozen event |
| 10 | Saving | SAVE_SUCCESS | Saved | Mutation returns 2xx | Clear dirty flag; write localStorage backup; emit DocumentationSaved |
| 11 | Saving | SAVE_CONFLICT | Conflict | Mutation returns VERSION_CONFLICT | Rollback cache; refetch; emit DocumentationConflictDetected |
| 12 | Saving | SAVE_ERROR | Failed | Mutation throws | Show error toast; keep dirty flag |
| 13 | Saved | EDIT_NOTES | Dirty | Notes changed | Restart auto-save timer |
| 14 | Conflict | RESOLVE_WITH_SERVER | Saved | User confirms server version | Replace notes; clear dirty flag; emit DocumentationSaved |
| 15 | Conflict | RESOLVE_WITH_LOCAL | Saving | User confirms local version | Force save; emit DocumentationSaved |
| 16 | Conflict | DISMISS_CONFLICT | Active | User dismisses without resolving | Keep local notes dirty; emit DocumentationConflictDismissed |
| 17 | Restoring | RESTORE_SUCCESS | Dirty | Draft timestamp > server updatedAt | Apply notes; set dirty flag; emit DraftRestored |
| 18 | Restoring | RESTORE_NOOP | Document | Draft timestamp <= server updatedAt or corrupt | Discard draft; emit DraftDiscarded |
| 19 | Failed | RETRY_SAVE | Saving | Not already Saving | Restart auto-save timer |
| 20 | Failed | EDIT_NOTES | Dirty | Notes changed | Restart auto-save timer |

## Forbidden Transitions

| From | To | Reason |
|------|----|--------|
| Document | Conflict, Failed, Saved, Saving | Cannot conflict or save without draft |
| Draft | Conflict, Failed, Saving (unless explicit SAVE) | Cannot fail or conflict if no changes |
| Dirty | Conflict, Failed, Saved | Must save before success or failure |
| Saving | Any except Saved, Conflict, Failed | Save must resolve |
| Saved | Conflict, Failed, Saving | Cannot fail after success without new change |
| Conflict | Document, Draft, Saving (without explicit resolution) | Must resolve before leaving conflict |
| Restoring | Conflict, Failed, Saving | Cannot save during restore |
| Failed | Document, Draft, Saved | Must retry or edit |

## Autosave Integration

### Trigger

Auto-save is triggered when:
1. DocumentationWorkflow enters `Dirty` state
2. 3-second debounce timer expires
3. ConsultationWorkflowState is `ACTIVE`

### Behavior

```
Dirty entered
    ↓
Start 3s debounce
    ↓ (if user edits again)
Clear previous timer, start new 3s timer
    ↓ (if timer expires)
Dispatch SAVE_DRAFT
    ↓
ConsultationWorkflowState transitions ACTIVE → SAVING
DocumentationWorkflow transitions Dirty → Saving
    ↓
useSaveConsultationDraft mutation fires
    ↓
Success: Saving → Saved → (after 2s) → Draft
Conflict: Saving → Conflict
Error: Saving → Failed
```

### Cleanup

- On PAUSED, pause auto-save timer
- On COMPLETING/TRANSITIONING/COMPLETED, clear auto-save timer permanently
- On SWITCH_PATIENT, clear auto-save timer; save draft if dirty before allowing switch

## Manual Save Integration

Manual save bypasses the debounce timer but follows the same mutation path:

```
User clicks Save
    ↓
Dispatch SAVE_DRAFT explicitly
    ↓
Same mutation path as auto-save
    ↓
Same state transitions
```

Manual save is the only path that allows save from `Draft` state (explicit user intent).

## Conflict Recovery

### Detection

Version conflict is detected in the mutation's `onError` when the API returns `VERSION_CONFLICT`. The engine automatically routes `Saving → Conflict`.

### Resolution Flow

```
SAVING → CONFLICT (automatic)
    ↓
ConsultationWorkflowState: ACTIVE → CONFLICT
    ↓
UI shows conflict banner with three options:
    1. "Use server version" → RESOLVE_WITH_SERVER
    2. "Keep my changes" → RESOLVE_WITH_LOCAL
    3. "Dismiss" → DISMISS_CONFLICT
    ↓
RESOLVE_WITH_SERVER → Saved (notes = server version)
RESOLVE_WITH_LOCAL → Saving (force save local notes)
DISMISS_CONFLICT → Active (dirty local notes kept)
```

### Side Effects

- On enter Conflict: refetch consultation; rollback optimistic update; show conflict banner
- On resolve server: replace notes with server version; clear dirty; emit audit
- On resolve local: force-save local notes; emit audit; allow completion
- On dismiss: no server action; user sees stale server notes; dirty flag set

## Draft Recovery

### Trigger

Draft recovery happens on consultation load, after server data is available but before the workspace becomes interactive.

### Flow

```
DocumentationWorkflow: Document
    ↓
Consultation load checks localStorage for `consultation-draft-${appointmentId}`
    ↓
Draft found?
├── Yes: Compare draft.timestamp vs consultation.updatedAt
│   ├── draft.timestamp > updatedAt:
│   │   RESTORE_SUCCESS → Dirty (apply draft silently)
│   └── draft.timestamp <= updatedAt or corrupt:
│       RESTORE_NOOP → Document (discard draft)
└── No: Remain in Document
```

### Legacy Migration

If the draft contains `fullText` but no `structured` (legacy format), the engine calls `parseLegacyNotes(fullText)` during `RESTORE_SUCCESS` to produce structured notes. The resulting notes enter `Dirty` state (not `Saved`) because they require server-side confirmation.

## Completion Locking

When consultation completes:
1. `ConsultationWorkflowState` transitions `TRANSITIONING → COMPLETED`
2. `DocumentationWorkflow` transitions to `Document` (locked)
3. All save actions are forbidden
4. Auto-save timer is permanently cleared
5. localStorage draft is removed

The user cannot edit notes after completion. Any attempt to dispatch `EDIT_NOTES` or `SAVE` is rejected by the engine.

## Interaction with ConsultationWorkflow

### Parallel State Matrix

| ConsultationWorkflowState | Allowed DocumentationWorkflow States |
|---------------------------|-------------------------------------|
| IDLE | Document |
| LOADING | Document, Restoring |
| READY | Document, Draft |
| ACTIVE | Document, Draft, Dirty, Saving, Saved, Conflict, Failed, Restoring |
| PAUSED | Document, Draft, Dirty, Saved, Failed (frozen — no transitions) |
| SAVING | Saving (synchronized) |
| COMPLETING | Document, Draft, Dirty, Saving, Saved, Conflict, Failed |
| TRANSITIONING | Document |
| COMPLETED | Document (locked) |
| CONFLICT | Conflict (synchronized) |
| ERROR | Any (error context preserved) |

### Synchronization Rules

1. **ACTIVE + SAVING** → ConsultationWorkflowState enters SAVING when DocumentationWorkflow enters Saving. Both exit together.
2. **ACTIVE + CONFLICT** → ConsultationWorkflowState enters CONFLICT when DocumentationWorkflow enters Conflict.
3. **PAUSED freeze** → When ConsultationWorkflowState enters PAUSED, DocumentationWorkflow auto-save timer is paused. No transitions occur until resumed.
4. **Completion lock** → When ConsultationWorkflowState enters TRANSITIONING or COMPLETED, DocumentationWorkflow transitions to Document. All further save/edit actions are rejected.
5. **Switch patient** → When ConsultationWorkflowState enters LOADING via SWITCH_PATIENT, DocumentationWorkflow transitions to Document (notes are either saved or discarded).

### Ownership

DocumentationWorkflow is owned by the `DocumentationEngine`, which lives inside `SessionProvider` (or `DocumentationProvider` after provider extraction). It is not owned by `ConsultationContext`.

- **Current (PR-A03):** `ConsultationContext` implicitly tracks `autoSaveStatus`, `isDirty`, and `isSaving` via reducer state
- **Target (PR-A04):** `DocumentationEngine` owns these states explicitly; `ConsultationContext` reads them but does not mutate them

## Legacy Migration

### From Current Implementation

| Current State | DocumentationWorkflow State | Notes |
|---------------|-----------------------------|-------|
| `autoSaveStatus: 'idle'` + `isDirty: false` | Draft or Saved | Auto-save idle and clean notes |
| `autoSaveStatus: 'idle'` + `isDirty: true` | Dirty | Notes changed but not yet saved |
| `autoSaveStatus: 'saving'` | Saving | Save in progress |
| `autoSaveStatus: 'saved'` | Saved | Save succeeded |
| `autoSaveStatus: 'error'` | Failed | Save failed |
| Version conflict detected in mutation | Conflict | Server version newer than client |

The migration is additive. `DocumentationWorkflow` runs alongside existing reducer state. Once all consumers read from `DocumentationEngine`, the old reducer flags (`autoSaveStatus`, `isSaving`) are removed.
