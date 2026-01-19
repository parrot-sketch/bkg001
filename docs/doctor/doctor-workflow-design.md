# Doctor Workflow Design Document
## Aesthetic Surgery Center - Clinical Event-Driven Doctor Workflows

**Last Updated:** January 2025  
**Status:** Design Phase  
**Author:** System Architecture Team

---

## STEP 1 — SYSTEM UNDERSTANDING

### Existing Patient Workflow (Auth → Consultation → Dashboard)

**Stage 1: Account Creation & Authentication**
- Entry: `/patient/login` or `/patient/register`
- Auth: JWT-based via `JwtAuthService`
- Models: `User` (auth) + `Patient` (profile)
- API: `POST /api/auth/register`, `POST /api/auth/login`
- State: User created → Patient profile may/may not exist

**Stage 2: Patient Profile Creation/Update**
- Entry: `/patient/profile`
- Workflow: Check if `Patient` exists → Create/Update
- API: `GET /api/patients/:id`, `POST /api/patients`, `PUT /api/patients/:id`
- Use Cases: `CreatePatientUseCase`, `UpdatePatientUseCase`
- State: No Patient → Patient Created → Profile Complete

**Stage 3: Consultation Request Submission**
- Entry: `/portal/book-consultation`
- Workflow: Patient selects service/doctor → Provides concern/medical info → Submits
- API: `POST /api/consultations/submit`
- Use Case: `SubmitConsultationRequestUseCase`
- State: Creates `Appointment` with:
  - `AppointmentStatus: PENDING`
  - `ConsultationRequestStatus: SUBMITTED`
  - `doctor_id` (required, selected by patient)

**Stage 4: Frontdesk Review (Triage/Assignment)**
- Entry: `/frontdesk/consultation-requests`
- Workflow: Frontdesk reviews → Can approve/request info/reject
- API: `POST /api/consultations/:id/review`
- Use Case: `ReviewConsultationRequestUseCase`
- State Transitions:
  - `SUBMITTED` → `PENDING_REVIEW` (auto or manual)
  - `PENDING_REVIEW` → `APPROVED` (if approved, sets date/time)
  - `PENDING_REVIEW` → `NEEDS_MORE_INFO` (if needs info)
  - Any → `CANCELLED` (if rejected, via `AppointmentStatus`)

**Stage 5: Patient Confirmation**
- Entry: `/patient/dashboard` or `/patient/consultations`
- Workflow: Patient sees `SCHEDULED` status → Confirms availability
- API: `POST /api/consultations/:id/confirm`
- Use Case: `ConfirmConsultationUseCase`
- State: `SCHEDULED` → `CONFIRMED`

**Stage 6: Appointment Day - Check-in**
- Entry: Doctor/Nurse/Frontdesk can check in
- Workflow: Patient arrives → Staff checks in
- API: `POST /api/appointments/:id/check-in`
- Use Case: `CheckInPatientUseCase`
- State: `AppointmentStatus` remains `SCHEDULED`, `checked_in_at` set

**Stage 7: Consultation Execution**
- Entry: `/doctor/appointments` or `/doctor/consultations`
- Workflow: Doctor starts consultation → Creates `Consultation` record → Completes
- API: `POST /api/consultations/:id/start`, `POST /api/consultations/:id/complete`
- Use Cases: `StartConsultationUseCase`, `CompleteConsultationUseCase`
- State: Consultation started → Consultation completed → `AppointmentStatus: COMPLETED`

**Stage 8: Patient Dashboard**
- Entry: `/patient/dashboard`
- Features: View appointments, consultation history, status tracking
- API: `GET /api/appointments/patient/:patientId`

### Existing Consultation Request Lifecycle

**Entity Model:**
- `Appointment` entity stores consultation request workflow
- `consultation_request_status: ConsultationRequestStatus` (nullable)
- `reviewed_by`, `reviewed_at`, `review_notes` (nullable)

**State Machine:**
```
SUBMITTED → PENDING_REVIEW → APPROVED → SCHEDULED → CONFIRMED
                ↓                    ↓
         NEEDS_MORE_INFO      CANCELLED (via AppointmentStatus)
                ↓
         SUBMITTED (resubmit loop)
```

**Key Invariants:**
- Consultation request MUST have `patient_id`
- Consultation request MUST have `doctor_id` (required at submission)
- Consultation request MUST have `concern_description` (in `note` field)
- State transitions validated via `isValidConsultationRequestTransition()`
- Frontdesk can review (`ReviewConsultationRequestUseCase`)
- Doctor review workflow **NOT YET IMPLEMENTED**

### Existing Appointment Logic

**Appointment Entity:**
- `AppointmentStatus`: `PENDING`, `SCHEDULED`, `CANCELLED`, `COMPLETED`
- `consultation_request_status`: Separate workflow status (nullable)
- `checked_in_at`, `checked_in_by`: Check-in tracking
- `note`: General notes field

**Appointment Workflow:**
- Created with `PENDING` status when consultation request submitted
- Updated to `SCHEDULED` when date/time set (by Frontdesk or Doctor)
- Updated to `COMPLETED` when consultation completed
- Can be `CANCELLED` at any point

**Consultation Entity:**
- Linked to `Appointment` via `appointment_id` (1:1)
- `started_at`, `completed_at`: Timestamps
- `doctor_notes`: Clinical notes
- `outcome`: Consultation outcome
- `follow_up_date`, `follow_up_type`, `follow_up_notes`: Follow-up planning

### Existing Role/Permission Assumptions

**RBAC System:**
- Roles: `ADMIN`, `DOCTOR`, `NURSE`, `FRONTDESK`, `PATIENT`, `CASHIER`, `LAB_TECHNICIAN`
- Permission Model: Resource + Action + Allowed Roles
- Middleware: `RbacMiddleware.requirePermission()`
- Current Doctor Permissions:
  - `consultation.start`: `[ADMIN, DOCTOR]`
  - `consultation.complete`: `[ADMIN, DOCTOR]`
  - `appointment.read`: `[ADMIN, DOCTOR, NURSE, FRONTDESK, PATIENT]`
  - `appointment.update`: `[ADMIN, DOCTOR, FRONTDESK]`

**Assignment Boundaries:**
- Doctors can only act on appointments where `appointment.doctor_id == doctor.id`
- Enforced in use cases (e.g., `StartConsultationUseCase` validates `doctorId` matches)

**Doctor Onboarding:**
- Doctors pre-exist in database (no self-signup)
- `DoctorOnboardingStatus`: `INVITED` → `ACTIVATED` → `PROFILE_COMPLETED` → `ACTIVE`
- Doctors must be `ACTIVE` to authenticate
- **Note:** Onboarding workflow exists but is OUT OF SCOPE for this design

### Integration Points for Doctor Workflow

**Must Plug Into:**
1. **Consultation Request Workflow:**
   - After Frontdesk review (`PENDING_REVIEW` or `APPROVED`)
   - Doctor can accept/decline/request info
   - Doctor can set appointment date/time when accepting

2. **Appointment Workflow:**
   - Doctor can view assigned appointments
   - Doctor can start/complete consultations
   - Doctor can add pre-consultation notes

3. **Patient Data Access:**
   - Doctor can view assigned patient profiles
   - Doctor can view patient medical history
   - Doctor can view previous consultations

4. **Notification System:**
   - Doctor actions trigger patient notifications
   - Doctor receives notifications for new consultation requests

**Must NOT Duplicate:**
- Patient authentication/registration
- Frontdesk review workflow
- Appointment scheduling infrastructure
- Consultation execution (start/complete) - already exists
- Patient dashboard logic

---

## STEP 2 — DOCTOR CORE USER JOURNEYS (CLINICAL ONLY)

### Journey 1: Review Assigned Consultation Requests

**Triggering Event:**
- New consultation request assigned to doctor (via Frontdesk review or direct assignment)
- Consultation request status: `PENDING_REVIEW` or `APPROVED`

**Required Data:**
- Consultation request details:
  - Patient name, age, gender
  - Concern description (aesthetic goals)
  - Preferred service/procedure
  - Preferred date/time
  - Medical safety info (over 18, conditions, pregnancy)
  - Submission date
  - Previous consultations (if returning patient)

**Decisions Made:**
- **Accept:** Surgery is appropriate, proceed to consultation
- **Decline:** Not appropriate for surgery / outside expertise
- **Request More Info:** Need more information before deciding

**State Transitions:**
- Accept: `PENDING_REVIEW`/`APPROVED` → `APPROVED` → `SCHEDULED` (if date/time set)
- Decline: `PENDING_REVIEW`/`APPROVED` → `CANCELLED` (via `AppointmentStatus`)
- Request Info: `PENDING_REVIEW` → `NEEDS_MORE_INFO`

**Outputs/Events Emitted:**
- `ConsultationRequestAccepted` (if accepted)
- `ConsultationRequestDeclined` (if declined)
- `ConsultationRequestMoreInfoRequested` (if needs info)
- Patient notification
- Audit log entry

---

### Journey 2: Make Clinical Decisions (Accept / Decline / Request Info)

**Triggering Event:**
- Doctor views consultation request in decision queue
- Consultation request status: `PENDING_REVIEW` or `APPROVED`

**Required Data:**
- Full patient profile (demographics, medical history, allergies)
- Previous consultations (continuity of care)
- Current concern description
- Medical safety information

**Decisions Made:**
- **Accept Decision:**
  - Is surgery appropriate? (Yes/No)
  - Which procedure? (If yes)
  - When can consultation occur? (Date/time selection)
- **Decline Decision:**
  - Why is it not appropriate? (Reason documented)
- **Request Info Decision:**
  - What specific information is needed? (Questions documented)

**State Transitions:**
- Accept: `PENDING_REVIEW` → `APPROVED` → `SCHEDULED` (if date/time set immediately)
- Decline: `PENDING_REVIEW` → `CANCELLED` (via `AppointmentStatus`)
- Request Info: `PENDING_REVIEW` → `NEEDS_MORE_INFO`

**Outputs/Events Emitted:**
- `ConsultationRequestAccepted` (with appointment date/time if set)
- `ConsultationRequestDeclined` (with reason)
- `ConsultationRequestMoreInfoRequested` (with questions)
- Patient notification
- Appointment updated (if accepted with date/time)

---

### Journey 3: Conduct Consultations

**Triggering Event:**
- Appointment scheduled for today
- Patient checked in
- Doctor ready to start consultation

**Required Data:**
- Patient profile (full context)
- Medical history timeline
- Previous consultations (if returning patient)
- Current concern/aesthetic goals
- Medical safety information

**Decisions Made:**
- **Eligibility Decision:** APPROPRIATE / NOT_APPROPRIATE / DEFER
- **Treatment Recommendation:** Procedure type, approach
- **Surgery Recommendation:** Yes / No
- **Follow-Up Requirement:** Yes / No, Type, Timeline
- **Risks Communication:** Document risks discussed

**State Transitions:**
- Consultation: Not started → `IN_PROGRESS` → `COMPLETED`
- Appointment: `SCHEDULED` → `COMPLETED` (when consultation completed)
- May create: Surgery entity (if surgery recommended)
- May create: FollowUp entity (if follow-up required)

**Outputs/Events Emitted:**
- `ConsultationStarted` (creates `Consultation` entity)
- `ConsultationCompleted` (with eligibility, treatment, next steps)
- `SurgeryPlanned` (if surgery recommended)
- `FollowUpScheduled` (if follow-up required)
- Patient notification (optional)

---

### Journey 4: Make Eligibility & Treatment Decisions

**Triggering Event:**
- During consultation execution
- Doctor evaluating patient candidacy

**Required Data:**
- Clinical assessment findings
- Patient aesthetic goals
- Medical history and contraindications
- Previous surgical outcomes (if applicable)

**Decisions Made:**
- **Eligibility:** APPROPRIATE / NOT_APPROPRIATE / DEFER
- **Treatment Type:** Specific procedure/treatment
- **Surgical Approach:** If surgery recommended
- **Timeline:** When surgery can occur
- **Risks & Expectations:** What to communicate to patient

**State Transitions:**
- Consultation: `IN_PROGRESS` → `COMPLETED` (with decisions documented)
- May trigger: Surgery planning workflow
- May trigger: Follow-up scheduling

**Outputs/Events Emitted:**
- `ConsultationCompleted` (with eligibility decision)
- `SurgeryPlanned` (if surgery recommended)
- `FollowUpScheduled` (if follow-up required)

---

### Journey 5: Recommend Surgery

**Triggering Event:**
- Consultation completed with surgery recommendation
- Eligibility decision: APPROPRIATE

**Required Data:**
- Consultation notes and recommendations
- Procedure type and approach
- Patient profile and medical history
- Expected outcomes

**Decisions Made:**
- **Surgery Recommended:** Yes
- **Procedure Type:** Specific procedure
- **Surgical Approach:** Planned approach
- **Timeline:** When surgery should occur

**State Transitions:**
- Consultation: `COMPLETED` (with `surgery_recommended: true`)
- Surgery: Created with status `PLANNING`
- Appointment: May create surgery appointment (separate from consultation)

**Outputs/Events Emitted:**
- `SurgeryPlanned` (creates `Surgery` entity)
- Patient notification (surgery recommended)

---

### Journey 6: Plan Surgery

**Triggering Event:**
- Surgery entity created (status: `PLANNING`)
- Consultation completed with surgery recommendation

**Required Data:**
- Consultation notes and recommendations
- Patient profile and medical history
- Procedure details
- Previous surgical outcomes (if applicable)

**Decisions Made:**
- **Surgical Approach:** Finalize approach
- **Estimated Duration:** Time estimate
- **Assistance Needed:** Yes / No, Who
- **Anesthetist Required:** Yes / No, Who
- **Coordination Notes:** Team communication

**State Transitions:**
- Surgery: `PLANNING` → `SCHEDULED` (when date/time confirmed by Frontdesk/Admin)
- Appointment: May create surgery appointment

**Outputs/Events Emitted:**
- `SurgeryScheduled` (when date/time set)
- Team notifications (if assistance needed)

---

### Journey 7: Conduct Follow-ups

**Triggering Event:**
- Follow-up appointment scheduled
- Follow-up due (from previous consultation/surgery)

**Required Data:**
- Full patient timeline (consultation → surgery → follow-up)
- Previous consultation notes
- Previous surgery notes (if applicable)
- Original procedure details

**Decisions Made:**
- **Progress Review:** Healing/progress assessment
- **Complications:** Any complications observed
- **Care Plan Adjustments:** Adjustments to care plan
- **Next Follow-Up Needed:** Yes / No, Timeline

**State Transitions:**
- FollowUp: `SCHEDULED` → `IN_PROGRESS` → `COMPLETED`
- May create: Another FollowUp (if needed)
- May trigger: Case closure

**Outputs/Events Emitted:**
- `FollowUpStarted`
- `FollowUpCompleted` (with progress notes)
- `FollowUpScheduled` (if next follow-up needed)

---

## STEP 3 — USE CASE DEFINITIONS (IMPLEMENTATION-READY)

### UseCase: AcceptConsultationRequest

**Actor:** Doctor

**Preconditions:**
- Consultation request exists
- `ConsultationRequestStatus` is `PENDING_REVIEW` or `APPROVED`
- Doctor is assigned to consultation request (`appointment.doctor_id == doctor.id`)
- Appointment exists and is not cancelled

**Guard Conditions:**
- `doctor.id == appointment.doctor_id` (assignment boundary)
- `appointment.status != AppointmentStatus.CANCELLED`
- `appointment.status != AppointmentStatus.COMPLETED`
- State transition is valid: `PENDING_REVIEW`/`APPROVED` → `APPROVED` → `SCHEDULED`

**State Transitions:**
- `ConsultationRequestStatus`: `PENDING_REVIEW`/`APPROVED` → `APPROVED` → `SCHEDULED` (if date/time provided)
- `AppointmentStatus`: Remains `PENDING` or becomes `SCHEDULED` (if date/time set)
- `appointment.appointment_date`: Set if provided
- `appointment.time`: Set if provided

**Events:**
- `ConsultationRequestAccepted` (with appointment date/time if set)
- Patient notification (consultation request accepted)
- Audit log entry

**Failure Cases:**
- Doctor not assigned to consultation request → `DomainException`
- Invalid state transition → `DomainException`
- Appointment already cancelled/completed → `DomainException`
- Date/time in the past → `DomainException`

---

### UseCase: DeclineConsultationRequest

**Actor:** Doctor

**Preconditions:**
- Consultation request exists
- `ConsultationRequestStatus` is `PENDING_REVIEW` or `APPROVED`
- Doctor is assigned to consultation request
- Appointment exists and is not cancelled/completed

**Guard Conditions:**
- `doctor.id == appointment.doctor_id` (assignment boundary)
- `appointment.status != AppointmentStatus.CANCELLED`
- `appointment.status != AppointmentStatus.COMPLETED`

**State Transitions:**
- `AppointmentStatus`: `PENDING`/`SCHEDULED` → `CANCELLED`
- `ConsultationRequestStatus`: Remains as-is (or can be set to final state)

**Events:**
- `ConsultationRequestDeclined` (with reason if provided)
- Patient notification (consultation request declined)
- Audit log entry

**Failure Cases:**
- Doctor not assigned to consultation request → `DomainException`
- Appointment already cancelled/completed → `DomainException`

---

### UseCase: RequestMoreInfoConsultationRequest

**Actor:** Doctor

**Preconditions:**
- Consultation request exists
- `ConsultationRequestStatus` is `PENDING_REVIEW`
- Doctor is assigned to consultation request
- Appointment exists and is not cancelled/completed

**Guard Conditions:**
- `doctor.id == appointment.doctor_id` (assignment boundary)
- `appointment.status != AppointmentStatus.CANCELLED`
- `appointment.status != AppointmentStatus.COMPLETED`
- State transition is valid: `PENDING_REVIEW` → `NEEDS_MORE_INFO`

**State Transitions:**
- `ConsultationRequestStatus`: `PENDING_REVIEW` → `NEEDS_MORE_INFO`
- `appointment.review_notes`: Set with questions/notes

**Events:**
- `ConsultationRequestMoreInfoRequested` (with questions)
- Patient notification (more information needed)
- Audit log entry

**Failure Cases:**
- Doctor not assigned to consultation request → `DomainException`
- Invalid state transition → `DomainException`
- Appointment already cancelled/completed → `DomainException`
- Questions/notes not provided → `DomainException`

---

### UseCase: StartConsultation

**Actor:** Doctor

**Preconditions:**
- Appointment exists
- `AppointmentStatus` is `PENDING` or `SCHEDULED`
- Doctor is assigned to appointment
- Patient is checked in (optional but recommended)

**Guard Conditions:**
- `doctor.id == appointment.doctor_id` (assignment boundary)
- `appointment.status != AppointmentStatus.CANCELLED`
- `appointment.status != AppointmentStatus.COMPLETED`

**State Transitions:**
- Consultation: Created with status `IN_PROGRESS`
- `Consultation.started_at`: Set to current time
- `AppointmentStatus`: `PENDING` → `SCHEDULED` (if was PENDING)

**Events:**
- `ConsultationStarted` (creates `Consultation` entity)
- Audit log entry

**Failure Cases:**
- Doctor not assigned to appointment → `DomainException`
- Appointment already cancelled/completed → `DomainException`
- Consultation already started → `DomainException`

**Note:** This use case already exists (`StartConsultationUseCase`). Verify it enforces assignment boundaries.

---

### UseCase: CompleteConsultation

**Actor:** Doctor

**Preconditions:**
- Consultation exists and is `IN_PROGRESS`
- Appointment exists
- Doctor is assigned to consultation/appointment
- Eligibility decision made
- Treatment recommendations documented

**Guard Conditions:**
- `doctor.id == consultation.doctor_id` (assignment boundary)
- `doctor.id == appointment.doctor_id` (assignment boundary)
- `consultation.status == IN_PROGRESS`
- `appointment.status != AppointmentStatus.CANCELLED`
- `appointment.status != AppointmentStatus.COMPLETED`

**State Transitions:**
- Consultation: `IN_PROGRESS` → `COMPLETED`
- `Consultation.completed_at`: Set to current time
- `AppointmentStatus`: `SCHEDULED` → `COMPLETED`
- May create: Surgery entity (if surgery recommended)
- May create: FollowUp entity (if follow-up required)

**Events:**
- `ConsultationCompleted` (with eligibility, treatment, next steps)
- `SurgeryPlanned` (if surgery recommended)
- `FollowUpScheduled` (if follow-up required)
- Patient notification (optional)

**Failure Cases:**
- Doctor not assigned to consultation/appointment → `DomainException`
- Consultation not started → `DomainException`
- Eligibility decision not made → `DomainException`
- Appointment already cancelled/completed → `DomainException`

**Note:** This use case already exists (`CompleteConsultationUseCase`). Verify it captures decisions explicitly and enforces assignment boundaries.

---

### UseCase: PlanSurgery

**Actor:** Doctor

**Preconditions:**
- Consultation completed with surgery recommendation
- Surgery entity created (status: `PLANNING`)
- Doctor is assigned to consultation/surgery

**Guard Conditions:**
- `doctor.id == consultation.doctor_id` (assignment boundary)
- `doctor.id == surgery.doctor_id` (assignment boundary)
- `consultation.status == COMPLETED`
- `surgery.status == PLANNING`
- `consultation.surgery_recommended == true`

**State Transitions:**
- Surgery: `PLANNING` → `SCHEDULED` (when date/time set by Frontdesk/Admin)
- `Surgery.surgical_approach`: Set
- `Surgery.estimated_duration`: Set
- `Surgery.assistance_needed`: Set
- `Surgery.assisting_doctors`: Set (if assistance needed)
- `Surgery.anesthetist_id`: Set (if applicable)
- `Surgery.coordination_notes`: Set

**Events:**
- `SurgeryScheduled` (when date/time confirmed)
- Team notifications (if assistance needed)

**Failure Cases:**
- Doctor not assigned to consultation/surgery → `DomainException`
- Consultation not completed → `DomainException`
- Surgery not in PLANNING status → `DomainException`
- Surgery not recommended in consultation → `DomainException`

---

### UseCase: ConductFollowUp

**Actor:** Doctor

**Preconditions:**
- FollowUp exists and is `SCHEDULED`
- FollowUp linked to originating Consultation or Surgery
- Doctor is assigned to FollowUp

**Guard Conditions:**
- `doctor.id == followup.doctor_id` (assignment boundary)
- `followup.status == SCHEDULED`
- FollowUp linked to Consultation or Surgery

**State Transitions:**
- FollowUp: `SCHEDULED` → `IN_PROGRESS` → `COMPLETED`
- `FollowUp.progress_notes`: Set
- `FollowUp.complications`: Set (if any)
- `FollowUp.care_plan_adjustments`: Set
- `FollowUp.next_follow_up_required`: Set
- `FollowUp.next_follow_up_timeline`: Set (if needed)
- May create: Another FollowUp (if needed)

**Events:**
- `FollowUpStarted`
- `FollowUpCompleted` (with progress notes)
- `FollowUpScheduled` (if next follow-up needed)

**Failure Cases:**
- Doctor not assigned to FollowUp → `DomainException`
- FollowUp not scheduled → `DomainException`
- FollowUp not linked to Consultation or Surgery → `DomainException`

---

## STEP 4 — API SURFACE (THIN CONTROLLERS)

### Consultation Request Management

**GET /api/consultations/doctor/:doctorId/pending**
- **Purpose:** Get pending consultation requests assigned to doctor
- **Controller:** `ConsultationController.getPendingConsultationRequests()`
- **Use Case:** `GetPendingConsultationRequestsUseCase` (new)
- **Permissions:** `DOCTOR` role only, must be own doctor ID
- **Query Params:** `status?`, `limit?`, `offset?`
- **Returns:** `AppointmentResponseDto[]` with consultation request details
- **Business Logic:** None (read-only projection)

---

**POST /api/consultations/:id/accept**
- **Purpose:** Accept consultation request and optionally set appointment date/time
- **Controller:** `ConsultationController.acceptConsultationRequest()`
- **Use Case:** `AcceptConsultationRequestUseCase` (new)
- **Permissions:** `DOCTOR` role only, must be assigned doctor
- **Body:** `{ appointmentDate?: Date, time?: string, notes?: string }`
- **Returns:** `AppointmentResponseDto`
- **Business Logic:** All in use case (state transitions, validation, notifications)

---

**POST /api/consultations/:id/decline**
- **Purpose:** Decline consultation request with optional reason
- **Controller:** `ConsultationController.declineConsultationRequest()`
- **Use Case:** `DeclineConsultationRequestUseCase` (new)
- **Permissions:** `DOCTOR` role only, must be assigned doctor
- **Body:** `{ reason?: string }`
- **Returns:** `AppointmentResponseDto`
- **Business Logic:** All in use case (state transitions, validation, notifications)

---

**POST /api/consultations/:id/request-info**
- **Purpose:** Request more information from patient
- **Controller:** `ConsultationController.requestMoreInfo()`
- **Use Case:** `RequestMoreInfoConsultationRequestUseCase` (new)
- **Permissions:** `DOCTOR` role only, must be assigned doctor
- **Body:** `{ questions: string, notes?: string }`
- **Returns:** `AppointmentResponseDto`
- **Business Logic:** All in use case (state transitions, validation, notifications)

---

### Consultation Management

**POST /api/consultations/:id/start**
- **Purpose:** Start consultation (creates Consultation entity)
- **Controller:** `ConsultationController.startConsultation()` (exists)
- **Use Case:** `StartConsultationUseCase` (exists)
- **Permissions:** `DOCTOR` role only, must be assigned doctor
- **Body:** `{ doctorNotes?: string }`
- **Returns:** `AppointmentResponseDto`
- **Business Logic:** All in use case (verify assignment boundaries)

---

**POST /api/consultations/:id/complete**
- **Purpose:** Complete consultation with decisions and recommendations
- **Controller:** `ConsultationController.completeConsultation()` (exists)
- **Use Case:** `CompleteConsultationUseCase` (exists, may need enhancement)
- **Permissions:** `DOCTOR` role only, must be assigned doctor
- **Body:** `{ outcome: string, eligibilityDecision: string, treatmentRecommendation?: string, surgeryRecommended?: boolean, followUpRequired?: boolean, followUpType?: string, followUpTimeline?: string }`
- **Returns:** `AppointmentResponseDto`
- **Business Logic:** All in use case (verify decision capture, assignment boundaries)

---

### Appointment Management

**GET /api/appointments/doctor/:doctorId/today**
- **Purpose:** Get today's appointments for doctor
- **Controller:** `AppointmentController.getTodayAppointments()` (may exist)
- **Use Case:** `GetTodayAppointmentsUseCase` (new or exists)
- **Permissions:** `DOCTOR` role only, must be own doctor ID
- **Returns:** `AppointmentResponseDto[]`
- **Business Logic:** None (read-only projection)

---

**GET /api/appointments/doctor/:doctorId/upcoming**
- **Purpose:** Get upcoming appointments for doctor
- **Controller:** `AppointmentController.getUpcomingAppointments()` (may exist)
- **Use Case:** `GetUpcomingAppointmentsUseCase` (new or exists)
- **Permissions:** `DOCTOR` role only, must be own doctor ID
- **Query Params:** `limit?`, `offset?`
- **Returns:** `AppointmentResponseDto[]`
- **Business Logic:** None (read-only projection)

---

**PUT /api/appointments/:id/notes**
- **Purpose:** Add/update appointment notes (pre-consultation)
- **Controller:** `AppointmentController.updateAppointmentNotes()` (new)
- **Use Case:** `AddAppointmentNotesUseCase` (new)
- **Permissions:** `DOCTOR` role only, must be assigned doctor
- **Body:** `{ notes: string }`
- **Returns:** `AppointmentResponseDto`
- **Business Logic:** All in use case (assignment boundary validation)

---

### Surgery Management

**POST /api/surgeries/:id/plan**
- **Purpose:** Plan surgery (finalize surgical approach, coordination)
- **Controller:** `SurgeryController.planSurgery()` (new)
- **Use Case:** `PlanSurgeryUseCase` (new)
- **Permissions:** `DOCTOR` role only, must be assigned doctor
- **Body:** `{ surgicalApproach: string, estimatedDuration: number, assistanceNeeded?: boolean, assistingDoctors?: string[], anesthetistId?: string, coordinationNotes?: string }`
- **Returns:** `SurgeryResponseDto`
- **Business Logic:** All in use case (assignment boundary validation)

---

### Follow-Up Management

**POST /api/follow-ups/:id/start**
- **Purpose:** Start follow-up
- **Controller:** `FollowUpController.startFollowUp()` (new)
- **Use Case:** `StartFollowUpUseCase` (new)
- **Permissions:** `DOCTOR` role only, must be assigned doctor
- **Returns:** `FollowUpResponseDto`
- **Business Logic:** All in use case (assignment boundary validation)

---

**POST /api/follow-ups/:id/complete**
- **Purpose:** Complete follow-up with progress notes
- **Controller:** `FollowUpController.completeFollowUp()` (new)
- **Use Case:** `CompleteFollowUpUseCase` (new)
- **Permissions:** `DOCTOR` role only, must be assigned doctor
- **Body:** `{ progressNotes: string, complications?: string, carePlanAdjustments?: string, nextFollowUpRequired?: boolean, nextFollowUpTimeline?: string }`
- **Returns:** `FollowUpResponseDto`
- **Business Logic:** All in use case (assignment boundary validation)

---

## STEP 5 — DOCTOR DASHBOARD READ MODELS

### Read Model: Pending Reviews

**Purpose:** Show consultation requests requiring doctor decision

**Query:**
```sql
SELECT 
  a.id,
  a.patient_id,
  a.doctor_id,
  a.appointment_date,
  a.time,
  a.consultation_request_status,
  a.note,
  a.reviewed_by,
  a.reviewed_at,
  a.review_notes,
  p.first_name,
  p.last_name,
  p.date_of_birth,
  p.gender,
  p.email,
  p.phone
FROM Appointment a
JOIN Patient p ON a.patient_id = p.id
WHERE a.doctor_id = :doctorId
  AND a.consultation_request_status IN ('PENDING_REVIEW', 'APPROVED')
  AND a.status != 'CANCELLED'
  AND a.status != 'COMPLETED'
ORDER BY a.created_at ASC
```

**Projection:** `PendingConsultationRequestDto[]`

**Fields:**
- Appointment ID
- Patient name, age, gender
- Concern description (from `note`)
- Preferred date/time
- Medical safety info (from `note`)
- Submission date (`created_at`)
- Review status
- Previous consultations count (if returning patient)

**Usage:** Doctor dashboard decision queue

---

### Read Model: Today's Consultations

**Purpose:** Show today's scheduled consultations

**Query:**
```sql
SELECT 
  a.id,
  a.patient_id,
  a.doctor_id,
  a.appointment_date,
  a.time,
  a.status,
  a.consultation_request_status,
  a.note,
  a.checked_in_at,
  a.checked_in_by,
  p.first_name,
  p.last_name,
  p.date_of_birth,
  p.gender,
  c.id as consultation_id,
  c.started_at,
  c.completed_at,
  c.doctor_notes
FROM Appointment a
JOIN Patient p ON a.patient_id = p.id
LEFT JOIN Consultation c ON a.id = c.appointment_id
WHERE a.doctor_id = :doctorId
  AND DATE(a.appointment_date) = CURRENT_DATE
  AND a.status IN ('PENDING', 'SCHEDULED')
  AND a.status != 'CANCELLED'
ORDER BY a.time ASC
```

**Projection:** `TodayConsultationDto[]`

**Fields:**
- Appointment ID
- Time
- Patient name
- Concern/reason
- Check-in status
- Consultation status (not started / in progress / completed)
- Previous consultation history (if returning patient)

**Usage:** Doctor dashboard today's schedule

---

### Read Model: Surgeries Scheduled

**Purpose:** Show upcoming surgeries requiring planning

**Query:**
```sql
SELECT 
  s.id,
  s.consultation_id,
  s.appointment_id,
  s.patient_id,
  s.doctor_id,
  s.procedure_type,
  s.surgical_approach,
  s.estimated_duration,
  s.status,
  s.scheduled_at,
  a.appointment_date,
  a.time,
  p.first_name,
  p.last_name
FROM Surgery s
JOIN Appointment a ON s.appointment_id = a.id
JOIN Patient p ON s.patient_id = p.id
WHERE s.doctor_id = :doctorId
  AND s.status IN ('PLANNING', 'SCHEDULED')
  AND a.appointment_date >= CURRENT_DATE
ORDER BY a.appointment_date ASC, a.time ASC
```

**Projection:** `ScheduledSurgeryDto[]`

**Fields:**
- Surgery ID
- Procedure type
- Patient name
- Scheduled date/time
- Planning status
- Consultation notes reference

**Usage:** Doctor dashboard surgical planning queue

---

### Read Model: Follow-ups Due

**Purpose:** Show follow-ups that need attention

**Query:**
```sql
SELECT 
  f.id,
  f.origin_type,
  f.origin_id,
  f.appointment_id,
  f.patient_id,
  f.doctor_id,
  f.follow_up_type,
  f.follow_up_reason,
  f.scheduled_date,
  f.scheduled_time,
  f.status,
  a.appointment_date,
  p.first_name,
  p.last_name
FROM FollowUp f
JOIN Appointment a ON f.appointment_id = a.id
JOIN Patient p ON f.patient_id = p.id
WHERE f.doctor_id = :doctorId
  AND f.status = 'SCHEDULED'
  AND a.appointment_date >= CURRENT_DATE
  AND a.appointment_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY a.appointment_date ASC, a.time ASC
```

**Projection:** `FollowUpDueDto[]`

**Fields:**
- FollowUp ID
- Patient name
- Follow-up type (IN_PERSON, VIRTUAL, PHONE)
- Follow-up reason
- Scheduled date/time
- Origin (Consultation or Surgery)
- Days since last visit

**Usage:** Doctor dashboard follow-up queue

---

## STEP 6 — NON-GOALS (VERY IMPORTANT)

### Explicitly NOT Implementing

1. **Doctor Signup / Invite Flow**
   - Doctors pre-exist in database
   - No self-registration
   - No invite token generation/validation
   - No activation workflow

2. **Profile Onboarding**
   - Doctor profile completion on first login
   - Profile fields validation
   - Onboarding status transitions
   - Profile completion requirements

3. **Admin Workflows**
   - Admin consultation request management
   - Admin appointment scheduling
   - Admin doctor management
   - Admin patient management

4. **Billing / Payments**
   - Payment processing
   - Bill generation
   - Payment status tracking
   - Receipt generation

5. **Nurse Workflows**
   - Nurse assignment to patients
   - Nurse care notes
   - Nurse vital signs recording
   - Nurse pre/post-op workflows

6. **Lab Test Management**
   - Lab test requests
   - Lab test results
   - Lab test status tracking

7. **Patient Portal Features**
   - Patient appointment booking
   - Patient profile management
   - Patient consultation history viewing

8. **Frontdesk Workflows**
   - Frontdesk consultation request review (already exists, not modifying)
   - Frontdesk appointment scheduling
   - Frontdesk patient intake

9. **Analytics / Reporting**
   - Doctor performance metrics
   - Patient statistics
   - Consultation statistics
   - Revenue reports

10. **Notification System Implementation**
    - Email/SMS notification infrastructure
    - In-app notification system
    - Notification preferences
    - Notification delivery tracking

---

## IMPLEMENTATION NOTES

### Key Design Decisions

1. **Consultation Request Review is Separate from Frontdesk Review**
   - Frontdesk does triage/assignment
   - Doctor does clinical acceptance
   - Both can set appointment date/time
   - Doctor decisions are clinical, not administrative

2. **Assignment Boundaries are Strict**
   - Doctors can only act on entities assigned to them
   - Enforced in use cases, not just UI
   - Assignment is via `doctor_id` field

3. **State Machines are Guarded**
   - All state transitions validated
   - Invalid transitions throw `DomainException`
   - State transition functions in domain layer

4. **Decisions are Explicit**
   - Eligibility decision is explicit (not inferred)
   - Treatment recommendations are explicit
   - Next steps are explicit (surgery, follow-up, decline)
   - Decision reasons are documented

5. **Events are Emitted**
   - All state changes emit domain events
   - Events trigger notifications
   - Events are audited

6. **Read Models are Separate**
   - Dashboard queries are read-only
   - No business logic in read models
   - Optimized for display, not mutation

---

## VALIDATION CHECKLIST

Before implementing, verify:

- [ ] All use cases enforce assignment boundaries
- [ ] All state transitions are validated
- [ ] All decisions are explicitly captured
- [ ] All events are emitted
- [ ] All notifications are sent
- [ ] All audit logs are recorded
- [ ] No UI-first abstractions
- [ ] No CRUD-only thinking
- [ ] No doctor signup/onboarding
- [ ] No admin workflows
- [ ] No billing/payments
- [ ] No nurse workflows

---

**End of Document**
