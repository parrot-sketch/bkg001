# Roadmap — Event-Driven Clinical Operating System

**Vision:** Transform Nairobi Sculpt from a traditional Hospital Management System into an event-driven clinical operating system where deterministic workflows orchestrate patient care, and AI agents augment human decision-making.

**Principles:**
- Events are the heartbeat of the clinic
- Workflows orchestrate what should happen next
- Agents react to events, they don't own data
- The database records facts; the event stream coordinates action

---

## Phase 0: Architecture Freeze

**Duration:** 1-2 weeks
**Goal:** Establish the architectural foundation before writing any production code

### Deliverables
- [ ] Approve architecture principles (`00-principles/architecture-principles.md`)
- [ ] Approve ubiquitous language (`00-principles/ubiquitous-language.md`)
- [ ] Approve context map (`00-principles/context-map.md`)
- [ ] Approve aggregate diagrams (`00-principles/aggregate-diagrams.md`)
- [ ] Approve event design rules (`00-principles/event-design-rules.md`)
- [ ] Approve event envelope (`02-event-catalog/event-envelope.md`)
- [ ] Approve domain capability map (`02-event-catalog/domain-capability-map.md`)
- [ ] Approve event ownership matrix (`02-event-catalog/event-ownership.md`)
- [ ] Approve event catalog (`02-event-catalog/event-catalog.md`)
- [ ] Approve agent responsibility matrix (`04-agent-platform/agent-responsibility-matrix.md`)
- [ ] Complete current-state audits for all core domains (see Phase 1)

### Success Criteria
- All architectural documents reviewed and approved by stakeholders
- No implementation work begins without approved architecture
- All engineers have read and understand the principles

---

## Phase 1: Domain Discovery

**Duration:** 3-4 weeks
**Goal:** Complete reverse-engineering audits of all core domains

### Deliverables
For each domain, produce the complete Current State Audit (15 deliverables):

- [ ] Appointments (`01-current-state/appointments.md`)
- [ ] Queue Management (`01-current-state/queue.md`)
- [ ] Consultation (`01-current-state/consultation.md`)
- [ ] Billing & Payments (`01-current-state/billing.md`)
- [ ] Surgical Management (`01-current-state/surgical.md`)
- [ ] Clinical Documentation (`01-current-state/clinical.md`)
- [ ] Inventory & Procurement (`01-current-state/inventory.md`)
- [ ] Communications & Notifications (`01-current-state/communications.md`)

For each domain, also produce:

- [ ] Business Intent Map (`03-workflows/[domain].md`)
- [ ] Decision Point Inventory (`03-workflows/[domain].md`)
- [ ] Event Candidate Matrix (`02-event-catalog/event-catalog.md`)

### Success Criteria
- Every core business process documented
- Every decision point identified and classified
- Every event candidate identified and categorized
- Business stakeholders validate documentation accuracy

---

## Phase 2: Domain Event Design

**Duration:** 2-3 weeks
**Goal:** Finalize event schema, ownership, and contracts

### Deliverables
- [ ] Finalize event catalog with domain expert review
- [ ] Finalize event ownership matrix
- [ ] Define event payload schemas (JSON Schema or TypeScript types)
- [ ] Define event versioning strategy
- [ ] Define correlation ID propagation rules
- [ ] Define dead letter queue strategy
- [ ] Define event retention policy
- [ ] Create event design rules document (`00-principles/event-design-rules.md`)
- [ ] Create aggregate diagrams (`00-principles/aggregate-diagrams.md`)

### Success Criteria
- Every event has a defined payload schema
- Every event has a single owner
- Event naming conventions are enforced
- Event versioning strategy is documented
- All stakeholders agree on event contracts

---

## Phase 3: Event Infrastructure

**Duration:** 4-6 weeks
**Goal:** Build the event platform that replaces polling and enables real-time coordination

### Deliverables
- [ ] Implement outbox table and pattern
- [ ] Define `EventPublisher` and `EventSubscriber` interfaces
- [ ] Implement `LocalEventBus` (in-memory, for testing)
- [ ] Implement `PostgresEventBus` (using LISTEN/NOTIFY)
- [ ] Implement `RedisEventBus` (production)
- [ ] Implement event serialization/deserialization
- [ ] Implement idempotency via `eventId`
- [ ] Implement dead letter queue
- [ ] Implement retry with exponential backoff
- [ ] Emit Tier 1 events only (see Event Tiering below)
- [ ] Replace 4-second polling with event-driven notifications
- [ ] Implement WebSocket/SSE endpoint for frontdesk real-time updates
- [ ] Load test event throughput
- [ ] Deploy to staging and validate

### Event Tiering for Phase 3

**Tier 1: Critical Workflow Events (Must Have)**
These events are required for core workflow coordination:

| Event | Producer | Consumer |
|-------|----------|----------|
| `intake.session.created` | StartPatientIntakeUseCase | Frontdesk UI |
| `intake.submission.created` | SubmitPatientIntakeUseCase | Frontdesk Notification |
| `intake.confirmed` | ConfirmPatientIntakeUseCase | Appointment Service |
| `patient.record.created` | CreatePatientUseCase | All downstream |
| `appointment.created` | ScheduleAppointmentUseCase | Queue, Notifications |
| `appointment.confirmed` | Appointment Service | Queue, Reminders |
| `patient.checked_in` | CheckInPatientUseCase | Queue, Consultation |
| `queue.assigned` | Queue Management | Frontdesk UI, Doctor |
| `consultation.started` | Consultation Service | Clinical, Timer |
| `consultation.completed` | Consultation Service | Billing, Follow-up |
| `payment.received` | Payment Service | Billing, Analytics |
| `invoice.created` | Billing Service | Patient, Notifications |

**Tier 2: Analytics Events (Should Have)**
Emitted after Tier 1 is stable:

| Event | Producer | Consumer |
|-------|----------|----------|
| `intake.form.viewed` | MobileIntakeForm | Analytics |
| `intake.form.step.completed` | MobileIntakeForm | Analytics |
| `appointment.cancelled` | Appointment Service | Analytics |
| `appointment.rescheduled` | Appointment Service | Analytics |
| `queue.called` | Queue Management | Analytics |
| `queue.removed` | Queue Management | Analytics |

**Tier 3: Observability Events (Nice to Have)**
Emitted after Tier 2 is stable:

| Event | Producer | Consumer |
|-------|----------|----------|
| `audit.recorded` | Audit Service | Compliance |
| `notification.sent` | Notification Service | Analytics |
| `notification.delivered` | Notification Service | Analytics |
| `user.logged_in` | Auth Service | Security |
| `user.logged_out` | Auth Service | Security |

### Success Criteria
| Metric | Target |
|--------|--------|
| Frontdesk notification latency | <1 second (was 4 seconds) |
| Polling requests eliminated | 100% for intake status |
| Event delivery success rate | >99.9% |
| Outbox processing latency | <500ms |
| System remains functional if event bus is down | Yes (graceful degradation) |

---

## Phase 4: Workflow Engine

**Duration:** 6-8 weeks
**Goal:** Replace ad-hoc orchestration with deterministic workflow definitions

### Architecture

```
Appointment Booked
    ↓
Event Bus
    ↓
Workflow Engine
    ↓
Determine workflow
    ↓
Execute steps
    ↓
Rules
    ↓
Need intelligence?
    ↓
Agent
    ↓
Workflow continues
    ↓
Emit next event
```

### Deliverables
- [ ] Define workflow definition language (YAML or JSON)
- [ ] Implement `WorkflowEngine` core
- [ ] Implement step executors (rules, agents, integrations)
- [ ] Implement workflow persistence (state machine storage)
- [ ] Implement workflow monitoring and debugging
- [ ] Migrate Appointment workflow to workflow engine
- [ ] Migrate Intake confirmation workflow to workflow engine
- [ ] Migrate Queue management workflow to workflow engine
- [ ] Migrate Consultation workflow to workflow engine
- [ ] Migrate Billing workflow to workflow engine

### Workflow Example: Appointment Booked

```yaml
workflow: appointment.booked
trigger: appointment.confirmed
steps:
  - name: notify_patient
    type: notification
    channel: sms
    template: appointment_confirmed
  - name: reserve_room
    type: rule
    rule: appointment_room_allocation
  - name: prepare_equipment
    type: rule
    rule: equipment_check
  - name: verify_payment
    type: rule
    rule: payment_verification
  - name: prepare_consent
    type: agent
    agent: ConsentAgent
    condition: surgical_case_exists
  - name: check_inventory
    type: rule
    rule: inventory_check
  - name: generate_reminder
    type: agent
    agent: ReminderAgent
    schedule: 24h_before
  - name: schedule_followup
    type: agent
    agent: SchedulingAgent
    condition: consultation_completed
```

### Success Criteria
- Workflow steps are declarative, not imperative
- Workflow execution is auditable (every step emits an event)
- Workflow failures are retried with backoff
- Workflow state is recoverable after restart
- Deterministic steps execute without AI
- AI steps are explicitly marked and isolated

---

## Phase 5: Agents

**Duration:** 8-12 weeks
**Goal:** Introduce rule-based and assisted intelligence agents

### Agent Maturity Levels

| Level | Description | Example | Phase |
|-------|-------------|---------|-------|
| Level 0: No Agent | Fully deterministic | IntakeSession expiry | Phase 3 |
| Level 1: Rule-Based | Deterministic rules, no ML | IntakeQualityAgent (completeness) | Phase 5 |
| Level 2: Assisted Intelligence | AI suggests, human decides | IntakeDuplicateAgent | Phase 5 |
| Level 3: Autonomous | AI decides, human reviews | SchedulingAgent | Phase 6 |
| Level 4: Fully Autonomous | AI decides and acts | ReminderAgent | Phase 6 |

### Phase 5 Agents (Level 1-2)

| Agent | Purpose | Events Watched | Events Produced |
|-------|---------|----------------|-----------------|
| IntakeQualityAgent | Validate submission completeness | `intake.submission.created` | `anomaly.flagged` |
| IntakeDuplicateAgent | Detect potential duplicates | `intake.submission.created` | `duplicate.patient.detected` |
| SchedulingAgent | Suggest appointment slots | `patient.record.created`, `consultation.completed` | `appointment.suggested` |
| ReminderAgent | Send appointment reminders | `appointment.confirmed` | `reminder.sent` |
| QueueManagementAgent | Optimize queue order | `patient.checked_in`, `queue.*` | `queue.assigned`, `queue.called` |
| BillingAgent | Generate invoices | `consultation.completed`, `procedure.completed` | `invoice.created` |

### Success Criteria
- Agents are isolated from core business logic
- Agents only emit events, they don't modify state directly
- All agent decisions are auditable via events
- Agent failures don't block workflow execution
- Human-in-the-loop for all clinical/financial decisions

---

## Phase 6: LLM-Powered Agents

**Duration:** 12+ weeks
**Goal:** Introduce large language model capabilities for complex reasoning

### LLM Agent Opportunities

| Agent | Purpose | LLM Use Case | Confidence |
|-------|---------|--------------|------------|
| ConsentAgent | Simplify consent forms | Summarize legal language into plain language | High |
| ClinicalDocumentationAgent | Draft clinical notes | Generate note drafts from consultation context | Medium |
| ConsultationAssistantAgent | Clinical decision support | Suggest diagnoses, drug interactions | Medium |
| FraudDetectionAgent | Detect unusual patterns | Anomaly detection in billing/appointments | Medium |
| PatientCommunicationAgent | Handle patient queries | Chatbot for FAQ, appointment status | High |

### LLM Safety Guardrails
- All LLM outputs are suggestions, not actions
- Clinical outputs require doctor sign-off
- Financial outputs require cashier sign-off
- All LLM interactions are logged for audit
- LLM prompts are versioned and reviewed

### Success Criteria
- LLM agents are additive, not disruptive
- All LLM suggestions are clearly marked as AI-generated
- Doctors can accept/reject/modify suggestions
- Patient-facing LLM features are opt-in
- LLM costs are tracked and budgeted

---

## Phased Rollout Strategy

### Week 1-2: Phase 0
- Finalize all architecture documents
- Get stakeholder approval
- Set up development environment

### Week 3-6: Phase 1
- Complete domain audits for Appointments, Queue, Consultation
- Identify all event candidates
- Map all decision points

### Week 7-9: Phase 2
- Finalize event schemas
- Get domain expert sign-off
- Prepare migration scripts

### Week 10-15: Phase 3
- Implement outbox pattern
- Implement event bus
- Emit Tier 1 events
- Replace polling with events
- Deploy to staging

### Week 16-23: Phase 4
- Build workflow engine
- Migrate Appointment workflow
- Migrate Queue workflow
- Migrate Consultation workflow
- Deploy to production

### Week 24-35: Phase 5
- Build rule-based agents
- Integrate agents with workflow engine
- Deploy Intake, Scheduling, Queue agents
- Monitor and tune

### Week 36+: Phase 6
- Evaluate LLM opportunities
- Build ConsentAgent, ClinicalDocAgent
- Implement guardrails and audit
- Gradual rollout with human-in-the-loop

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Architecture changes mid-project | Medium | High | Phase 0 freeze, change control process |
| Event schema evolution breaks consumers | Medium | Medium | Versioned events, backward compatibility |
| Workflow engine too complex | Medium | High | Start simple, iterate based on real usage |
| Agent decisions cause clinical errors | Low | Critical | Human-in-the-loop, audit trails, gradual rollout |
| Performance degradation from events | Low | Medium | Load testing, async processing, backpressure |
| Team resistance to new architecture | Medium | Medium | Training, incremental adoption, show value early |

---

## Success Metrics

| Metric | Phase 3 Target | Phase 4 Target | Phase 5 Target | Phase 6 Target |
|--------|----------------|----------------|----------------|----------------|
| Frontdesk notification latency | <1s | <1s | <1s | <1s |
| Workflow automation rate | N/A | 50% | 70% | 80% |
| Agent-assisted decisions | N/A | N/A | 30% | 50% |
| LLM-assisted decisions | N/A | N/A | N/A | 20% |
| System availability | 99.5% | 99.5% | 99.5% | 99.5% |
| Event delivery success | >99.9% | >99.9% | >99.9% | >99.9% |
