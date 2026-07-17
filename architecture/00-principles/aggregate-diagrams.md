# Aggregate Diagrams

**Purpose:** This document provides visual and textual representations of each aggregate in the system. An aggregate is a cluster of domain objects that can be treated as a single unit for data change purposes.

**Key Rule:** Aggregates are the only entry points for data modification. No external module may modify an aggregate's internal state directly.

---

## Patient Intake Aggregates

### IntakeSession Aggregate

```
┌─────────────────────────────────────────┐
│           IntakeSession                 │
│                                         │
│  - sessionId (String)                   │
│  - status (ACTIVE | SUBMITTED |         │
│           CONFIRMED | EXPIRED)          │
│  - createdAt (DateTime)                 │
│  - expiresAt (DateTime)                 │
│  - createdByUserId (String?)            │
│                                         │
│  + create()                             │
│  + markAsSubmitted()                    │
│  + markAsConfirmed()                    │
│  + markAsExpired()                      │
│  + isExpired()                          │
│  + canAcceptSubmission()                │
│                                         │
└─────────────────────────────────────────┘
              │
              │ 1:1
              ▼
┌─────────────────────────────────────────┐
│        IntakeSubmission                 │
│                                         │
│  - submissionId (String)                │
│  - sessionId (String)                   │
│  - personalInfo (PersonalInfo)          │
│  - contactInfo (ContactInfo)            │
│  - emergencyContact (EmergencyContact)  │
│  - medicalInfo (MedicalInfo)            │
│  - insuranceInfo (InsuranceInfo)        │
│  - consent (ConsentInfo)                │
│  - submittedAt (DateTime)               │
│  - ipAddress (String?)                  │
│  - userAgent (String?)                  │
│  - status (PENDING | CONFIRMED |        │
│           REJECTED)                     │
│                                         │
│  + create()                             │
│  + markAsConfirmed()                    │
│  + markAsRejected()                     │
│  + isComplete()                         │
│  + getCompletenessScore()               │
│                                         │
└─────────────────────────────────────────┘
```

**Relationships:**
- IntakeSession 1:1 IntakeSubmission
- IntakeSession created by User (createdByUserId)
- IntakeSubmission creates Patient (on confirmation)

**Invariants:**
- Session must be ACTIVE to accept submission
- Session expires after configured minutes (default 60)
- Submission can only be created once per session
- All three consents required for valid submission

---

### Patient Aggregate

```
┌─────────────────────────────────────────┐
│               Patient                   │
│                                         │
│  - id (String)                          │
│  - fileNumber (String) [NS001, NS002...]│
│  - userId (String?) [unique]            │
│  - firstName (String)                   │
│  - lastName (String)                    │
│  - dateOfBirth (DateTime)               │
│  - gender (MALE | FEMALE | OTHER)       │
│  - phone (String)                       │
│  - whatsappPhone (String?)              │
│  - email (String) [unique]              │
│  - maritalStatus (String?)              │
│  - occupation (String?)                 │
│  - address (String)                     │
│  - emergencyContactName (String?)       │
│  - emergencyContactNumber (String?)     │
│  - relation (String?)                   │
│  - bloodGroup (String?)                 │
│  - allergies (String?)                  │
│  - medicalConditions (String?)          │
│  - medicalHistory (String?)             │
│  - insuranceProvider (String?)          │
│  - insuranceNumber (String?)            │
│  - privacyConsent (Boolean)             │
│  - serviceConsent (Boolean)             │
│  - medicalConsent (Boolean)             │
│  - img (String?)                        │
│  - colorCode (String?)                  │
│  - approved (Boolean)                   │
│  - approvedBy (String?)                 │
│  - approvedAt (DateTime?)               │
│  - assignedToUserId (String?)           │
│  - createdAt (DateTime)                 │
│  - updatedAt (DateTime)                 │
│                                         │
│  + create()                             │
│  + getAge()                             │
│  + getAgeInMonths()                     │
│  + isMinor()                            │
│  + hasAllConsents()                     │
│  + hasInsurance()                       │
│  + equals()                             │
│                                         │
└─────────────────────────────────────────┘
              │
              │ 1:N
              ├──────────────────────┐
              ▼                      ▼
    ┌─────────────────┐   ┌─────────────────┐
    │   Appointment    │   │  PatientQueue    │
    └─────────────────┘   └─────────────────┘
              │                      │
              ▼                      ▼
    ┌─────────────────┐   ┌─────────────────┐
    │ Consultation     │   │  NurseAssignment │
    └─────────────────┘   └─────────────────┘
```

**Relationships:**
- Patient 1:N Appointment
- Patient 1:N PatientQueue
- Patient 1:N Consultation
- Patient 1:N NurseAssignment
- Patient 1:N MedicalRecord
- Patient 1:N ClinicalNote
- Patient 1:N VitalSign
- Patient 1:N Diagnosis
- Patient 1:N CareNote
- Patient 1:N Payment
- Patient 1:N SurgicalCase
- Patient N:1 User (via userId)

**Invariants:**
- Email must be unique
- File number must be sequential (NS001, NS002...)
- All three consents required for registration
- Date of birth cannot be in the future

---

## Appointment Aggregates

### Appointment Aggregate

```
┌─────────────────────────────────────────┐
│             Appointment                 │
│                                         │
│  - id (Int) [autoincrement]             │
│  - patientId (String)                   │
│  - doctorId (String)                    │
│  - appointmentDate (DateTime)           │
│  - time (String)                        │
│  - status (PENDING | CONFIRMED |        │
│           SCHEDULED | CANCELLED |       │
│           COMPLETED | NO_SHOW |         │
│           CHECKED_IN | ...)             │
│  - type (String)                        │
│  - note (String?)                       │
│  - reason (String?)                     │
│  - checkedInAt (DateTime?)              │
│  - checkedInBy (String?)                │
│  - lateArrival (Boolean)                │
│  - lateByMinutes (Int?)                 │
│  - scheduledAt (DateTime?)              │
│  - statusChangedAt (DateTime)           │
│  - statusChangedBy (String?)            │
│  - doctorConfirmedAt (DateTime?)        │
│  - doctorConfirmedBy (String?)          │
│  - doctorRejectionReason (String?)      │
│  - noShow (Boolean)                     │
│  - noShowAt (DateTime?)                 │
│  - noShowReason (String?)               │
│  - noShowNotes (String?)                │
│  - rescheduledToAppointmentId (Int?)    │
│  - consultationRequestStatus (String?)  │
│  - reviewedBy (String?)                 │
│  - reviewedAt (DateTime?)               │
│  - reviewNotes (String?)                │
│  - source (PATIENT_REQUESTED |          │
│           FRONTDESK_SCHEDULED |         │
│           DOCTOR_FOLLOW_UP |            │
│           ADMIN_SCHEDULED)              │
│  - createdByUserId (String?)            │
│  - bookingChannel (String?)             │
│  - createdAt (DateTime)                 │
│  - updatedAt (DateTime)                 │
│                                         │
│  + confirm()                            │
│  + cancel()                             │
│  + checkIn()                            │
│  + complete()                           │
│  + markNoShow()                         │
│  + reschedule()                         │
│                                         │
└─────────────────────────────────────────┘
              │
              │ 1:1
              ▼
┌─────────────────────────────────────────┐
│           Consultation                  │
└─────────────────────────────────────────┘
```

**Relationships:**
- Appointment belongs to Patient
- Appointment belongs to Doctor
- Appointment 1:1 Consultation (optional)
- Appointment 1:N CareNote
- Appointment 1:N ClinicalNote
- Appointment 1:N ClinicalTask
- Appointment 1:N VitalSign
- Appointment 1:N NurseAssignment
- Appointment 1:N PatientImage
- Appointment 1:1 Payment (optional)
- Appointment 1:1 CasePlan (optional)
- Appointment 1:1 SurgicalCase (optional)

**Invariants:**
- Doctor cannot have overlapping appointments (unique constraint on doctor_id + scheduled_at)
- Appointment status transitions are controlled
- Check-in requires appointment to be CONFIRMED or SCHEDULED

---

## Queue Aggregates

### PatientQueue Aggregate

```
┌─────────────────────────────────────────┐
│            PatientQueue                 │
│                                         │
│  - id (Int) [autoincrement]             │
│  - patientId (String)                   │
│  - doctorId (String)                    │
│  - appointmentId (Int?)                 │
│  - status (WAITING | IN_CONSULTATION |  │
│           COMPLETED | REMOVED)          │
│  - addedBy (String)                     │
│  - addedAt (DateTime)                   │
│  - calledAt (DateTime?)                 │
│  - completedAt (DateTime?)              │
│  - notes (String?)                      │
│  - position (Int?)                      │
│  - removedAt (DateTime?)                │
│  - removedBy (String?)                  │
│  - removalReason (String?)              │
│                                         │
│  + addToQueue()                         │
│  + call()                               │
│  + complete()                           │
│  + remove()                             │
│                                         │
└─────────────────────────────────────────┘
```

**Relationships:**
- PatientQueue belongs to Patient
- PatientQueue belongs to Doctor
- PatientQueue optionally belongs to Appointment

**Invariants:**
- Patient can only be in queue once per doctor
- Position is automatically assigned on add
- Status transitions: WAITING → IN_CONSULTATION → COMPLETED

---

## Clinical Aggregates

### Consultation Aggregate

```
┌─────────────────────────────────────────┐
│            Consultation                 │
│                                         │
│  - id (Int) [autoincrement]             │
│  - appointmentId (Int) [unique]         │
│  - doctorId (String)                    │
│  - userId (String?)                     │
│  - startedAt (DateTime?)                │
│  - completedAt (DateTime?)              │
│  - durationMinutes (Int?)               │
│  - doctorNotes (String?)                │
│  - outcome (String?)                    │
│  - outcomeType (String?)                │
│  - patientDecision (String?)            │
│  - followUpDate (DateTime?)             │
│  - followUpType (String?)               │
│  - followUpNotes (String?)              │
│  - createdAt (DateTime)                 │
│  - updatedAt (DateTime)                 │
│  - assessment (String?)                 │
│  - chiefComplaint (String?)             │
│  - examination (String?)                │
│  - plan (String?)                       │
│  - lastActivityAt (DateTime)            │
│                                         │
│  + start()                              │
│  + end()                                │
│  + complete()                           │
│                                         │
└─────────────────────────────────────────┘
              │
              │ 1:1
              ▼
┌─────────────────────────────────────────┐
│       DoctorConsultation                │
│                                         │
│  - id (String)                          │
│  - caseId (Int?)                        │
│  - patientId (String?)                  │
│  - requestingDoctorId (String)          │
│  - consultingDoctorId (String)          │
│  - urgency (ROUTINE | URGENT | INTRA_OP)│
│  - status (OPEN | IN_PROGRESS |         │
│           RESOLVED | CLOSED)            │
│  - subject (String)                     │
│  - question (String)                    │
│  - background (String?)                 │
│  - whatIsNeeded (String?)               │
│  - response (String?)                   │
│  - resolvedAt (DateTime?)               │
│  - resolvedBy (String?)                 │
│  - createdAt (DateTime)                 │
│  - updatedAt (DateTime)                 │
│                                         │
└─────────────────────────────────────────┘
```

---

### MedicalRecord Aggregate

```
┌─────────────────────────────────────────┐
│            MedicalRecord                │
│                                         │
│  - id (Int) [autoincrement]             │
│  - patientId (String)                   │
│  - appointmentId (Int)                  │
│  - doctorId (String)                    │
│  - treatmentPlan (String?)              │
│  - prescriptions (String?)              │
│  - labRequest (String?)                 │
│  - notes (String?)                      │
│  - createdAt (DateTime)                 │
│  - updatedAt (DateTime)                 │
│                                         │
└─────────────────────────────────────────┘
              │
              │ 1:N
              ▼
┌─────────────────────────────────────────┐
│             Diagnosis                   │
└─────────────────────────────────────────┘
              │
              │ 1:N
              ▼
┌─────────────────────────────────────────┐
│              LabTest                    │
└─────────────────────────────────────────┘
```

---

### VitalSign Aggregate

```
┌─────────────────────────────────────────┐
│              VitalSign                  │
│                                         │
│  - id (Int) [autoincrement]             │
│  - patientId (String)                   │
│  - appointmentId (Int?)                  │
│  - medicalRecordId (Int?)               │
│  - bodyTemperature (Float?)             │
│  - systolic (Int?)                      │
│  - diastolic (Int?)                     │
│  - heartRate (String?)                  │
│  - respiratoryRate (Int?)               │
│  - oxygenSaturation (Int?)              │
│  - weight (Float?)                      │
│  - height (Float?)                      │
│  - recordedBy (String)                  │
│  - recordedAt (DateTime)                │
│  - createdAt (DateTime)                 │
│  - updatedAt (DateTime)                 │
│                                         │
└─────────────────────────────────────────┘
```

---

## Surgical Aggregates

### SurgicalCase Aggregate

```
┌─────────────────────────────────────────┐
│            SurgicalCase                 │
│                                         │
│  - id (String) [UUID]                   │
│  - patientId (String)                   │
│  - primarySurgeonId (String?)           │
│  - appointmentId (Int?) [unique]        │
│  - consultationId (Int?) [unique]       │
│  - urgency (ELECTIVE | URGENT |         │
│           EMERGENCY)                    │
│  - status (DRAFT | PLANNING |           │
│           READY_FOR_SCHEDULING |        │
│           SCHEDULED | IN_PREP |         │
│           IN_THEATER | RECOVERY |       │
│           COMPLETED | CANCELLED | ...)  │
│  - diagnosis (String?)                  │
│  - procedureName (String?)              │
│  - side (String?)                       │
│  - createdAt (DateTime)                 │
│  - updatedAt (DateTime)                 │
│                                         │
└─────────────────────────────────────────┘
              │
              │ 1:1
              ▼
┌─────────────────────────────────────────┐
│             CasePlan                    │
│                                         │
│  - id (Int) [autoincrement]             │
│  - appointmentId (Int) [unique]         │
│  - surgicalCaseId (String?) [unique]    │
│  - patientId (String)                   │
│  - doctorId (String)                    │
│  - procedurePlan (String?)              │
│  - riskFactors (String?)                │
│  - readinessStatus (NOT_STARTED |       │
│           IN_PROGRESS | PENDING_LABS |  │
│           PENDING_CONSENT |             │
│           PENDING_REVIEW | READY |      │
│           ON_HOLD)                      │
│  - readyForSurgery (Boolean)            │
│  - consentChecklist (String?)           │
│  - plannedAnesthesia (String?)          │
│  - specialInstructions (String?)        │
│                                         │
└─────────────────────────────────────────┘
              │
              │ 1:N
              ▼
┌─────────────────────────────────────────┐
│            ConsentForm                  │
└─────────────────────────────────────────┘
```

### TheaterBooking Aggregate

```
┌─────────────────────────────────────────┐
│           TheaterBooking                │
│                                         │
│  - id (String) [UUID]                   │
│  - theaterId (String)                   │
│  - surgicalCaseId (String) [unique]     │
│  - startTime (DateTime)                 │
│  - endTime (DateTime)                   │
│  - status (PROVISIONAL | CONFIRMED |    │
│           CANCELLED | COMPLETED)        │
│  - lockedBy (String?)                   │
│  - lockedAt (DateTime?)                 │
│  - confirmedAt (DateTime?)              │
│  - confirmedBy (String?)                │
│  - lockExpiresAt (DateTime?)            │
│  - version (Int)                        │
│  - createdAt (DateTime)                 │
│  - updatedAt (DateTime)                 │
│                                         │
└─────────────────────────────────────────┘
```

---

## Billing Aggregates

### Payment Aggregate

```
┌─────────────────────────────────────────┐
│              Payment                    │
│                                         │
│  - id (Int) [autoincrement]             │
│  - patientId (String)                   │
│  - appointmentId (Int?) [unique]        │
│  - surgicalCaseId (String?) [unique]    │
│  - billDate (DateTime)                  │
│  - paymentDate (DateTime?)              │
│  - discount (Float)                     │
│  - totalAmount (Float)                  │
│  - amountPaid (Float)                   │
│  - paymentMethod (CASH | CARD |         │
│           MOBILE_MONEY |                │
│           BANK_TRANSFER)                │
│  - status (PAID | UNPAID | PART)        │
│  - receiptNumber (String?) [unique]     │
│  - createdAt (DateTime)                 │
│  - updatedAt (DateTime)                 │
│  - finalizedAt (DateTime?)              │
│  - finalizedBy (String?)                │
│                                         │
└─────────────────────────────────────────┘
              │
              │ 1:N
              ▼
┌─────────────────────────────────────────┐
│             PatientBill                 │
└─────────────────────────────────────────┘
```

---

## Inventory Aggregates

### PurchaseOrder Aggregate

```
┌─────────────────────────────────────────┐
│           PurchaseOrder                 │
│                                         │
│  - id (String) [UUID]                   │
│  - vendorId (String)                    │
│  - poNumber (String) [unique]           │
│  - status (DRAFT | SUBMITTED |          │
│           APPROVED | PARTIALLY_RECEIVED │
│           | CLOSED | CANCELLED)         │
│  - orderedByUserId (String?)            │
│  - approvedByUserId (String?)           │
│  - approvedAt (DateTime?)               │
│  - notes (String?)                      │
│  - subtotal (Decimal)                   │
│  - vatAmount (Decimal)                  │
│  - currency (String)                    │
│  - expectedDeliveryDate (DateTime?)     │
│  - totalAmount (Decimal)                │
│  - createdAt (DateTime)                 │
│  - updatedAt (DateTime)                 │
│                                         │
└─────────────────────────────────────────┘
              │
              │ 1:N
              ▼
┌─────────────────────────────────────────┐
│          PurchaseOrderItem              │
└─────────────────────────────────────────┘
```

---

## Notification Aggregate

### Notification Aggregate

```
┌─────────────────────────────────────────┐
│            Notification                 │
│                                         │
│  - id (Int) [autoincrement]             │
│  - userId (String?)                     │
│  - senderId (String?)                   │
│  - type (EMAIL | SMS | PUSH |           │
│           IN_APP)                       │
│  - status (PENDING | SENT |             │
│           FAILED | READ)                │
│  - subject (String?)                    │
│  - message (String)                     │
│  - metadata (String?)                   │
│  - sentAt (DateTime?)                   │
│  - readAt (DateTime?)                   │
│  - createdAt (DateTime)                 │
│  - updatedAt (DateTime)                 │
│                                         │
└─────────────────────────────────────────┘
```

---

## Aggregate Rules

### Creation Rules
1. Only the aggregate root may create instances of itself
2. Aggregates are created through factory methods or constructors
3. Creation invariants are enforced in the factory method

### Modification Rules
1. Only the aggregate root may modify its own state
2. External modules must use the aggregate's public interface
3. State changes must emit events (via outbox)

### Deletion Rules
1. Soft delete preferred (status flags, timestamps)
2. Hard delete only for regulatory compliance
3. Deletion must emit event for audit

### Reference Rules
1. External aggregates are referenced by ID only
2. No direct object references to other aggregates
3. Navigation through IDs, not object graphs

### Transaction Rules
1. A transaction updates only one aggregate
2. Cross-aggregate updates use events and eventual consistency
3. The outbox pattern ensures atomicity of state change + event emission
