# Doctor Journey Design Document
## Aesthetic Surgery Center - Comprehensive Doctor Workflow

**Last Updated:** January 2025  
**Status:** Design Phase  
**Author:** System Architecture Team

---

## 🧠 Foundation Layer: Aesthetic Surgeon — Daily Reality

> **This is not how software imagines surgeons work.**  
> **This is how they actually operate.**

### Core Principle: Event-Driven, Not Feature-Driven

A surgeon's day is **event-driven, not feature-driven**. The system must model:
- **Clinical events** (consultations, surgeries, follow-ups)
- **Decisions** (accept/decline, treatment recommendations, eligibility)
- **Transitions** (consultation → surgery → follow-up)

**NOT:**
- Screens
- Forms
- Tabs

### 1️⃣ Day Start: Clinical Awareness & Readiness

#### What the Surgeon Does
- Reviews today's schedule:
  - Consultations
  - Procedures / surgeries
  - Follow-ups
- Mentally prepares for:
  - Patient expectations
  - Surgical complexity
  - Time constraints

#### What They Need
- **A clear, concise daily view**
- Immediate visibility into:
  - Who they're seeing
  - Why they're seeing them
  - What decisions are required today

#### System Implication
**Doctor dashboard ≠ analytics**  
**It is a decision cockpit**

First screen answers: **"What do I need to do today?"**

### 2️⃣ Patient Consultations (Pre-Surgery)

#### What the Surgeon Does
This is the **core value-creation phase**.

- Reviews patient history
- Evaluates aesthetic concerns
- Explains:
  - Options
  - Risks
  - Expected outcomes
- Decides:
  - Is surgery appropriate?
  - Which procedure?
  - Timeline?

#### Outputs
- Clinical assessment
- Recommendations
- Eligibility decision
- Sometimes rejection or deferral

#### System Implication
**Consultations are not just meetings**  
**They are decision events**

Surgeon must:
- Review patient data
- Record structured + freeform notes
- Trigger next steps (surgery / follow-up / decline)

### 3️⃣ Surgical Planning (Between Consult & OR)

#### What the Surgeon Does
- Finalizes procedure details
- Confirms:
  - Surgical approach
  - Estimated duration
  - Assistance needed
- Coordinates informally with:
  - Other surgeons
  - Anesthetists (sometimes external)
  - Frontdesk / admin

#### Outputs
- Surgery readiness confirmation
- Surgical notes
- Team awareness

#### System Implication
**There is a gap between consultation and surgery**  
**This gap must exist in your system**

Surgery is a **planned clinical event, not an appointment**.

### 4️⃣ Surgery Day (Execution Phase)

#### What the Surgeon Does
- Performs the procedure
- May collaborate with:
  - Another surgeon
  - Assistants
- Focus is 100% clinical

#### What They Do NOT Do
- Fill forms mid-procedure
- Manage scheduling
- Interact with dashboards

#### Outputs (After)
- Operative notes
- Immediate post-op observations
- Instructions for follow-up

#### System Implication
Surgery workflow must:
- Be minimal during execution
- Support post-surgery documentation
- No complex UI during surgery

Notes may be:
- Typed later
- Dictated
- Finalized post-op

### 5️⃣ Post-Op & Follow-Ups

#### What the Surgeon Does
- Reviews healing progress
- Addresses complications
- Adjusts care plans
- Reassures patient

#### Outputs
- Follow-up notes
- Updated recommendations
- Sometimes escalation

#### System Implication
**Follow-ups are continuations, not new cases**

Surgeon needs:
- Full timeline visibility
- Prior notes easily accessible

### 6️⃣ Peer Consultation (Doctor ↔ Doctor)

#### What the Surgeon Does
- Seeks second opinions
- Advises colleagues
- Discusses edge cases

#### Key Detail
These are:
- Professional
- Purpose-driven
- Often time-boxed

#### System Implication
**This is not chat**  
**It's a clinical consult artifact**

Must be attributable and auditable.

### 7️⃣ Documentation (Throughout the Day)

#### What the Surgeon Does
Documents:
- Assessments
- Decisions
- Outcomes

Often under time pressure. Sometimes via dictation.

#### System Implication
Notes must be:
- Easy to create
- Easy to review
- Clearly owned by the surgeon

Dictation must be assistive, not authoritative.

### 8️⃣ End of Day Review

#### What the Surgeon Does
Checks:
- Outstanding tasks
- Pending consults
- Follow-ups needed

Mentally closes loops.

#### System Implication
Surgeon dashboard must show:
- What is done
- What is pending
- What is blocked

### 🧱 Surgeon Responsibilities vs System Responsibilities

| Surgeon Does | System Must |
|--------------|-------------|
| Make clinical decisions | Capture decisions cleanly |
| Review patient info | Present relevant data fast |
| Perform surgery | Stay out of the way |
| Document outcomes | Make documentation effortless |
| Collaborate | Preserve accountability |
| Move fast | Reduce friction |

### 🧠 Key Insight (Very Important)

**A surgeon's day is event-driven, not feature-driven.**

Your system must model:
- Clinical events
- Decisions
- Transitions

**NOT:**
- Screens
- Forms
- Tabs

---

## 🧠 Phase 1: Understanding the Existing System

### 1.1 Current Patient Workflow (Linear Journey)

#### **Stage 1: Account Creation & Authentication**
- **Entry Point:** `/patient/login` or `/patient/register`
- **Authentication:** JWT-based (via `JwtAuthService`)
- **User Model:** `User` entity with role metadata
- **Patient Model:** Separate `Patient` entity linked via `user_id`
- **API Endpoints:**
  - `POST /api/auth/register` - User registration
  - `POST /api/auth/login` - User login
  - `POST /api/auth/refresh` - Token refresh
- **State:** User created → Patient profile may or may not exist

#### **Stage 2: Patient Profile Creation/Update**
- **Entry Point:** `/patient/profile`
- **Workflow:**
  1. User logs in
  2. System checks if `Patient` record exists for `user_id`
  3. If missing: Show create form (pre-filled from User data)
  4. If exists: Show view/edit form
- **API Endpoints:**
  - `GET /api/patients/:id` - Get patient profile
  - `POST /api/patients` - Create patient (via `CreatePatientUseCase`)
  - `PUT /api/patients/:id` - Update patient (via `UpdatePatientUseCase`)
- **State Transitions:**
  - No Patient → Patient Created → Profile Complete
  - Profile Incomplete → Profile Updated → Profile Complete

#### **Stage 3: Consultation Request Submission**
- **Entry Point:** `/portal/book-consultation`
- **Workflow:**
  1. Patient selects service/concern
  2. Optionally selects preferred doctor
  3. Provides preferred date/time
  4. Completes medical safety questions
  5. Provides consents
  6. Submits consultation request
- **API Endpoints:**
  - `POST /api/consultations/submit` - Submit consultation request
- **Use Case:** `SubmitConsultationRequestUseCase`
- **State Transitions:**
  - No Request → `ConsultationRequestStatus.SUBMITTED`
  - Creates `Appointment` with `status: PENDING` and `consultation_request_status: SUBMITTED`

#### **Stage 4: Consultation Request Review (Frontdesk)**
- **Entry Point:** `/frontdesk/consultation-requests`
- **Workflow:**
  1. Frontdesk views pending requests (`SUBMITTED` or `PENDING_REVIEW`)
  2. Frontdesk reviews patient info and concern
  3. Frontdesk can:
     - **Approve:** Set proposed date/time → `APPROVED` → `SCHEDULED`
     - **Request More Info:** Add review notes → `NEEDS_MORE_INFO`
     - **Reject:** Cancel appointment → `CANCELLED`
- **API Endpoints:**
  - `GET /api/consultations/pending` - Get pending requests
  - `POST /api/consultations/:id/review` - Review request
- **Use Case:** `ReviewConsultationRequestUseCase`
- **State Transitions:**
  - `SUBMITTED` → `PENDING_REVIEW` (auto)
  - `PENDING_REVIEW` → `APPROVED` (if approved)
  - `PENDING_REVIEW` → `NEEDS_MORE_INFO` (if needs info)
  - `APPROVED` → `SCHEDULED` (when date/time set)
  - Any → `CANCELLED` (if rejected)

#### **Stage 5: Patient Confirmation**
- **Entry Point:** `/patient/dashboard` or `/patient/consultations`
- **Workflow:**
  1. Patient sees consultation request with status `SCHEDULED`
  2. Patient confirms availability
  3. System updates to `CONFIRMED`
- **API Endpoints:**
  - `POST /api/consultations/:id/confirm` - Confirm consultation
- **Use Case:** `ConfirmConsultationUseCase`
- **State Transitions:**
  - `SCHEDULED` → `CONFIRMED`
  - `AppointmentStatus` remains `PENDING` or becomes `SCHEDULED`

#### **Stage 6: Appointment Day - Check-in**
- **Entry Point:** Doctor/Nurse/Frontdesk can check in
- **Workflow:**
  1. Patient arrives
  2. Staff checks in patient
  3. System records `checked_in_at` and `checked_in_by`
- **API Endpoints:**
  - `POST /api/appointments/:id/check-in` - Check in patient
- **Use Case:** `CheckInPatientUseCase`
- **State:** `AppointmentStatus` remains `SCHEDULED`, check-in timestamp recorded

#### **Stage 7: Consultation Execution**
- **Entry Point:** `/doctor/appointments` or `/doctor/consultations`
- **Workflow:**
  1. Doctor views appointment
  2. Doctor starts consultation → Creates `Consultation` record
  3. Doctor adds notes, diagnoses, treatment plans
  4. Doctor completes consultation
- **API Endpoints:**
  - `POST /api/consultations/:id/start` - Start consultation
  - `POST /api/consultations/:id/complete` - Complete consultation
- **Use Cases:**
  - `StartConsultationUseCase`
  - `CompleteConsultationUseCase`
- **State Transitions:**
  - `SCHEDULED` → Consultation started (creates `Consultation` entity)
  - Consultation started → Consultation completed
  - `AppointmentStatus` → `COMPLETED` (when consultation completed)

#### **Stage 8: Patient Dashboard Usage**
- **Entry Point:** `/patient/dashboard`
- **Features:**
  - View upcoming appointments
  - View consultation history
  - View appointment status
  - Quick stats (upcoming, pending, completed)
- **API Endpoints:**
  - `GET /api/appointments/patient/:patientId` - Get patient appointments
  - `GET /api/appointments/patient/:patientId/upcoming` - Get upcoming appointments

### 1.2 Architectural Patterns

#### **Role Modeling**
- **User vs Profile Separation:**
  - `User` entity: Authentication, basic info (email, password, role, status)
  - `Patient` entity: Clinical/administrative data (linked via `user_id`)
  - `Doctor` entity: Professional data (linked via `user_id`, REQUIRED for DOCTOR role)
- **Invariant:** Every `Doctor` MUST have a `User` with `role: DOCTOR`
- **Onboarding Status:** `DoctorOnboardingStatus` enum tracks doctor activation:
  - `INVITED` → `ACTIVATED` → `PROFILE_COMPLETED` → `ACTIVE`

#### **Permission Enforcement**
- **RBAC Middleware:** `RbacMiddleware` enforces role-based permissions
- **Permission Model:**
  - Resource + Action + Allowed Roles
  - Example: `{ resource: 'consultation', action: 'start', allowedRoles: [Role.DOCTOR] }`
- **Route Access:** Defined in `lib/routes.ts` (currently minimal, auth handled client-side)
- **API Protection:** `JwtMiddleware` authenticates requests, `RbacMiddleware` checks permissions

#### **Dashboard Structure**
- **Patient Dashboard:** `/patient/dashboard`
  - Quick stats (upcoming, pending, completed)
  - Upcoming appointments list
  - Recent consultations
- **Doctor Dashboard:** `/doctor/dashboard` (exists but basic)
  - Today's appointments
  - Upcoming appointments
  - Pending check-ins
- **Pattern:** Dashboard → Detail Pages (appointments, consultations, profile)

#### **Workflow State Storage**
- **Dual State System:**
  1. `AppointmentStatus`: `PENDING`, `SCHEDULED`, `CANCELLED`, `COMPLETED`
  2. `ConsultationRequestStatus`: `SUBMITTED`, `PENDING_REVIEW`, `NEEDS_MORE_INFO`, `APPROVED`, `SCHEDULED`, `CONFIRMED`
- **State Transitions:** Validated via domain functions (`isValidConsultationRequestTransition`)
- **Audit Trail:** `AuditLog` records all state changes

#### **Reuse Patterns**
- **Profile Logic:**
  - `CreatePatientUseCase` / `UpdatePatientUseCase` pattern
  - Profile completeness tracking
  - Form validation via Zod schemas
- **Auth Guards:**
  - `useAuth` hook for client-side auth
  - `JwtMiddleware` for API routes
  - Redirect logic in components
- **Shared Components:**
  - `AppointmentCard` - Reusable appointment display
  - `ProfileImage` - Profile picture display
  - UI components from `components/ui/`

### 1.3 Non-Negotiable Constraints

1. **Doctors Pre-Exist in DB:**
   - Doctors are created by Admin/Frontdesk
   - No self-registration for doctors
   - Doctor activation via invitation token (`DoctorInviteToken`)

2. **Authentication Shared:**
   - All roles use same `User` table
   - JWT-based authentication
   - Role stored in `User.role` field

3. **Existing System Support:**
   - Consultations workflow (submit → review → confirm → execute)
   - Services catalog
   - Doctors directory
   - Frontdesk review workflow
   - Admin management

4. **Doctor Onboarding Status:**
   - Doctors must have `onboarding_status: ACTIVE` to authenticate
   - Enforced in `JwtAuthService.login()`

---

## 🧩 Phase 2: Doctor Persona in Aesthetic Surgery Context

### 2.1 Daily Responsibilities

#### **Clinical Actions (Time-Critical)**
1. **Review Consultation Requests:**
   - View pending consultation requests assigned to them
   - Review patient concerns and medical history
   - Accept/decline consultation requests
   - Request additional information from patient

2. **Prepare for Consultations:**
   - Review patient profile and medical history
   - Review previous consultations/notes
   - Prepare treatment recommendations

3. **Conduct Consultations:**
   - Start consultation session
   - Document patient concerns and goals
   - Perform clinical assessment
   - Provide treatment recommendations
   - Document consultation notes

4. **Complete Consultations:**
   - Finalize consultation notes
   - Set follow-up plans
   - Mark consultation as completed

#### **Operational Actions (Moderate Priority)**
1. **Manage Schedule:**
   - View today's appointments
   - View upcoming appointments
   - Check patient check-in status
   - Manage availability (working days/hours)

2. **Patient Management:**
   - View assigned patients
   - Review patient medical history
   - Track patient progress

#### **Read-Only Insights (Low Priority)**
1. **Analytics:**
   - View consultation statistics
   - View patient ratings/feedback
   - Review appointment history

### 2.2 Decision Points

1. **Consultation Request Acceptance:**
   - Should I accept this consultation request?
   - Do I need more information from the patient?
   - Is this within my specialization/expertise?

2. **Treatment Recommendations:**
   - What procedure/treatment is appropriate?
   - What are the risks and benefits?
   - What is the expected outcome?

3. **Follow-up Planning:**
   - Does patient need follow-up?
   - When should follow-up occur?
   - What type of follow-up (in-person, virtual, phone)?

### 2.3 Information Consumption vs Production

#### **Consumes:**
- Patient consultation requests (concern description, medical info)
- Patient profile (demographics, medical history, allergies)
- Previous consultations/notes
- Appointment schedule
- Patient check-in status

#### **Produces:**
- Consultation acceptance/decline decisions
- Consultation notes
- Treatment recommendations
- Follow-up plans
- Clinical diagnoses (via `Diagnosis` entity)
- Medical records (via `MedicalRecord` entity)

### 2.4 Time-Critical vs Optional Actions

#### **Time-Critical (Must Do Daily):**
- Review new consultation requests (within 24-48 hours)
- Start consultations for checked-in patients
- Complete consultations before end of day
- Respond to consultation requests requiring doctor input

#### **Optional (Can Defer):**
- Update profile information
- Review analytics/statistics
- Manage availability settings
- View patient history (unless preparing for consultation)

---

## 🛠 Phase 3: Doctor Core Workflows

### 3.1 Doctor Entry Point

#### **First Login Experience**
1. **Doctor receives invitation:**
   - Admin/Frontdesk creates `Doctor` record
   - System generates `DoctorInviteToken`
   - Doctor receives email with activation link

2. **Doctor activates account:**
   - Visits `/doctor/activate?token=xxx`
   - Sets password
   - System updates `onboarding_status: ACTIVATED`
   - Doctor redirected to profile completion

3. **Profile Completion (Required on First Access):**
   - Doctor must complete:
     - Professional bio
     - Education background
     - Focus areas/specializations
     - Professional affiliations
     - Working days/hours
   - System updates `onboarding_status: PROFILE_COMPLETED`
   - System updates `onboarding_status: ACTIVE` (allows full access)

4. **Subsequent Logins:**
   - Doctor logs in via `/patient/login` (shared login)
   - System checks `onboarding_status: ACTIVE`
   - Redirects to `/doctor/dashboard`

#### **Required Profile Completion**
- **Critical Fields:**
  - Bio (brief professional introduction)
  - Education (qualifications, certifications)
  - Focus areas (areas of expertise)
  - Working days/hours (availability)
- **Optional Fields:**
  - Professional affiliations
  - Profile image
  - Clinic location

### 3.2 Doctor Dashboard: Decision Cockpit

> **Remember:** Doctor dashboard ≠ analytics. It is a decision cockpit.  
> First screen answers: **"What do I need to do today?"**

#### **Primary Decision Points (Immediate Visibility)**

The dashboard must answer these questions in order of priority:

1. **"What decisions do I need to make today?"**
   - Pending consultation requests requiring review
   - Consultation requests awaiting my decision (Accept/Decline/Request Info)
   - Filtered by `consultation_request_status IN [SUBMITTED, PENDING_REVIEW]` and `doctor_id = current_doctor`

2. **"Who am I seeing today?"**
   - Today's appointments (consultations, procedures, follow-ups)
   - Filtered by `appointment_date = today` and `status IN [PENDING, SCHEDULED]`
   - Shows: Patient name, concern/reason, check-in status, time

3. **"What's pending that I need to follow up on?"**
   - Pending check-ins (patients who haven't arrived yet)
   - Filtered by `checked_in_at IS NULL` and `appointment_date = today`
   - Follow-ups that need attention

4. **"What's coming up that I need to prepare for?"**
   - Upcoming appointments (next 3-5 days)
   - Filtered by `appointment_date > today` and `status IN [PENDING, SCHEDULED]`
   - Surgeries requiring planning

#### **Actionable Decision Queues (Event-Driven)**

1. **Consultation Request Decisions (Highest Priority)**
   - **Event:** New consultation request assigned
   - **Decision Required:** Accept / Decline / Request More Info
   - **Context Shown:**
     - Patient name, age, gender
     - Concern description
     - Medical safety info
     - Preferred service
   - **Actions:** Accept (with date/time selection), Decline (with reason), Request Info (with questions)
   - **Priority:** Oldest first (SLA tracking) or newest first (user preference)

2. **Today's Clinical Events**
   - **Event:** Appointment scheduled for today
   - **Context Shown:**
     - Time
     - Patient name
     - Concern/reason
     - Check-in status
     - Previous consultation history (if any)
   - **Actions:**
     - View Patient Profile (full context)
     - Start Consultation (if checked in)
     - Check In Patient (if not checked in)
     - View Previous Notes

3. **Surgical Planning Events**
   - **Event:** Surgery scheduled (post-consultation)
   - **Context Shown:**
     - Procedure type
     - Patient name
     - Date/time
     - Planning status
   - **Actions:**
     - Review Consultation Notes
     - Finalize Surgical Plan
     - Coordinate with Team

4. **Follow-Up Events**
   - **Event:** Follow-up needed (from previous consultation/surgery)
   - **Context Shown:**
     - Patient name
     - Original procedure/consultation
     - Follow-up reason
     - Days since last visit
   - **Actions:**
     - Review Timeline
     - Schedule Follow-Up
     - Add Follow-Up Notes

#### **Information Architecture (Decision-First)**

**Primary (Always Visible - Decision Support):**
- Pending consultation requests (decisions needed)
- Today's schedule (who am I seeing)
- Pending check-ins (what's waiting)

**Secondary (Visible by Default - Context):**
- Today's appointments list (with full context)
- Upcoming appointments (next 3-5 days)
- Recent consultations (for continuity)

**Tertiary (Collapsible/Hidden - Analytics):**
- Patient statistics (total patients, new this month)
- Consultation statistics (completion rate, etc.)
- Ratings/feedback summary
- Recent activity log

**Key Principle:** Analytics are secondary. Decisions are primary.

### 3.3 Consultation Lifecycle (Doctor Side) - Decision Events

> **Remember:** Consultations are not just meetings. They are decision events.

#### **View Pending Consultation Requests (Decision Event)**

- **Event Type:** Consultation Request Review
- **Entry Point:** Dashboard decision queue or `/doctor/consultation-requests`
- **Context Required for Decision:**
  - Patient name, age, gender
  - Concern description (aesthetic goals)
  - Preferred service
  - Preferred date/time
  - Medical safety info (over 18, serious conditions, pregnancy)
  - Submission date
  - Previous consultations (if returning patient)
- **Decision Actions Available:**
  - **Accept:** 
    - Decision: "Surgery is appropriate, proceed to consultation"
    - Action: Set appointment date/time
    - State Transition: `APPROVED` → `SCHEDULED`
    - Output: Consultation scheduled, patient notified
  - **Decline:**
    - Decision: "Not appropriate for surgery / outside expertise"
    - Action: Provide reason (optional but recommended)
    - State Transition: `CANCELLED`
    - Output: Appointment cancelled, patient notified
  - **Request More Info:**
    - Decision: "Need more information before deciding"
    - Action: Provide specific questions/notes
    - State Transition: `NEEDS_MORE_INFO`
    - Output: Patient notified, can resubmit

#### **Review Patient Info (Pre-Consultation Context)**

- **Event Type:** Pre-Consultation Review
- **Entry Point:** Click on consultation request or appointment
- **Purpose:** Gather context for clinical decision-making
- **Data Displayed (Decision Support):**
  - Full patient profile (demographics, medical history, allergies)
  - Previous consultations (continuity of care)
  - Previous appointments history
  - Medical records
  - Previous surgical outcomes (if applicable)
- **Actions Available:**
  - View full patient profile (all context in one place)
  - View medical history timeline
  - Add pre-consultation notes (mental preparation)
  - Review previous consultation notes (if returning patient)

#### **Accept Consultation Request**
- **Workflow:**
  1. Doctor reviews consultation request
  2. Doctor clicks "Accept"
  3. Doctor selects/confirms appointment date and time
  4. System updates:
     - `consultation_request_status: APPROVED` → `SCHEDULED`
     - `appointment_date` and `time` set
     - `AppointmentStatus` remains `PENDING` (until patient confirms)
  5. Patient receives notification
  6. Patient confirms → `CONFIRMED`
- **API Endpoint:** `POST /api/consultations/:id/accept` (new)
- **Use Case:** `AcceptConsultationRequestUseCase` (new)

#### **Decline Consultation Request**
- **Workflow:**
  1. Doctor reviews consultation request
  2. Doctor clicks "Decline"
  3. Doctor provides reason (optional but recommended)
  4. System updates:
     - `AppointmentStatus: CANCELLED`
     - `consultation_request_status` remains as-is (or set to final state)
  5. Patient receives notification
- **API Endpoint:** `POST /api/consultations/:id/decline` (new)
- **Use Case:** `DeclineConsultationRequestUseCase` (new)

#### **Request More Information**
- **Workflow:**
  1. Doctor reviews consultation request
  2. Doctor clicks "Request More Info"
  3. Doctor provides specific questions/notes
  4. System updates:
     - `consultation_request_status: NEEDS_MORE_INFO`
     - `review_notes` set
  5. Patient receives notification
  6. Patient can resubmit with additional info → `SUBMITTED`
- **API Endpoint:** `POST /api/consultations/:id/request-info` (new)
- **Use Case:** `RequestMoreInfoUseCase` (new)

#### **Add Notes or Recommendations**
- **Event Type:** Pre-Consultation Preparation
- **Workflow:**
  1. Doctor views consultation request or appointment
  2. Doctor adds pre-consultation notes (mental preparation)
  3. Notes stored in `Appointment.note` or separate `ConsultationNotes` entity
- **API Endpoint:** `PUT /api/appointments/:id/notes` (new or extend existing)
- **Use Case:** `AddAppointmentNotesUseCase` (new)

#### **Conduct Consultation (Core Decision Event)**

> **Remember:** This is the core value-creation phase. Consultations are decision events.

- **Event Type:** Consultation Execution
- **Entry Point:** Dashboard → Today's Schedule → Start Consultation
- **Clinical Decision Process:**
  1. **Review Patient Context:**
     - Patient profile (demographics, medical history, allergies)
     - Previous consultations (if returning patient)
     - Current concern/aesthetic goals
     - Medical safety information
  2. **Clinical Assessment:**
     - Evaluate aesthetic concerns
     - Assess candidacy for surgery
     - Consider risks and contraindications
  3. **Decision Points:**
     - **Is surgery appropriate?** (Yes/No/Defer)
     - **Which procedure?** (If yes)
     - **Timeline?** (When can surgery occur)
     - **Risks and expectations?** (What to communicate)
  4. **Documentation:**
     - Structured notes (assessment, recommendations)
     - Freeform notes (clinical observations)
     - Treatment plan (if surgery recommended)
     - Follow-up plan (if needed)

- **Outputs (Clinical Decisions):**
  - Clinical assessment
  - Treatment recommendations
  - Eligibility decision (surgery appropriate / not appropriate / defer)
  - Procedure recommendation (if applicable)
  - Follow-up plan

- **System Implication:**
  - Consultation notes must support both structured and freeform input
  - Must capture decisions clearly (not just notes)
  - Must trigger next steps (surgery scheduling / follow-up / decline)
  - Full patient timeline must be visible during consultation

#### **Complete Consultation (Decision Finalization)**

- **Event Type:** Consultation Completion
- **Workflow:**
  1. Doctor finalizes consultation notes
  2. Doctor confirms recommendations
  3. Doctor sets follow-up plan (if needed)
  4. System creates/updates `Consultation` record
  5. System updates `Appointment.status: COMPLETED`
  6. Next steps triggered:
     - If surgery recommended → Surgery planning workflow
     - If follow-up needed → Follow-up scheduling
     - If declined → Patient notification

- **API Endpoint:** `POST /api/consultations/:id/complete` (exists)
- **Use Case:** `CompleteConsultationUseCase` (exists)

#### **State Changes Propagation**
- **To Patient:**
  - Notification sent when consultation request accepted/declined
  - Patient dashboard updates to show new status
  - Patient can view doctor's notes (if shared)
- **To Frontdesk:**
  - Frontdesk dashboard shows consultation request status
  - Frontdesk can see doctor's decision and notes
- **To System:**
  - Audit log records all state changes
  - Appointment status updates trigger notifications

### 3.3.1 Surgical Planning (Between Consult & OR)

> **Remember:** There is a gap between consultation and surgery. This gap must exist in your system.  
> Surgery is a planned clinical event, not an appointment.

#### **What the Surgeon Does**
- Finalizes procedure details
- Confirms:
  - Surgical approach
  - Estimated duration
  - Assistance needed
- Coordinates informally with:
  - Other surgeons
  - Anesthetists (sometimes external)
  - Frontdesk / admin

#### **System Implication**
- **Event Type:** Surgical Planning
- **Entry Point:** Post-Consultation → Surgery Planning
- **Context Required:**
  - Consultation notes and recommendations
  - Patient profile and medical history
  - Procedure details
  - Previous surgical outcomes (if applicable)
- **Actions:**
  - Finalize surgical plan
  - Set estimated duration
  - Coordinate with team (informal, but documented)
  - Confirm readiness
- **Outputs:**
  - Surgery readiness confirmation
  - Surgical notes (pre-operative)
  - Team awareness (who's involved)

#### **System Requirements**
- Surgery must be a separate entity/event from consultation
- Planning phase must be distinct from execution phase
- Must support coordination notes (team communication)
- Must preserve full timeline (consultation → planning → surgery → follow-up)

### 3.3.2 Surgery Day (Execution Phase)

> **Remember:** Focus is 100% clinical. System must stay out of the way.

#### **What the Surgeon Does**
- Performs the procedure
- May collaborate with:
  - Another surgeon
  - Assistants
- Focus is 100% clinical

#### **What They Do NOT Do**
- Fill forms mid-procedure
- Manage scheduling
- Interact with dashboards

#### **System Implication**
- **Event Type:** Surgery Execution
- **During Surgery:**
  - Minimal UI (if any)
  - No complex forms
  - No scheduling interactions
  - System stays out of the way
- **After Surgery:**
  - Operative notes (can be typed later)
  - Immediate post-op observations
  - Instructions for follow-up
  - Dictation support (assistive, not authoritative)

#### **Documentation Workflow**
- **During:** Minimal or none
- **Post-Surgery:**
  - Notes can be typed later
  - Dictation supported
  - Finalized post-op
  - Full timeline preserved

### 3.3.3 Post-Op & Follow-Ups

> **Remember:** Follow-ups are continuations, not new cases.

#### **What the Surgeon Does**
- Reviews healing progress
- Addresses complications
- Adjusts care plans
- Reassures patient

#### **System Implication**
- **Event Type:** Follow-Up (Continuation Event)
- **Context Required:**
  - Full timeline visibility (consultation → surgery → follow-up)
  - Prior notes easily accessible
  - Previous outcomes
  - Original procedure details
- **Actions:**
  - Review timeline
  - Document progress
  - Update care plan
  - Schedule next follow-up (if needed)
- **Outputs:**
  - Follow-up notes
  - Updated recommendations
  - Sometimes escalation

#### **System Requirements**
- Follow-ups must show full patient journey
- Prior notes must be easily accessible
- Timeline view is critical
- Continuity of care is preserved

### 3.4 Patient Interaction Model

#### **What Doctors Can View**
- **Full Patient Profile:**
  - Demographics (name, DOB, gender, contact info)
  - Medical history
  - Allergies
  - Insurance information
  - Emergency contacts
- **Appointment History:**
  - All appointments (past and future)
  - Consultation history
  - Check-in status
- **Medical Records:**
  - All medical records for assigned patients
  - Vital signs
  - Diagnoses
  - Treatment plans
  - Lab test results
- **Consultation Requests:**
  - All consultation requests assigned to doctor
  - Patient concerns and medical safety info

#### **What Doctors Can Edit**
- **Clinical Data (Full Access):**
  - Consultation notes
  - Diagnoses
  - Treatment plans
  - Medical records
  - Vital signs (if allowed by workflow)
- **Appointment Data (Limited):**
  - Appointment notes (pre-consultation)
  - Consultation outcome
  - Follow-up plans
- **Cannot Edit:**
  - Patient demographics (name, DOB, etc.) - Admin/Frontdesk only
  - Patient contact information - Patient/Admin only
  - Insurance information - Patient/Admin only

#### **What Doctors Can Annotate**
- **Consultation Requests:**
  - Pre-consultation notes
  - Acceptance/decline reasons
  - Information requests
- **Appointments:**
  - Pre-consultation notes
  - Consultation notes
  - Follow-up recommendations
- **Patient Records:**
  - Clinical notes
  - Treatment recommendations
  - Follow-up plans

#### **Boundaries**
- **Medical Data (Doctor Domain):**
  - Diagnoses, treatment plans, clinical notes
  - Consultation outcomes
  - Medical recommendations
- **Administrative Data (Admin/Frontdesk Domain):**
  - Patient demographics
  - Contact information
  - Insurance information
  - Appointment scheduling (doctors can propose, Frontdesk confirms)

### 3.5 Profile & Preferences

#### **Doctor Profile Data Model**
- **Professional Information:**
  - Name, title (Dr., Prof., etc.)
  - Specialization
  - License number
  - Bio
  - Education
  - Focus areas
  - Professional affiliations
- **Contact Information:**
  - Email (from User)
  - Phone
  - Address
  - Clinic location
- **Availability:**
  - Working days (Monday-Sunday)
  - Working hours (start_time, end_time per day)
  - Availability status (AVAILABLE, UNAVAILABLE, ON_LEAVE)
- **Display:**
  - Profile image
  - Color code (for UI)

#### **Availability & Scheduling Assumptions**
- **Working Days:**
  - Doctors set availability per day of week
  - Each day has `start_time` and `end_time`
  - Can mark days as unavailable
- **Scheduling:**
  - Frontdesk/Admin schedules appointments based on doctor availability
  - Doctors can propose appointment times when accepting consultation requests
  - System should check availability before confirming appointments
- **Future Enhancement:**
  - Block out specific dates/times
  - Recurring availability patterns
  - Time slot duration settings

#### **Specialties, Services, Visibility**
- **Specialties:**
  - Each doctor has `specialization` field
  - Can have multiple focus areas (stored in `focus_areas` text field)
- **Services:**
  - Doctors are not directly linked to services
  - Services are procedure/treatment types
  - Doctors can be assigned to consultation requests based on specialization
- **Visibility:**
  - Doctors visible in patient portal if `onboarding_status: ACTIVE`
  - Profile information visible to patients
  - Ratings/feedback visible to patients

---

## 🧱 Phase 4: System Integration & Design Output

### 4.1 Doctor User Journey (Step-by-Step)

#### **Journey 1: First-Time Doctor Activation**

1. **Receive Invitation**
   - Admin/Frontdesk creates doctor account
   - Doctor receives email with activation link: `/doctor/activate?token=xxx`

2. **Activate Account**
   - Doctor clicks link
   - System validates token
   - Doctor sets password
   - System updates `onboarding_status: ACTIVATED`
   - Redirects to profile completion

3. **Complete Profile**
   - Doctor fills required profile fields:
     - Bio
     - Education
     - Focus areas
     - Working days/hours
   - System updates `onboarding_status: PROFILE_COMPLETED`
   - System updates `onboarding_status: ACTIVE`
   - Redirects to dashboard

4. **First Dashboard View**
   - Doctor sees welcome message
   - Dashboard shows empty state (no appointments yet)
   - Doctor can explore system features

#### **Journey 2: Daily Workflow - Review Consultation Requests**

1. **Login**
   - Doctor logs in via `/patient/login`
   - System authenticates and checks `onboarding_status: ACTIVE`
   - Redirects to `/doctor/dashboard`

2. **View Dashboard**
   - Doctor sees:
     - Today's appointments count
     - Pending consultation requests count
     - Pending check-ins count
     - Upcoming appointments count
   - Doctor clicks "View Consultation Requests"

3. **Review Consultation Requests**
   - Doctor sees list of pending requests
   - Doctor clicks on a request to view details
   - Doctor reviews:
     - Patient info
     - Concern description
     - Medical safety info
     - Preferred date/time

4. **Make Decision**
   - **Option A: Accept**
     - Doctor clicks "Accept"
     - Doctor confirms/selects appointment date and time
     - System updates status to `APPROVED` → `SCHEDULED`
     - Patient receives notification
   - **Option B: Decline**
     - Doctor clicks "Decline"
     - Doctor provides reason (optional)
     - System cancels appointment
     - Patient receives notification
   - **Option C: Request More Info**
     - Doctor clicks "Request More Info"
     - Doctor provides specific questions
     - System updates status to `NEEDS_MORE_INFO`
     - Patient receives notification

5. **Return to Dashboard**
   - Doctor returns to dashboard
   - Pending requests count updates
   - Doctor can continue reviewing other requests

#### **Journey 3: Consultation Day - Conduct Consultation (Decision Event)**

1. **Day Start: Clinical Awareness**
   - Doctor logs in
   - Dashboard (decision cockpit) shows:
     - Today's appointments (who am I seeing)
     - Pending check-ins (what's waiting)
     - Decisions needed (consultation requests)
   - Doctor mentally prepares for the day

2. **Pre-Consultation Review (Context Gathering)**
   - Doctor clicks on today's appointment
   - Doctor views:
     - Patient profile (full context)
     - Medical history (timeline view)
     - Previous consultations (if returning patient)
     - Current concern/aesthetic goals
   - Doctor adds pre-consultation notes (mental preparation)

3. **Start Consultation (Event Initiation)**
   - Patient checks in (or already checked in)
   - Doctor clicks "Start Consultation"
   - System creates `Consultation` record
   - Doctor begins clinical assessment

4. **Conduct Consultation (Core Decision Event)**
   - **Clinical Assessment:**
     - Doctor evaluates aesthetic concerns
     - Doctor reviews patient goals
     - Doctor assesses candidacy
   - **Decision Making:**
     - Is surgery appropriate? (Yes/No/Defer)
     - Which procedure? (If yes)
     - Timeline? (When can surgery occur)
   - **Documentation:**
     - Doctor documents structured notes (assessment, recommendations)
     - Doctor adds freeform notes (clinical observations)
     - Doctor sets treatment plan (if surgery recommended)
     - Doctor sets follow-up plan (if needed)

5. **Complete Consultation (Decision Finalization)**
   - Doctor finalizes consultation notes
   - Doctor confirms recommendations
   - Doctor clicks "Complete Consultation"
   - System updates:
     - `Consultation.completed_at` set
     - `Appointment.status: COMPLETED`
   - Next steps triggered:
     - If surgery recommended → Surgery planning workflow
     - If follow-up needed → Follow-up scheduling
   - Patient receives notification

6. **Post-Consultation**
   - Doctor can view consultation in history
   - Full timeline preserved (consultation → surgery → follow-up)
   - Doctor can add follow-up notes later

#### **Journey 4: Manage Profile & Availability**

1. **Access Profile**
   - Doctor navigates to `/doctor/profile`
   - Doctor views current profile information

2. **Update Profile**
   - Doctor edits:
     - Bio
     - Education
     - Focus areas
     - Professional affiliations
   - Doctor saves changes
   - System updates `Doctor` record

3. **Manage Availability**
   - Doctor navigates to availability settings
   - Doctor updates:
     - Working days
     - Working hours per day
     - Availability status
   - Doctor saves changes
   - System updates `WorkingDay` records

### 4.2 Doctor Dashboard Information Architecture: Decision Cockpit

> **Core Principle:** Doctor dashboard ≠ analytics. It is a decision cockpit.  
> First screen answers: **"What do I need to do today?"**

#### **Layout Structure (Event-Driven, Decision-First)**

```
┌─────────────────────────────────────────────────────────┐
│  Header: Welcome, Dr. [Name]                           │
│  Quick Actions: Profile, Settings                      │
└─────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Decisions    │ Today's      │ Pending      │ Upcoming     │
│ Needed       │ Events       │ Check-ins    │ Events       │
│ [Count]      │ [Count]      │ [Count]      │ [Count]      │
│              │              │              │              │
└──────────────┴──────────────┴──────────────┴──────────────┘

┌─────────────────────────────────────────────────────────┐
│  DECISION QUEUE: Consultation Requests                │
│  (What decisions do I need to make today?)            │
│  ┌───────────────────────────────────────────────────┐  │
│  │ [Decision Card 1] - Patient Name, Concern        │  │
│  │ Context: Age, Gender, Medical Safety Info        │  │
│  │ Decision: Accept | Decline | Request Info       │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ [Decision Card 2] - ...                           │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  TODAY'S CLINICAL EVENTS                                │
│  (Who am I seeing today? What's happening?)            │
│  ┌───────────────────────────────────────────────────┐  │
│  │ [Event Card 1] - 10:00 AM, Consultation         │  │
│  │ Patient: [Name], Concern: [Description]        │  │
│  │ Status: Checked In ✓                             │  │
│  │ Actions: View Context | Start Consultation       │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ [Event Card 2] - 2:00 PM, Surgery                │  │
│  │ Patient: [Name], Procedure: [Type]               │  │
│  │ Status: Ready                                    │  │
│  │ Actions: Review Plan | View Timeline             │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  UPCOMING EVENTS (Next 3-5 Days)                        │
│  (What do I need to prepare for?)                       │
│  [Collapsible/Expandable]                               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ANALYTICS (Collapsible/Hidden)                         │
│  - Patient statistics                                   │
│  - Consultation statistics                              │
│  - Ratings/feedback                                     │
│  - Recent activity                                       │
└─────────────────────────────────────────────────────────┘
```

#### **Information Hierarchy (Decision-First)**

1. **Primary (Always Visible - Decision Support):**
   - **Decisions Needed:** Pending consultation requests requiring review
   - **Today's Events:** Appointments scheduled for today (consultations, surgeries, follow-ups)
   - **Pending Check-ins:** Patients who haven't arrived yet
   - **Decision Queue:** Consultation requests with full context for decision-making

2. **Secondary (Visible by Default - Event Context):**
   - **Today's Schedule List:** Full list of today's clinical events with context
   - **Upcoming Events:** Next 3-5 days (for preparation)
   - **Recent Consultations:** For continuity of care

3. **Tertiary (Collapsible/Hidden - Analytics):**
   - Patient statistics (total patients, new this month)
   - Consultation statistics (completion rate, etc.)
   - Ratings/feedback summary
   - Recent activity log

#### **Key Design Principles**

1. **Event-Driven Display:**
   - Show clinical events (consultations, surgeries, follow-ups)
   - Not just appointments or meetings
   - Each event has context and purpose

2. **Decision-First Layout:**
   - Decisions needed are most prominent
   - Full context provided for each decision
   - Actions are clear and immediate

3. **Timeline Continuity:**
   - Full patient journey visible
   - Previous consultations easily accessible
   - Follow-ups shown as continuations, not new cases

4. **Minimal Friction:**
   - One-click access to full context
   - Decisions can be made quickly
   - Documentation is effortless

5. **Clinical Focus:**
   - Analytics are secondary
   - Clinical decisions are primary
   - System supports, doesn't distract

### 4.3 Core API Endpoints Needed (Additive Only)

#### **Consultation Request Management**

1. **GET /api/consultations/doctor/:doctorId/pending**
   - Get pending consultation requests for a doctor
   - Query params: `status`, `limit`, `offset`
   - Returns: `AppointmentResponseDto[]` with consultation request details
   - Permissions: `DOCTOR` role only

2. **POST /api/consultations/:id/accept**
   - Accept a consultation request
   - Body: `{ appointmentDate: Date, time: string, notes?: string }`
   - Returns: `AppointmentResponseDto`
   - Permissions: `DOCTOR` role only, must be assigned doctor
   - Use Case: `AcceptConsultationRequestUseCase`

3. **POST /api/consultations/:id/decline**
   - Decline a consultation request
   - Body: `{ reason?: string }`
   - Returns: `AppointmentResponseDto`
   - Permissions: `DOCTOR` role only, must be assigned doctor
   - Use Case: `DeclineConsultationRequestUseCase`

4. **POST /api/consultations/:id/request-info**
   - Request more information from patient
   - Body: `{ questions: string, notes?: string }`
   - Returns: `AppointmentResponseDto`
   - Permissions: `DOCTOR` role only, must be assigned doctor
   - Use Case: `RequestMoreInfoUseCase`

#### **Appointment Management**

5. **GET /api/appointments/doctor/:doctorId/today**
   - Get today's appointments for a doctor
   - Returns: `AppointmentResponseDto[]`
   - Permissions: `DOCTOR` role only, must be own doctor ID
   - Already exists, verify it works

6. **GET /api/appointments/doctor/:doctorId/upcoming**
   - Get upcoming appointments for a doctor
   - Query params: `limit`, `offset`
   - Returns: `AppointmentResponseDto[]`
   - Permissions: `DOCTOR` role only, must be own doctor ID
   - Already exists, verify it works

7. **PUT /api/appointments/:id/notes**
   - Add/update appointment notes (pre-consultation)
   - Body: `{ notes: string }`
   - Returns: `AppointmentResponseDto`
   - Permissions: `DOCTOR` role only, must be assigned doctor
   - Use Case: `AddAppointmentNotesUseCase`

#### **Doctor Profile Management**

8. **GET /api/doctors/:id/profile**
   - Get doctor profile (full details)
   - Returns: `DoctorResponseDto` with full profile
   - Permissions: `DOCTOR` role only (own profile) or `ADMIN`/`FRONTDESK`
   - May already exist, verify

9. **PUT /api/doctors/:id/profile**
   - Update doctor profile
   - Body: `UpdateDoctorProfileDto` (bio, education, focus_areas, etc.)
   - Returns: `DoctorResponseDto`
   - Permissions: `DOCTOR` role only (own profile) or `ADMIN`
   - Use Case: `UpdateDoctorProfileUseCase`

10. **GET /api/doctors/:id/availability**
    - Get doctor availability (working days/hours)
    - Returns: `WorkingDay[]`
    - Permissions: `DOCTOR` role only (own) or `ADMIN`/`FRONTDESK`
    - May need to create

11. **PUT /api/doctors/:id/availability**
    - Update doctor availability
    - Body: `UpdateAvailabilityDto` (working days array)
    - Returns: `WorkingDay[]`
    - Permissions: `DOCTOR` role only (own) or `ADMIN`
    - Use Case: `UpdateDoctorAvailabilityUseCase`

#### **Dashboard Statistics**

12. **GET /api/doctors/:id/dashboard-stats**
    - Get dashboard statistics for doctor
    - Returns: `DoctorDashboardStatsDto` (today's count, pending requests, etc.)
    - Permissions: `DOCTOR` role only, must be own doctor ID
    - Use Case: `GetDoctorDashboardStatsUseCase`

### 4.4 State Transitions Diagram (Textual)

#### **Consultation Request States (Doctor Side)**

```
[SUBMITTED]
  │
  ├─→ Doctor Reviews
  │
  ├─→ [PENDING_REVIEW] (auto, or manual)
  │     │
  │     ├─→ Doctor Accepts → [APPROVED]
  │     │                      │
  │     │                      ├─→ Frontdesk Sets Date/Time → [SCHEDULED]
  │     │                      │                                    │
  │     │                      │                                    ├─→ Patient Confirms → [CONFIRMED]
  │     │                      │                                    │                          │
  │     │                      │                                    │                          └─→ Appointment Day
  │     │                      │                                    │
  │     │                      └─→ Doctor Sets Date/Time → [SCHEDULED] (if doctor can set)
  │     │
  │     ├─→ Doctor Requests More Info → [NEEDS_MORE_INFO]
  │     │                                  │
  │     │                                  ├─→ Patient Resubmits → [SUBMITTED] (loop)
  │     │                                  │
  │     │                                  └─→ Doctor Reviews Again → [PENDING_REVIEW]
  │     │
  │     └─→ Doctor Declines → [CANCELLED] (AppointmentStatus)
  │
  └─→ Doctor Declines → [CANCELLED] (AppointmentStatus)
```

#### **Appointment States (Doctor Side)**

```
[PENDING] (Consultation Request Approved, Awaiting Patient Confirmation)
  │
  ├─→ Patient Confirms → [SCHEDULED]
  │                        │
  │                        ├─→ Appointment Day
  │                        │
  │                        ├─→ Patient Checks In → [SCHEDULED] (checked_in_at set)
  │                        │
  │                        └─→ Doctor Starts Consultation → Consultation Started
  │                                                          │
  │                                                          └─→ Doctor Completes → [COMPLETED]
  │
  └─→ Doctor/Frontdesk Cancels → [CANCELLED]
```

#### **Doctor Onboarding States**

```
[INVITED]
  │
  ├─→ Doctor Activates Account → [ACTIVATED]
  │                                │
  │                                └─→ Doctor Completes Profile → [PROFILE_COMPLETED]
  │                                                               │
  │                                                               └─→ System Activates → [ACTIVE]
  │                                                                                    │
  │                                                                                    └─→ Can Login & Use System
```

### 4.5 Role & Permission Matrix

#### **Consultation Request Actions**

| Action | DOCTOR | FRONTDESK | ADMIN | PATIENT |
|--------|--------|-----------|-------|---------|
| View Own Consultation Requests | ✅ | ✅ | ✅ | ❌ |
| Accept Consultation Request | ✅ (own) | ❌ | ✅ | ❌ |
| Decline Consultation Request | ✅ (own) | ❌ | ✅ | ❌ |
| Request More Info | ✅ (own) | ✅ | ✅ | ❌ |
| Review Consultation Request | ❌ | ✅ | ✅ | ❌ |
| Submit Consultation Request | ❌ | ❌ | ❌ | ✅ |

#### **Appointment Actions**

| Action | DOCTOR | FRONTDESK | ADMIN | PATIENT |
|--------|--------|-----------|-------|---------|
| View Own Appointments | ✅ | ✅ | ✅ | ✅ (own) |
| Start Consultation | ✅ (own) | ❌ | ✅ | ❌ |
| Complete Consultation | ✅ (own) | ❌ | ✅ | ❌ |
| Add Appointment Notes | ✅ (own) | ✅ | ✅ | ❌ |
| Check In Patient | ✅ | ✅ | ✅ | ❌ |
| Schedule Appointment | ❌ | ✅ | ✅ | ❌ |

#### **Patient Data Access**

| Data | DOCTOR | FRONTDESK | ADMIN | PATIENT |
|------|--------|-----------|-------|---------|
| View Patient Profile | ✅ (assigned) | ✅ | ✅ | ✅ (own) |
| Edit Patient Demographics | ❌ | ✅ | ✅ | ✅ (own) |
| View Medical History | ✅ (assigned) | ✅ | ✅ | ✅ (own) |
| Edit Medical Records | ✅ (assigned) | ❌ | ✅ | ❌ |
| View Consultation History | ✅ (assigned) | ✅ | ✅ | ✅ (own) |

#### **Doctor Profile Actions**

| Action | DOCTOR | FRONTDESK | ADMIN | PATIENT |
|--------|--------|-----------|-------|---------|
| View Own Profile | ✅ | ✅ | ✅ | ✅ (public) |
| Edit Own Profile | ✅ | ❌ | ✅ | ❌ |
| Manage Own Availability | ✅ | ❌ | ✅ | ❌ |
| View Other Doctors | ✅ | ✅ | ✅ | ✅ (public) |
| Edit Other Doctors | ❌ | ❌ | ✅ | ❌ |

### 4.6 What Can Be Reused from Patient Logic

#### **Profile Management**
- **Reusable Patterns:**
  - Profile completeness tracking
  - Form validation (Zod schemas)
  - Profile update use case pattern
- **Adaptations Needed:**
  - Doctor profile has different fields (bio, education, etc.)
  - Doctor profile update requires different validation
  - Doctor profile has availability management

#### **Authentication & Authorization**
- **Fully Reusable:**
  - `useAuth` hook
  - `JwtMiddleware`
  - `RbacMiddleware`
  - Token storage/refresh logic
- **No Changes Needed**

#### **Dashboard Structure**
- **Reusable Patterns:**
  - Dashboard layout (stats cards + lists)
  - Appointment card component
  - Loading states
  - Empty states
- **Adaptations Needed:**
  - Different KPIs for doctor
  - Different actionable queues
  - Different navigation

#### **Appointment Display**
- **Fully Reusable:**
  - `AppointmentCard` component
  - Appointment status indicators
  - Date/time formatting
- **Adaptations Needed:**
  - Doctor-specific actions (Accept, Decline, etc.)
  - Doctor-specific information display

#### **Consultation Workflow**
- **Partially Reusable:**
  - Consultation start/complete use cases exist
  - Consultation API endpoints exist
- **Additions Needed:**
  - Doctor consultation request review workflow
  - Doctor acceptance/decline logic

### 4.7 What Must Be Doctor-Specific

#### **Consultation Request Review**
- **New Workflow:**
  - Doctor views pending consultation requests
  - Doctor accepts/declines/requests info
  - Different from Frontdesk review (Frontdesk sets date/time, Doctor can also set)
- **New Components:**
  - `ConsultationRequestCard` (doctor-specific)
  - `AcceptConsultationDialog`
  - `DeclineConsultationDialog`
  - `RequestMoreInfoDialog`

#### **Doctor Dashboard**
- **Unique Features:**
  - Pending consultation requests queue
  - Doctor-specific KPIs
  - Today's schedule with check-in status
  - Doctor availability management

#### **Doctor Profile Management**
- **Unique Fields:**
  - Professional bio
  - Education background
  - Focus areas
  - Professional affiliations
  - Working days/hours
- **Unique Workflows:**
  - Availability management
  - Profile completion on first login

#### **Doctor-Specific API Endpoints**
- All endpoints listed in Section 4.3 are doctor-specific
- New use cases needed:
  - `AcceptConsultationRequestUseCase`
  - `DeclineConsultationRequestUseCase`
  - `RequestMoreInfoUseCase`
  - `UpdateDoctorProfileUseCase`
  - `UpdateDoctorAvailabilityUseCase`
  - `GetDoctorDashboardStatsUseCase`

---

## 🎯 Design Principles Summary

### Core Philosophy: Event-Driven, Decision-Focused

The system must model **how surgeons actually work**, not how software imagines they work.

#### **1. Event-Driven Architecture**
- Model **clinical events** (consultations, surgeries, follow-ups)
- Model **decisions** (accept/decline, treatment recommendations, eligibility)
- Model **transitions** (consultation → surgery → follow-up)
- **NOT:** Screens, forms, tabs

#### **2. Decision Cockpit, Not Analytics Dashboard**
- First screen answers: **"What do I need to do today?"**
- Decisions needed are most prominent
- Full context provided for each decision
- Analytics are secondary, decisions are primary

#### **3. Clinical Events, Not Appointments**
- Consultations are **decision events**, not just meetings
- Surgery is a **planned clinical event**, not an appointment
- Follow-ups are **continuations**, not new cases
- Each event has context, purpose, and outcomes

#### **4. Minimal Friction, Maximum Support**
- System stays out of the way during surgery
- Documentation is effortless (structured + freeform)
- Full timeline visibility for continuity
- One-click access to full context

#### **5. Surgeon Responsibilities vs System Responsibilities**

| Surgeon Does | System Must |
|--------------|-------------|
| Make clinical decisions | Capture decisions cleanly |
| Review patient info | Present relevant data fast |
| Perform surgery | Stay out of the way |
| Document outcomes | Make documentation effortless |
| Collaborate | Preserve accountability |
| Move fast | Reduce friction |

### Implementation Priorities

1. **Decision Queue (Highest Priority)**
   - Pending consultation requests
   - Full context for decision-making
   - Clear actions (Accept/Decline/Request Info)

2. **Today's Clinical Events**
   - Who am I seeing today?
   - What's happening?
   - What context do I need?

3. **Timeline Continuity**
   - Full patient journey visible
   - Previous consultations accessible
   - Follow-ups as continuations

4. **Documentation Support**
   - Easy to create (structured + freeform)
   - Easy to review
   - Clearly owned by surgeon

5. **Surgical Planning & Execution**
   - Gap between consultation and surgery
   - Minimal UI during execution
   - Post-surgery documentation support

---

## 🚨 CRITICAL: Design Compliance Validation

### Core Principles (DO NOT VIOLATE)

Before implementing ANY feature, validate against these principles:

#### ✅ **1. Event-Driven, Not Feature-Driven**
- [ ] Does this model **clinical events** (consultations, surgeries, follow-ups)?
- [ ] Does this model **decisions** (eligibility, treatment recommendations, next steps)?
- [ ] Does this model **transitions** (consultation → surgery → follow-up)?
- [ ] **STOP if:** This introduces screens, tabs, or forms as primary abstractions

#### ✅ **2. Decision Cockpit, Not Analytics**
- [ ] Does the dashboard answer: **"What do I need to do today?"**
- [ ] Are decisions needed prominently displayed?
- [ ] Is full context provided for each decision?
- [ ] **STOP if:** Dashboard shows analytics before decisions

#### ✅ **3. Consultations as Decision Events**
- [ ] Does consultation capture **eligibility decisions**?
- [ ] Does consultation capture **treatment recommendations**?
- [ ] Does consultation trigger **next steps** (surgery, follow-up, decline)?
- [ ] **STOP if:** Consultation is treated as a simple appointment/meeting

#### ✅ **4. Surgery as Planned Clinical Event**
- [ ] Is surgery **distinct from consultation**?
- [ ] Is there a **planning phase** between consultation and execution?
- [ ] Does the system **stay out of the way** during surgery?
- [ ] **STOP if:** Surgery is treated as an appointment or mixed with consultation

#### ✅ **5. Follow-ups as Continuations**
- [ ] Are follow-ups shown as **continuations of a timeline**?
- [ ] Is full patient journey visible (consultation → surgery → follow-up)?
- [ ] Are prior notes easily accessible?
- [ ] **STOP if:** Follow-ups are treated as new cases

#### ✅ **6. System Stays Out of the Way During Surgery**
- [ ] Is UI minimal or non-existent during surgery execution?
- [ ] Can documentation happen post-surgery?
- [ ] Is dictation supported (assistive, not authoritative)?
- [ ] **STOP if:** System requires forms or complex UI during surgery

#### ✅ **7. Documentation is Assistive, Fast, Attributable**
- [ ] Is documentation easy to create (structured + freeform)?
- [ ] Is documentation clearly owned by the surgeon?
- [ ] Is documentation fast (minimal friction)?
- [ ] **STOP if:** Documentation requires clerical work or complex forms

### Constraints Validation

#### ✅ **System Constraints**
- [ ] Doctors pre-exist in DB (no self-registration)
- [ ] JWT auth, RBAC enforced
- [ ] Existing patient & consultation workflows remain intact
- [ ] Additive changes only (no breaking changes)
- [ ] **STOP if:** Any constraint is violated

### Failure Condition Checks

Before implementing, verify this does NOT:
- [ ] ❌ Introduce UI-first abstractions
- [ ] ❌ Treat consultations as simple appointments
- [ ] ❌ Mix admin/frontdesk responsibilities with clinical decisions
- [ ] ❌ Require doctors to perform clerical work
- [ ] ❌ Model screens/tabs/forms instead of events/decisions/transitions

### Decision Gate

**If ANY requirement conflicts with these principles:**
1. **STOP implementation**
2. **Document the conflict**
3. **Explain why the requirement violates principles**
4. **Propose alternative that aligns with principles**
5. **Get approval before proceeding**

### Current Implementation Gaps (To Fix)

Based on codebase analysis, these areas need alignment:

#### ❌ **Doctor Dashboard - Analytics-Focused**
**Current State:** `app/doctor/dashboard/page.tsx` shows:
- "Quick stats (appointments, consultations, patients)" - analytics first
- Charts and statistics prominently displayed
- Missing: Decision queue for consultation requests
- Missing: "What do I need to do today?" focus

**Required Fix:**
- Reorganize to decision-first layout
- Show pending consultation requests (decisions needed) prominently
- Move analytics to collapsible/hidden section
- Answer "What do I need to do today?" immediately

#### ⚠️ **Consultation Implementation - Event Model Unclear**
**Current State:**
- `StartConsultationUseCase` and `CompleteConsultationUseCase` exist
- Consultations are tied to `Appointment` entity
- Decision capture (eligibility, recommendations, next steps) not explicit

**Required Fix:**
- Ensure consultations capture decisions explicitly:
  - Eligibility decision (appropriate/not appropriate/defer)
  - Treatment recommendations
  - Next steps (surgery scheduling, follow-up, decline)
- Make consultation a distinct clinical event, not just an appointment state

#### ⚠️ **Surgical Planning - Gap Not Modeled**
**Current State:**
- No distinct surgical planning phase
- Surgery may be treated as appointment type
- Gap between consultation and OR not explicitly modeled

**Required Fix:**
- Model surgical planning as distinct phase
- Support coordination notes (team communication)
- Preserve timeline: consultation → planning → surgery → follow-up

#### ⚠️ **Follow-ups - Continuity Not Emphasized**
**Current State:**
- Follow-ups may be treated as new appointments
- Timeline continuity may not be prominently displayed

**Required Fix:**
- Show follow-ups as continuations of patient journey
- Full timeline visibility (consultation → surgery → follow-up)
- Prior notes easily accessible

#### ✅ **Documentation - Structure Exists**
**Current State:**
- Consultation notes supported
- Medical records exist
- Documentation structure in place

**Required Enhancement:**
- Ensure documentation is fast and effortless
- Support both structured and freeform notes
- Clear attribution to surgeon

---

## ✅ Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Create `AcceptConsultationRequestUseCase`
- [ ] Create `DeclineConsultationRequestUseCase`
- [ ] Create `RequestMoreInfoUseCase`
- [ ] Create `UpdateDoctorProfileUseCase`
- [ ] Create `UpdateDoctorAvailabilityUseCase`
- [ ] Create `GetDoctorDashboardStatsUseCase`

### Phase 2: API Endpoints (Week 1-2)
- [ ] Implement `GET /api/consultations/doctor/:doctorId/pending`
- [ ] Implement `POST /api/consultations/:id/accept`
- [ ] Implement `POST /api/consultations/:id/decline`
- [ ] Implement `POST /api/consultations/:id/request-info`
- [ ] Implement `PUT /api/appointments/:id/notes`
- [ ] Implement `GET /api/doctors/:id/profile`
- [ ] Implement `PUT /api/doctors/:id/profile`
- [ ] Implement `GET /api/doctors/:id/availability`
- [ ] Implement `PUT /api/doctors/:id/availability`
- [ ] Implement `GET /api/doctors/:id/dashboard-stats`

### Phase 3: UI Components (Week 2-3)
- [ ] Create `ConsultationRequestCard` component
- [ ] Create `AcceptConsultationDialog` component
- [ ] Create `DeclineConsultationDialog` component
- [ ] Create `RequestMoreInfoDialog` component
- [ ] Update `DoctorDashboard` page with new queues
- [ ] Create `/doctor/consultation-requests` page
- [ ] Update `/doctor/profile` page with full profile management
- [ ] Create `/doctor/availability` page

### Phase 4: Integration & Testing (Week 3-4)
- [ ] Integrate doctor consultation request workflow
- [ ] Test state transitions
- [ ] Test permissions
- [ ] Test notifications
- [ ] Update documentation

---

## 📝 Notes & Considerations

1. **Doctor Consultation Request Review vs Frontdesk Review:**
   - Frontdesk reviews for triage/assignment
   - Doctor reviews for clinical acceptance
   - Both can set appointment date/time (doctor when accepting, Frontdesk when reviewing)

2. **Availability Management:**
   - Doctors set working days/hours
   - System should validate appointment scheduling against availability
   - Future: Block out specific dates/times

3. **Notifications:**
   - Doctors should receive notifications for new consultation requests
   - Patients should receive notifications when doctor accepts/declines
   - Consider in-app notifications + email

4. **Scalability:**
   - Design supports multi-clinic expansion
   - Doctor availability can be clinic-specific in future
   - Consultation requests can be clinic-specific in future

5. **Security:**
   - Doctors can only view/edit their own consultation requests
   - Doctors can only view assigned patients
   - All actions are audited

---

**End of Document**
