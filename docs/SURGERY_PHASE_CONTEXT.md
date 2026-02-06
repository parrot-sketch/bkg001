# Surgery Phase Context & Architecture

## Overview

This document establishes the context for transitioning from the Consultation phase to the Surgery phase. The Surgery phase handles cases where consultation outcome is `PROCEDURE_RECOMMENDED` and the patient has agreed to proceed.

## Current State Summary

### ✅ Consultation Phase (Completed)
- Frontdesk can book appointments
- Doctors can confirm appointments
- Frontdesk checks in patients
- Doctors conduct consultations
- Consultations can be completed with outcomes:
  - `PROCEDURE_RECOMMENDED` → Triggers Surgery Phase
  - `CONSULTATION_ONLY` → No further clinical workflow
  - `FOLLOW_UP_CONSULTATION_NEEDED` → Schedule follow-up
  - `PATIENT_DECIDING` → Awaiting patient decision
  - `REFERRAL_NEEDED` → External referral

### ✅ Billing Integration (Completed)
- Payment record created when consultation completes
- Frontdesk notified for payment collection
- Billing management page for frontdesk

---

## Surgery Phase Architecture

### Three Main Phases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SURGERY WORKFLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────────────────┐      │
│  │  PRE-OP      │ →  │  INTRA-OP        │ →  │  POST-OP              │      │
│  │  (Planning)  │    │  (Theatre)       │    │  (Recovery)           │      │
│  └──────────────┘    └──────────────────┘    └───────────────────────┘      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Pre-Operative Care

**Trigger:** Consultation completed with `PROCEDURE_RECOMMENDED` and patient decision = `YES`

**Entities:**
- `SurgicalCase` - The master record linking everything
- `CasePlan` - Detailed surgical planning
- `ConsentForm` - Patient consent documents
- `PatientImage` - Pre-op photography (angles, timepoints)
- `VitalSign` - Pre-op vitals
- `LabTest` - Pre-op lab work

**Readiness Criteria (must be met before scheduling):**
```typescript
interface SurgeryReadiness {
  intakeFormComplete: boolean;      // Patient info up to date
  medicalHistoryComplete: boolean;  // Complete history on file
  photosUploaded: boolean;          // Pre-op photos taken
  consentSigned: boolean;           // All consent forms signed
  medicalClearanceReceived: boolean; // Doctor clearance for surgery
  labWorkComplete: boolean;         // All labs done
  labResultsNormal: boolean;        // Lab results acceptable
  insuranceVerified: boolean;       // Insurance/payment confirmed
  paymentArranged: boolean;         // Financial clearance
  implantOrdered: boolean;          // Materials ordered (if applicable)
  theatreBooked: boolean;           // OR time reserved
  anesthesiaConfirmed: boolean;     // Anesthesia team confirmed
}
```

**Workflow States:**
- `AWAITING_PATIENT_DECISION` - Procedure recommended, waiting for patient
- `CASE_PLAN_DRAFT` - Creating surgical plan
- `READINESS_CHECK` - Gathering pre-op requirements
- `READY_TO_SCHEDULE` - All checks passed
- `SCHEDULED` - Surgery date set

**Key Roles:**
- **Doctor** - Creates case plan, defines procedure details
- **Nurse** - Manages readiness checklist, collects vitals/photos
- **Frontdesk** - Schedules surgery, manages consent forms
- **Patient** - Completes forms, signs consent

### Phase 2: Intra-Operative Care

**Trigger:** Patient arrives on surgery day, checked into theatre

**Entities:**
- `SurgicalProcedureRecord` - The operative record
- `TheaterBooking` - Theatre time slot
- `SurgicalStaff` - Team members present
- `Theater` - Physical OR room

**Key Timestamps:**
```typescript
interface OperativeTimestamps {
  anesthesia_start: DateTime;  // Anesthesia begins
  incision_time: DateTime;     // First incision
  closure_time: DateTime;      // Closure begins
  wheels_out: DateTime;        // Patient leaves theatre
}
```

**Workflow States:**
- `IN_PREP` - Patient in pre-op holding
- `IN_THEATER` - Surgery in progress

**Key Roles:**
- **Surgeon** - Performs procedure, documents operative notes
- **Nurse** - Pre-op prep, assists in theatre, documentation
- **Anesthesia** - Anesthesia management (may be external)

### Phase 3: Post-Operative Care

**Trigger:** Surgery completed, patient transferred to recovery

**Entities:**
- `VitalSign` - Post-op vitals monitoring
- `NursingNote` - Recovery notes
- `MedicationAdministration` - Pain management, antibiotics
- `Appointment` - Follow-up appointments

**Workflow States:**
- `RECOVERY` - Immediate post-op monitoring
- `FOLLOW_UP` - Discharged, follow-up care period
- `COMPLETED` - Case closed, all follow-ups done

**Key Roles:**
- **Nurse** - Post-op monitoring, discharge prep
- **Doctor** - Post-op checks, discharge authorization
- **Frontdesk** - Discharge paperwork, follow-up scheduling

---

## Database Schema Summary

### Core Tables (Already Exist)

| Table | Purpose |
|-------|---------|
| `SurgicalCase` | Master surgery record, links consultation to outcome |
| `CasePlan` | Pre-op planning details, readiness tracking |
| `TheaterBooking` | Theatre scheduling with optimistic locking |
| `SurgicalProcedureRecord` | Intra-op documentation |
| `ConsentForm` | Legal consent with signatures |
| `PatientImage` | Clinical photography |
| `VitalSign` | Patient vitals at any point |
| `Theater` | Physical theatre rooms |
| `SurgicalStaff` | Staff assigned to procedures |

### Enums (Already Exist)

| Enum | Values |
|------|--------|
| `SurgicalCaseStatus` | DRAFT, PLANNING, READY_FOR_SCHEDULING, SCHEDULED, IN_PREP, IN_THEATER, RECOVERY, COMPLETED, CANCELLED |
| `CaseReadinessStatus` | NOT_STARTED, IN_PROGRESS, PENDING_LABS, PENDING_CONSENT, PENDING_REVIEW, READY, ON_HOLD |
| `SurgicalUrgency` | ELECTIVE, URGENT, EMERGENCY |
| `TheaterBookingStatus` | PROVISIONAL, CONFIRMED, CANCELLED, COMPLETED |
| `ConsentType` | PROCEDURE, ANESTHESIA, BLOOD_PRODUCTS, PHOTOGRAPHY, RESEARCH |
| `ConsentStatus` | DRAFT, SENT, SIGNED, EXPIRED, REVOKED |
| `ImageTimepoint` | PRE_OP, INTRA_OP, POST_OP_IMMEDIATE, POST_OP_1_WEEK, etc. |
| `ImageAngle` | FRONTAL, LEFT_OBLIQUE, RIGHT_OBLIQUE, LEFT_LATERAL, RIGHT_LATERAL, etc. |

---

## Existing UI Components

### Doctor Routes
- `/doctor/cases/[appointmentId]` - Case plan management
- `/doctor/patients/[patientId]/case-plans` - Patient's case plans list
- `/doctor/theater` - Theatre schedule view

### Admin Routes
- `/admin/theaters` - Theatre management

---

## Implementation Priorities

### Phase 1: Pre-Op (Recommended First)

1. **Case Plan Creation Flow**
   - When consultation completes with PROCEDURE_RECOMMENDED
   - Doctor defines procedure, risk factors, implant details
   - System creates SurgicalCase and CasePlan

2. **Readiness Dashboard**
   - Nurse sees patients with pending readiness items
   - Checklist UI for completing each item
   - Visual progress indicator

3. **Consent Management**
   - Generate consent forms based on procedure type
   - Patient e-signature capability
   - Witness signature capture

4. **Theatre Scheduling**
   - Calendar view of available slots
   - Booking with conflict detection
   - Optimistic locking for concurrent users

### Phase 2: Intra-Op

1. **Theatre Day View**
   - Today's surgical schedule
   - Patient status tracking (in prep, in theater, recovery)

2. **Operative Record Entry**
   - Timestamps capture
   - Staff assignment
   - Procedure details

3. **Real-time Status Updates**
   - Waiting room notifications
   - Nurse station display

### Phase 3: Post-Op

1. **Recovery Monitoring**
   - Vitals charting
   - Pain scores
   - Discharge criteria checklist

2. **Discharge Workflow**
   - Instructions generation
   - Prescription printing
   - Follow-up scheduling

3. **Follow-up Management**
   - Automated reminders
   - Photo comparison (pre-op vs post-op)
   - Outcome tracking

---

## Integration Points

### From Consultation → Surgery
```typescript
// When consultation completes with PROCEDURE_RECOMMENDED
async function onConsultationComplete(consultation: Consultation) {
  if (consultation.outcome_type === 'PROCEDURE_RECOMMENDED' && 
      consultation.patient_decision === 'YES') {
    
    // Create SurgicalCase
    const surgicalCase = await createSurgicalCase({
      patient_id: consultation.patient_id,
      primary_surgeon_id: consultation.doctor_id,
      consultation_id: consultation.id,
      urgency: 'ELECTIVE',
      status: 'DRAFT',
      procedure_name: consultation.recommended_procedure,
    });
    
    // Create CasePlan
    await createCasePlan({
      surgical_case_id: surgicalCase.id,
      patient_id: consultation.patient_id,
      doctor_id: consultation.doctor_id,
      readiness_status: 'NOT_STARTED',
    });
    
    // Notify nurse for readiness workflow
    await notifyNurse(surgicalCase.id, 'New case requires pre-op preparation');
  }
}
```

### From Pre-Op → Intra-Op
```typescript
// When patient checks in on surgery day
async function onSurgeryDayCheckIn(surgicalCase: SurgicalCase) {
  await updateSurgicalCaseStatus(surgicalCase.id, 'IN_PREP');
  await notifyTheaterTeam(surgicalCase.id, 'Patient in pre-op holding');
}
```

### From Intra-Op → Post-Op
```typescript
// When surgery completes
async function onSurgeryComplete(procedureRecord: SurgicalProcedureRecord) {
  await updateSurgicalCaseStatus(procedureRecord.surgical_case_id, 'RECOVERY');
  await scheduleFollowUp(procedureRecord.surgical_case_id, '1 week');
  await notifyRecoveryNurse(procedureRecord.surgical_case_id);
}
```

---

## Role-Specific Dashboards Needed

### Nurse Dashboard Additions
- Patients awaiting pre-op readiness work
- Today's surgery prep list
- Recovery patients needing monitoring

### Doctor Dashboard Additions  
- Pending case plans to complete
- Today's surgical schedule
- Post-op patients requiring review

### Frontdesk Dashboard Additions
- Patients needing consent forms
- Surgery schedule overview
- Discharge queue

---

## Questions Before Implementation

1. **Theatre Management**
   - How many operating theatres?
   - What are standard surgery block times?
   - Who manages theatre scheduling (frontdesk, nurse, surgeon)?

2. **Consent Workflow**
   - Are consents signed in-person or can patients sign remotely?
   - What consent types are required per procedure?
   - How long before surgery must consent be signed?

3. **Lab Integration**
   - Are labs done in-house or external?
   - How are results received (manual entry, integration)?
   - What labs are required for surgical clearance?

4. **Post-Op Protocol**
   - Standard follow-up schedule (1 week, 1 month, 3 months)?
   - What vitals/metrics are tracked in recovery?
   - Discharge criteria checklist?

---

## Recommended Starting Point

Begin with the **Consultation → Case Plan** transition:

1. Update `CompleteConsultationUseCase` to auto-create `SurgicalCase` when outcome is `PROCEDURE_RECOMMENDED` and patient says `YES`

2. Create `/doctor/cases/new` page for manually creating cases (for walk-ins or referrals)

3. Enhance `/doctor/cases/[id]` page for full case planning

4. Create `/nurse/pre-op` dashboard for readiness workflow

This gives a complete Pre-Op workflow before tackling the more complex Theatre and Recovery phases.
