# Workflow Event Catalog

## Purpose

This document defines all transition events emitted by the Workflow Engine. Events decouple state transitions from side effects (toasts, cache invalidation, audit logging, WebSocket broadcasts). Producers emit events; consumers subscribe without knowing the producer.

## Event Conventions

- **Events are immutable** — payloads are frozen at emission time
- **Events are ordered by transition ID** — consumers see events in the order transitions occurred
- **Events are at-least-once** — consumers must be idempotent
- **Events are fire-and-forget** — producers do not await consumer processing

## Event Envelope

```typescript
interface WorkflowEvent<T = any> {
  readonly id: string;
  readonly type: string;
  readonly timestamp: number;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly payload: T;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | UUID v4 — unique per event |
| `type` | `string` | Event type string |
| `timestamp` | `number` | Unix epoch ms |
| `correlationId` | `string` | Session-level ID — all events for one consultation share this |
| `causationId` | `string | null` | If this event was caused by another, its ID |
| `payload` | `T` | Typed payload |

## Event Catalog

### 1. ConsultationStarted

| Property | Value |
|----------|-------|
| **Producer** | `WorkflowEngine` on `READY → ACTIVE` via `START_CONSULTATION` |
| **Consumers** | `TimerProvider`, `NotificationService`, `AuditService`, `QueueProvider` |
| **Ordering** | Ordered within session (causationId = previous transition event) |
| **Retry Policy** | Emitted once per transition; not retried on consumer failure |
| **Idempotency Key** | `correlationId + causationId` — duplicate deliveries are no-ops |
| **WebSocket** | Future: broadcast to frontdesk dashboard ("Doctor X started consultation with Patient Y") |
| **Audit** | Required — `AuditService.recordEvent('SESSION_STARTED', ...)` |

**Payload Schema:**
```typescript
interface ConsultationStartedPayload {
  appointmentId: number;
  patientId: string;
  consultationId: number | null;
  doctorId: string;
  doctorName: string;
  patientName: string;
  appointmentStatus: string;
}
```

### 2. ConsultationPaused

| Property | Value |
|----------|-------|
| **Producer** | `WorkflowEngine` on `ACTIVE → PAUSED` via `PAUSE` |
| **Consumers** | `TimerProvider`, `NotificationService` |
| **Ordering** | Ordered — fires after all ACTIVE side effects complete |
| **Retry Policy** | Fire-and-forget — consumer failure does not revert state |
| **Idempotency Key** | `correlationId + appointmentId + action` |
| **WebSocket** | None |
| **Audit** | Required |

**Payload Schema:**
```typescript
interface ConsultationPausedPayload {
  appointmentId: number;
  patientId: string;
  pausedAt: number; // timestamp
  reason: 'user_initiated' | 'idle_timeout' | 'forced';
  unsavedChanges: boolean;
}
```

### 3. DocumentationSaved

| Property | Value |
|----------|-------|
| **Producer** | `DocumentationEngine` on `Saving → Saved` via `SAVE_SUCCESS` |
| **Consumers** | `NotificationService`, `AuditService`, `CacheService` |
| **Ordering** | Ordered — fires after mutation `onSuccess` |
| **Retry Policy** | When emitted, it has already succeeded. Consumer failure does not retry emission. |
| **Idempotency Key** | `correlationId + appointmentId + draftVersion` |
| **WebSocket** | None |
| **Audit** | Required — `AuditService.recordEvent('DRAFT_SAVED', ...)` |

**Payload Schema:**
```typescript
interface DocumentationSavedPayload {
  appointmentId: number;
  consultationId: number;
  version: string;
  savedAt: number;
  saveType: 'auto' | 'manual';
  fieldsChanged: NoteField[];
  wordCount: number;
}
```

### 4. DocumentationConflictDetected

| Property | Value |
|----------|-------|
| **Producer** | `WorkflowEngine` on `SAVING → CONFLICT` via `SAVE_CONFLICT` |
| **Consumers** | `NotificationService`, `AuditService`, `ConflictResolver` |
| **Ordering** | Ordered — fires before any CONFLICT state transition |
| **Retry Policy** | Emitted once per conflict; not buffered or retried |
| **Idempotency Key** | `correlationId + appointmentId + serverVersion` |
| **WebSocket** | None |
| **Audit** | Required — `AuditService.recordEvent('DRAFT_CONFLICT', ...)` |

**Payload Schema:**
```typescript
interface DocumentationConflictDetectedPayload {
  appointmentId: number;
  consultationId: number;
  serverVersion: string;
  clientVersion: string;
  serverUpdatedAt: number;
  conflictFields: NoteField[];
}
```

### 5. ConsultationCompleted

| Property | Value |
|----------|-------|
| **Producer** | `WorkflowEngine` on `COMPLETING → TRANSITIONING` via `CONFIRM_COMPLETE` |
| **Consumers** | `BillingService`, `SurgicalCaseService`, `NotificationService`, `QueueProvider`, `AuditService` |
| **Ordering** | Ordered — fires after all completion side effects in session |
| **Retry Policy** | Consumer failures are logged but do not affect completion state |
| **Idempotency Key** | `correlationId + appointmentId + completedAt` |
| **WebSocket** | Broadcast to frontdesk/nurses — "Consultation completed for Patient Y" |
| **Audit** | Required — `AuditService.recordEvent('SESSION_COMPLETED', ...)` |

**Payload Schema:**
```typescript
interface ConsultationCompletedPayload {
  appointmentId: number;
  patientId: string;
  consultationId: number;
  doctorId: string;
  completedAt: number;
  outcomeType: ConsultationOutcomeType;
  patientDecision: PatientDecision | null;
  durationSeconds: number;
  billingCreated: boolean;
  surgicalCaseCreated: boolean;
}
```

### 6. PatientSwitched

| Property | Value |
|----------|-------|
| **Producer** | `WorkflowEngine` on any load transition that changes `patientId` |
| **Consumers** | `TimerProvider`, `PatientContextProvider`, `QueueProvider`, `AuditService` |
| **Ordering** | Ordered — fires after new session data loads |
| **Retry Policy** | Fire-and-forget |
| **Idempotency Key** | `correlationId + fromPatientId + toPatientId` |
| **WebSocket** | Future: broadcast to nurse station |
| **Audit** | Required — `AuditService.recordEvent('SESSION_SWITCHED', ...)` |

**Payload Schema:**
```typescript
interface PatientSwitchedPayload {
  fromAppointmentId: number | null;
  toAppointmentId: number;
  fromPatientId: string | null;
  toPatientId: string;
  doctorId: string;
  reason: 'queue_advance' | 'manual_switch' | 'retry';
}
```

### 7. QueueAdvanced

| Property | Value |
|----------|-------|
| **Producer** | `QueueProvider` when next patient is auto-loaded after `COMPLETING → TRANSITIONING → LOADING` |
| **Consumers** | `SessionService`, `NotificationService`, `AuditService` |
| **Ordering** | Ordered — fires before `ConsultationStarted` for the new patient |
| **Retry Policy** | Fire-and-forget |
| **Idempotency Key** | `correlationId + nextAppointmentId` |
| **WebSocket** | Future: queue dashboard updates |
| **Audit** | Required |

**Payload Schema:**
```typescript
interface QueueAdvancedPayload {
  previousAppointmentId: number;
  nextAppointmentId: number;
  routingPriority: 'resume_in_consultation' | 'start_next_waiting';
  queueLengthAfter: number;
}
```

### 8. DraftRestored

| Property | Value |
|----------|-------|
| **Producer** | `DocumentationEngine` on `Restoring → Dirty` via `RESTORE_SUCCESS` |
| **Consumers** | `NotificationService`, `AuditService` |
| **Ordering** | Ordered — fires before `DocumentationSaved` if restore leads to immediate save |
| **Retry Policy** | Fire-and-forget |
| **Idempotency Key** | `correlationId + appointmentId + draftTimestamp` |
| **WebSocket** | None |
| **Audit** | Required — `AuditService.recordEvent('DRAFT_RESTORED', ...)` |

**Payload Schema:**
```typescript
interface DraftRestoredPayload {
  appointmentId: number;
  consultationId: number;
  draftTimestamp: number;
  serverUpdatedAt: number;
  fieldsRestored: NoteField[];
  wasLegacyFormat: boolean;
}
```

### 9. ConsultationFailed

| Property | Value |
|----------|-------|
| **Producer** | `WorkflowEngine` on `LOADING → ERROR`, `SAVING → ERROR`, or `TRANSITIONING → ERROR` via `LOAD_ERROR` / `SAVE_ERROR` |
| **Consumers** | `NotificationService`, `AuditService`, `CrashReporter` |
| **Ordering** | Ordered — fires before state enters ERROR |
| **Retry Policy** | Not retried — emitted once per failure |
| **Idempotency Key** | `correlationId + appointmentId + operation` |
| **WebSocket** | None |
| **Audit** | Required — `AuditService.recordEvent('SESSION_FAILED', ...)` |

**Payload Schema:**
```typescript
interface ConsultationFailedPayload {
  appointmentId: number;
  operation: 'load' | 'save' | 'complete' | 'switch';
  errorCode: string;
  errorMessage: string;
  recoverable: boolean;
  timestamp: number;
}
```

### 10. ConsultationRetried

| Property | Value |
|----------|-------|
| **Producer** | `WorkflowEngine` on `ERROR → LOADING` or `ERROR → ACTIVE` via `RETRY` / `COMPLETION_RETRY` |
| **Consumers** | `AuditService` |
| **Ordering** | Ordered — fires before retry attempt begins |
| **Retry Policy** | Fire-and-forget |
| **Idempotency Key** | `correlationId + operation + retryCount` |
| **WebSocket** | None |
| **Audit** | Required — `AuditService.recordEvent('SESSION_RETRIED', ...)` |

**Payload Schema:**
```typescript
interface ConsultationRetriedPayload {
  appointmentId: number;
  previousErrorCode: string;
  retryCount: number;
  previousState: ConsultationWorkflowState;
  nextState: ConsultationWorkflowState;
}
```

## Special Events

### DocumentationCleared

- **Producer:** `DocumentationEngine` on `Dirty → Document` via `SWITCH_PATIENT` or `COMPLETE`
- **Consumers:** `AuditService`
- **Payload:**
```typescript
interface DocumentationClearedPayload {
  appointmentId: number;
  reason: 'switch_patient' | 'completion';
  notesWereDirty: boolean;
  draftWasSaved: boolean;
}
```

### DocumentationFrozen

- **Producer:** `DocumentationEngine` on entry to `PAUSED`
- **Consumers:** `TimerProvider`
- **Payload:**
```typescript
interface DocumentationFrozenPayload {
  appointmentId: number;
  autoSavePaused: boolean;
}
```

### DraftRestored

- **Producer:** `DocumentationEngine` on `Restoring → Dirty` or `Restoring → Document`
- **Consumers:** `AuditService`
- **Payload:**
```typescript
interface DraftRestoredPayload {
  appointmentId: number;
  wasRestored: boolean;
  wasLegacyFormat: boolean;
}
```

## Event Flow Diagrams

### Completion Flow

```
OPEN_COMPLETE_DIALOG
    ↓
WorkflowEngine: ACTIVE → COMPLETING
    ↓
No event (UI-only transition)
    ↓
User confirms
    ↓
ConsultationCompleted (after billing, surgical, notifications, audit)
    ↓
QueueAdvanced (if next patient loaded)
    ↓
ConsultationStarted (for next patient)
```

### Auto-Save Flow

```
User types → Dirty entered
    ↓
(3s debounce)
    ↓
WorkflowEngine: ACTIVE → SAVING
DocumentationEngine: Dirty → Saving
    ↓
Mutation succeeds
    ↓
DocumentationSaved
    ↓
WorkflowEngine: SAVING → ACTIVE
DocumentationEngine: Saving → Saved
    ↓
(2s timeout)
    ↓
DocumentationEngine: Saved → Draft
```

### Conflict Flow

```
Mutation returns VERSION_CONFLICT
    ↓
DocumentationConflictDetected
    ↓
WorkflowEngine: SAVING → CONFLICT
DocumentationEngine: Saving → Conflict
    ↓
User resolves with server
    ↓
(no new event — resolution is a consumer action)
    ↓
WorkflowEngine: CONFLICT → ACTIVE
DocumentationEngine: Conflict → Saved
    ↓
DocumentationSaved
```

### Switch Patient Flow

```
User selects new patient
    ↓
G-017: DraftSavedOrUserConfirmed? yes
    ↓
WorkflowEngine: ACTIVE → LOADING
DocumentationEngine: Dirty → Document (Draft if no changes)
    ↓
DocumentationCleared (reason: switch_patient)
    ↓
Load new appointment
    ↓
PatientSwitched
    ↓
(load completes)
    ↓
ConsultationStarted (for new patient) or READY
```

## Ordering Guarantees

Within a single consultation session (`correlationId`), events are strictly ordered by `timestamp`. Consumers must process events in order. The engine guarantees:

1. **No backward jumps:** `timestamp` is monotonically increasing within a session
2. **Causation chain:** `causationId` links dependent events
3. **Atomic batches:** Side effects that must happen together (e.g., `ConsultationCompleted` + `ConsultationCleared`) are emitted as an ordered sequence with adjacent timestamps

## Retry Policy Summary

| Event | Retry on Consumer Failure | Buffered | Dead Letter |
|-------|---------------------------|----------|-------------|
| ConsultationStarted | No | No | No |
| ConsultationPaused | No | No | No |
| DocumentationSaved | No | No | No |
| DocumentationConflictDetected | No | No | No |
| ConsultationCompleted | No (logged) | No | No |
| PatientSwitched | No | No | No |
| QueueAdvanced | No | No | No |
| DraftRestored | No | No | No |
| ConsultationFailed | No | No | No |
| ConsultationRetried | No | No | No |

**Rationale:** The Workflow Engine owns state. Events are a notification mechanism, not a persistence mechanism. If a consumer fails, it can re-sync from the current state.

## Idempotency Keys

All events include enough information for consumers to deduplicate:

```typescript
const idempotencyKey = `${correlationId}:${type}:${extractKey(payload)}`;
```

- `ConsultationStarted` → `correlationId:ConsultationStarted:appointmentId`
- `DocumentationSaved` → `correlationId:DocumentationSaved:appointmentId:version`
- `ConsultationCompleted` → `correlationId:ConsultationCompleted:appointmentId`
- `DocumentationConflictDetected` → `correlationId:DocumentationConflictDetected:appointmentId:serverVersion`

## Future WebSocket Implications

The event envelope is designed for future WebSocket emission:

```typescript
// Future: WebSocket gateway subscribes to event bus
eventBus.on('ConsultationCompleted', (event) => {
  wsServer.broadcast('consultation-updates', event);
});
```

Events that are candidates for WebSocket broadcast:
- `ConsultationStarted` — frontdesk queue update
- `ConsultationCompleted` — frontdesk/nurse notification
- `QueueAdvanced` — queue panel refresh
- `PatientSwitched` — frontdesk awareness

Events that MUST NOT be broadcast:
- `DocumentationSaved` — contains clinical notes
- `DocumentationConflictDetected` — contains version metadata
- `DraftRestored` — contains draft content
- `ConsultationFailed` — contains error details

## Audit Implications

Every event is an audit trail entry. The `AuditService` subscribes to the event bus and writes to the audit log:

| Event | Audit Severity | Retention |
|-------|----------------|-----------|
| ConsultationStarted | INFO | 7 years |
| ConsultationPaused | INFO | 7 years |
| DocumentationSaved | INFO | 7 years |
| DocumentationConflictDetected | WARNING | 7 years |
| ConsultationCompleted | CRITICAL | 7 years |
| PatientSwitched | INFO | 7 years |
| QueueAdvanced | INFO | 7 years |
| DraftRestored | INFO | 7 years |
| ConsultationFailed | ERROR | 7 years |
| ConsultationRetried | INFO | 7 years |
| DocumentationCleared | INFO | 7 years |
| DocumentationFrozen | DEBUG | 1 year |

All audit events must include:
- `actorId` (doctor who triggered)
- `appointmentId`
- `patientId`
- `timestamp`
- `correlationId`
