# Agent Responsibility Matrix

**Purpose:** This document defines the responsibility boundaries for all agents in the system. It prevents overlap, defines clear read/write permissions, and ensures every agent has a single, well-defined purpose.

**How to Read:**
- **Agent Name:** The identifier for the agent
- **Watches:** Which event patterns this agent subscribes to
- **May Read:** Which aggregates/entities this agent can query
- **May Write:** Which aggregates/entities this agent can modify
- **Purpose:** What the agent does

**Golden Rule:** Agents do not own business data. They react to events. They may suggest actions, but humans (or deterministic services) execute them.

---

## Agent Catalog

### Intake Agents

| Agent | Watches | May Read | May Write | Purpose |
|-------|---------|----------|-----------|---------|
| **IntakeSessionAgent** | `intake.session.*`, `intake.form.*` | IntakeSession, IntakeSubmission, Patient | None | Manages session lifecycle, auto-expiry, cleanup of abandoned sessions |
| **IntakeNotificationAgent** | `intake.submission.created`, `intake.session.expired` | IntakeSession, IntakeSubmission, User | Notification | Notifies frontdesk when submission arrives; notifies patient if session expires |
| **IntakeQualityAgent** | `intake.submission.created` | IntakeSubmission, Patient | None | Validates submission completeness, flags anomalies for frontdesk review |
| **IntakeDuplicateAgent** | `intake.submission.created` | IntakeSubmission, Patient | None | Compares new submissions against existing patients using fuzzy matching |

### Scheduling Agents

| Agent | Watches | May Read | May Write | Purpose |
|-------|---------|----------|-----------|---------|
| **SchedulingAgent** | `patient.record.created`, `consultation.completed` | Patient, Doctor, Appointment, AvailabilityTemplate | Appointment | Suggests and schedules follow-up appointments based on clinical need |
| **ReminderAgent** | `appointment.confirmed`, `appointment.scheduled` | Appointment, Patient, User | Notification | Sends appointment reminders via SMS/WhatsApp/Email at configurable intervals |
| **TheaterBookingAgent** | `surgical.case.ready_for_scheduling` | SurgicalCase, Theater, TheaterBooking, Doctor | TheaterBooking | Proposes theater slots based on case urgency, surgeon availability, and theater capacity |

### Queue Agents

| Agent | Watches | May Read | May Write | Purpose |
|-------|---------|----------|-----------|---------|
| **QueueManagementAgent** | `patient.checked_in`, `appointment.confirmed`, `queue.*` | PatientQueue, Appointment, Doctor | PatientQueue | Optimizes queue order based on urgency, appointment time, and doctor availability |
| **QueueNotificationAgent** | `queue.called`, `queue.assigned` | PatientQueue, Patient, User | Notification | Notifies patients when they are called or when queue position changes |

### Consultation Agents

| Agent | Watches | May Read | May Write | Purpose |
|-------|---------|----------|-----------|---------|
| **ConsultationAssistantAgent** | `consultation.started` | Consultation, Patient, MedicalRecord, ClinicalNote | ClinicalNote, MedicalRecord | Suggests relevant medical history, drug interactions, and clinical guidelines during consultation |
| **ConsultationFollowUpAgent** | `consultation.completed` | Consultation, Patient, Appointment | Appointment | Suggests follow-up appointments and care plans based on consultation outcome |

### Clinical Agents

| Agent | Watches | May Read | May Write | Purpose |
|-------|---------|----------|-----------|---------|
| **ClinicalDocumentationAgent** | `consultation.started`, `vital.signs.recorded` | Consultation, VitalSign, ClinicalNote | ClinicalNote | Auto-generates clinical note drafts from consultation context and vital signs |
| **ConsentAgent** | `case.plan.ready` | CasePlan, ConsentTemplate, Patient | ConsentForm | Generates consent forms, tracks signing status, identifies missing consents |
| **LabResultsAgent** | `lab.test.completed` | LabTest, Patient, MedicalRecord | MedicalRecord | Correlates lab results with diagnoses, flags abnormal results for doctor review |

### Billing Agents

| Agent | Watches | May Read | May Write | Purpose |
|-------|---------|----------|-----------|---------|
| **BillingAgent** | `consultation.completed`, `procedure.completed` | Consultation, SurgicalCase, Service, Payment | Payment, PatientBill | Generates invoices based on services rendered, applies insurance if available |
| **PaymentReconciliationAgent** | `payment.received`, `invoice.created` | Payment, Invoice, Patient | None | Reconciles payments with invoices, flags discrepancies |
| **InsuranceAgent** | `invoice.created`, `patient.record.created` | Patient, Payment, InsuranceProvider | Payment | Verifies insurance eligibility, submits claims, tracks reimbursements |

### Inventory Agents

| Agent | Watches | May Read | May Write | Purpose |
|-------|---------|----------|-----------|---------|
| **InventoryForecastAgent** | `inventory.usage.recorded`, `goods.receipt.created` | InventoryItem, InventoryUsage, GoodsReceipt | None | Predicts stock depletion, suggests reorder points |
| **ProcurementAgent** | `inventory.item.adjusted` | InventoryItem, PurchaseOrder, Vendor | PurchaseOrder | Creates purchase orders when stock falls below reorder point |

### Notification Agents

| Agent | Watches | May Read | May Write | Purpose |
|-------|---------|----------|-----------|---------|
| **NotificationRouterAgent** | `notification.*` | Notification, User, Patient | None | Routes notifications to appropriate channels (SMS, Email, WhatsApp, Push) |
| **FollowUpAgent** | `appointment.completed`, `consultation.completed` | Appointment, Patient, User | Notification | Sends post-appointment follow-up messages and satisfaction surveys |

### Analytics Agents

| Agent | Watches | May Read | May Write | Purpose |
|-------|---------|----------|-----------|---------|
| **AnalyticsAgent** | `*` (all events) | All aggregates | None | Computes real-time analytics, dashboards, KPIs |
| **FraudDetectionAgent** | `payment.received`, `patient.record.created` | Payment, Patient, Appointment | None | Detects unusual patterns (e.g., duplicate billing, fake appointments) |

### Security & Compliance Agents

| Agent | Watches | May Read | May Write | Purpose |
|-------|---------|----------|-----------|---------|
| **SecurityAgent** | `user.logged_in`, `user.token.refreshed`, `data.accessed` | User, AuditLog, RefreshToken | None | Detects suspicious login patterns, unauthorized access |
| **ComplianceAgent** | `audit.recorded`, `consent.signed`, `data.exported` | AuditLog, ConsentForm, Patient | None | Ensures compliance with healthcare regulations (HIPAA, KMPDC) |

---

## Agent Interaction Rules

### Read Patterns
- Agents may query any aggregate for context, but must not cache sensitive data indefinitely
- All reads must be auditable
- Agents must respect data retention policies

### Write Patterns
- Agents may only write to aggregates they own
- Agents may suggest actions but cannot execute clinical decisions without human approval
- Financial actions (invoices, payments) require human confirmation

### Event Consumption
- Agents must handle events idempotently
- Agents must handle schema evolution gracefully
- Agents must not block the event stream

---

## Agent Deployment Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    Event Bus / Message Broker                │
│  (Kafka / RabbitMQ / AWS EventBridge / GCP Pub/Sub)         │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐           ┌────▼────┐          ┌────▼────┐
   │  Queue  │           │  Stream │          │  Dead   │
   │  Topic  │           │  Topic  │          │  Letter │
   └────┬────┘           └────┬────┘          └─────────┘
        │                     │
        └─────────────────────┼─────────────────────┐
                              │                     │
                    ┌─────────▼─────────┐   ┌──────▼──────┐
                    │   Agent Host      │   │   Agent     │
                    │   (K8s Pod)       │   │   Host      │
                    │                   │   │  (Scale)    │
                    │  ┌─────────────┐  │   │             │
                    │  │ Intake Agent │  │   │ ┌─────────┐ │
                    │  └─────────────┘  │   │ │Sched.   │ │
                    │  ┌─────────────┐  │   │ │Agent    │ │
                    │  │ Queue Agent │  │   │ └─────────┘ │
                    │  └─────────────┘  │   │ ┌─────────┐ │
                    │  ┌─────────────┐  │   │ │Billing  │ │
                    │  │Billing Agent│  │   │ │Agent    │ │
                    │  └─────────────┘  │   │ └─────────┘ │
                    └───────────────────┘   └─────────────┘
```

---

## Agent Maturity Levels

| Level | Description | Example |
|-------|-------------|---------|
| **Level 0: No Agent** | Fully deterministic, no AI | IntakeSession expiry, file number generation |
| **Level 1: Rule-Based Agent** | Deterministic rules, no ML | IntakeQualityAgent (completeness check) |
| **Level 2: Assisted Intelligence** | AI suggests, human decides | IntakeDuplicateAgent (suggests matches) |
| **Level 3: Autonomous Agent** | AI decides, human reviews | SchedulingAgent (proposes, frontdesk confirms) |
| **Level 4: Fully Autonomous** | AI decides and acts without human | ReminderAgent (sends reminders automatically) |

**Current System:** Mostly Level 0. Some Level 1 in validation logic.

**Target:** Gradual introduction of Level 2-3 for non-clinical decisions. Level 4 only for non-critical notifications.

---

## Open Questions

1. **Agent Isolation:** Should agents run in separate containers/namespaces? Yes, for security and scalability.
2. **Agent Communication:** Should agents communicate directly, or only via events? **Answer: Only via events.** Direct communication creates coupling.
3. **Agent Failure:** What happens when an agent is down? Events should queue and be processed when agent recovers.
4. **Agent Monitoring:** How do we know agents are working? Each agent should emit `agent.*` events for health monitoring.
5. **Agent Deployment:** Which agents are critical vs optional? Intake and Scheduling are critical. Analytics is optional.
