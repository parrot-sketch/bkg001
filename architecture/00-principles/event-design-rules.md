# Event Design Rules

**Purpose:** These rules govern every event in the Nairobi Sculpt system. They ensure consistency, reliability, and maintainability of the event stream.

---

## Rule 1: Events Are Facts, Not Commands

Events describe something that **already happened**. They are not requests to do something.

| ✅ Good (Fact) | ❌ Bad (Command/Request) |
|----------------|--------------------------|
| `patient.created` | `create.patient` |
| `appointment.booked` | `book.appointment` |
| `consultation.completed` | `complete.consultation` |
| `payment.received` | `receive.payment` |
| `notification.sent` | `send.notification` |

**Why:** Commands belong inside workflows. Events describe what happened. This separation enables:
- Audit trails (what happened)
- Debugging (trace by correlationId)
- Replay (rebuild state from facts)

---

## Rule 2: Events Are Immutable

Once emitted, an event **never changes**. Corrections are new events.

| Scenario | Correct Approach |
|----------|------------------|
| Patient address was wrong | Emit `patient.record.updated` with new address |
| Appointment time changed | Emit `appointment.rescheduled` with old and new times |
| Payment amount corrected | Emit `payment.refunded` + new `payment.received` |
| Consultation notes amended | Emit `clinical.note.updated` |

**Why:** Immutability enables:
- Complete audit trail
- Event replay
- Time-travel debugging
- Regulatory compliance

---

## Rule 3: Events Use Past Tense

Event names describe completed actions in past tense.

| Pattern | Example |
|---------|---------|
| `noun.verb.past` | `patient.created`, `appointment.confirmed` |
| `noun.adjective` | `patient.minor` (rare) |

**Why:** Past tense makes it clear the action already occurred.

---

## Rule 4: Events Have a Single Owner

Only one aggregate may emit a specific event type. This prevents conflicting events.

| Event | Owner | Forbidden Producers |
|-------|-------|---------------------|
| `patient.record.created` | Patient Aggregate | Frontdesk UI, Appointment Service |
| `appointment.confirmed` | Appointment Aggregate | Queue Management, Notification Service |
| `consultation.completed` | Consultation Aggregate | Doctor, Billing Service |

**Enforcement:** See `02-event-catalog/event-ownership.md`

---

## Rule 5: Events Use Standardized Envelope

Every event must use the `DomainEvent<TPayload>` envelope.

```typescript
interface DomainEvent<TPayload> {
  eventId: string;           // UUID
  eventType: string;         // e.g., "patient.created"
  version: number;           // Schema version
  aggregateId: string;       // ID of the aggregate
  aggregateType: string;     // Type of the aggregate
  occurredAt: string;        // ISO 8601 timestamp
  correlationId: string;     // Workflow grouping
  causationId: string;       // Parent event ID
  producer: string;          // Service/function
  actor: { ... };            // Who triggered it
  payload: TPayload;         // Event-specific data
}
```

**Enforcement:** See `02-event-catalog/event-envelope.md`

---

## Rule 6: Events Are Versioned

Event payloads are versioned to support schema evolution.

| Version Change | Example | Action |
|----------------|---------|--------|
| Add optional field | Add `middleName` to patient | Bump to v1.1, field is optional |
| Rename with alias | `firstName` → `givenName` | Bump to v1.2, keep alias |
| Breaking change | Remove `phone` field | Bump to v2.0, require consumer migration |

**Versioning Strategy:**
- Semantic versioning: MAJOR.MINOR.PATCH
- MAJOR: Breaking changes
- MINOR: Additive changes (new optional fields)
- PATCH: Documentation fixes, no schema change

---

## Rule 7: Events Are Idempotent

Consumers may receive the same event multiple times. Processing must be safe.

| Scenario | Idempotent Handling |
|----------|---------------------|
| Event delivered twice | Check `eventId` before processing |
| Event retried after timeout | Use `eventId` to deduplicate |
| Consumer restarts mid-processing | Replay from last committed `eventId` |

**Implementation:**
```typescript
async function handleEvent(event: DomainEvent<any>) {
  if (await isEventProcessed(event.eventId)) {
    return; // Already processed, skip
  }
  await processEvent(event);
  await markEventProcessed(event.eventId);
}
```

---

## Rule 8: Events Are Ordered Within an Aggregate

Events for a single aggregate must be processed in order.

| Guarantee | Implementation |
|-----------|----------------|
| Order within aggregate | Partition event stream by `aggregateId` |
| No order across aggregates | Consumers handle out-of-order events |
| Causal ordering | Use `causationId` for parent-child events |

---

## Rule 9: Events Have Payload Contracts

Every event has a well-defined payload schema.

| Schema Type | Use Case |
|-------------|----------|
| TypeScript interface | Development-time type checking |
| JSON Schema | Runtime validation, documentation |
| Protobuf/Avro | High-performance serialization (future) |

**Payload Rules:**
- No nested objects more than 2 levels deep
- No arrays with unbounded length
- All optional fields must have defaults
- All IDs must be UUIDs or well-defined types

---

## Rule 10: Events Are Small and Focused

One event = one fact. Do not combine multiple facts into one event.

| ❌ Bad (Multiple Facts) | ✅ Good (Single Fact) |
|------------------------|----------------------|
| `patient.created_and_notified` | `patient.created` + `notification.sent` |
| `appointment.confirmed_and_reminded` | `appointment.confirmed` + `reminder.scheduled` |
| `consultation.completed_and_invoiced` | `consultation.completed` + `invoice.created` |

**Why:** Separate events enable:
- Independent consumers
- Flexible orchestration
- Better debugging
- Easier testing

---

## Rule 11: Events Carry Correlation Context

Every workflow generates a `correlationId` at the entry point.

| Workflow | Correlation ID Generated At | Example |
|----------|----------------------------|---------|
| QR Intake | `StartPatientIntakeUseCase` | `correlationId: "intake-abc-123"` |
| Appointment | `ScheduleAppointmentUseCase` | `correlationId: "appointment-xyz-789"` |
| Consultation | `ConsultationService.start()` | `correlationId: "consultation-def-456"` |

**Propagation:**
- Correlation ID is passed through all subsequent events in the workflow
- Causation ID links child events to parent events
- All logs, metrics, and traces include correlation ID

---

## Rule 12: Events Are Retryable with Backoff

Event processing failures must not block the event stream.

| Failure Scenario | Retry Policy |
|------------------|--------------|
| Consumer timeout | Retry 3x with exponential backoff (1s, 2s, 4s) |
| Consumer 500 error | Retry 3x with exponential backoff |
| Consumer 400 error | Do not retry, send to DLQ |
| Consumer unavailable | Retry with jitter, max 5 minutes |
| DLQ depth > 100 | Alert operations team |

---

## Rule 13: Events Have Dead Letter Queue (DLQ)

Events that cannot be processed after retries go to DLQ.

| DLQ Event | Action |
|-----------|--------|
| Malformed payload | Alert, manual review |
| Unsupported version | Alert, version migration needed |
| Consumer bug | Fix consumer, replay from DLQ |
| Data inconsistency | Manual intervention, emit correction event |

---

## Rule 14: Events Are Auditable

Every event emission is logged for compliance and debugging.

| Audit Field | Value |
|-------------|-------|
| `eventId` | UUID of the event |
| `eventType` | Type of event |
| `occurredAt` | When it happened |
| `producer` | Who emitted it |
| `actor.id` | Who triggered it |
| `actor.role` | Role of the actor |
| `actor.ipAddress` | IP address |
| `correlationId` | Workflow grouping |

---

## Rule 15: Events Are Monitored

Event stream health is monitored with metrics and alerts.

| Metric | Alert Threshold |
|--------|-----------------|
| Event publishing latency | >500ms |
| Event processing latency | >1s |
| DLQ depth | >100 events |
| Event delivery failure rate | >0.1% |
| Outbox backlog | >1000 events |

---

## Event Naming Anti-Patterns

| Anti-Pattern | Example | Problem | Correct |
|--------------|---------|---------|---------|
| Abbreviations | `pt.crt` | Unclear meaning | `patient.created` |
| Mixed tenses | `patient.create` | Not a fact | `patient.created` |
| Commands | `create.patient` | Event, not command | `patient.created` |
| Requests | `notify.patient` | Event, not request | `notification.sent` |
| Questions | `patient.exists` | Not a fact | N/A |
| Negatives | `patient.not.deleted` | Confusing | `patient.deleted` (if it happens) |
| Multiple facts | `patient.created_and_emailed` | Not focused | `patient.created` + `notification.sent` |

---

## Event Size Limits

| Limit | Value | Reason |
|-------|-------|--------|
| Max payload size | 10KB | Prevents bloated events |
| Max nesting depth | 2 levels | Keeps payloads flat |
| Max array length | 100 items | Prevents unbounded arrays |
| Max string length | 1000 chars | Prevents abuse |

**If you need more:** Store data in the aggregate, emit a reference in the event.

---

## Event Schema Evolution Example

```typescript
// v1: Initial schema
interface PatientCreatedPayloadV1 {
  patientId: string;
  fileNumber: string;
  firstName: string;
  lastName: string;
  email: string;
}

// v1.1: Added optional phone field
interface PatientCreatedPayloadV1_1 {
  patientId: string;
  fileNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string; // NEW: optional
}

// v2.0: Renamed firstName to givenName (breaking)
interface PatientCreatedPayloadV2 {
  patientId: string;
  fileNumber: string;
  givenName: string; // RENAMED from firstName
  lastName: string;
  email: string;
}

// Consumer handles all versions
function handlePatientCreated(event: DomainEvent<any>) {
  const { patientId, fileNumber } = event.payload;
  let firstName: string;
  
  if (event.version >= 2) {
    firstName = event.payload.givenName;
  } else {
    firstName = event.payload.firstName;
  }
  
  // Process...
}
```

---

## Event Testing Requirements

| Test Type | Requirement |
|-----------|-------------|
| Unit test | Verify event emitted with correct payload |
| Integration test | Verify event delivered to consumer |
| Contract test | Verify payload matches schema |
| Performance test | Verify event throughput >1000/sec |
| Chaos test | Verify system survives event bus failure |

---

## Event Documentation Requirements

Every event must have:
1. **Name:** Dot-separated domain action
2. **Description:** What happened and why
3. **Payload schema:** TypeScript interface or JSON Schema
4. **Producer:** Which aggregate/service emits it
5. **Consumers:** Which services subscribe to it
6. **Frequency:** How often it occurs
7. **Size:** Typical payload size
8. **Retention:** How long it's kept
9. **Examples:** Sample event JSON

**Location:** `02-event-catalog/event-catalog.md`
