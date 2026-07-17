# Context Map

**Purpose:** This document defines the bounded contexts of the Nairobi Sculpt Hospital Management System, their relationships, and the translation layers between them. It is the primary tool for understanding module boundaries and integration points.

**How to Read:**
- Each box is a bounded context (a domain)
- Arrows show dependency direction (publishes →)
- Lines show integration points
- Upstream contexts publish events; downstream contexts consume them

---

## High-Level Context Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Nairobi Sculpt Clinical OS                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐         ┌──────────────────┐                │
│  │ Patient Intake   │────────▶│ Patient Registry │                │
│  │                  │         │                  │                │
│  │ Owns:            │         │ Owns:            │                │
│  │ - IntakeSession  │         │ - Patient        │                │
│  │ - IntakeSubmission│        │ - User           │                │
│  │                  │         │                  │                │
│  │ Produces:        │         │ Produces:        │                │
│  │ - intake.*       │         │ - patient.*      │                │
│  │                  │         │                  │                │
│  └──────────────────┘         └────────┬─────────┘                │
│                                        │ publishes                 │
│                                        ▼                            │
│  ┌──────────────────────────────────────────────────────┐          │
│  │                     Appointment                      │          │
│  │                                                      │          │
│  │  Owns:                                               │          │
│  │  - Appointment                                       │          │
│  │  - AppointmentStatus                                 │          │
│  │                                                      │          │
│  │  Produces:                                           │          │
│  │  - appointment.created                               │          │
│  │  - appointment.confirmed                             │          │
│  │  - patient.checked_in                                │          │
│  │                                                      │          │
│  └──────────────────────────┬───────────────────────────┘          │
│                             │ publishes                             │
│                             ▼                                        │
│  ┌──────────────────────────────────────────────────────┐          │
│  │                      Queue Management                 │          │
│  │                                                      │          │
│  │  Owns:                                               │          │
│  │  - PatientQueue                                      │          │
│  │                                                      │          │
│  │  Produces:                                           │          │
│  │  - queue.assigned                                    │          │
│  │  - queue.called                                      │          │
│  │                                                      │          │
│  └──────────────────────────┬───────────────────────────┘          │
│                             │ publishes                             │
│                             ▼                                        │
│  ┌──────────────────────────────────────────────────────┐          │
│  │                     Consultation                      │          │
│  │                                                      │          │
│  │  Owns:                                               │          │
│  │  - Consultation                                      │          │
│  │  - DoctorConsultation                                │          │
│  │                                                      │          │
│  │  Produces:                                           │          │
│  │  - consultation.started                              │          │
│  │  - consultation.completed                            │          │
│  │                                                      │          │
│  └──────────────────────────┬───────────────────────────┘          │
│                             │ publishes                             │
│                             ▼                                        │
│  ┌──────────────────────────────────────────────────────┐          │
│  │                     Clinical Domain                   │          │
│  │                                                      │          │
│  │  Owns:                                               │          │
│  │  - VitalSign                                         │          │
│  │  - ClinicalNote                                      │          │
│  │  - MedicalRecord                                     │          │
│  │  - Diagnosis                                         │          │
│  │  - LabTest                                           │          │
│  │  - CareNote                                          │          │
│  │                                                      │          │
│  │  Produces:                                           │          │
│  │  - vital.signs.recorded                              │          │
│  │  - clinical.note.created                             │          │
│  │  - medical.record.created                            │          │
│  │                                                      │          │
│  └──────────────────────────┬───────────────────────────┘          │
│                             │ publishes                             │
│                             ▼                                        │
│  ┌──────────────────────────────────────────────────────┐          │
│  │                     Billing Domain                    │          │
│  │                                                      │          │
│  │  Owns:                                               │          │
│  │  - Payment                                           │          │
│  │  - SurgicalBillingEstimate                           │          │
│  │                                                      │          │
│  │  Produces:                                           │          │
│  │  - invoice.created                                   │          │
│  │  - payment.received                                  │          │
│  │                                                      │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     Supporting Domains                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐         ┌──────────────────┐                │
│  │ Surgical Domain  │         │ Inventory Domain │                │
│  │                  │         │                  │                │
│  │ Owns:            │         │ Owns:            │                │
│  │ - SurgicalCase   │         │ - InventoryItem  │                │
│  │ - CasePlan       │         │ - GoodsReceipt   │                │
│  │ - ConsentForm    │         │ - PurchaseOrder  │                │
│  │ - TheaterBooking │         │                  │                │
│  │ - Checklist      │         │ Produces:        │                │
│  │                  │         │ - inventory.*    │                │
│  │ Produces:        │         │ - goods.receipt.*│                │
│  │ - surgical.*     │         │                  │                │
│  │ - consent.*      │         │                  │                │
│  │ - theater.*      │         │                  │                │
│  └──────────────────┘         └──────────────────┘                │
│                                                                     │
│  ┌──────────────────┐         ┌──────────────────┐                │
│  │ Notification     │         │ User & Auth      │                │
│  │ Domain           │         │ Domain           │                │
│  │                  │         │                  │                │
│  │ Owns:            │         │ Owns:            │                │
│  │ - Notification   │         │ - User           │                │
│  │                  │         │ - Role           │                │
│  │ Produces:        │         │ - RefreshToken   │                │
│  │ - notification.* │         │                  │                │
│  │ - reminder.*     │         │ Produces:        │                │
│  │                  │         │ - user.*         │                │
│  │                  │         │ - token.*        │                │
│  └──────────────────┘         └──────────────────┘                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Context Relationships

### Patient Intake → Patient Registry

| Aspect | Detail |
|--------|--------|
| **Relationship** | Upstream → Downstream |
| **Integration Pattern** | Event-driven (intake.confirmed → patient.record.created) |
| **Shared Model** | None — translation via event payload |
| **Translation** | IntakeSubmission fields → Patient fields |
| **Dependency** | Patient Registry depends on Intake for patient creation |

### Patient Registry → Appointment

| Aspect | Detail |
|--------|--------|
| **Relationship** | Upstream → Downstream |
| **Integration Pattern** | Event-driven (patient.record.created → appointment.created) |
| **Shared Model** | Patient ID, file number |
| **Translation** | Patient aggregate ID → Appointment.patientId |
| **Dependency** | Appointment depends on Patient |

### Appointment → Queue Management

| Aspect | Detail |
|--------|--------|
| **Relationship** | Upstream → Downstream |
| **Integration Pattern** | Event-driven (patient.checked_in → queue.assigned) |
| **Shared Model** | Appointment ID, Patient ID, Doctor ID |
| **Translation** | Appointment aggregate → PatientQueue aggregate |
| **Dependency** | Queue depends on Appointment for check-in events |

### Queue Management → Consultation

| Aspect | Detail |
|--------|--------|
| **Relationship** | Upstream → Downstream |
| **Integration Pattern** | Event-driven (queue.called → consultation.started) |
| **Shared Model** | Patient ID, Doctor ID, Queue ID |
| **Translation** | PatientQueue → Consultation aggregate |
| **Dependency** | Consultation depends on Queue for patient context |

### Consultation → Clinical Domain

| Aspect | Detail |
|--------|--------|
| **Relationship** | Upstream → Downstream |
| **Integration Pattern** | Event-driven (consultation.started → vital.signs.recorded) |
| **Shared Model** | Consultation ID, Patient ID, Doctor ID |
| **Translation** | Consultation context → Clinical aggregates |
| **Dependency** | Clinical domain depends on Consultation for context |

### Consultation → Billing

| Aspect | Detail |
|--------|--------|
| **Relationship** | Upstream → Downstream |
| **Integration Pattern** | Event-driven (consultation.completed → invoice.created) |
| **Shared Model** | Consultation ID, Patient ID, Doctor ID |
| **Translation** | Consultation services → Payment aggregate |
| **Dependency** | Billing depends on Consultation for billing triggers |

### Surgical Domain → Theater Booking

| Aspect | Detail |
|--------|--------|
| **Relationship** | Upstream → Downstream |
| **Integration Pattern** | Event-driven (surgical.case.ready_for_scheduling → theater.booked) |
| **Shared Model** | SurgicalCase ID, Doctor ID, Procedure details |
| **Translation** | SurgicalCase → TheaterBooking aggregate |
| **Dependency** | Theater Booking depends on Surgical Case readiness |

---

## Anti-Corruption Layers

| Context | Anti-Corruption Layer | Purpose |
|---------|----------------------|---------|
| Patient Intake → Patient Registry | IntakeSubmission → Patient mapper | Prevents Intake domain from leaking into Patient domain |
| Appointment → Queue | Appointment → PatientQueue translator | Ensures Queue domain owns its state |
| Consultation → Billing | Consultation → Payment mapper | Ensures Billing domain owns financial state |
| Surgical → Theater | SurgicalCase → TheaterBooking translator | Ensures Theater domain owns scheduling |

---

## Context Evolution

### Current State (Monolithic)
All contexts exist within a single codebase with shared database schema.

### Target State (Modular Monolith → Microservices)
```
Phase 1-3: Modular Monolith
- All contexts in single deployable unit
- Clear module boundaries within codebase
- Events enable loose coupling

Phase 4+: Microservices (if needed)
- Each context becomes a deployable service
- Events become the primary integration mechanism
- API Gateway for external access
```

---

## Open Questions

1. **Context Boundaries:** Should Inventory be its own context or part of Surgical? Current: separate. Possible: merge if tightly coupled.
2. **User Context:** Should User/Auth be a separate service from day one? Current: part of monolith. Possible: separate early for security.
3. **Notification Context:** Should Notifications be a separate service? Current: part of monolith. Possible: separate for scalability.
4. **Analytics Context:** Should Analytics be a separate read model? Current: none. Possible: separate read-optimized database.
