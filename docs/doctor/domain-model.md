# Doctor Workflow Domain Model
## Aesthetic Surgery Center - Event-Driven Clinical Workflow

**Last Updated:** January 2025  
**Status:** Design Phase  
**Author:** System Architecture Team

---

## 🎯 Core Principles

This domain model is built on the foundation that:
- **Surgeons are NOT clerks** - Their work is event-driven and decision-driven
- **Clinical events, not appointments** - Consultations, surgeries, and follow-ups are clinical events
- **Decisions are first-class** - Eligibility, treatment recommendations, next steps must be explicit
- **System stays out of the way** - Minimal friction, maximum support

---

## 📋 Table of Contents

1. [Core Clinical Entities](#core-clinical-entities)
2. [Event Types](#event-types)
3. [Decision Points & Ownership](#decision-points--ownership)
4. [State Machines](#state-machines)
5. [Invariants](#invariants)

---

## 🏗️ Core Clinical Entities

### 1. ConsultationRequest

**Purpose:** Represents a patient's request for a consultation, requiring a doctor's clinical decision.

**Owner:** 
- **Created by:** Patient
- **Reviewed by:** Frontdesk (triage/assignment) → Doctor (clinical acceptance)
- **Decision owned by:** Doctor

**Lifecycle:**
1. Patient submits consultation request
2. Frontdesk reviews (triage/assignment)
3. Doctor reviews (clinical acceptance decision)
4. Doctor makes decision: Accept / Decline / Request More Info
5. If accepted → transitions to Appointment → Consultation

**Key Attributes:**
- `id`: Unique identifier
- `patient_id`: Patient requesting consultation
- `doctor_id`: Assigned doctor (may be null initially)
- `concern_description`: Patient's aesthetic concern/goal
- `preferred_service`: Service/procedure of interest
- `preferred_date`: Patient's preferred date
- `preferred_time`: Patient's preferred time
- `medical_safety_info`: Safety questions (over 18, conditions, pregnancy)
- `status`: ConsultationRequestStatus
- `submitted_at`: When patient submitted
- `reviewed_by`: User ID who reviewed (Frontdesk)
- `reviewed_at`: When reviewed
- `doctor_reviewed_by`: Doctor ID who made clinical decision
- `doctor_reviewed_at`: When doctor reviewed
- `review_notes`: Notes from review
- `decision_reason`: Reason for accept/decline (if applicable)

**Invariants:**
- ConsultationRequest MUST have a patient_id
- ConsultationRequest MUST have a concern_description
- ConsultationRequest MUST have medical_safety_info
- Once in final state (CONFIRMED, CANCELLED), cannot be modified
- Doctor can only review requests assigned to them
- Decision (Accept/Decline/Request Info) MUST be made by a Doctor

**Relationships:**
- Belongs to: Patient
- Belongs to: Doctor (optional, assigned during review)
- Creates: Appointment (when accepted)
- Creates: Consultation (when appointment executed)

---

### 2. Consultation

**Purpose:** Represents a clinical consultation event where a doctor evaluates a patient and makes treatment decisions.

**Owner:**
- **Created by:** Doctor (when starting consultation)
- **Owned by:** Doctor (clinical decisions)
- **Documented by:** Doctor

**Lifecycle:**
1. Appointment scheduled and confirmed
2. Patient checks in
3. Doctor starts consultation (creates Consultation entity)
4. Doctor conducts clinical assessment
5. Doctor makes decisions (eligibility, treatment, next steps)
6. Doctor documents findings
7. Doctor completes consultation
8. Consultation may trigger: Surgery planning, Follow-up scheduling, or Decline

**Key Attributes:**
- `id`: Unique identifier
- `appointment_id`: Links to Appointment
- `patient_id`: Patient being consulted
- `doctor_id`: Doctor conducting consultation
- `started_at`: When consultation started
- `completed_at`: When consultation completed
- `status`: ConsultationStatus (IN_PROGRESS, COMPLETED, CANCELLED)
- `clinical_assessment`: Structured assessment notes
- `freeform_notes`: Freeform clinical observations
- `eligibility_decision`: EligibilityDecision (APPROPRIATE, NOT_APPROPRIATE, DEFER)
- `eligibility_reason`: Reason for eligibility decision
- `treatment_recommendation`: Recommended procedure/treatment
- `procedure_type`: Type of procedure (if surgery recommended)
- `risks_communicated`: Risks discussed with patient
- `expected_outcomes`: Expected outcomes communicated
- `next_steps`: NextSteps (SURGERY, FOLLOW_UP, DECLINE, NONE)
- `surgery_recommended`: Boolean (if surgery is recommended)
- `follow_up_required`: Boolean
- `follow_up_type`: FollowUpType (IN_PERSON, VIRTUAL, PHONE)
- `follow_up_timeline`: When follow-up should occur

**Invariants:**
- Consultation MUST be linked to an Appointment
- Consultation MUST have a doctor_id
- Consultation MUST have a patient_id
- Consultation can only be started by the assigned doctor
- Consultation can only be completed by the doctor who started it
- Eligibility decision MUST be made before completion
- If surgery recommended, procedure_type MUST be specified
- If follow-up required, follow_up_type and follow_up_timeline MUST be specified
- Consultation cannot be modified after completion (only notes can be added)

**Relationships:**
- Belongs to: Appointment
- Belongs to: Patient
- Belongs to: Doctor
- May create: Surgery (if surgery recommended)
- May create: FollowUp (if follow-up required)
- References: Previous Consultations (for continuity)

---

### 3. Surgery

**Purpose:** Represents a planned clinical event for surgical procedure execution.

**Owner:**
- **Planned by:** Doctor (after consultation)
- **Scheduled by:** Frontdesk/Admin (coordination)
- **Executed by:** Doctor (surgeon)
- **Documented by:** Doctor (post-surgery)

**Lifecycle:**
1. Consultation completed with surgery recommendation
2. Doctor plans surgery (creates Surgery entity)
3. Surgical planning phase (coordination, finalization)
4. Surgery scheduled (date/time confirmed)
5. Surgery day arrives
6. Surgery executed (minimal system interaction)
7. Post-surgery documentation (operative notes, observations)
8. Surgery completed
9. May trigger: Follow-up scheduling

**Key Attributes:**
- `id`: Unique identifier
- `consultation_id`: Links to originating Consultation
- `appointment_id`: Links to Appointment (surgery appointment)
- `patient_id`: Patient undergoing surgery
- `doctor_id`: Surgeon performing surgery
- `procedure_type`: Type of surgical procedure
- `surgical_approach`: Planned surgical approach
- `estimated_duration`: Estimated duration in minutes
- `assistance_needed`: Boolean (another surgeon, assistants)
- `assisting_doctors`: Array of doctor IDs (if assistance needed)
- `anesthetist_id`: Anesthetist ID (if applicable)
- `status`: SurgeryStatus (PLANNING, SCHEDULED, READY, IN_PROGRESS, COMPLETED, CANCELLED)
- `planning_started_at`: When planning began
- `scheduled_at`: When surgery is scheduled
- `started_at`: When surgery started
- `completed_at`: When surgery completed
- `operative_notes`: Post-surgery operative notes
- `immediate_observations`: Immediate post-op observations
- `follow_up_instructions`: Instructions for follow-up
- `coordination_notes`: Notes for team coordination

**Invariants:**
- Surgery MUST be linked to a Consultation that recommended surgery
- Surgery MUST have a doctor_id (surgeon)
- Surgery MUST have a patient_id
- Surgery MUST have a procedure_type
- Surgery can only be planned by the doctor who conducted the consultation
- Surgery cannot be executed before scheduled date/time
- Surgery status cannot go backwards (COMPLETED → IN_PROGRESS is invalid)
- Post-surgery documentation can happen after completion
- System MUST stay out of the way during surgery execution (minimal/no UI)

**Relationships:**
- Belongs to: Consultation (originating consultation)
- Belongs to: Appointment (surgery appointment)
- Belongs to: Patient
- Belongs to: Doctor (surgeon)
- May have: Assisting Doctors
- May have: Anesthetist
- May create: FollowUp (post-surgery follow-up)

---

### 4. FollowUp

**Purpose:** Represents a continuation of clinical care, not a new case.

**Owner:**
- **Created by:** Doctor (during consultation or surgery completion)
- **Scheduled by:** Frontdesk/Admin (coordination)
- **Conducted by:** Doctor
- **Documented by:** Doctor

**Lifecycle:**
1. Consultation or Surgery completed with follow-up requirement
2. FollowUp entity created
3. FollowUp scheduled (date/time)
4. FollowUp appointment created
5. FollowUp conducted
6. Progress reviewed
7. FollowUp completed
8. May trigger: Another FollowUp or case closure

**Key Attributes:**
- `id`: Unique identifier
- `origin_type`: OriginType (CONSULTATION, SURGERY)
- `origin_id`: ID of originating Consultation or Surgery
- `appointment_id`: Links to Appointment (follow-up appointment)
- `patient_id`: Patient for follow-up
- `doctor_id`: Doctor conducting follow-up
- `follow_up_type`: FollowUpType (IN_PERSON, VIRTUAL, PHONE)
- `follow_up_reason`: Reason for follow-up
- `scheduled_date`: Scheduled date
- `scheduled_time`: Scheduled time
- `status`: FollowUpStatus (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)
- `progress_notes`: Notes on healing/progress
- `complications`: Any complications observed
- `care_plan_adjustments`: Adjustments to care plan
- `next_follow_up_required`: Boolean
- `next_follow_up_timeline`: When next follow-up needed (if applicable)
- `completed_at`: When follow-up completed

**Invariants:**
- FollowUp MUST be linked to a Consultation or Surgery
- FollowUp MUST have a patient_id
- FollowUp MUST have a doctor_id
- FollowUp MUST have a follow_up_type
- FollowUp MUST have a follow_up_reason
- FollowUp is a continuation, not a new case (full timeline must be visible)
- Previous consultations/surgeries must be easily accessible
- FollowUp cannot be created without originating Consultation or Surgery

**Relationships:**
- Belongs to: Consultation OR Surgery (originating event)
- Belongs to: Appointment (follow-up appointment)
- Belongs to: Patient
- Belongs to: Doctor
- References: Full patient timeline (consultation → surgery → follow-up)

---

### 5. Appointment

**Purpose:** Represents a scheduling container for clinical events (consultations, surgeries, follow-ups).

**Owner:**
- **Created by:** System (when consultation request accepted) or Frontdesk/Admin
- **Scheduled by:** Frontdesk/Admin or Doctor (when accepting consultation request)
- **Confirmed by:** Patient
- **Checked in by:** Frontdesk/Nurse/Doctor

**Lifecycle:**
1. Created when consultation request accepted or manually scheduled
2. Date/time set
3. Patient confirms
4. Appointment day arrives
5. Patient checks in
6. Clinical event occurs (Consultation, Surgery, FollowUp)
7. Appointment completed

**Key Attributes:**
- `id`: Unique identifier
- `patient_id`: Patient
- `doctor_id`: Doctor
- `appointment_date`: Date of appointment
- `time`: Time of appointment (HH:mm)
- `status`: AppointmentStatus (PENDING, SCHEDULED, CANCELLED, COMPLETED)
- `type`: AppointmentType (CONSULTATION, SURGERY, FOLLOW_UP, PROCEDURE)
- `note`: General notes
- `reason`: Reason for appointment
- `checked_in_at`: When patient checked in
- `checked_in_by`: User ID who checked in patient
- `consultation_request_status`: ConsultationRequestStatus (if from consultation request)
- `reviewed_by`: User ID who reviewed (Frontdesk)
- `reviewed_at`: When reviewed
- `review_notes`: Notes from review

**Invariants:**
- Appointment MUST have a patient_id
- Appointment MUST have a doctor_id
- Appointment MUST have a valid date and time
- Appointment date cannot be in the past (for new appointments)
- Appointment can only be checked in on the appointment date
- Appointment status transitions must be valid
- Appointment type must match the clinical event it contains

**Relationships:**
- Belongs to: Patient
- Belongs to: Doctor
- May contain: Consultation
- May contain: Surgery
- May contain: FollowUp
- May originate from: ConsultationRequest

---

### 6. DoctorOnboarding

**Purpose:** Represents the doctor activation and profile completion workflow.

**Owner:**
- **Created by:** Admin/Frontdesk (invitation)
- **Activated by:** Doctor (via invite token)
- **Profile completed by:** Doctor
- **Activated by:** System (after profile completion)

**Lifecycle:**
1. Admin/Frontdesk creates Doctor record and invitation
2. Doctor receives invitation email
3. Doctor activates account (sets password)
4. Doctor completes required profile fields
5. System activates doctor account
6. Doctor can now access system

**Key Attributes:**
- `doctor_id`: Doctor ID
- `onboarding_status`: DoctorOnboardingStatus
- `invited_at`: When invited
- `invited_by`: User ID who invited
- `activated_at`: When account activated
- `profile_completed_at`: When profile completed
- `invite_token`: DoctorInviteToken (temporary)

**Invariants:**
- Doctor MUST be invited by Admin/Frontdesk (no self-registration)
- Doctor MUST activate account before profile completion
- Doctor MUST complete required profile fields before system activation
- Doctor cannot authenticate until onboarding_status is ACTIVE
- Invite token MUST be valid and not expired
- Invite token can only be used once

**Relationships:**
- Belongs to: Doctor
- Uses: DoctorInviteToken

---

## 🎯 Event Types

### Consultation Request Events

1. **ConsultationRequestSubmitted**
   - **Triggered by:** Patient
   - **Creates:** ConsultationRequest (status: SUBMITTED)
   - **Creates:** Appointment (status: PENDING)
   - **Notifies:** Frontdesk

2. **ConsultationRequestAssigned**
   - **Triggered by:** Frontdesk
   - **Updates:** ConsultationRequest (assigns doctor_id)
   - **Updates:** ConsultationRequestStatus → PENDING_REVIEW
   - **Notifies:** Doctor

3. **ConsultationRequestAccepted**
   - **Triggered by:** Doctor
   - **Updates:** ConsultationRequestStatus → APPROVED → SCHEDULED
   - **Updates:** Appointment (sets date/time, status: SCHEDULED)
   - **Notifies:** Patient

4. **ConsultationRequestDeclined**
   - **Triggered by:** Doctor
   - **Updates:** ConsultationRequestStatus → CANCELLED
   - **Updates:** AppointmentStatus → CANCELLED
   - **Notifies:** Patient

5. **ConsultationRequestMoreInfoRequested**
   - **Triggered by:** Doctor
   - **Updates:** ConsultationRequestStatus → NEEDS_MORE_INFO
   - **Notifies:** Patient

6. **ConsultationRequestResubmitted**
   - **Triggered by:** Patient (after more info requested)
   - **Updates:** ConsultationRequestStatus → SUBMITTED
   - **Notifies:** Doctor

### Consultation Events

7. **ConsultationStarted**
   - **Triggered by:** Doctor
   - **Creates:** Consultation (status: IN_PROGRESS)
   - **Updates:** Appointment (links to Consultation)

8. **ConsultationCompleted**
   - **Triggered by:** Doctor
   - **Updates:** Consultation (status: COMPLETED, sets completed_at)
   - **Updates:** AppointmentStatus → COMPLETED
   - **May create:** Surgery (if surgery recommended)
   - **May create:** FollowUp (if follow-up required)
   - **Notifies:** Patient (optional)

### Surgery Events

9. **SurgeryPlanned**
   - **Triggered by:** Doctor (after consultation completion)
   - **Creates:** Surgery (status: PLANNING)
   - **Links to:** Consultation

10. **SurgeryScheduled**
    - **Triggered by:** Frontdesk/Admin (coordination)
    - **Updates:** SurgeryStatus → SCHEDULED
    - **Creates:** Appointment (type: SURGERY)
    - **Sets:** scheduled_at

11. **SurgeryReady**
    - **Triggered by:** System/Doctor (on surgery day, pre-surgery checks complete)
    - **Updates:** SurgeryStatus → READY

12. **SurgeryStarted**
    - **Triggered by:** Doctor (when surgery begins)
    - **Updates:** SurgeryStatus → IN_PROGRESS
    - **Sets:** started_at
    - **System:** Minimal/no UI interaction

13. **SurgeryCompleted**
    - **Triggered by:** Doctor (when surgery ends)
    - **Updates:** SurgeryStatus → COMPLETED
    - **Sets:** completed_at
    - **May create:** FollowUp (post-surgery follow-up)
    - **Notifies:** Patient (optional)

### Follow-Up Events

14. **FollowUpScheduled**
    - **Triggered by:** Doctor (during consultation/surgery completion) or Frontdesk
    - **Creates:** FollowUp (status: SCHEDULED)
    - **Creates:** Appointment (type: FOLLOW_UP)
    - **Links to:** Originating Consultation or Surgery

15. **FollowUpStarted**
    - **Triggered by:** Doctor
    - **Updates:** FollowUpStatus → IN_PROGRESS

16. **FollowUpCompleted**
    - **Triggered by:** Doctor
    - **Updates:** FollowUpStatus → COMPLETED
    - **Sets:** completed_at
    - **May create:** Another FollowUp (if needed)

---

## 🎯 Decision Points & Ownership

### Consultation Request Decisions

| Decision Point | Owner | Decision Options | When Made |
|----------------|-------|-------------------|-----------|
| **Accept Consultation Request** | Doctor | Accept / Decline / Request More Info | When reviewing consultation request |
| **Set Appointment Date/Time** | Doctor (when accepting) or Frontdesk | Select date/time | When accepting consultation request |
| **Request More Information** | Doctor | Provide specific questions | When reviewing consultation request |
| **Decline Consultation Request** | Doctor | Provide reason (optional) | When reviewing consultation request |

### Consultation Decisions

| Decision Point | Owner | Decision Options | When Made |
|----------------|-------|-------------------|-----------|
| **Eligibility Decision** | Doctor | APPROPRIATE / NOT_APPROPRIATE / DEFER | During consultation |
| **Treatment Recommendation** | Doctor | Procedure type, approach | During consultation |
| **Surgery Recommendation** | Doctor | Yes / No | During consultation |
| **Follow-Up Requirement** | Doctor | Yes / No, Type, Timeline | During consultation |
| **Risks Communication** | Doctor | Document risks discussed | During consultation |

### Surgery Decisions

| Decision Point | Owner | Decision Options | When Made |
|----------------|-------|-------------------|-----------|
| **Surgical Approach** | Doctor | Finalize approach | During planning phase |
| **Assistance Needed** | Doctor | Yes / No, Who | During planning phase |
| **Anesthetist Required** | Doctor | Yes / No, Who | During planning phase |
| **Surgery Readiness** | Doctor | Ready / Not Ready | Pre-surgery |
| **Post-Surgery Follow-Up** | Doctor | Yes / No, Type, Timeline | Post-surgery |

### Follow-Up Decisions

| Decision Point | Owner | Decision Options | When Made |
|----------------|-------|-------------------|-----------|
| **Follow-Up Required** | Doctor | Yes / No | During consultation/surgery completion |
| **Follow-Up Type** | Doctor | IN_PERSON / VIRTUAL / PHONE | When scheduling follow-up |
| **Care Plan Adjustment** | Doctor | Document adjustments | During follow-up |
| **Next Follow-Up Needed** | Doctor | Yes / No, Timeline | During follow-up |

---

## 🔄 State Machines

### 1. ConsultationRequest State Machine

**States:**
- `SUBMITTED` - Patient submitted request
- `PENDING_REVIEW` - Assigned to doctor, awaiting review
- `NEEDS_MORE_INFO` - Doctor requested more information
- `APPROVED` - Doctor approved, awaiting scheduling
- `SCHEDULED` - Date/time set, awaiting patient confirmation
- `CONFIRMED` - Patient confirmed, ready for appointment day
- `CANCELLED` - Request declined or cancelled

**Valid Transitions:**

```
[SUBMITTED]
  │
  ├─→ Frontdesk assigns → [PENDING_REVIEW]
  │
  └─→ Doctor reviews directly → [PENDING_REVIEW]

[PENDING_REVIEW]
  │
  ├─→ Doctor Accepts → [APPROVED]
  │                      │
  │                      └─→ Date/Time Set → [SCHEDULED]
  │                                           │
  │                                           └─→ Patient Confirms → [CONFIRMED]
  │
  ├─→ Doctor Requests More Info → [NEEDS_MORE_INFO]
  │                                  │
  │                                  ├─→ Patient Resubmits → [SUBMITTED] (loop)
  │                                  │
  │                                  └─→ Doctor Reviews Again → [PENDING_REVIEW]
  │
  └─→ Doctor Declines → [CANCELLED]

[APPROVED]
  │
  ├─→ Date/Time Set → [SCHEDULED]
  │
  └─→ Cancelled → [CANCELLED]

[SCHEDULED]
  │
  ├─→ Patient Confirms → [CONFIRMED]
  │
  └─→ Cancelled → [CANCELLED]

[NEEDS_MORE_INFO]
  │
  ├─→ Patient Resubmits → [SUBMITTED]
  │
  ├─→ Doctor Reviews → [PENDING_REVIEW]
  │
  └─→ Cancelled → [CANCELLED]

[CONFIRMED]
  │
  └─→ (Transitions to Appointment lifecycle)

[CANCELLED]
  │
  └─→ (Final state, no further transitions)
```

**Who Can Trigger Each Transition:**

| Transition | Triggered By | Conditions |
|------------|--------------|------------|
| SUBMITTED → PENDING_REVIEW | Frontdesk or System (auto) | Request assigned to doctor |
| PENDING_REVIEW → APPROVED | Doctor | Doctor accepts request |
| APPROVED → SCHEDULED | Doctor or Frontdesk | Date/time set |
| SCHEDULED → CONFIRMED | Patient | Patient confirms availability |
| PENDING_REVIEW → NEEDS_MORE_INFO | Doctor | Doctor requests more info |
| NEEDS_MORE_INFO → SUBMITTED | Patient | Patient resubmits with info |
| PENDING_REVIEW → CANCELLED | Doctor | Doctor declines |
| Any → CANCELLED | Doctor, Frontdesk, Admin | Request cancelled |

---

### 2. Appointment State Machine

**States:**
- `PENDING` - Created, awaiting scheduling
- `SCHEDULED` - Date/time set, awaiting confirmation
- `CANCELLED` - Cancelled
- `COMPLETED` - Appointment completed

**Valid Transitions:**

```
[PENDING]
  │
  ├─→ Date/Time Set → [SCHEDULED]
  │
  └─→ Cancelled → [CANCELLED]

[SCHEDULED]
  │
  ├─→ Patient Confirms → [SCHEDULED] (status unchanged, confirmed flag set)
  │
  ├─→ Patient Checks In → [SCHEDULED] (status unchanged, checked_in_at set)
  │
  ├─→ Clinical Event Starts → [SCHEDULED] (status unchanged, event in progress)
  │
  ├─→ Clinical Event Completes → [COMPLETED]
  │
  └─→ Cancelled → [CANCELLED]

[COMPLETED]
  │
  └─→ (Final state, no further transitions)

[CANCELLED]
  │
  └─→ (Final state, no further transitions)
```

**Who Can Trigger Each Transition:**

| Transition | Triggered By | Conditions |
|------------|--------------|------------|
| PENDING → SCHEDULED | Doctor (when accepting) or Frontdesk | Date/time set |
| SCHEDULED → COMPLETED | Doctor | Consultation/Surgery/FollowUp completed |
| Any → CANCELLED | Doctor, Frontdesk, Admin, Patient | Appointment cancelled |

---

### 3. Surgery State Machine

**States:**
- `PLANNING` - Surgery being planned (post-consultation)
- `SCHEDULED` - Surgery scheduled, date/time confirmed
- `READY` - Pre-surgery checks complete, ready to proceed
- `IN_PROGRESS` - Surgery in progress
- `COMPLETED` - Surgery completed
- `CANCELLED` - Surgery cancelled

**Valid Transitions:**

```
[PLANNING]
  │
  ├─→ Date/Time Set → [SCHEDULED]
  │
  └─→ Cancelled → [CANCELLED]

[SCHEDULED]
  │
  ├─→ Pre-Surgery Checks Complete → [READY]
  │
  └─→ Cancelled → [CANCELLED]

[READY]
  │
  ├─→ Surgery Starts → [IN_PROGRESS]
  │
  └─→ Cancelled → [CANCELLED]

[IN_PROGRESS]
  │
  └─→ Surgery Completes → [COMPLETED]

[COMPLETED]
  │
  └─→ (Final state, no further transitions)

[CANCELLED]
  │
  └─→ (Final state, no further transitions)
```

**Who Can Trigger Each Transition:**

| Transition | Triggered By | Conditions |
|------------|--------------|------------|
| PLANNING → SCHEDULED | Frontdesk/Admin | Date/time confirmed |
| SCHEDULED → READY | Doctor or System | Pre-surgery checks complete |
| READY → IN_PROGRESS | Doctor | Surgery begins |
| IN_PROGRESS → COMPLETED | Doctor | Surgery ends |
| Any → CANCELLED | Doctor, Frontdesk, Admin | Surgery cancelled |

**Critical Invariant:** System MUST stay out of the way during IN_PROGRESS state (minimal/no UI).

---

### 4. DoctorOnboarding State Machine

**States:**
- `INVITED` - Doctor invited, awaiting activation
- `ACTIVATED` - Account activated, awaiting profile completion
- `PROFILE_COMPLETED` - Profile completed, awaiting system activation
- `ACTIVE` - Fully active, can access system

**Valid Transitions:**

```
[INVITED]
  │
  └─→ Doctor Activates Account → [ACTIVATED]

[ACTIVATED]
  │
  └─→ Doctor Completes Profile → [PROFILE_COMPLETED]

[PROFILE_COMPLETED]
  │
  └─→ System Activates → [ACTIVE]

[ACTIVE]
  │
  └─→ (Final state, can use system)
```

**Who Can Trigger Each Transition:**

| Transition | Triggered By | Conditions |
|------------|--------------|------------|
| INVITED → ACTIVATED | Doctor | Doctor activates via invite token |
| ACTIVATED → PROFILE_COMPLETED | Doctor | Required profile fields completed |
| PROFILE_COMPLETED → ACTIVE | System | Automatic after profile completion |

**Invariants:**
- Doctor cannot authenticate until ACTIVE
- All transitions are one-way (no rollback)
- Profile completion is required before ACTIVE

---

## 🔒 Invariants

### Global Invariants

1. **Clinical Event Ownership**
   - All clinical events (Consultation, Surgery, FollowUp) MUST be owned by a Doctor
   - Only the assigned Doctor can make clinical decisions
   - Clinical decisions cannot be delegated to non-clinical roles

2. **Event-Driven Architecture**
   - System models clinical events, not screens/forms/tabs
   - All state transitions represent clinical events or decisions
   - No UI-first abstractions

3. **Decision Capture**
   - All clinical decisions MUST be explicitly captured
   - Decisions cannot be inferred from state alone
   - Decision reasons MUST be documented (where applicable)

4. **Timeline Continuity**
   - Follow-ups MUST be linked to originating Consultation or Surgery
   - Full patient journey MUST be visible (consultation → surgery → follow-up)
   - Previous clinical events MUST be easily accessible

5. **System Stays Out of the Way**
   - During surgery execution, system MUST have minimal/no UI
   - Documentation can happen post-surgery
   - No complex forms during clinical events

### ConsultationRequest Invariants

1. ConsultationRequest MUST have a patient_id
2. ConsultationRequest MUST have a concern_description
3. ConsultationRequest MUST have medical_safety_info
4. Doctor can only review requests assigned to them
5. Decision (Accept/Decline/Request Info) MUST be made by a Doctor
6. Once in final state (CONFIRMED, CANCELLED), cannot be modified

### Consultation Invariants

1. Consultation MUST be linked to an Appointment
2. Consultation MUST have a doctor_id
3. Consultation MUST have a patient_id
4. Consultation can only be started by the assigned doctor
5. Consultation can only be completed by the doctor who started it
6. Eligibility decision MUST be made before completion
7. If surgery recommended, procedure_type MUST be specified
8. If follow-up required, follow_up_type and follow_up_timeline MUST be specified
9. Consultation cannot be modified after completion (only notes can be added)

### Surgery Invariants

1. Surgery MUST be linked to a Consultation that recommended surgery
2. Surgery MUST have a doctor_id (surgeon)
3. Surgery MUST have a patient_id
4. Surgery MUST have a procedure_type
5. Surgery can only be planned by the doctor who conducted the consultation
6. Surgery cannot be executed before scheduled date/time
7. Surgery status cannot go backwards (COMPLETED → IN_PROGRESS is invalid)
8. Post-surgery documentation can happen after completion
9. System MUST stay out of the way during surgery execution (minimal/no UI)

### FollowUp Invariants

1. FollowUp MUST be linked to a Consultation or Surgery
2. FollowUp MUST have a patient_id
3. FollowUp MUST have a doctor_id
4. FollowUp MUST have a follow_up_type
5. FollowUp MUST have a follow_up_reason
6. FollowUp is a continuation, not a new case (full timeline must be visible)
7. Previous consultations/surgeries must be easily accessible
8. FollowUp cannot be created without originating Consultation or Surgery

### Appointment Invariants

1. Appointment MUST have a patient_id
2. Appointment MUST have a doctor_id
3. Appointment MUST have a valid date and time
4. Appointment date cannot be in the past (for new appointments)
5. Appointment can only be checked in on the appointment date
6. Appointment status transitions must be valid
7. Appointment type must match the clinical event it contains

### DoctorOnboarding Invariants

1. Doctor MUST be invited by Admin/Frontdesk (no self-registration)
2. Doctor MUST activate account before profile completion
3. Doctor MUST complete required profile fields before system activation
4. Doctor cannot authenticate until onboarding_status is ACTIVE
5. Invite token MUST be valid and not expired
6. Invite token can only be used once

---

## 📊 Entity Relationships Summary

```
Patient
  ├─→ ConsultationRequest (1:N)
  │     └─→ Appointment (1:1)
  │           └─→ Consultation (1:1)
  │                 └─→ Surgery (1:1)
  │                       └─→ FollowUp (1:N)
  │
  ├─→ Appointment (1:N)
  │     ├─→ Consultation (1:1)
  │     ├─→ Surgery (1:1)
  │     └─→ FollowUp (1:1)
  │
  └─→ MedicalRecord (1:N)

Doctor
  ├─→ ConsultationRequest (1:N) [assigned]
  ├─→ Consultation (1:N) [conducts]
  ├─→ Surgery (1:N) [performs]
  ├─→ FollowUp (1:N) [conducts]
  └─→ DoctorOnboarding (1:1)
```

---

## 🎯 Key Design Decisions

1. **ConsultationRequest is Separate from Appointment**
   - ConsultationRequest represents the request/decision workflow
   - Appointment represents the scheduling container
   - This separation allows clear modeling of the decision process

2. **Surgery is a Distinct Entity**
   - Surgery is NOT just an appointment type
   - Surgery has its own lifecycle (planning → scheduled → execution → completion)
   - Surgery is linked to Consultation but is a separate clinical event

3. **FollowUp is a Continuation Entity**
   - FollowUp is NOT a new case
   - FollowUp is always linked to originating Consultation or Surgery
   - Full timeline must be visible

4. **Consultation Captures Decisions Explicitly**
   - Eligibility decision is explicit (not inferred)
   - Treatment recommendations are explicit
   - Next steps are explicit (surgery, follow-up, decline)

5. **System Stays Out of the Way During Surgery**
   - Surgery execution has minimal/no UI
   - Documentation happens post-surgery
   - System supports, doesn't distract

---

**End of Document**
