# SessionService Architecture

## Executive Summary

SessionService is the Application Service responsible for the complete consultation session lifecycle. It is the single orchestration point for everything that happens between a doctor opening an appointment and completing or switching away from it.

Unlike DraftService, which owns a narrow slice of functionality (draft persistence), SessionService owns the full lifecycle: loading, starting, pausing, resuming, completing, switching, and queue advancement.

**Status: DESIGN COMPLETE — READY FOR PR-A05-02**

---

## 1. Positioning

### Layer

```
Presentation Layer
    │
    ▼
Application Layer
    ├── SessionService          ← THIS SERVICE
    ├── DraftService            ← already extracted
    ├── WorkflowCoordinator     ← already certified
    └── ...
    │
    ▼
Domain Layer
    ├── WorkflowEngine
    ├── WorkflowGuardEngine
    ├── SideEffectDispatcher
    └── WorkflowEventBus
    │
    ▼
Infrastructure Layer
    ├── HttpConsultationApi
    ├── HttpPatientApi
    └── HttpDoctorApi
```

### Responsibility Boundary

SessionService sits between the Presentation Layer and the Domain/Infrastructure layers. It receives intents from Presentation, translates them into domain operations via the WorkflowCoordinator, coordinates infrastructure calls, and returns typed results.

**SessionService must NOT:**
- Own draft persistence (belongs to DraftService)
- Own UI state, React state, reducers, or rendering (belongs to Presentation)
- Own notifications, toasts, or routing (belongs to Presentation or future NotificationProvider)
- Own timers or heartbeats (belongs to future TimerProvider)
- Own billing (belongs to BillingService)
- Own direct workflow mutations (must flow through WorkflowCoordinator)

---

## 2. Scope Definition

### In Scope for SessionService

| Capability | Description |
|------------|-------------|
| Session initialization | Parallel fetch of appointment, doctor, patient, vitals, consultation |
| Session hydration | Restore notes, outcome, decision, draft from server + localStorage |
| Session start | API call to start consultation, handle already-in-progress |
| Session resume | Transition existing IN_PROGRESS consultation to active UI state |
| Session completion | API call to complete, cleanup, cache invalidation |
| Session cancellation | Transition from COMPLETING back to ACTIVE |
| Session pause/resume | Workflow commands for pause/resume lifecycle |
| Patient switching | Save dirty state, navigate to new appointment |
| Queue advancement | Load next patient or complete session based on queue |
| Heartbeat coordination | Send periodic keepalive (delegates to infrastructure) |
| Cache coordination | React Query invalidation for consultation, doctor, appointments |
| Error recovery | Map infrastructure failures to clinical error codes |
| State machine coordination | Issue workflow commands, consume coordinator results |

### Out of Scope (Explicitly Not Owned by SessionService)

| Capability | Owner |
|------------|-------|
| Draft save/restore/discard | DraftService |
| Draft local backup | DraftStorage (Shared Kernel) |
| Notes editing UI state | DocumentationProvider (future) |
| Outcome/decision UI state | DocumentationProvider (future) |
| Queue filtering logic | QueueProvider (future) |
| Queue display state | QueueProvider (future) |
| Heartbeat interval management | TimerProvider (future) |
| Toast notifications | NotificationProvider (future) |
| Navigation/routing | Presentation Layer |
| React Query cache policies | Presentation Layer (QueryClient configuration) |
| Billing calculations | BillingService |
| Billing display | BillingProvider (future) |

---

## 3. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Presentation Layer                              │
│                                                                             │
│  SessionProvider (future)                                                   │
│    ├── consumes: SessionService                                             │
│    ├── owns: SessionState (active, appointment, patient, loading, error)    │
│    └── delegates: workflow via WorkflowCoordinator                          │
│                                                                             │
│  DocumentationProvider (future)                                             │
│    ├── consumes: DraftService                                               │
│    └── owns: notes, outcomeType, patientDecision                            │
└─────────────────────────────────────────────────────────────────────────────┘
           │                           │
           ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Application Layer                                 │
│                                                                             │
│  SessionService                                                             │
│    ├── initializeSession(appointmentId) → SessionResult                     │
│    ├── startSession(appointmentId, doctorId, userId) → SessionResult        │
│    ├── resumeSession(consultationId) → SessionResult                        │
│    ├── completeSession(consultationId) → SessionResult                      │
│    ├── cancelCompletion() → SessionResult                                   │
│    ├── pauseSession() → SessionResult                                       │
│    ├── resumePausedSession() → SessionResult                                │
│    ├── switchSession(fromId, toId) → SessionResult                          │
│    ├── advanceQueue(doctorId) → SessionResult                               │
│    ├── sendHeartbeat(consultationId) → SessionResult                        │
│    │                                                                         │
│    ├── depends on:                                                           │
│    │   ├── WorkflowCoordinator (REQUIRED)                                   │
│    │   ├── DoctorApi (REQUIRED)                                             │
│    │   ├── ConsultationApi (REQUIRED)                                       │
│    │   ├── PatientApi (REQUIRED)                                            │
│    │   ├── DraftService (REQUIRED — for dirty save on switch)               │
│    │   ├── WorkflowEventBus (OPTIONAL — for audit events)                   │
│    │   └── NotificationService (OPTIONAL — for completion toast)            │
│    │                                                                         │
│    └── returns: SessionResult<T> discriminated union                        │
│                                                                             │
│  DraftService (already extracted)                                            │
│    └── saveDraft, restoreDraft, discardDraft                                │
│                                                                             │
│  WorkflowCoordinator (already certified)                                     │
│    └── execute(command) → WorkflowCoordinatorResult                          │
│    └── delegates to: WorkflowEngine → Guards → SideEffects → Events         │
└─────────────────────────────────────────────────────────────────────────────┘
           │                           │
           ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               Domain Layer                                   │
│                                                                             │
│  WorkflowEngine                                                              │
│    ├── WorkflowGuardEngine (73 guards)                                       │
│    ├── SideEffectDispatcher                                                  │
│    └── WorkflowEventBus                                                      │
│                                                                             │
│  State Machines                                                              │
│    ├── ConsultationWorkflowStateMachine                                      │
│    └── DocumentationWorkflowStateMachine                                     │
└─────────────────────────────────────────────────────────────────────────────┘
           │                           │
           ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Infrastructure Layer                               │
│                                                                             │
│  HttpDoctorApi                                                               │
│  HttpConsultationApi                                                         │
│  HttpPatientApi                                                              │
│  DraftStorage (localStorage adapter)                                         │
│  AuditService (future)                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Design Principles

### 4.1 Single Responsibility

SessionService owns exactly one thing: the consultation session lifecycle. Everything else is delegated.

### 4.2 No Direct Workflow Mutations

SessionService never touches `ConsultationWorkflowState` directly. All state changes flow through `WorkflowCoordinator.execute()`.

### 4.3 No React Dependencies

SessionService is a pure TypeScript class. It imports no React, no hooks, no Context, no JSX.

### 4.4 Typed Results

Every method returns a discriminated union (`SessionResult<T>`). No `Promise<void>`. Callers can always distinguish success from failure.

### 4.5 Shim-First Migration

SessionService will be introduced via `ConsultationWorkflowShim` (the existing shim will be extended or a new `SessionOperationsShim` will be created). The shim is the only migration boundary.

### 4.6 Zero Legacy Branches After Cutover

After SessionService is promoted to canonical implementation, no feature flags, no dual paths, and no legacy fallback logic may remain in ConsultationContext.

---

## 5. State Ownership

### 5.1 State Classification

| State | Current Owner | Post-Extraction Owner | Category |
|-------|---------------|----------------------|----------|
| `appointment` | ConsultationContext reducer | SessionProvider (future) | Server State |
| `patient` | ConsultationContext reducer | SessionProvider (future) | Server State |
| `vitals` | ConsultationContext reducer | SessionProvider (future) | Server State |
| `consultation` | ConsultationContext reducer | SessionProvider (future) | Server State |
| `doctorId` | ConsultationContext reducer | SessionProvider (future) | Server State |
| `workflow` | ConsultationContext reducer | SessionService → dispatched back to Presentation | Session State |
| `notes` | ConsultationContext reducer | DocumentationProvider (future) | Form State |
| `outcomeType` | ConsultationContext reducer | DocumentationProvider (future) | Form State |
| `patientDecision` | ConsultationContext reducer | DocumentationProvider (future) | Form State |
| `isLoading` | ConsultationContext reducer | SessionProvider (future) | UI State |
| `isSaving` | ConsultationContext reducer | DocumentationProvider (future) | UI State |
| `showCompleteDialog` | ConsultationContext reducer | DocumentationProvider (future) | UI State |
| `showStartDialog` | ConsultationContext reducer | SessionProvider (future) | UI State |
| `autoSaveStatus` | ConsultationContext reducer | DocumentationProvider (future) | UI State |
| `isDirty` (workflow field) | ConsultationContext reducer | SessionService → Presentation | Derived |
| waitingQueue | Derived in ConsultationContext | QueueProvider (future) | Derived |
| refetchQueue | Derived in ConsultationContext | QueueProvider (future) | Derived |

### 5.2 What Moves Into SessionService

SessionService does NOT permanently own state. It operates on transient inputs and returns results. However, during method execution, it holds temporary state:

| Transient State | Lifetime | Purpose |
|-----------------|----------|---------|
| Loaded appointment | Method execution | Parallel fetch coordinator |
| Loaded patient/vitals | Method execution | Hydration pipeline |
| Consultation record | Method execution | State restoration |
| Draft comparison result | Method execution | Restore newer drafts |
| Workflow command | Method execution | Issue to coordinator |
| Coordinator result | Method execution | Map to presentation action |
| Cache invalidation list | Method execution | Post-completion cleanup |

### 5.3 What Remains in Presentation

After extraction, ConsultationContext (and eventually SessionProvider) retains:

- Reducer for UI state
- Derived computed values (`isActive`, `isReadOnly`, `canSave`, `canComplete`)
- Provider composition
- Effect hooks for auto-save, heartbeat, beforeunload (these migrate to specialized providers)

### 5.4 What Belongs to WorkflowEngine

The WorkflowEngine retains ultimate authority over:

- Transition validation
- Guard evaluation
- Side effect sequencing
- Event publication
- State machine enforcement

---

## 6. Workflow Integration

### 6.1 Command Mapping

Every SessionService operation maps to exactly one `WorkflowCommand`:

| SessionService Method | WorkflowCommand | Coordinator Behavior |
|-----------------------|-----------------|---------------------|
| `initializeSession()` | `INITIALIZE_CONSULTATION` | Fetches data, transitions LOADING → READY/ACTIVE/ERROR |
| `startSession()` | `START_CONSULTATION` | Transitions READY → ACTIVE |
| `resumeSession()` | `START_CONSULTATION` | Transitions READY → ACTIVE (idempotent) |
| `completeSession()` | `COMPLETE_CONSULTATION` | Transitions ACTIVE → COMPLETING → TRANSITIONING |
| `cancelCompletion()` | `CANCEL_CONSULTATION` | Transitions COMPLETING → ACTIVE |
| `pauseSession()` | `PAUSE_CONSULTATION` | Transitions ACTIVE → PAUSED |
| `resumePausedSession()` | `RESUME_CONSULTATION` | Transitions PAUSED → ACTIVE |
| `switchSession()` | `SWITCH_PATIENT` | Transitions any → LOADING |
| `advanceQueue()` | `ADVANCE_QUEUE` | Loads next or completes session |
| `sendHeartbeat()` | *(none)* | Infrastructure call only, no state change |

### 6.2 Zero Direct Mutations

SessionService never:
- Calls `getNextState()` directly
- Calls `canPerformAction()` directly
- Mutates `ConsultationWorkflowState` directly
- Sets workflow state in a reducer directly

All mutations flow through `WorkflowCoordinator.execute(command)`.

---

## 7. Error Handling

### 7.1 Error Taxonomy

| Error Category | Examples | Recovery |
|----------------|----------|----------|
| NETWORK | API timeout, 5xx | Retry with backoff, return partial result |
| NOT_FOUND | Appointment deleted, patient removed | Return terminal state, navigate away |
| CONFLICT | Draft version conflict | Return conflict result, let Presentation resolve |
| AUTH | Token expired, permission denied | Redirect to login |
| VALIDATION | Invalid appointment status | Return validation error, show UI message |
| CLINICAL | Attempt to complete without notes | Block transition, show warning |
| UNKNOWN | Unexpected exception | Return generic failure, log for investigation |

### 7.2 Result Type

```typescript
export type SessionResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: SessionError };

export interface SessionError {
  readonly code: SessionErrorCode;
  readonly message: string;
  readonly category: ErrorCategory;
  readonly recoverable: boolean;
  readonly retryable: boolean;
  readonly cause?: unknown;
}
```

---

## 8. Clinical Safety

### 8.1 Invariants

| Invariant | Enforcement |
|-----------|-------------|
| Auto-save must trigger within 3s of last keystroke | SessionService delegates dirty detection to DraftService |
| Draft recovery must restore notes after crash | SessionService delegates to DraftService during initialization |
| Session start/complete/switch must not lose data | All transitions validate via WorkflowGuardEngine |
| Queue integrity must match priority rules | `advanceQueue()` uses `WorkflowCommandHandler.hasNextPatient()` |
| All clinical actions must be logged | WorkflowEventBus emits events for every transition |
| No regression on 3G networks | Parallel fetch + cache invalidation in SessionService |

### 8.2 Safety Boundaries

| Operation | Safety Mechanism |
|-----------|-----------------|
| Complete consultation | Requires ACTIVE state + no dirty draft (blocked by guard) |
| Switch patient | Saves dirty draft first (delegated to DraftService) |
| Start consultation | Handles already-in-progress gracefully |
| Load appointment | Validates appointment exists and is accessible |

---

## 9. Compliance Matrix

| Requirement | Source | SessionService Compliance |
|-------------|--------|---------------------------|
| No React in Application Layer | G-001 | ✅ Pure TypeScript class |
| Shim-first replacement | G-006 | ✅ SessionOperationsShim planned |
| ConsultationContext shrinks | G-007 | ✅ Target: -300 lines |
| Zero legacy branches after cutover | G-008 | ✅ No flags in context after removal |
| No Promise<void> in services | G-012 | ✅ All methods return SessionResult<T> |
| Behavioral parity before promotion | G-016 | ✅ Parity tests required |
| Clinical validation | G-021 | ✅ All clinical operations reviewed |
| Single source of truth | INV-004 | ✅ Session state owned by SessionProvider |
| State machine enforcement | INV-005 | ✅ All transitions via WorkflowCoordinator |
| Extract-CutOver-Remove | INV-008 | ✅ Shim-first pattern |
| No scattered feature flags | INV-009 | ✅ Flag only in shim |
| Single responsibility | INV-010 | ✅ Session lifecycle only |
| Patient safety | INV-016 | ✅ No clinical data loss paths |
