# Phase 1: Event Infrastructure

**Duration:** 4-6 weeks
**Goal:** Replace polling with events, implement outbox pattern, enable real-time frontdesk notifications

---

## Objectives

1. Implement outbox pattern for all domain events
2. Build event bus infrastructure
3. Replace 4-second polling with event-driven notifications
4. Enable real-time frontdesk awareness of intake submissions

---

## Deliverables

### 1.1 Outbox Table and Pattern

**File:** `prisma/migrations/XXX_add_outbox_table.sql`

```sql
CREATE TABLE outbox_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    processed_at TIMESTAMP,
    idempotency_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outbox_status_created ON outbox_event(status, created_at);
CREATE INDEX idx_outbox_type ON outbox_event(type);
```

**Implementation:**
- `OutboxEventRepository` — persists events within the same transaction as the aggregate
- `OutboxPublisher` — publishes pending events to the event bus
- `OutboxProcessor` — background job that publishes and marks as processed

### 1.2 Event Bus

**Technology Selection:**
- **Option A:** PostgreSQL LISTEN/NOTIFY (simple, no external dependency)
- **Option B:** Redis Pub/Sub (fast, simple)
- **Option C:** Kafka (production-grade, more complex)
- **Recommendation:** Start with Redis Pub/Sub for Phase 1, migrate to Kafka in Phase 3

**Implementation:**
- `EventBus` interface with `publish(event)` and `subscribe(eventType, handler)`
- `RedisEventBus` implementation
- Event serialization/deserialization using the standardized envelope
- Idempotency via `eventId`

### 1.3 Event Emission Points

**Priority 1 (Must Have):**
| Event | Producer | Trigger |
|-------|----------|---------|
| `intake.session.created` | `StartPatientIntakeUseCase` | Session created |
| `intake.submission.created` | `SubmitPatientIntakeUseCase` | Submission persisted |
| `intake.session.submitted` | `SubmitPatientIntakeUseCase` | Session marked submitted |
| `intake.confirmed` | `ConfirmPatientIntakeUseCase` | Intake confirmed |

**Priority 2 (Should Have):**
| Event | Producer | Trigger |
|-------|----------|---------|
| `patient.record.created` | `CreatePatientUseCase`, `ConfirmPatientIntakeUseCase` | Patient created |
| `intake.session.expired` | `GetIntakeSessionStatusUseCase` | Session auto-expired |

**Priority 3 (Nice to Have):**
| Event | Producer | Trigger |
|-------|----------|---------|
| `intake.session.opened` | `validateIntakeSessionAccess` | Form displayed |
| `intake.form.viewed` | `MobileIntakeForm` | Form rendered |

### 1.4 Replace Polling with Event-Driven Notifications

**Current Implementation:**
```
Frontdesk polls every 4 seconds
    ↓
GET /frontdesk/intake/[sessionId]/status
    ↓
Eventually sees SUBMITTED status
```

**Target Implementation:**
```
Patient submits form
    ↓
Outbox event: intake.submission.created
    ↓
Event bus publishes
    ↓
Frontdesk UI receives via WebSocket/SSE
    ↓
Immediate notification
```

**Implementation Steps:**
1. Add WebSocket/Server-Sent Events endpoint for frontdesk
2. Frontdesk UI subscribes to `intake.submission.created` events
3. Remove 4-second polling from `StartIntakePage`
4. Add event-driven toast notification for new submissions

### 1.5 Event Storage and Replay

**Requirements:**
- Events stored in `outbox_event` table for replay
- Events published to Redis for real-time consumption
- Dead letter queue for failed publications
- Retry with exponential backoff (max 5 retries)

---

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Frontdesk notification latency | <1 second | Time from submission to frontdesk alert |
| Polling requests eliminated | 100% | Zero GET /status requests from StartIntakePage |
| Event delivery success rate | >99.9% | Events published / Events attempted |
| Outbox processing latency | <500ms | Time from transaction commit to event published |

---

## Dependencies

| Dependency | Status | Owner |
|------------|--------|-------|
| Redis infrastructure | Not started | DevOps |
| WebSocket/SSE infrastructure | Not started | Frontend |
| Outbox table migration | Not started | Backend |

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Redis not available | Low | High | Fallback to PostgreSQL LISTEN/NOTIFY |
| Event ordering issues | Medium | Medium | Partition by aggregateId |
| Duplicate event delivery | Low | Low | Idempotency via eventId |
| Performance degradation | Low | Medium | Load test before production |

---

## Out of Scope for Phase 1

- Agent implementation (Phase 3)
- Event sourcing / state rebuilding (Phase 2+)
- Complex event processing / sagas (Phase 2+)
- Kafka migration (Phase 3)
- Analytics pipeline (Phase 3)

---

## Next Steps

1. [ ] Review and approve architecture principles
2. [ ] Select event bus technology (Redis vs Kafka)
3. [ ] Create outbox table migration
4. [ ] Implement OutboxEventRepository
5. [ ] Implement EventBus interface + Redis implementation
6. [ ] Add event emission to intake use cases
7. [ ] Implement WebSocket endpoint for frontdesk
8. [ ] Replace polling with event subscription
9. [ ] Load test event throughput
10. [ ] Deploy to staging and validate
