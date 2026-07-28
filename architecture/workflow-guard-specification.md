# Workflow Guard Specification

## Purpose

This document defines Transition Guards for every state machine transition. Guards enforce business rules, permission checks, clinical safety invariants, and data integrity constraints. No transition may occur without all guards passing.

## Guard Model

Every guard returns a `GuardResult`:

```typescript
type GuardResult =
  | { passed: true }
  | { passed: false; reason: string; clinicalRisk: 'none' | 'low' | 'medium' | 'high' | 'critical' };
```

Guards are pure functions with no side effects. They may read state but must not mutate it.

## Guard Execution Order

For any transition, guards execute in this order:

1. **Structural Guards** — state shape, required data presence
2. **Permission Guards** — user role, assignment, ownership
3. **Clinical Safety Guards** — patient safety, draft integrity, billing integrity
4. **Business Rule Guards** — workflow invariants, lock conditions

If any guard fails, the transition is rejected and the engine remains in the current state.

## Complete Guard Catalog

### LOAD_PATIENT Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-001 | ValidAppointmentId | IDLE → LOADING, TRANSITIONING → LOADING | `appointmentId` is a positive integer |
| G-002 | UserAuthenticated | IDLE → LOADING, TRANSITIONING → LOADING | `user` is present and role is DOCTOR |
| G-003 | PatientNotArchived | IDLE → LOADING, TRANSITIONING → LOADING | Appointment status is not ARCHIVED (future-proofing) |

### LOAD_SUCCESS Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-004 | AppointmentLoaded | LOADING → READY, LOADING → ACTIVE | `appointment` response is non-null and successful |
| G-005 | PatientLoaded | LOADING → READY, LOADING → ACTIVE | `patient` response is non-null and successful |
| G-006 | DoctorLoaded | LOADING → READY, LOADING → ACTIVE | `doctor` response is non-null (or fallback to user.id) |
| G-007 | PatientIdentityPreserved | LOADING → READY, LOADING → ACTIVE | `patient.id` matches `appointment.patientId` |
| G-008 | ConsultationStateValid | LOADING → ACTIVE | If consultation exists, `consultation.state` is IN_PROGRESS or NOT_STARTED |
| G-009 | AppointmentStatusReady | LOADING → READY | Appointment status is CHECKED_IN, READY_FOR_CONSULTATION, COMPLETED, or CANCELLED |
| G-010 | AppointmentStatusActive | LOADING → ACTIVE | Appointment status is IN_CONSULTATION |

### LOAD_ERROR Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-011 | ErrorIsRecoverable | LOADING → ERROR | Error is not a permanent structural failure (e.g., not a corrupted DB response) |

### START_CONSULTATION Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-012 | AppointmentStatusAllowsStart | READY → ACTIVE | Appointment status === CHECKED_IN or READY_FOR_CONSULTATION |
| G-013 | DoctorAssigned | READY → ACTIVE | `doctorId` matches `appointment.doctorId` OR doctor is in queue |
| G-014 | AppointmentNotCompleted | READY → ACTIVE | Appointment status !== COMPLETED and !== CANCELLED |
| G-015 | NoActiveConflict | READY → ACTIVE | DocumentationWorkflow is not in Conflict |

### SWITCH_PATIENT Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-016 | TargetAppointmentExists | READY → LOADING, ACTIVE → LOADING, PAUSED → LOADING, ERROR → LOADING | Target `appointmentId` is distinct from current and valid |
| G-017 | DraftSavedOrUserConfirmed | ACTIVE → LOADING, PAUSED → LOADING | `isDirty === false` OR user confirmed in confirmation dialog |
| G-018 | SaveTimeoutCleared | ACTIVE → LOADING, PAUSED → LOADING | `saveTimeoutRef.current === null` |
| G-019 | ConsultingNotOwnedByOther | ERROR → LOADING | If switching from ERROR after load failure, target appointment is loadable |
| G-020 | CurrentSessionClean | READY → LOADING | `isDirty === false` (trivially true since no edits in READY) |

### SAVE_DRAFT Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-021 | ConsultationInProgress | ACTIVE → SAVING | `consultation.state === ConsultationState.IN_PROGRESS` |
| G-022 | AppointmentNotCompleted | ACTIVE → SAVING | `appointment.status !== COMPLETED` |
| G-023 | NotAlreadySaving | ACTIVE → SAVING | DocumentationWorkflow !== Saving |
| G-024 | NotesPresent | ACTIVE → SAVING | `notes` object is non-null (even if empty is valid) |
| G-025 | DoctorIdPresent | ACTIVE → SAVING | `doctorId` is non-null |
| G-026 | ConsultationIdPresent | ACTIVE → SAVING | `consultation.id` is non-null |

### SAVE_SUCCESS / SAVE_CONFLICT / SAVE_ERROR Guards

These are outcome-dependent and are triggered by the mutation result, not by pre-check.

### OPEN_COMPLETE_DIALOG Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-027 | ConsultationInProgress | ACTIVE → COMPLETING | `consultation.state === ConsultationState.IN_PROGRESS` |
| G-028 | AppointmentNotTerminal | ACTIVE → COMPLETING | `appointment.status !== COMPLETED` and `appointment.status !== CANCELLED` |
| G-029 | UserRoleDoctor | ACTIVE → COMPLETING | `user.role === ROLE_DOCTOR` |
| G-030 | NoActiveSave | ACTIVE → COMPLETING | DocumentationWorkflow !== Saving |
| G-031 | NoActiveConflict | ACTIVE → COMPLETING | DocumentationWorkflow !== Conflict |
| G-032 | PatientNotDeceased | ACTIVE → COMPLETING | Patient is not marked deceased (future: demographic guard) |

### PAUSE Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-033 | SessionActive | ACTIVE → PAUSED | ConsultationWorkflowState === ACTIVE |
| G-034 | NoActiveSave | ACTIVE → PAUSED | DocumentationWorkflow !== Saving |
| G-035 | NoActiveConflict | ACTIVE → PAUSED | DocumentationWorkflow !== Conflict |
| G-036 | NoPendingCompletion | ACTIVE → PAUSED | showCompleteDialog === false |

### RESUME Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-037 | UserExplicitResume | PAUSED → ACTIVE | User clicks resume button |
| G-038 | AppointmentStillLoaded | PAUSED → ACTIVE | `appointment` is non-null |
| G-039 | PatientStillLoaded | PAUSED → ACTIVE | `patient` is non-null |

### CANCEL_COMPLETE Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-040 | DialogIsOpen | COMPLETING → ACTIVE | `showCompleteDialog === true` |

### CONFIRM_COMPLETE Guards

This is the most clinically critical transition.

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-041 | OutcomeSelected | COMPLETING → TRANSITIONING | `outcomeType` is non-null |
| G-042 | NoPendingSave | COMPLETING → TRANSITIONING | DocumentationWorkflow === Document or Draft or Saved |
| G-043 | UserConfirmedProceed | COMPLETING → TRANSITIONING | If DocumentationWorkflow === Failed, user explicitly confirmed "proceed without saving" |
| G-044 | ConsultationInProgress | COMPLETING → TRANSITIONING | `consultation.state === ConsultationState.IN_PROGRESS` |
| G-045 | AppointmentNotCompleted | COMPLETING → TRANSITIONING | `appointment.status !== COMPLETED` and !== CANCELLED |
| G-046 | PatientIdentityVerified | COMPLETING → TRANSITIONING | `patient.id === appointment.patientId` |
| G-047 | VersionCurrent | COMPLETING → TRANSITIONING | Client version matches or is behind server version (no stale overwrite) |
| G-048 | BillingSummaryPresent | COMPLETING → TRANSITIONING | Billing summary loaded (non-blocking; if null, use defaults) |
| G-049 | QueueOwnershipValid | COMPLETING → TRANSITIONING | Doctor is authorized for current appointment |
| G-050 | AdvisoryWarningsReviewed | COMPLETING → TRANSITIONING | All mandatory advisory warnings acknowledged (no unchecked critical warnings) |

### LOAD_NEXT_PATIENT Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-051 | NextPatientExists | TRANSITIONING → LOADING | Queue contains another appointment (IN_CONSULTATION preferred, then CHECKED_IN/READY_FOR_CONSULTATION) |
| G-052 | NextPatientNotCurrent | TRANSITIONING → LOADING | `nextPatient.id !== completedAppointmentId` |
| G-053 | DoctorAuthorizedForNext | TRANSITIONING → LOADING | Doctor is assigned to or in queue for next patient |

### COMPLETE_SESSION Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-054 | NoNextPatient | TRANSITIONING → COMPLETED | Queue is empty after excluding current and completed appointments |
| G-055 | AllCachesInvalidated | TRANSITIONING → COMPLETED | QueryClient.invalidateQueries called for all session keys |

### RESET Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-056 | CompletedOrNewSession | COMPLETED → IDLE | Previous state was COMPLETED or user navigated to new session |

### RESOLVE_WITH_SERVER Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-057 | ServerDataAvailable | CONFLICT → Saved | Refetched consultation has non-null `notes.structured` |
| G-058 | AuditLogged | CONFLICT → Saved | Resolution event recorded (non-blocking) |

### RESOLVE_WITH_LOCAL Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-059 | LocalNotesPresent | CONFLICT → Saving | Local `notes` object is non-null |
| G-060 | LocalVersionTracked | CONFLICT → Saving | Local notes have a version identifier for force-save |
| G-061 | AuditLogged | CONFLICT → Saving | Resolution event recorded (non-blocking) |

### DISMISS_CONFLICT Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-062 | UserExplicitDismiss | CONFLICT → Active | User clicked "Dismiss" (not accidental click) |
| G-063 | DirtyFlagMaintained | CONFLICT → Active | Local notes remain dirty after dismiss |

### RESTORE_SUCCESS Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-064 | DraftTimestampValid | Restoring → Dirty | Draft timestamp is parseable ISO string |
| G-065 | DraftTimestampNewer | Restoring → Dirty | `draft.timestamp > consultation.updatedAt` |
| G-066 | DraftStructureValid | Restoring → Dirty | Draft contains `structured` or parsable `fullText` |

### RESTORE_NOOP Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-067 | DraftTimestampOlderOrEqual | Restoring → Document | `draft.timestamp <= consultation.updatedAt` |
| G-068 | DraftCorruptOrMissing | Restoring → Document | JSON parse fails or `structured`/`fullText` missing |

### RETRY Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-069 | RetryCountNotExhausted | ERROR → LOADING | Retry count < 3 for network errors |
| G-070 | ErrorIsRetryable | ERROR → LOADING | Error type is NETWORK_UNAVAILABLE, TIMEOUT, or transient 5xx |
| G-071 | UserInitiatedRetry | ERROR → LOADING | User clicked retry button (not automatic retry) |

### DISMISS_ERROR Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-072 | UserInitiatedDismiss | ERROR → IDLE | User clicked dismiss or closed error panel |
| G-073 | NoPendingMutations | ERROR → IDLE | No background mutations in flight |

### COMPLETION_RETRY Guards

| Guard ID | Name | Transitions | Logic |
|----------|------|-------------|-------|
| G-074 | PreviousStateWasCompleting | ERROR → ACTIVE | Error originated from COMPLETING or TRANSITIONING |
| G-075 | AppointmentStillActive | ERROR → ACTIVE | Appointment status !== COMPLETED and !== CANCELLED |
| G-076 | NoDataCorruption | ERROR → ACTIVE | Client state matches re-fetched server state (or user confirmed to proceed) |

## Clinical Safety Guard Details

### G-042: NoPendingSave (Completion Guard)

**Clinical Rationale:** Completing a consultation with unsaved notes risks losing clinical documentation. The backend may finalize stale server notes while the doctor thinks their latest edits are saved.

**Enforcement:** DocumentationWorkflow must be Document (no draft), Draft (saved and clean), or Saved (just saved). If Failed, the user must explicitly acknowledge data loss before proceeding.

**Failure Impact:** HIGH — potential loss of clinical notes.

### G-017: DraftSavedOrUserConfirmed (Switch Guard)

**Clinical Rationale:** Switching patients without saving risks losing the current patient's notes. The confirmation dialog gives the doctor agency.

**Enforcement:** If `isDirty === true`, the UI shows a confirmation dialog. If the user confirms, the engine attempts a save. If save fails, navigation still proceeds (draft is not critical — a new load will show the last server version).

**Failure Impact:** MEDIUM — notes may be stale after switch, but server version is preserved.

### G-008: ConsultationStateValid (Resume Guard)

**Clinical Rationale:** Resuming a consultation that is already COMPLETED or CANCELLED would allow editing finalized notes.

**Enforcement:** If `consultation.state` is COMPLETED or CANCELLED, the engine routes to `READY` (read-only) instead of `ACTIVE`.

**Failure Impact:** HIGH — editing completed clinical records violates data integrity.

### G-047: VersionCurrent (Completion Guard)

**Clinical Rationale:** If client version is ahead of server version, completing could overwrite newer server data.

**Enforcement:** Compare client `consultation.version` with server `consultation.version`. If client is ahead, force a save before allowing completion.

**Failure Impact:** MEDIUM — stale client data could be committed as final.

### G-049: QueueOwnershipValid (Completion Guard)

**Clinical Rationale:** Completing a consultation for an appointment the doctor is not authorized for is a security violation.

**Enforcement:** `doctorId` must match `appointment.doctorId` OR doctor must be in the queue for this appointment.

**Failure Impact:** HIGH — unauthorized completion breaks audit trail.

### G-026: ConsultationIdPresent (Save Guard)

**Clinical Rationale:** Attempting to save a draft without a consultation ID would create an orphaned draft.

**Enforcement:** `consultation.id` must be non-null before save mutation fires.

**Failure Impact:** MEDIUM — orphaned drafts create billing and audit inconsistencies.

### G-057: ServerDataAvailable (Conflict Resolution Guard)

**Clinical Rationale:** Resolving with server version when server data is unavailable would leave notes blank.

**Enforcement:** Ensure refetched consultation has valid `notes` before applying server version.

**Failure Impact:** MEDIUM — blank notes in a completed consultation.

## Permission Checks

All permission checks are delegated to the backend API. The frontend state machine assumes the backend has validated:

- JWT authentication
- Doctor role
- Appointment assignment
- Queue membership

The frontend guards duplicate critical checks for UX responsiveness but never replace backend enforcement.

## Examples

### Example 1: Start Consultation from READY

```
READY + START_CONSULTATION
    ↓
G-012: Appointment status CHECKED_IN? yes
G-013: Doctor assigned? yes
G-014: Not completed? yes
    ↓
READY → ACTIVE
    ↓
StartConsultationUseCase.execute()
Toast: "Consultation started"
```

### Example 2: Complete Consultation with Unsaved Notes

```
ACTIVE + OPEN_COMPLETE_DIALOG
    ↓
G-027: Consultation IN_PROGRESS? yes
G-028: Not terminal? yes
G-030: No active save? yes
G-031: No conflict? yes
    ↓
ACTIVE → COMPLETING
    ↓
User clicks Finalize
    ↓
G-041: Outcome selected? yes
G-042: No pending save? NO (DocumentationWorkflow = Dirty)
    ↓
Guard REJECTED
Show warning: "You have unsaved notes. Save before completing?"
User confirms proceed anyway
    ↓
G-042: override = true
    ↓
COMPLETING → TRANSITIONING
    ↓
CompleteConsultationUseCase.execute()
```

### Example 3: Version Conflict During Auto-Save

```
ACTIVE (Dirty) + auto-save timer expires
    ↓
ACTIVE → SAVING
    ↓
Mutation fires
Mutation returns VERSION_CONFLICT
    ↓
SAVING → CONFLICT
    ↓
WorkflowEngine emits DocumentationConflictDetected
UI shows conflict banner
User clicks "Use server version"
    ↓
RESOLVE_WITH_SERVER
    ↓
G-057: Server data available? yes
    ↓
CONFLICT → Saved
Notes replaced with server version
Dirty flag cleared
```

### Example 4: Network Failure During Load

```
LOADING + fetch throws NetworkError
    ↓
G-011: Error recoverable? yes
    ↓
LOADING → ERROR
    ↓
UI shows error toast + retry button
User clicks retry
    ↓
G-069: Retry count < 3? yes
G-070: Error retryable? yes
G-071: User initiated? yes
    ↓
ERROR → LOADING
    ↓
Re-attempt load
```
