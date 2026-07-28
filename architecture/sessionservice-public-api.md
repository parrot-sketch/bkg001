# SessionService Public API

## Purpose

This document defines the complete public interface of SessionService. Every method signature, input DTO, output type, business invariant, workflow command, side effect, failure mode, and recovery behavior is specified.

This document is the implementation specification for PR-A05-02. No architectural decisions remain after this document.

---

## 1. Result Type System

### 1.1 Base Result

```typescript
export type SessionResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: SessionError };
```

### 1.2 Error Type

```typescript
export enum SessionErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  CONFLICT = 'CONFLICT',
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  CLINICAL_VIOLATION = 'CLINICAL_VIOLATION',
  STATE_CONFLICT = 'STATE_CONFLICT',
  UNKNOWN = 'UNKNOWN',
}

export enum ErrorCategory {
  NETWORK,
  BUSINESS,
  CLINICAL,
  SYSTEM,
}

export interface SessionError {
  readonly code: SessionErrorCode;
  readonly message: string;
  readonly category: ErrorCategory;
  readonly recoverable: boolean;
  readonly retryable: boolean;
  readonly cause?: unknown;
}
```

### 1.3 Convenience Result Types

```typescript
export type SessionVoid = SessionResult<void>;
export type SessionSession = SessionResult<SessionData>;
export type SessionList = SessionResult<SessionData[]>;
```

---

## 2. Data Types

### 2.1 SessionData

```typescript
export interface SessionData {
  readonly appointment: AppointmentResponse;
  readonly patient: PatientResponse;
  readonly vitals: VitalsResponse[] | null;
  readonly consultation: ConsultationResponse | null;
  readonly doctorId: string;
  readonly workflowState: ConsultationWorkflowState;
  readonly isDirty: boolean;
  readonly draftAvailable: boolean;
}
```

### 2.2 SessionInitializationResult

```typescript
export interface SessionInitializationResult {
  readonly session: SessionData;
  readonly restoredDraft: boolean;
  readonly invalidationInstructions: InvalidationInstruction[];
}

export interface InvalidationInstruction {
  readonly queryKey: readonly unknown[];
  readonly direction: 'invalidate' | 'refetch';
}
```

### 2.3 SessionCompletionResult

```typescript
export interface SessionCompletionResult {
  readonly completedAppointment: AppointmentResponse;
  readonly clearedLocalStorage: boolean;
  readonly invalidationInstructions: InvalidationInstruction[];
  readonly redirectPath: string;
}
```

### 2.4 SessionSwitchResult

```typescript
export interface SessionSwitchResult {
  readonly fromAppointmentId: number;
  readonly toAppointmentId: number;
  readonly draftSaved: boolean;
  readonly nextSession: SessionInitializationResult;
}
```

---

## 3. Method Specifications

### 3.1 initializeSession

```typescript
initializeSession(appointmentId: number): Promise<SessionResult<SessionInitializationResult>>
```

**Purpose:** Load all data for an appointment, restore drafts, determine initial workflow state, and transition to the correct UI state.

**Input:**
- `appointmentId: number` — the appointment to load

**Output:**
- `SessionResult<SessionInitializationResult>`

**Business Invariants:**
1. Appointment must exist and be accessible by the current user.
2. If consultation already exists, notes/outcome/decision must be restored.
3. If local draft is newer than server, local draft takes precedence.
4. Workflow state must be determined by appointment status and consultation state:
   - COMPLETED/CANCELLED → READY (read-only)
   - IN_CONSULTATION or IN_PROGRESS → ACTIVE
   - CHECKED_IN or READY_FOR_CONSULTATION → READY (show start dialog)
   - Otherwise → READY

**Workflow Command Emitted:**
- `INITIALIZE_CONSULTATION` (with `appointmentId`)

**Side Effects Requested:**
- Cache invalidation for consultation, doctor, appointments
- Draft restoration from localStorage if newer

**Failure Modes:**
| Failure | Code | Recoverable | Recovery |
|---------|------|-------------|----------|
| Appointment not found | NOT_FOUND | No | Navigate to dashboard |
| Network error | NETWORK_ERROR | Yes | Retry with backoff |
| Patient not found | NOT_FOUND | No | Navigate to dashboard |
| Draft restore failure | CONFLICT | Yes | Continue with server notes |
| Workflow transition failure | STATE_CONFLICT | Yes | Return session data but mark workflow as ERROR |

**Recovery Behavior:**
- Network errors: SessionService returns `SessionResult` with retryable=true. Presentation shows retry UI.
- Not found: SessionService returns terminal result. Presentation navigates away.
- Draft conflict: SessionService continues with server notes, logs conflict. Presentation shows toast.

---

### 3.2 startSession

```typescript
startSession(appointmentId: number, doctorId: string, userId: string): Promise<SessionResult<SessionData>>
```

**Purpose:** Start a new consultation for an appointment. Handles already-in-progress gracefully.

**Input:**
- `appointmentId: number`
- `doctorId: string`
- `userId: string`

**Output:**
- `SessionResult<SessionData>`

**Business Invariants:**
1. Appointment must be in CHECKED_IN or READY_FOR_CONSULTATION state.
2. If consultation already exists, treat as resume rather than error.
3. Doctor must be authenticated.

**Workflow Command Emitted:**
- `START_CONSULTATION`

**Side Effects Requested:**
- Invalidate doctor appointments query
- Invalidate consultation query

**Failure Modes:**
| Failure | Code | Recoverable | Recovery |
|---------|------|-------------|----------|
| Already in progress | VALIDATION_FAILED | Yes | Proceed to ACTIVE state |
| Permission denied | AUTH_REQUIRED | No | Redirect to login |
| Network error | NETWORK_ERROR | Yes | Retry |
| Appointment not found | NOT_FOUND | No | Navigate to dashboard |

**Recovery Behavior:**
- Already-in-progress: SessionService refreshes consultation record and returns ACTIVE session. Presentation shows toast "Consultation already in progress".
- Network: Retry up to 3 times with exponential backoff.

---

### 3.3 resumeSession

```typescript
resumeSession(consultationId: number): Promise<SessionResult<SessionData>>
```

**Purpose:** Resume an existing in-progress consultation. Used when navigating back to an active session.

**Input:**
- `consultationId: number`

**Output:**
- `SessionResult<SessionData>`

**Business Invariants:**
1. Consultation must exist and be in IN_PROGRESS state.
2. No API call needed if local state is fresh.

**Workflow Command Emitted:**
- `START_CONSULTATION` (idempotent)

**Side Effects Requested:**
- Refresh consultation data
- Invalidate consultation query

**Failure Modes:**
| Failure | Code | Recoverable | Recovery |
|---------|------|-------------|----------|
| Consultation not found | NOT_FOUND | No | Navigate to dashboard |
| Consultation not in progress | VALIDATION_FAILED | No | Show error, navigate to dashboard |
| Network error | NETWORK_ERROR | Yes | Retry |

---

### 3.4 completeSession

```typescript
completeSession(consultationId: number): Promise<SessionResult<SessionCompletionResult>>
```

**Purpose:** Complete the current consultation. Performs all cleanup and cache invalidation.

**Input:**
- `consultationId: number`

**Output:**
- `SessionResult<SessionCompletionResult>`

**Business Invariants:**
1. Consultation must be in IN_PROGRESS state.
2. Draft must be saved or dirty flag must be false.
3. Doctor must have completed all mandatory fields (enforced by WorkflowGuardEngine).

**Workflow Command Emitted:**
- `COMPLETE_CONSULTATION`

**Side Effects Requested:**
- Clear localStorage draft via DraftService
- Invalidate consultation, doctor, appointments, billing queries
- Emit audit event

**Failure Modes:**
| Failure | Code | Recoverable | Recovery |
|---------|------|-------------|----------|
| Draft not saved | CLINICAL_VIOLATION | Yes | Prompt user to save |
| Consultation not in progress | VALIDATION_FAILED | No | Show error |
| Network error | NETWORK_ERROR | Yes | Retry |
| Guard rejection | STATE_CONFLICT | Yes | Return to ACTIVE, show reason |

**Recovery Behavior:**
- Draft not saved: SessionService returns failure. Presentation shows "Save draft before completing" warning.
- Guard rejection: SessionService returns error with guard reason. Presentation shows error message.

---

### 3.5 cancelCompletion

```typescript
cancelCompletion(): Promise<SessionResult<SessionData>>
```

**Purpose:** Cancel the completion dialog and return to active consultation state.

**Input:** None

**Output:**
- `SessionResult<SessionData>>

**Business Invariants:**
1. Current workflow state must be COMPLETING.
2. No data changes occur.

**Workflow Command Emitted:**
- `CANCEL_CONSULTATION`

**Side Effects Requested:**
- None

**Failure Modes:**
| Failure | Code | Recoverable | Recovery |
|---------|------|-------------|----------|
| Not in COMPLETING state | STATE_CONFLICT | No | Ignore — already not completing |

---

### 3.6 pauseSession

```typescript
pauseSession(): Promise<SessionResult<void>>
```

**Purpose:** Pause the current consultation.

**Input:** None

**Output:**
- `SessionResult<void>`

**Business Invariants:**
1. Current workflow state must be ACTIVE.

**Workflow Command Emitted:**
- `PAUSE_CONSULTATION`

**Side Effects Requested:**
- Stop heartbeat (delegate to TimerProvider or SessionService)
- Clear auto-save timer

**Failure Modes:**
| Failure | Code | Recoverable | Recovery |
|---------|------|-------------|----------|
| Not in ACTIVE state | STATE_CONFLICT | No | Ignore |

---

### 3.7 resumePausedSession

```typescript
resumePausedSession(): Promise<SessionResult<void>>
```

**Purpose:** Resume a paused consultation.

**Input:** None

**Output:**
- `SessionResult<void>`

**Business Invariants:**
1. Current workflow state must be PAUSED.

**Workflow Command Emitted:**
- `RESUME_CONSULTATION`

**Side Effects Requested:**
- Restart heartbeat
- Restart auto-save timer

**Failure Modes:**
| Failure | Code | Recoverable | Recovery |
|---------|------|-------------|----------|
| Not in PAUSED state | STATE_CONFLICT | No | Ignore |

---

### 3.8 switchSession

```typescript
switchSession(fromAppointmentId: number, toAppointmentId: number): Promise<SessionResult<SessionSwitchResult>>
```

**Purpose:** Save current session and load a new appointment. Ensures no data loss during switching.

**Input:**
- `fromAppointmentId: number`
- `toAppointmentId: number`

**Output:**
- `SessionResult<SessionSwitchResult>`

**Business Invariants:**
1. From-appointment must exist and be currently loaded.
2. To-appointment must exist and be accessible.
3. Dirty state must be saved before switching (delegated to DraftService).
4. Auto-save timer must be cleared.
5. LocalStorage draft for from-appointment must be cleared.

**Workflow Command Emitted:**
- `SWITCH_PATIENT` (with `appointmentId: toAppointmentId`)

**Side Effects Requested:**
- Save draft via DraftService (if dirty)
- Clear localStorage draft for from-appointment
- Invalidate from-appointment queries
- Load to-appointment data

**Failure Modes:**
| Failure | Code | Recoverable | Recovery |
|---------|------|-------------|----------|
| Draft save failed | CLINICAL_VIOLATION | Yes | Prompt user, offer retry or discard |
| To-appointment not found | NOT_FOUND | No | Stay on current session |
| Network error | NETWORK_ERROR | Yes | Retry |

**Recovery Behavior:**
- Draft save failed: SessionService returns failure. Presentation shows "Save failed. Discard changes and switch?" confirmation.
- Network: Retry switch up to 3 times.

---

### 3.9 advanceQueue

```typescript
advanceQueue(doctorId: string): Promise<SessionResult<SessionInitializationResult | null>>
```

**Purpose:** Advance to the next patient in the queue, or complete the session if no more patients.

**Input:**
- `doctorId: string`

**Output:**
- `SessionResult<SessionInitializationResult | null>`
- `null` means session completed (no next patient)

**Business Invariants:**
1. Must be called when consultation is in TRANSITIONING state (post-completion).
2. Must check queue for next CHECKED_IN/READY_FOR_CONSULTATION appointment.
3. If next patient exists, load their session.
4. If no next patient, complete current session fully.

**Workflow Command Emitted:**
- `ADVANCE_QUEUE`

**Side Effects Requested:**
- If next patient: load new session data
- If no next patient: complete session (same as `completeSession`)

**Failure Modes:**
| Failure | Code | Recoverable | Recovery |
|---------|------|-------------|----------|
| No next patient | NOT_FOUND | No | Return null — session complete |
| Network error | NETWORK_ERROR | Yes | Retry |
| Next patient not accessible | VALIDATION_FAILED | No | Skip to following patient or return null |

---

### 3.10 sendHeartbeat

```typescript
sendHeartbeat(consultationId: number): Promise<SessionResult<void>>
```

**Purpose:** Send a keepalive signal to prevent session timeout.

**Input:**
- `consultationId: number`

**Output:**
- `SessionResult<void>`

**Business Invariants:**
1. Consultation must exist.
2. Failure must not interrupt the consultation.

**Workflow Command Emitted:**
- None (infrastructure call only)

**Side Effects Requested:**
- POST to `/consultations/{id}/heartbeat`

**Failure Modes:**
| Failure | Code | Recoverable | Recovery |
|---------|------|-------------|----------|
| Network error | NETWORK_ERROR | Yes | Silently retry on next interval |
| Consultation not found | NOT_FOUND | Yes | Transition to ERROR state |

**Recovery Behavior:**
- Network errors are swallowed. Heartbeat is best-effort.
- 404 triggers workflow transition to ERROR state via coordinator.

---

## 4. Method Summary Table

| Method | Input | Output | Workflow Command | Side Effects |
|--------|-------|--------|-----------------|-------------|
| `initializeSession` | `appointmentId: number` | `SessionResult<SessionInitializationResult>` | `INITIALIZE_CONSULTATION` | Fetch, restore draft, invalidate queries |
| `startSession` | `appointmentId, doctorId, userId` | `SessionResult<SessionData>` | `START_CONSULTATION` | API call, invalidate doctor queries |
| `resumeSession` | `consultationId: number` | `SessionResult<SessionData>` | `START_CONSULTATION` | Refresh consultation |
| `completeSession` | `consultationId: number` | `SessionResult<SessionCompletionResult>` | `COMPLETE_CONSULTATION` | Clear draft, invalidate all, emit audit |
| `cancelCompletion` | — | `SessionResult<SessionData>` | `CANCEL_CONSULTATION` | None |
| `pauseSession` | — | `SessionResult<void>` | `PAUSE_CONSULTATION` | Stop timers |
| `resumePausedSession` | — | `SessionResult<void>` | `RESUME_CONSULTATION` | Restart timers |
| `switchSession` | `fromId, toId` | `SessionResult<SessionSwitchResult>` | `SWITCH_PATIENT` | Save draft, clear storage, load new |
| `advanceQueue` | `doctorId: string` | `SessionResult<SessionInitializationResult | null>` | `ADVANCE_QUEUE` | Load next or complete |
| `sendHeartbeat` | `consultationId: number` | `SessionResult<void>` | None | POST heartbeat |

---

## 5. Invariants

| Invariant | Enforcement |
|-----------|-------------|
| All methods return `SessionResult<T>` | Type system — no `Promise<void>` |
| All transitions flow through WorkflowCoordinator | Code review + architecture test |
| No method performs routing or shows toast | G-001 + code review |
| No method accesses localStorage directly | Code review — delegates to DraftService |
| No method imports React | TypeScript compilation — no React in Application Layer |
| SessionService never mutates Presentation state | SessionService has no knowledge of reducers or Context |
