# Ubiquitous Language

**Purpose:** This document defines the canonical vocabulary of the Nairobi Sculpt Hospital Management System. It is the single source of truth for term definitions, ensuring that engineers, product managers, clinicians, and future AI agents all speak the same language.

**Rule:** If a term is not in this document, it does not exist. If a term has a different meaning in conversation, the conversation is wrong, not the definition.

---

## Core Terms

| Term | Definition | Never Means | Example |
|------|------------|-------------|---------|
| **Intake Session** | Temporary QR-based session created by frontdesk to capture patient information | A patient record, an appointment, a consultation | "Scan this QR to start your intake session" |
| **Intake Submission** | Completed form data submitted by a patient during an intake session | A patient record, a consultation, a request | "Your intake submission has been received" |
| **Patient** | Confirmed registry record with unique file number (NS001, NS002...) | An intake submission, a user account, a consultation | "Patient NS001 is ready for check-in" |
| **File Number** | Sequential identifier assigned to confirmed patients (NS001, NS002...) | A patient ID, a database primary key, a queue position | "File number NS042 is assigned to John Doe" |
| **Appointment** | Scheduled encounter between a patient and a doctor at a specific date/time | A consultation, a queue entry, a procedure | "Appointment #1234 is scheduled for Monday at 10:00" |
| **Consultation** | Clinical encounter where a doctor assesses and treats a patient | An appointment, a procedure, a prescription | "Consultation started for patient NS001" |
| **Queue Entry** | Patient waiting to be seen by a doctor | An appointment, a consultation, a walk-in | "Queue entry added for Dr. Smith" |
| **Queue Position** | Ordinal position in the doctor's waiting queue | A file number, an appointment ID | "You are position 3 in the queue" |
| **Check-In** | Frontdesk action confirming patient arrival for appointment | Intake, registration, triage | "Patient checked in for appointment #1234" |
| **Consultation Request** | Formal request for doctor review, typically from frontdesk or nurse | An appointment, a referral, a prescription | "Consultation request submitted for review" |
| **Doctor Consultation** | Peer-to-peer consultation between doctors (second opinion) | A consultation, a referral, a case conference | "Dr. A requested consultation with Dr. B" |
| **Surgical Case** | Complete surgical journey from planning to recovery | A procedure, an appointment, a consultation | "Surgical case #SC-001 is ready for scheduling" |
| **Case Plan** | Pre-operative planning document for a surgical case | A prescription, a treatment plan, a consent | "Case plan requires consent before scheduling" |
| **Consent Form** | Legal document capturing patient consent for procedure | A waiver, a registration form, a medical history | "Consent form signed by patient" |
| **Theater Booking** | Reservation of surgical theater for a specific time slot | An appointment, a procedure, a case | "Theater 1 booked for case #SC-001" |
| **Procedure Record** | Intra-operative documentation of surgical procedure | A case plan, a medical record, a consultation | "Procedure recorded for surgical case #SC-001" |
| **Surgical Checklist** | WHO-style safety checklist (Sign In, Time Out, Sign Out) | A consent form, a case plan, a procedure record | "Sign-in checklist completed" |
| **Vital Signs** | Clinical measurements: temperature, BP, heart rate, etc. | A diagnosis, a consultation, a medical record | "Vital signs recorded: BP 120/80" |
| **Clinical Note** | Doctor's written observation or assessment | A diagnosis, a prescription, a medical record | "Clinical note added to patient record" |
| **Medical Record** | Comprehensive patient medical history and treatment plan | A clinical note, a consultation, a diagnosis | "Medical record created for patient NS001" |
| **Diagnosis** | Doctor's identification of disease/condition | A symptom, a prescription, a lab result | "Diagnosis: Hypertension" |
| **Lab Test** | Ordered diagnostic test with results | A diagnosis, a prescription, a consultation | "Lab test requested: Complete Blood Count" |
| **Payment** | Financial transaction for services rendered | An invoice, a bill, a receipt | "Payment received: KES 5,000" |
| **Invoice** | Bill generated for services rendered | A payment, a receipt, a statement | "Invoice #INV-001 generated" |
| **Patient Queue** | Ordered list of patients waiting for a specific doctor | An appointment list, a waiting room, a schedule | "Patient queue for Dr. Smith has 5 patients" |
| **Patient Assignment** | Doctor responsible for patient's ongoing care | A consultation, a referral, a queue entry | "Patient assigned to Dr. Smith" |
| **Care Note** | Nursing observation or care record | A clinical note, a diagnosis, a vital sign | "Care note recorded: Patient resting comfortably" |
| **Inventory Item** | Catalogued medical supply or equipment | A medication, a consumable, a drug | "Inventory item: Sutures 3-0" |
| **Purchase Order** | Formal request to vendor for goods | An invoice, a receipt, a goods receipt | "Purchase order #PO-001 submitted" |
| **Goods Receipt** | Record of items received from vendor | A purchase order, an invoice, a delivery | "Goods receipt created for PO-001" |
| **Notification** | Communication sent to user (SMS, Email, WhatsApp, Push) | A message, an alert, a reminder | "Notification sent: Appointment reminder" |
| **Audit Log** | Immutable record of a significant action | A log, a history, a trail | "Audit log: Patient NS001 created by user-456" |
| **User** | System account for staff, doctors, patients, or admins | A patient, a doctor, a person | "User user-456 logged in as FRONTDESK" |
| **Role** | Authorization level: ADMIN, DOCTOR, NURSE, FRONTDESK, PATIENT, etc. | A permission, a group, a department | "User has role FRONTDESK" |
| **Session** | Temporary context for a user interaction | A consultation, an appointment, a queue | "Intake session expired" |
| **Draft** | Unsaved form data stored locally or server-side | A submission, a record, a confirmation | "Draft auto-saved to localStorage" |
| **Submission** | Completed form data sent for processing | A draft, a record, a request | "Form submitted for review" |
| **Confirmation** | Formal approval of a submission or action | A submission, a draft, a suggestion | "Intake confirmed by frontdesk" |
| **Rejection** | Formal denial of a submission or action | A cancellation, a deletion, a dismissal | "Patient registration rejected" |
| **Approval** | Formal acceptance by authorized personnel | A confirmation, a verification, a sign-off | "Patient approved by admin" |
| **File Number Generator** | System service that generates sequential patient file numbers | A UUID generator, a random ID, a database sequence | "Next file number: NS042" |
| **Outbox** | Pattern for reliably publishing events within a transaction | A queue, a log, a buffer | "Event published via outbox pattern" |
| **Correlation ID** | UUID grouping all events in a single workflow/business transaction | A trace ID, a session ID, a request ID | "Search events by correlationId to trace workflow" |
| **Causation ID** | UUID of the event that directly caused this event | A parent ID, a source ID, a trigger ID | "Event B has causationId = event A's eventId" |

---

## Domain-Specific Terms

### Patient Intake Domain

| Term | Definition | Never Means |
|------|------------|-------------|
| **Intake Session** | Temporary QR session created by frontdesk | Patient record, appointment |
| **Intake Submission** | Completed form data from patient | Confirmed patient, consultation |
| **Permanent Desk QR** | Non-expiring QR code pointing to intake entry | Timed session, patient record |
| **Timed Session** | QR session with 60-minute expiration | Permanent QR, infinite session |
| **Completeness Score** | Percentage of required fields filled in submission | Approval score, clinical score |
| **Pending Intake** | Submission awaiting frontdesk review | Confirmed patient, rejected submission |

### Appointment Domain

| Term | Definition | Never Means |
|------|------------|-------------|
| **Appointment Source** | How appointment was created: PATIENT_REQUESTED, FRONTDESK_SCHEDULED, DOCTOR_FOLLOW_UP, ADMIN_SCHEDULED | Appointment type, appointment status |
| **Booking Channel** | UI channel used to book: DASHBOARD, PATIENT_LIST, PATIENT_PROFILE | Appointment source, payment method |
| **Late Arrival** | Patient arrived after scheduled time | No-show, cancellation |
| **No-Show** | Patient did not arrive for appointment | Cancelled, completed |
| **Follow-Up Appointment** | Appointment linked to parent via parent_appointment_id | New appointment, rescheduled appointment |

### Queue Domain

| Term | Definition | Never Means |
|------|------------|-------------|
| **Queue Position** | Ordinal position in doctor's queue | File number, appointment ID |
| **Queue Status** | WAITING, IN_CONSULTATION, COMPLETED, REMOVED | Appointment status, consultation status |
| **Called** | Patient notified they can proceed to consultation | Checked in, completed |

### Surgical Domain

| Term | Definition | Never Means |
|------|------------|-------------|
| **Surgical Case** | Complete surgical journey from planning to recovery | Procedure, appointment, case plan |
| **Case Plan** | Pre-operative planning document | Consent form, procedure record |
| **Readiness Status** | NOT_STARTED, IN_PROGRESS, PENDING_LABS, PENDING_CONSENT, PENDING_REVIEW, READY, ON_HOLD | Surgical case status, appointment status |
| **Sign In / Time Out / Sign Out** | WHO surgical checklist phases | Consent signing, procedure steps |
| **Theater** | Surgical operating room | Consultation room, examination room |

### Billing Domain

| Term | Definition | Never Means |
|------|------------|-------------|
| **Invoice** | Bill generated for services | Payment, receipt, statement |
| **Payment Status** | PAID, UNPAID, PART | Appointment status, consultation status |
| **Bill Type** | CONSULTATION, SURGERY, LAB_TEST, FOLLOW_UP, OTHER | Payment method, payment status |
| **Surgical Billing Estimate** | Pre-operative cost estimate | Invoice, payment, receipt |

---

## Anti-Patterns (Language Violations to Avoid)

| Anti-Pattern | Why It's Wrong | Correct Term |
|--------------|----------------|--------------|
| "Create a patient" when submitting intake form | Creates a submission, not a patient | "Submit intake form" or "Create intake submission" |
| "Approve a consultation" when confirming intake | Different workflows, different aggregates | "Confirm intake" or "Approve patient" |
| "Book an appointment" when creating consultation | Different aggregates with different rules | "Create consultation" or "Schedule appointment" |
| "Check in" when adding to queue | Check-in is for appointments, queue is separate | "Add to queue" or "Check in for appointment" |
| "Cancel" when marking no-show | No-show is distinct from cancellation | "Mark as no-show" or "Cancel appointment" |
| "User" when meaning "Patient" | User is a system account, patient is a person | "Patient" or "User account" |
| "Doctor" when meaning "User with DOCTOR role" | Doctor is a clinical role, User is a system concept | "Doctor" or "User with DOCTOR role" |

---

## Language Evolution

### How to Add a New Term
1. Propose term with definition in PR description
2. Get review from domain expert (clinical or operational)
3. Add to this document
4. Update code comments and documentation

### How to Change a Term
1. Document the old term and new term
2. Create migration guide for existing code
3. Update all references in code
4. Announce change to team

### How to Remove a Term
1. Mark as deprecated in this document
2. Add replacement term
3. Update all code references
4. Remove after one sprint

---

## Context Boundaries

| Term | Used In | Should Not Be Used In |
|------|---------|----------------------|
| Intake Session | Patient Intake domain | Appointment, Queue, Billing |
| Intake Submission | Patient Intake domain | Appointment, Queue, Billing |
| Patient | All domains | Intake (use IntakeSubmission) |
| Appointment | Appointment domain | Intake (use Intake Session) |
| Consultation | Consultation domain | Appointment (use Appointment) |
| Queue Entry | Queue domain | Appointment (use Appointment) |
