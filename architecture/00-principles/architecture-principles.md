# Architecture Principles

**Purpose:** These principles govern every architectural decision in the Nairobi Sculpt Hospital Management System. They are immutable unless formally amended.

---

## 1. Business Requirements First

Every architectural decision must trace back to a business requirement. If we cannot answer "why does this exist?" in business terms, the feature does not exist.

**Application:**
- Before adding a field to a schema, document the business rule it enforces
- Before adding an API endpoint, document the user story it serves
- Before adding an agent, document the decision it automates

---

## 2. Events Are the Source of Truth

The event stream is the system's memory of what happened. The database is a projection of that stream.

**Application:**
- Every significant state change MUST produce an event
- Events are immutable — they cannot be updated or deleted
- Events are the integration layer between modules
- The database is optimized for queries; the event stream is optimized for coordination

---

## 3. Aggregates Own Their State

Only the aggregate that owns a piece of data may modify it. No external service may bypass the aggregate to update state.

**Application:**
- Only `Patient` aggregate may create/update/delete patient records
- Only `Appointment` aggregate may modify appointment state
- Agents may suggest actions but cannot directly modify aggregates
- All state changes go through the aggregate's public interface

---

## 4. Agents React, They Don't Own

Agents subscribe to events and react. They do not own business data. They do not make autonomous clinical decisions.

**Application:**
- Agents may read from any aggregate for context
- Agents may only write to aggregates they explicitly own
- Clinical decisions always require human approval
- Financial decisions always require human confirmation
- Agents emit `ai.*` events for their suggestions/actions

---

## 5. Correlation Over Causation

When debugging, we trace by correlation ID, not by stack trace. Distributed systems don't have stack traces.

**Application:**
- Every workflow generates a `correlationId` at the entry point
- All events in that workflow carry the same `correlationId`
- Every event that is caused by another event carries the `causationId` of the parent
- Logs, metrics, and traces all include `correlationId`

---

## 6. Immutability by Default

Events, audit logs, and medical records are immutable. If something changes, create a new event.

**Application:**
- Events are never updated or deleted
- Corrections are new events (e.g., `patient.record.corrected`)
- Audit logs append-only
- Medical records append-only with amendment events

---

## 7. Explicit Over Implicit

Business rules must be explicit in code, not hidden in comments, naming conventions, or database defaults.

**Application:**
- If a rule exists, it must be in the domain entity or use case
- If a rule is in a comment but not enforced, it is not a rule — it is a wish
- Database defaults are acceptable for timestamps, not for business logic
- Every "magic number" must be named and documented

---

## 8. Security by Design

Security is not an afterthought. Every entry point must authenticate, authorize, and audit.

**Application:**
- All API routes require authentication unless explicitly public
- Public routes (like intake form) validate sessions, not users
- Role-based access control at the route level
- Audit logs for every sensitive action
- IP whitelisting for sensitive operations (configurable)

---

## 9. Observability by Default

If we cannot measure it, we cannot improve it. Every workflow must emit events that can be measured.

**Application:**
- Every workflow step emits an event
- Every event has a standard envelope with `correlationId`
- Metrics are derived from events, not from separate instrumentation
- Dashboards are built on top of the event stream

---

## 10. Graceful Degradation

The system must remain functional when external services fail. Event consumers must handle missing or delayed events.

**Application:**
- Retry with exponential backoff
- Dead letter queue for failed events
- Circuit breakers for external dependencies
- Fallback UI states when real-time data is unavailable
- No single point of failure

---

## 11. Data Privacy & Compliance

Patient data is sensitive. Every piece of data must have a clear owner, retention policy, and access control.

**Application:**
- PII is encrypted at rest and in transit
- Access to patient data is logged
- Data retention policies are enforced
- Patients can request data export/deletion (GDPR)
- Consent is captured and audited for all data processing

---

## 12. Incremental Evolution

The architecture must support incremental improvement. We do not require big-bang rewrites.

**Application:**
- New features are added alongside old ones
- Old features are deprecated before removal
- Events enable new features without changing existing code
- Agents are added as new consumers of existing events
- The outbox pattern enables event publishing without disrupting existing workflows

---

## Anti-Patterns We Explicitly Reject

| Anti-Pattern | Why We Reject It | What We Do Instead |
|--------------|------------------|-------------------|
| Big-bang rewrites | High risk, long timelines, no value delivery | Incremental evolution via events |
| Tight coupling between modules | Changes ripple across the system | Event-driven communication |
| Shared databases between modules | Schema conflicts, hidden dependencies | Each module owns its data |
| Synchronous cross-module calls | Cascading failures, tight coupling | Async events with eventual consistency |
| Agents that own data | Violates aggregate boundaries | Agents react to events, suggest actions |
| Fire-and-forget events | Data loss, no accountability | Outbox pattern with retry + DLQ |
| Multiple events for the same thing | Inconsistent consumers, hard to debug | Single event, multiple consumers |

---

## Architectural Decision Records (ADRs)

Every significant architectural decision should be documented as an ADR:

```markdown
# ADR-001: Event Envelope Format

## Status
Accepted

## Context
We need a standardized format for events to enable uniform tracing, audit, and agent consumption.

## Decision
All events will use the standardized DomainEvent envelope with correlationId, causationId, and typed payload.

## Consequences
- All new events must implement the envelope
- Existing events must be migrated
- Agent developers have a consistent interface
- Debugging is simplified via correlationId tracing
```

---

## Review Cycle

These principles should be reviewed quarterly by the architecture team. Amendments require:
1. Written proposal
2. Architecture team approval
3. Documentation update
4. Communication to all engineering teams
