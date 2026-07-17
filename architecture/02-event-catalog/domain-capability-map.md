# Domain Capability Map

**Purpose:** This document is the north star of the platform. It maps every business capability to its owning domain, aggregate root, events produced, and events consumed. This becomes the single source of truth for understanding "who does what" in the system.

**How to Read:**
- **Domain:** Bounded context / business area
- **Capability:** What the domain does
- **Owner:** Which user role primarily operates this capability
- **Aggregate:** The root entity that enforces invariants
- **Events Produced:** What this capability publishes to the event stream
- **Events Consumed:** What this capability subscribes to from the event stream

---

## Patient Intake Domain

| Capability | Owner | Aggregate | Events Produced | Events Consumed |
|------------|-------|-----------|-----------------|-----------------|
| Intake Session Management | Frontdesk | IntakeSession | intake.session.created, intake.session.submitted, intake.session.confirmed, intake.session.expired | — |
| Intake Submission | Patient | IntakeSubmission | intake.submission.created, intake.submission.confirmed, intake.submission.rejected | intake.session.created |
| Patient Registry | Frontdesk | Patient | patient.record.created, patient.record.updated, patient.record.approved, patient.record.rejected | intake.confirmed |
| Patient Search | Frontdesk | Patient | frontdesk.patient.search.performed | — |
| File Number Generation | System | Patient | — | — |

## Patient Registry Domain

| Capability | Owner | Aggregate | Events Produced | Events Consumed |
|------------|-------|-----------|-----------------|-----------------|
| Patient Profile Management | Frontdesk | Patient | patient.record.created, patient.record.updated, patient.record.viewed | intake.confirmed |
| Patient Assignment | Doctor | DoctorPatientAssignment | patient.assigned, patient.discharged, patient.transferred | patient.record.created |
| Patient Queue Management | Frontdesk | PatientQueue | patient.queued, patient.called, patient.removed_from_queue | patient.record.created, patient.checked_in |

## Appointment Domain

| Capability | Owner | Aggregate | Events Produced | Events Consumed |
|------------|-------|-----------|-----------------|-----------------|
| Appointment Scheduling | Frontdesk | Appointment | appointment.created, appointment.scheduled, appointment.confirmed, appointment.cancelled, appointment.rescheduled | patient.record.created, doctor.available |
| Appointment Check-In | Frontdesk | Appointment | patient.checked_in | appointment.confirmed |
| Appointment Completion | Doctor | Appointment | appointment.completed | patient.checked_in, consultation.completed |
| Appointment Follow-Up | Doctor | Appointment | appointment.follow_up.created | appointment.completed |

## Consultation Domain

| Capability | Owner | Aggregate | Events Produced | Events Consumed |
|------------|-------|-----------|-----------------|-----------------|
| Consultation Request | Doctor | Consultation | consultation.requested, consultation.approved, consultation.declined | appointment.confirmed |
| Consultation Execution | Doctor | Consultation | consultation.started, consultation.ended, consultation.completed | patient.checked_in |
| Doctor Consultation | Doctor | DoctorConsultation | doctor.consultation.requested, doctor.consultation.resolved | consultation.started |

## Queue Management Domain

| Capability | Owner | Aggregate | Events Produced | Events Consumed |
|------------|-------|-----------|-----------------|-----------------|
| Queue Entry | Frontdesk | PatientQueue | patient.queued | patient.checked_in, appointment.confirmed |
| Queue Calling | Frontdesk | PatientQueue | patient.called | patient.queued |
| Queue Removal | Frontdesk | PatientQueue | patient.removed_from_queue | patient.queued |

## Clinical Domain

| Capability | Owner | Aggregate | Events Produced | Events Consumed |
|------------|-------|-----------|-----------------|-----------------|
| Vital Signs Recording | Nurse | VitalSign | vital_signs.recorded | patient.checked_in |
| Clinical Notes | Doctor | ClinicalNote | clinical.note.created, clinical.note.updated | consultation.started |
| Medical Records | Doctor | MedicalRecord | medical.record.created, medical.record.updated | consultation.completed |
| Diagnoses | Doctor | Diagnosis | diagnosis.created, diagnosis.updated | medical.record.created |
| Lab Tests | Doctor | LabTest | lab.test.requested, lab.test.completed | medical.record.created |
| Care Notes | Nurse | CareNote | care.note.created | patient.checked_in |

## Surgical Domain

| Capability | Owner | Aggregate | Events Produced | Events Consumed |
|------------|-------|-----------|-----------------|-----------------|
| Surgical Case Creation | Doctor | SurgicalCase | surgical.case.created, surgical.case.updated | consultation.completed |
| Case Planning | Doctor | CasePlan | case.plan.created, case.plan.updated, case.plan.ready | surgical.case.created |
| Consent Management | Frontdesk | ConsentForm | consent.created, consent.signed, consent.witnessed | case.plan.ready |
| Theater Booking | Frontdesk | TheaterBooking | theater.booked, theater.confirmed, theatre.booking.cancelled | surgical.case.ready_for_scheduling |
| Surgical Procedure Recording | Doctor | SurgicalProcedureRecord | procedure.recorded, procedure.started, procedure.completed | theater.confirmed |
| Surgical Checklist | Theater Technician | SurgicalChecklist | checklist.sign_in.completed, checklist.time_out.completed, checklist.sign_out.completed | procedure.recorded |

## Billing Domain

| Capability | Owner | Aggregate | Events Produced | Events Consumed |
|------------|-------|-----------|-----------------|-----------------|
| Invoice Generation | Cashier | Payment | invoice.created, invoice.updated, invoice.paid | appointment.completed, surgical.case.completed |
| Billing Estimate | Doctor | SurgicalBillingEstimate | billing.estimate.created, billing.estimate.finalized | surgical.case.created |
| Payment Processing | Cashier | Payment | payment.received, payment.refunded | invoice.created |

## Inventory Domain

| Capability | Owner | Aggregate | Events Produced | Events Consumed |
|------------|-------|-----------|-----------------|-----------------|
| Inventory Management | Stores | InventoryItem | inventory.item.created, inventory.item.updated, inventory.item.adjusted | — |
| Goods Receipt | Stores | GoodsReceipt | goods.receipt.created | purchase.order.approved |
| Purchase Order | Stores | PurchaseOrder | purchase.order.created, purchase.order.submitted, purchase.order.approved, purchase.order.received | — |
| Inventory Usage | Clinical | InventoryUsage | inventory.usage.recorded | procedure.recorded, consultation.completed |

## User & Authentication Domain

| Capability | Owner | Aggregate | Events Produced | Events Consumed |
|------------|-------|-----------|-----------------|-----------------|
| User Authentication | System | User | user.logged_in, user.logged_out, user.token.refreshed | — |
| Staff Invitation | Admin | StaffInvite | staff.invited, staff.invite.accepted, staff.invite.declined | — |
| Session Management | System | RefreshToken | token.created, token.revoked | user.logged_in |

## Notification Domain

| Capability | Owner | Aggregate | Events Produced | Events Consumed |
|------------|-------|-----------|-----------------|-----------------|
| Notification Delivery | System | Notification | notification.sent, notification.delivered, notification.read | appointment.confirmed, intake.confirmed, payment.received |
| Reminder Scheduling | System | Notification | reminder.scheduled, reminder.sent | appointment.confirmed |

## Analytics Domain

| Capability | Owner | Aggregate | Events Produced | Events Consumed |
|------------|-------|-----------|-----------------|-----------------|
| Patient Analytics | Admin | — | — | patient.record.created, appointment.completed |
| Financial Analytics | Admin | — | — | payment.received, invoice.created |
| Operational Analytics | Admin | — | — | queue.*, appointment.* |

---

## Cross-Capability Dependencies

```
intake.session.created
    ↓
intake.submission.created
    ↓
intake.confirmed
    ↓
patient.record.created
    ↓
    ├── appointment.created
    │       ↓
    │   appointment.confirmed
    │       ↓
    │   patient.checked_in
    │       ↓
    │   queue.assigned
    │       ↓
    │   consultation.started
    │       ↓
    │   consultation.completed
    │       ↓
    │   medical.record.created
    │       ↓
    │   invoice.created
    │       ↓
    │   payment.received
    │
    └── doctor.assigned
            ↓
        appointment.scheduled
```

---

## Key Observations

1. **Patient Record is the central hub.** Almost every domain eventually depends on `patient.record.created`.
2. **Intake is the primary entry point** for new patients into the entire system.
3. **Appointment is the primary orchestration point** — it connects patient, doctor, queue, consultation, and billing.
4. **Events flow downstream only.** There are no circular dependencies in the current design.
5. **Some aggregates produce events that no one currently consumes.** This is the gap that the outbox/event infrastructure will fill.
