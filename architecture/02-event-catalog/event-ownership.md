# Event Ownership Matrix

**Purpose:** This document defines who owns each event in the system. It prevents multiple modules from emitting the same event differently, which is the #1 cause of event-driven architecture rot.

**How to Read:**
- **Source of Truth:** The aggregate/domain that owns the data and is the sole producer of the event
- **May Publish:** Which services/modules are allowed to emit this event
- **May Consume:** Which services/modules are allowed to subscribe to this event

**Golden Rule:** Only the Source of Truth may publish. Everyone else may consume.

---

## Patient Intake Events

| Event | Source of Truth | May Publish | May Consume |
|-------|-----------------|-------------|-------------|
| `intake.session.created` | IntakeSession Aggregate (`StartPatientIntakeUseCase`) | StartPatientIntakeUseCase, Frontdesk Intake API | Analytics, Expiry Agent, Frontdesk UI |
| `intake.session.opened` | IntakeSession Aggregate (`validateIntakeSessionAccess`) | Intake Validation Middleware | Analytics, Security Agent |
| `intake.session.submitted` | IntakeSession Aggregate (`SubmitPatientIntakeUseCase`) | SubmitPatientIntakeUseCase | Frontdesk UI, Analytics |
| `intake.session.confirmed` | IntakeSession Aggregate (`ConfirmPatientIntakeUseCase`) | ConfirmPatientIntakeUseCase | Session Cleanup Agent, Analytics |
| `intake.session.expired` | IntakeSession Aggregate (`GetIntakeSessionStatusUseCase`) | GetIntakeSessionStatusUseCase | Cleanup Agent, Frontdesk UI, Analytics |
| `intake.form.viewed` | IntakeSubmission Aggregate (`MobileIntakeForm`) | MobileIntakeForm component | Analytics, Reminder Agent |
| `intake.form.step.completed` | IntakeSubmission Aggregate (`MobileIntakeForm`) | MobileIntakeForm component | Analytics, Reminder Agent |
| `intake.form.draft.saved` | IntakeSubmission Aggregate (`MobileIntakeForm`) | MobileIntakeForm component | Analytics, Recovery Agent |
| `intake.submission.created` | IntakeSubmission Aggregate (`SubmitPatientIntakeUseCase`) | SubmitPatientIntakeUseCase | Frontdesk Notification Agent, CRM, Analytics |
| `intake.submission.confirmed` | IntakeSubmission Aggregate (`ConfirmPatientIntakeUseCase`) | ConfirmPatientIntakeUseCase | Audit Agent, Compliance Reporter |
| `intake.submission.rejected` | IntakeSubmission Aggregate (`Reject Patient API`) | Admin Reject API | Frontdesk UI, Audit Agent, Patient Notification Agent |

## Patient Registry Events

| Event | Source of Truth | May Publish | May Consume |
|-------|-----------------|-------------|-------------|
| `patient.record.created` | Patient Aggregate (`CreatePatientUseCase`, `ConfirmPatientIntakeUseCase`) | CreatePatientUseCase, ConfirmPatientIntakeUseCase | All downstream domains |
| `patient.record.updated` | Patient Aggregate (`UpdatePatientUseCase`) | UpdatePatientUseCase | Analytics, CRM |
| `patient.record.approved` | Patient Aggregate (`Approve Patient API`) | Admin Approve API | Frontdesk UI, Notification Agent |
| `patient.record.rejected` | Patient Aggregate (`Reject Patient API`) | Admin Reject API | Frontdesk UI, Audit Agent |
| `patient.assigned` | DoctorPatientAssignment Aggregate | Assignment Service | Queue Management, Notifications |
| `patient.discharged` | DoctorPatientAssignment Aggregate | Assignment Service | Queue Management, Billing |
| `patient.transferred` | DoctorPatientAssignment Aggregate | Assignment Service | Queue Management, Notifications |

## Appointment Events

| Event | Source of Truth | May Publish | May Consume |
|-------|-----------------|-------------|-------------|
| `appointment.created` | Appointment Aggregate (`ScheduleAppointmentUseCase`) | ScheduleAppointmentUseCase | Queue Management, Notifications, Analytics |
| `appointment.updated` | Appointment Aggregate | Appointment Service | Queue Management, Notifications |
| `appointment.cancelled` | Appointment Aggregate | Appointment Service | Queue Management, Billing, Notifications |
| `appointment.rescheduled` | Appointment Aggregate | Appointment Service | Queue Management, Notifications |
| `appointment.confirmed` | Appointment Aggregate | Appointment Service | Queue Management, Notifications, Reminder Agent |
| `patient.checked_in` | Appointment Aggregate (`CheckInPatientUseCase`) | CheckInPatientUseCase | Queue Management, Consultation |
| `appointment.completed` | Appointment Aggregate | Consultation Service | Billing, Medical Records, Follow-up Agent |
| `appointment.follow_up.created` | Appointment Aggregate | Appointment Service | Notifications, Analytics |

## Queue Events

| Event | Source of Truth | May Publish | May Consume |
|-------|-----------------|-------------|-------------|
| `patient.queued` | PatientQueue Aggregate | Queue Management Service | Frontdesk UI, Doctor Dashboard |
| `patient.called` | PatientQueue Aggregate | Queue Management Service | Frontdesk UI, Patient Notification |
| `patient.removed_from_queue` | PatientQueue Aggregate | Queue Management Service | Frontdesk UI, Analytics |

## Consultation Events

| Event | Source of Truth | May Publish | May Consume |
|-------|-----------------|-------------|-------------|
| `consultation.requested` | Consultation Aggregate | Consultation Service | Doctor Dashboard, Notifications |
| `consultation.approved` | Consultation Aggregate | Consultation Service | Appointment Service, Notifications |
| `consultation.declined` | Consultation Aggregate | Consultation Service | Doctor Dashboard, Notifications |
| `consultation.started` | Consultation Aggregate | Consultation Service | Clinical Notes, Vital Signs, Timer |
| `consultation.ended` | Consultation Aggregate | Consultation Service | Medical Records, Billing |
| `consultation.completed` | Consultation Aggregate | Consultation Service | Billing, Follow-up Agent, Analytics |
| `doctor.consultation.requested` | DoctorConsultation Aggregate | Doctor Consultation Service | Consulting Doctor Dashboard |
| `doctor.consultation.resolved` | DoctorConsultation Aggregate | Doctor Consultation Service | Requesting Doctor Dashboard, Audit |

## Surgical Events

| Event | Source of Truth | May Publish | May Consume |
|-------|-----------------|-------------|-------------|
| `surgical.case.created` | SurgicalCase Aggregate | Surgical Case Service | Case Planning, Scheduling |
| `surgical.case.updated` | SurgicalCase Aggregate | Surgical Case Service | Analytics, Dashboard |
| `surgical.case.ready_for_scheduling` | SurgicalCase Aggregate | Surgical Case Service | Theater Booking, Scheduling |
| `case.plan.created` | CasePlan Aggregate | Case Plan Service | Consent Management, Checklist |
| `case.plan.updated` | CasePlan Aggregate | Case Plan Service | Consent Management, Checklist |
| `case.plan.ready` | CasePlan Aggregate | Case Plan Service | Theater Booking, Scheduling |
| `consent.created` | ConsentForm Aggregate | Consent Service | Patient, Witness, Staff |
| `consent.signed` | ConsentForm Aggregate | Consent Service | Case Plan, Audit |
| `consent.witnessed` | ConsentForm Aggregate | Consent Service | Case Plan, Audit |
| `theater.booked` | TheaterBooking Aggregate | Theater Booking Service | Surgical Case, Scheduling |
| `theater.confirmed` | TheaterBooking Aggregate | Theater Booking Service | Surgical Case, Nursing |
| `theater.cancelled` | TheaterBooking Aggregate | Theater Booking Service | Surgical Case, Scheduling |
| `procedure.recorded` | SurgicalProcedureRecord Aggregate | Procedure Recording Service | Billing, Inventory, Clinical Notes |
| `procedure.started` | SurgicalProcedureRecord Aggregate | Procedure Recording Service | Timer, Checklist |
| `procedure.completed` | SurgicalProcedureRecord Aggregate | Procedure Recording Service | Recovery, Billing, Outcomes |
| `checklist.sign_in.completed` | SurgicalChecklist Aggregate | Checklist Service | Procedure Recording |
| `checklist.time_out.completed` | SurgicalChecklist Aggregate | Checklist Service | Procedure Recording |
| `checklist.sign_out.completed` | SurgicalChecklist Aggregate | Checklist Service | Procedure Recording, Billing |

## Clinical Events

| Event | Source of Truth | May Publish | May Consume |
|-------|-----------------|-------------|-------------|
| `vital.signs.recorded` | VitalSign Aggregate | Vital Signs Service | Consultation, Medical Records |
| `clinical.note.created` | ClinicalNote Aggregate | Clinical Note Service | Medical Records, Patient Timeline |
| `clinical.note.updated` | ClinicalNote Aggregate | Clinical Note Service | Medical Records, Audit |
| `clinical.form.started` | ClinicalFormResponse Aggregate | Clinical Form Service | Analytics |
| `clinical.form.submitted` | ClinicalFormResponse Aggregate | Clinical Form Service | Medical Records, Audit |
| `clinical.form.signed` | ClinicalFormResponse Aggregate | Clinical Form Service | Medical Records, Audit, Legal |
| `care.note.created` | CareNote Aggregate | Care Note Service | Medical Records, Patient Timeline |
| `diagnosis.created` | Diagnosis Aggregate | Diagnosis Service | Medical Records, Billing |
| `lab.test.requested` | LabTest Aggregate | Lab Test Service | Laboratory, Billing |
| `lab.test.completed` | LabTest Aggregate | Lab Test Service | Medical Records, Consultation |

## Financial Events

| Event | Source of Truth | May Publish | May Consume |
|-------|-----------------|-------------|-------------|
| `invoice.created` | Payment Aggregate | Billing Service | Patient, Notifications |
| `invoice.updated` | Payment Aggregate | Billing Service | Patient, Notifications |
| `payment.received` | Payment Aggregate | Payment Service | Billing, Receipts, Analytics |
| `payment.refunded` | Payment Aggregate | Payment Service | Billing, Analytics, Notifications |
| `billing.estimate.created` | SurgicalBillingEstimate Aggregate | Billing Estimate Service | Patient, Insurance |
| `billing.estimate.finalized` | SurgicalBillingEstimate Aggregate | Billing Estimate Service | Patient, Billing |

## Notification Events

| Event | Source of Truth | May Publish | May Consume |
|-------|-----------------|-------------|-------------|
| `reminder.scheduled` | Notification Aggregate | Reminder Service | — |
| `reminder.sent` | Notification Aggregate | Notification Service | Analytics |
| `notification.delivered` | Notification Aggregate | Notification Service | Analytics |
| `notification.read` | Notification Aggregate | Notification Service | Analytics |
| `notification.failed` | Notification Aggregate | Notification Service | Retry Agent |

## AI Events

| Event | Source of Truth | May Publish | May Consume |
|-------|-----------------|-------------|-------------|
| `duplicate.patient.detected` | Patient Aggregate (AI Agent) | Intake Agent | Frontdesk UI, Merge Agent |
| `anomaly.flagged` | IntakeSubmission Aggregate (AI Agent) | Intake Agent | Frontdesk UI, Quality Agent |
| `appointment.suggested` | Patient Aggregate (AI Agent) | Scheduling Agent | Frontdesk UI, Notification Agent |
| `consent.summary.generated` | ConsentForm Aggregate (AI Agent) | Consent Agent | Patient, Frontdesk UI |

## Audit Events

| Event | Source of Truth | May Publish | May Consume |
|-------|-----------------|-------------|-------------|
| `audit.recorded` | AuditLog Aggregate | Audit Service | Compliance, Security, Analytics |
| `consent.signed` | ConsentForm Aggregate | Consent Service | Audit, Legal |
| `data.exported` | — | Export Service | Compliance, Security |
| `data.accessed` | — | Access Log Service | Security, Compliance |

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | Correct Approach |
|---------------|--------------|------------------|
| Multiple modules emit `patient.created` | Creates duplicate/conflicting events | Only Patient Aggregate emits this |
| Frontend emits domain events | Frontend shouldn't know domain rules | Frontend emits UI events; backend emits domain events |
| Consumers modify event data | Events are immutable facts | Consumers create new events if they need to change state |
| Tight coupling via event content | Consumers depend on producer's data shape | Use well-defined contracts/versioned schemas |
| Fire-and-forget critical events | Data loss if consumer is down | Use outbox pattern with retry |

---

## Ownership Transition Rules

1. **New event types** must be registered in this matrix before implementation.
2. **Event schema changes** require version bump and migration plan.
3. **New consumers** may subscribe to any event unless explicitly restricted.
4. **New producers** may only emit events for aggregates they own.
5. **Disputes** over event ownership are resolved by the Domain Architect.
