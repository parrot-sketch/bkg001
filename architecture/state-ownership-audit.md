# State Ownership Audit

## Purpose

This document audits every consultation state mutation to identify state ownership violations relative to ADR-003 (State Ownership Taxonomy) and `architecture-invariants.md`.

**Scope:** `ConsultationContext.tsx`, `useConsultation.ts`, `useSaveConsultationDraft.ts`, and consumer components.

---

## 1. State Inventory

### 1.1 Mutable State in ConsultationContext Reducer

| State | Type | Currently Owned By | Persistence | Readers |
|-------|------|-------------------|-------------|---------|
| `appointment` | `AppointmentResponseDto \| null` | ConsultationContext reducer | Memory | ConsultationWorkspaceOptimized, CompleteConsultationDialog, header |
| `patient` | `PatientResponseDto \| null` | ConsultationContext reducer | Memory | PatientInfoSidebar, ConsultationWorkspaceOptimized |
| `vitals` | `VitalsData \| null` | ConsultationContext reducer | Memory | PatientInfoSidebar |
| `consultation` | `ConsultationResponseDto \| null` | ConsultationContext reducer | Memory | CompleteConsultationDialog, ConsultationWorkspaceOptimized |
| `doctorId` | `string \| null` | ConsultationContext reducer | Memory | Internal |
| `notes` | `StructuredNotes` | ConsultationContext reducer + React Query cache + localStorage | Memory + Cache + Backup | ConsultationWorkspaceOptimized, CompleteConsultationDialog |
| `outcomeType` | `ConsultationOutcomeType \| null` | ConsultationContext reducer | Memory | PlanTab, CompleteConsultationDialog |
| `patientDecision` | `PatientDecision \| null` | ConsultationContext reducer | Memory | CompleteConsultationDialog |
| `workflow` | `ConsultationWorkflowContext` | ConsultationContext reducer | Memory | SessionProvider (future) |
| `isLoading` | `boolean` | ConsultationContext reducer | Memory | LoadingState components |
| `isSaving` | `boolean` | ConsultationContext reducer | Memory | Header, buttons |
| `showCompleteDialog` | `boolean` | ConsultationContext reducer | Memory | CompleteConsultationDialog |
| `showStartDialog` | `boolean` | ConsultationContext reducer | Memory | StartConsultationDialog |
| `autoSaveStatus` | `'idle' \| 'saving' \| 'saved' \| 'error'` | ConsultationContext reducer | Memory | Header auto-save indicator |

### 1.2 Computed/Derived State (Not Stored in Reducer)

| State | Currently | Correct Owner |
|-------|-----------|---------------|
| `isActive` | Computed in provider from `appointment.status` and `consultation.state` | SessionProvider |
| `isReadOnly` | Computed in provider | SessionProvider |
| `canSave` | Computed in provider from `state.workflow.isDirty` | DocumentationProvider |
| `canComplete` | Computed in provider | SessionProvider |
| `waitingQueue` | Computed in provider from `todayAppointments` + `state.appointment.id` | QueueProvider |
| `refetchQueue` | Derived from `useDoctorTodayAppointments` hook | QueueProvider |
| `isQueueRefetching` | Derived from `useDoctorTodayAppointments` hook | QueueProvider |

---

## 2. Violation Inventory

### VIOLATION SO-001: Triple-Write Pattern for Notes

**State:** `notes` (`StructuredNotes`)

**Three writers:**
1. **ConsultationContext reducer** — `SET_NOTES`, `UPDATE_NOTE_FIELD` dispatch
2. **React Query cache** — `useSaveConsultationDraft.ts` `onMutate` optimistic update writes notes to `['consultation', appointmentId]` query data
3. **localStorage** — `ConsultationContext.tsx` `saveDraft()` and `saveNotes()` both write directly via `localStorage.setItem`

**Dependency graph:**
```
User input
    ↓
UPDATE_NOTE_FIELD
    ↓
ConsultationContext reducer (writer 1)
    ↓ mutates
state.notes

    ↓ simultaneously
useSaveConsultationDraft mutation onMutate (writer 2)
    ↓ mutates
React Query cache notes

    ↓ simultaneously
localStorage.setItem (writer 3)
    ↓ mutates
localStorage backup
```

**Why it violates ADR-003:**
- "Every piece of state has exactly one owner."
- "Notes state → DocumentationProvider (single source of truth)"
- Three simultaneous writes with no single coordination point.

**Impact:**
- Medium. Concurrency between reducer update and optimistic cache update can cause stale reads.
- localStorage write happens twice (in `saveDraft` and `saveNotes`).
- Rollback logic must reconcile three stores.

---

### VIOLATION SO-002: Duplicate localStorage Write Paths

**Files:**
- `ConsultationContext.tsx:579-585` (`saveDraft`)
- `ConsultationContext.tsx:643-649` (`saveNotes`)

**Details:**
Both functions write the exact same structure to localStorage:
```typescript
localStorage.setItem(`consultation-draft-${appointmentId}`, JSON.stringify({
  structured: state.notes,
  timestamp: new Date().toISOString()
}));
```

**Dependency graph:**
```
saveDraft() → localStorage.setItem
saveNotes() → localStorage.setItem
     ↓
Both mutate the same key with the same format
```

**Why it violates ADR-003:**
- "Offline state → DraftStorage adapter (single persistence boundary)"
- Two write paths to the same persistence mechanism without coordination.

**Impact:**
- Medium. If one path changes format and the other doesn't, draft restoration breaks silently.
- Race condition: both can write within the same event loop tick.

---

### VIOLATION SO-003: Competing Notes Source in React Query Cache

**File:**
- `hooks/consultation/useSaveConsultationDraft.ts:39-70`

**Details:**
The mutation's `onMutate` optimistically updates the consultation cache with modified notes:
```typescript
onMutate: async (newDraft) => {
  await queryClient.cancelQueries({ queryKey: ['consultation', newDraft.appointmentId] });
  const previousConsultation = queryClient.getQueryData<ConsultationResponseDto | null>(
    ['consultation', newDraft.appointmentId]
  );
  if (previousConsultation) {
    const fullText = newDraft.notes.rawText || formatStructuredNotes(newDraft.notes.structured);
    queryClient.setQueryData<ConsultationResponseDto | null>(
      ['consultation', newDraft.appointmentId],
      {
        ...previousConsultation,
        notes: { fullText, structured: newDraft.notes.structured },
        outcomeType: newDraft.outcomeType ?? previousConsultation.outcomeType,
        patientDecision: newDraft.patientDecision ?? previousConsultation.patientDecision,
        updatedAt: new Date(),
      } as ConsultationResponseDto
    );
  }
  return { previousConsultation };
},
```

**Why it violates ADR-003:**
- "Server state → React Query cache (via QueryProvider policies)"
- The cache is being used as a client-state mirror for notes, which are UI/client state.
- This creates a competing source of truth against the reducer state.

**Impact:**
- Medium. After mutation, consultation cache contains different notes than the server until `onSuccess` reconciles.
- Components that read from cache (none currently, but future ones might) see stale/false data.

---

### VIOLATION SO-004: Derived State Computed but Exported as First-Class State

**File:**
- `ConsultationContext.tsx:843-889`

**Details:**
Context value exports `isActive`, `isReadOnly`, `canSave`, `canComplete`, `waitingQueue` as first-class properties. These are computed from underlying state but are treated as independent state slices by consumers.

**Why it is a partial violation:**
- ADR-003 taxonomy distinguishes "Computed" from "Client State".
- Computed values should be functions or selectors, not state exports.
- However, exporting computed values as props is not strictly harmful if they remain computed.

**Impact:**
- Low. Currently these are computed values, not stored state. But they create the illusion of independent ownership.

---

### VIOLATION SO-005: Workflow State Mutation Without Validation

**File:**
- `ConsultationContext.tsx:131-135, 166-169, 219-226, 478, 482, 487-490, 538, 685, 690, 704, 735`

**Details:**
`SET_WORKFLOW_STATE` action directly assigns state without calling `getNextState()` or `canPerformAction()`:
```typescript
case 'SET_WORKFLOW_STATE':
  return {
    ...state,
    workflow: { ...state.workflow, state: action.payload },
  };
```

**Why it violates ADR-003 / INV-005:**
- "Session state → Application Service or Provider"
- State machine enforcement is required for all workflow transitions.
- Direct assignment bypasses validation.

**Impact:**
- Medium. Invalid transitions are possible (e.g., `ACTIVE` → `READY` without going through `COMPLETING`).

**Decision:** This is the scope of PR-A04 (Workflow Engine Activation), not PR-A03. We document it here but do not fix it in this PR, per user constraints ("Do not modify workflow sequencing").

---

## 3. ADR-003 Compliance Gaps

| ADR-003 Rule | Status | Gap |
|--------------|--------|-----|
| Server state lives only in React Query | 🟡 Partial | `appointment`, `patient`, `consultation`, `vitals` mirror in reducer |
| Client state lives only in provider reducers | 🟢 Pass | UI state correctly in reducer |
| Each data type has exactly one owner | 🔴 Violated | `notes` has 3 writers |
| Session state lives only in DraftStorage | 🔴 Violated | `notes` backup written directly from ConsultationContext |

---

## 4. Recommended Ownership Model

### 4.1 Notes State

| Store | Role | Owner |
|-------|------|-------|
| **Reducer state** (`state.notes`) | UI source of truth | DocumentationProvider (future) |
| **React Query cache** | Server-state mirror of consultation record | React Query policies |
| **localStorage** | Crash recovery backup | DraftStorage adapter |

**Rule after remediation:**
- Reducer state is the single writer for `notes`.
- React Query cache is a read-through mirror; updated only by mutation `onSuccess` with server response.
- localStorage backup is written by ONE helper function, called from ONE path.

### 4.2 Consultation Record

| Store | Role | Owner |
|-------|------|-------|
| **Reducer state** (`state.consultation`) | UI working copy | SessionProvider (future) |
| **React Query cache** | Server-state mirror | React Query policies |

### 4.3 Derived State

| State | Correct Form | Current |
|-------|-------------|---------|
| `isActive` | Computed selector | Computed in provider (acceptable) |
| `isReadOnly` | Computed selector | Computed in provider (acceptable) |
| `canSave` | Computed selector | Computed in provider (acceptable) |
| `canComplete` | Computed selector | Computed in provider (acceptable) |
| `waitingQueue` | Computed selector | Computed in provider (acceptable) |

These are acceptable as computed values. They do not need to change.

---

## 5. Remediation Plan

### RI-001: Eliminate Triple-Write for Notes

**Root cause:** Three independent write paths for `notes` with no coordination.

**Fix:**
1. Remove optimistic notes update from `useSaveConsultationDraft.ts` `onMutate`.
2. Keep notes in reducer as single UI source of truth.
3. Let `onSuccess` update React Query cache with server response only.
4. Consolidate localStorage backup into one helper.

**Impact:** Low. UI components already read notes from reducer, not cache.

### RI-002: Consolidate localStorage Write Paths

**Root cause:** `saveDraft()` and `saveNotes()` both write the same localStorage key with the same format.

**Fix:** Extract single `persistDraftBackup` helper. Call from both functions (or from one shared save path).

**Impact:** None. Same format, same key. Just removes duplication.

### RI-003: Remove Competing React Query Notes Update

**Root cause:** `onMutate` in `useSaveConsultationDraft` updates cache notes before server responds.

**Fix:** Remove notes update from `onMutate`. Keep snapshot/rollback only. Let `onSuccess` reconcile cache.

**Impact:** Low. No component reads notes from cache; all read from reducer.

### RI-004: Document State Ownership

**Fix:** Add ownership comments in ConsultationContext reducer and actions.

**Impact:** None. Documentation only.

---

## 6. Out of Scope for PR-A03

| Issue | Reason | Deferred To |
|-------|--------|-------------|
| Workflow state machine enforcement | User constraint: "Do not modify workflow sequencing" | PR-A04 |
| Provider extraction | User constraint: "Do not extract Providers" | PR-A05+ |
| React Query cache cleanup for server state | Requires provider boundaries to be established | PR-A05+ |
| Duplicate `appointment`/`patient`/`consultation` in reducer and cache | Architectural decision pending provider extraction | PR-A05+ |
| SessionService extraction | User constraint: "Do not implement SessionService" | PR-A05+ |
