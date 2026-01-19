# Doctor Journey Implementation Analysis

**Date:** January 2025  
**Status:** Ready for Implementation  
**Purpose:** Comprehensive analysis of doctor journey documentation and implementation roadmap

---

## 📋 Executive Summary

The doctor journey implementation is designed around **event-driven, decision-focused architecture** where:
- **Surgeons are NOT clerks** - Their work is event-driven and decision-driven
- **Clinical events, not appointments** - Consultations, surgeries, and follow-ups are clinical events
- **Decisions are first-class** - Eligibility, treatment recommendations, next steps must be explicit
- **System stays out of the way** - Minimal friction, maximum support

---

## 🎯 Core Principles (DO NOT VIOLATE)

### 1. Event-Driven, Decision-Driven Architecture
- Model **clinical events** (consultations, surgeries, follow-ups)
- Model **decisions** (eligibility, treatment recommendations, next steps)
- Model **transitions** (consultation → surgery → follow-up)
- **NOT:** Screens, tabs, or forms as primary abstractions

### 2. Decision Cockpit, Not Analytics Dashboard
- Dashboard answers: **"What do I need to do today?"**
- Decisions needed are most prominent
- Full context provided for each decision
- Analytics are secondary, decisions are primary

### 3. Consultations as Decision Events
- Capture **eligibility decisions** explicitly
- Capture **treatment recommendations** explicitly
- Trigger **next steps** (surgery, follow-up, decline) explicitly

### 4. Surgery as Planned Clinical Event
- Surgery is **distinct from consultation**
- There is a **planning phase** between consultation and OR
- System **stays out of the way** during surgery execution

### 5. Follow-ups as Continuations
- Follow-ups are **continuations of a timeline**, not new cases
- Full patient journey visible (consultation → surgery → follow-up)
- Prior notes easily accessible

---

## 📊 Current State Analysis

### ✅ What Exists

#### Use Cases (Application Layer)
- `StartConsultationUseCase` - Starts consultation (exists, needs verification)
- `CompleteConsultationUseCase` - Completes consultation (exists, needs enhancement)
- `ScheduleAppointmentUseCase` - Schedules appointments
- `CheckInPatientUseCase` - Checks in patients
- `ReviewConsultationRequestUseCase` - Frontdesk review (exists)
- `SubmitConsultationRequestUseCase` - Patient submission (exists)

#### Pages (UI Layer)
- `/doctor/dashboard` - Basic dashboard (needs redesign)
- `/doctor/appointments` - Appointments list
- `/doctor/consultations` - Consultations list
- `/doctor/patients` - Patients list
- `/doctor/profile` - Profile page
- `/doctor/activate` - Activation page

#### Components
- `StartConsultationDialog` - Starts consultation
- `CompleteConsultationDialog` - Completes consultation
- `DoctorSidebar` - Navigation sidebar

#### API Endpoints
- `GET /api/appointments/doctor/:doctorId/today` - Today's appointments (may exist)
- `GET /api/appointments/doctor/:doctorId/upcoming` - Upcoming appointments (may exist)
- `POST /api/consultations/:id/start` - Start consultation (exists)
- `POST /api/consultations/:id/complete` - Complete consultation (exists)

### ❌ What's Missing

#### Use Cases (Application Layer)
1. **`AcceptConsultationRequestUseCase`** - Doctor accepts consultation request
2. **`DeclineConsultationRequestUseCase`** - Doctor declines consultation request
3. **`RequestMoreInfoConsultationRequestUseCase`** - Doctor requests more info
4. **`GetPendingConsultationRequestsUseCase`** - Get pending requests for doctor
5. **`UpdateDoctorProfileUseCase`** - Update doctor profile
6. **`UpdateDoctorAvailabilityUseCase`** - Update working days/hours
7. **`GetDoctorDashboardStatsUseCase`** - Get dashboard statistics
8. **`AddAppointmentNotesUseCase`** - Add pre-consultation notes

#### API Endpoints
1. **`GET /api/consultations/doctor/:doctorId/pending`** - Get pending consultation requests
2. **`POST /api/consultations/:id/accept`** - Accept consultation request
3. **`POST /api/consultations/:id/decline`** - Decline consultation request
4. **`POST /api/consultations/:id/request-info`** - Request more information
5. **`PUT /api/appointments/:id/notes`** - Add/update appointment notes
6. **`GET /api/doctors/:id/profile`** - Get doctor profile
7. **`PUT /api/doctors/:id/profile`** - Update doctor profile
8. **`GET /api/doctors/:id/availability`** - Get doctor availability
9. **`PUT /api/doctors/:id/availability`** - Update doctor availability
10. **`GET /api/doctors/:id/dashboard-stats`** - Get dashboard statistics

#### UI Components
1. **`ConsultationRequestCard`** - Display consultation request with decision actions
2. **`AcceptConsultationDialog`** - Accept consultation request dialog
3. **`DeclineConsultationDialog`** - Decline consultation request dialog
4. **`RequestMoreInfoDialog`** - Request more info dialog
5. **`DecisionQueue`** - Decision queue component for dashboard
6. **`TodayEvents`** - Today's clinical events component
7. **`PendingCheckIns`** - Pending check-ins component

#### Dashboard Redesign
- Current: Analytics-focused (stats, charts)
- Required: Decision cockpit (decisions needed, today's events, pending check-ins)

---

## 🏗️ Implementation Roadmap

### Phase 1: Foundation - Use Cases (Week 1)

**Priority:** HIGHEST  
**Goal:** Create core use cases for doctor consultation request management

#### Tasks:
1. ✅ Create `AcceptConsultationRequestUseCase`
   - Validates doctor assignment
   - Updates consultation request status
   - Sets appointment date/time (optional)
   - Emits events and notifications

2. ✅ Create `DeclineConsultationRequestUseCase`
   - Validates doctor assignment
   - Cancels appointment
   - Records decline reason
   - Emits events and notifications

3. ✅ Create `RequestMoreInfoConsultationRequestUseCase`
   - Validates doctor assignment
   - Updates status to `NEEDS_MORE_INFO`
   - Records questions/notes
   - Emits events and notifications

4. ✅ Create `GetPendingConsultationRequestsUseCase`
   - Queries appointments with pending consultation requests
   - Filters by doctor assignment
   - Returns read model for dashboard

5. ✅ Create `GetDoctorDashboardStatsUseCase`
   - Calculates today's appointments count
   - Calculates pending consultation requests count
   - Calculates pending check-ins count
   - Calculates upcoming appointments count

6. ✅ Create `UpdateDoctorProfileUseCase`
   - Updates doctor profile fields (bio, education, focus areas, etc.)
   - Validates required fields
   - Records audit event

7. ✅ Create `UpdateDoctorAvailabilityUseCase`
   - Updates working days/hours
   - Validates availability data
   - Records audit event

8. ✅ Create `AddAppointmentNotesUseCase`
   - Adds pre-consultation notes
   - Validates doctor assignment
   - Records audit event

---

### Phase 2: API Layer (Week 1-2)

**Priority:** HIGH  
**Goal:** Create API endpoints for doctor workflows

#### Tasks:
1. ✅ Create `GET /api/consultations/doctor/:doctorId/pending`
   - Controller: `ConsultationController.getPendingConsultationRequests()`
   - Use Case: `GetPendingConsultationRequestsUseCase`
   - Permissions: `DOCTOR` role only, must be own doctor ID

2. ✅ Create `POST /api/consultations/:id/accept`
   - Controller: `ConsultationController.acceptConsultationRequest()`
   - Use Case: `AcceptConsultationRequestUseCase`
   - Permissions: `DOCTOR` role only, must be assigned doctor

3. ✅ Create `POST /api/consultations/:id/decline`
   - Controller: `ConsultationController.declineConsultationRequest()`
   - Use Case: `DeclineConsultationRequestUseCase`
   - Permissions: `DOCTOR` role only, must be assigned doctor

4. ✅ Create `POST /api/consultations/:id/request-info`
   - Controller: `ConsultationController.requestMoreInfo()`
   - Use Case: `RequestMoreInfoConsultationRequestUseCase`
   - Permissions: `DOCTOR` role only, must be assigned doctor

5. ✅ Create `PUT /api/appointments/:id/notes`
   - Controller: `AppointmentController.updateAppointmentNotes()`
   - Use Case: `AddAppointmentNotesUseCase`
   - Permissions: `DOCTOR` role only, must be assigned doctor

6. ✅ Create `GET /api/doctors/:id/profile`
   - Controller: `DoctorController.getProfile()`
   - Permissions: `DOCTOR` role only (own profile) or `ADMIN`/`FRONTDESK`

7. ✅ Create `PUT /api/doctors/:id/profile`
   - Controller: `DoctorController.updateProfile()`
   - Use Case: `UpdateDoctorProfileUseCase`
   - Permissions: `DOCTOR` role only (own profile) or `ADMIN`

8. ✅ Create `GET /api/doctors/:id/availability`
   - Controller: `DoctorController.getAvailability()`
   - Permissions: `DOCTOR` role only (own) or `ADMIN`/`FRONTDESK`

9. ✅ Create `PUT /api/doctors/:id/availability`
   - Controller: `DoctorController.updateAvailability()`
   - Use Case: `UpdateDoctorAvailabilityUseCase`
   - Permissions: `DOCTOR` role only (own) or `ADMIN`

10. ✅ Create `GET /api/doctors/:id/dashboard-stats`
    - Controller: `DoctorController.getDashboardStats()`
    - Use Case: `GetDoctorDashboardStatsUseCase`
    - Permissions: `DOCTOR` role only, must be own doctor ID

---

### Phase 3: Dashboard Redesign (Week 2-3)

**Priority:** HIGH  
**Goal:** Transform dashboard from analytics-focused to decision cockpit

#### Tasks:
1. ✅ Redesign `/doctor/dashboard` page
   - **Primary Section:** Decision Queue (pending consultation requests)
   - **Secondary Section:** Today's Clinical Events
   - **Tertiary Section:** Pending Check-ins
   - **Collapsible Section:** Analytics (moved to bottom)

2. ✅ Create `DecisionQueue` component
   - Displays pending consultation requests
   - Shows full context for decision-making
   - Provides Accept/Decline/Request Info actions

3. ✅ Create `TodayEvents` component
   - Displays today's appointments
   - Shows check-in status
   - Provides Start Consultation action

4. ✅ Create `PendingCheckIns` component
   - Displays patients who haven't checked in
   - Provides Check In action

5. ✅ Create `/doctor/consultation-requests` page
   - Full list of consultation requests
   - Filtering and sorting
   - Decision actions

---

### Phase 4: UI Components (Week 2-3)

**Priority:** MEDIUM  
**Goal:** Create reusable components for doctor workflows

#### Tasks:
1. ✅ Create `ConsultationRequestCard` component
   - Displays consultation request details
   - Shows patient info, concern, medical safety info
   - Provides decision actions (Accept/Decline/Request Info)

2. ✅ Create `AcceptConsultationDialog` component
   - Date/time selection
   - Optional notes
   - Confirmation

3. ✅ Create `DeclineConsultationDialog` component
   - Optional reason field
   - Confirmation

4. ✅ Create `RequestMoreInfoDialog` component
   - Questions/notes field
   - Confirmation

5. ✅ Update `DoctorSidebar` component
   - Add "Consultation Requests" link
   - Update navigation structure

---

### Phase 5: Integration & Testing (Week 3-4)

**Priority:** MEDIUM  
**Goal:** Integrate all components and test workflows

#### Tasks:
1. ✅ Integrate consultation request workflow
   - Connect UI to API endpoints
   - Test state transitions
   - Test notifications

2. ✅ Test permissions
   - Verify doctor can only access own requests
   - Verify assignment boundaries
   - Verify RBAC enforcement

3. ✅ Test state transitions
   - Verify valid transitions work
   - Verify invalid transitions are rejected
   - Verify audit logging

4. ✅ Update documentation
   - Update API documentation
   - Update workflow documentation
   - Update user guides

---

## 🔍 Key Design Decisions

### 1. Consultation Request Review is Separate from Frontdesk Review
- **Frontdesk:** Does triage/assignment
- **Doctor:** Does clinical acceptance
- **Both:** Can set appointment date/time
- **Doctor decisions:** Are clinical, not administrative

### 2. Assignment Boundaries are Strict
- Doctors can only act on entities assigned to them
- Enforced in use cases, not just UI
- Assignment is via `doctor_id` field

### 3. State Machines are Guarded
- All state transitions validated
- Invalid transitions throw `DomainException`
- State transition functions in domain layer

### 4. Decisions are Explicit
- Eligibility decision is explicit (not inferred)
- Treatment recommendations are explicit
- Next steps are explicit (surgery, follow-up, decline)
- Decision reasons are documented

### 5. Events are Emitted
- All state changes emit domain events
- Events trigger notifications
- Events are audited

### 6. Read Models are Separate
- Dashboard queries are read-only
- No business logic in read models
- Optimized for display, not mutation

---

## 🚨 Critical Constraints

### System Constraints
- ✅ Doctors pre-exist in DB (no self-registration)
- ✅ JWT auth, RBAC enforced
- ✅ Existing workflows remain intact
- ✅ Additive changes only (no breaking changes)

### Non-Goals (Explicitly NOT Implementing)
- ❌ Doctor signup/invite flow (out of scope)
- ❌ Profile onboarding (out of scope)
- ❌ Admin workflows (out of scope)
- ❌ Billing/payments (out of scope)
- ❌ Nurse workflows (out of scope)
- ❌ Lab test management (out of scope)
- ❌ Patient portal features (out of scope)
- ❌ Frontdesk workflows (already exist, not modifying)
- ❌ Analytics/reporting (out of scope)
- ❌ Notification system implementation (out of scope)

---

## 📝 Implementation Checklist

### Phase 1: Foundation - Use Cases
- [ ] `AcceptConsultationRequestUseCase`
- [ ] `DeclineConsultationRequestUseCase`
- [ ] `RequestMoreInfoConsultationRequestUseCase`
- [ ] `GetPendingConsultationRequestsUseCase`
- [ ] `GetDoctorDashboardStatsUseCase`
- [ ] `UpdateDoctorProfileUseCase`
- [ ] `UpdateDoctorAvailabilityUseCase`
- [ ] `AddAppointmentNotesUseCase`

### Phase 2: API Layer
- [ ] `GET /api/consultations/doctor/:doctorId/pending`
- [ ] `POST /api/consultations/:id/accept`
- [ ] `POST /api/consultations/:id/decline`
- [ ] `POST /api/consultations/:id/request-info`
- [ ] `PUT /api/appointments/:id/notes`
- [ ] `GET /api/doctors/:id/profile`
- [ ] `PUT /api/doctors/:id/profile`
- [ ] `GET /api/doctors/:id/availability`
- [ ] `PUT /api/doctors/:id/availability`
- [ ] `GET /api/doctors/:id/dashboard-stats`

### Phase 3: Dashboard Redesign
- [ ] Redesign `/doctor/dashboard` page
- [ ] Create `DecisionQueue` component
- [ ] Create `TodayEvents` component
- [ ] Create `PendingCheckIns` component
- [ ] Create `/doctor/consultation-requests` page

### Phase 4: UI Components
- [ ] `ConsultationRequestCard` component
- [ ] `AcceptConsultationDialog` component
- [ ] `DeclineConsultationDialog` component
- [ ] `RequestMoreInfoDialog` component
- [ ] Update `DoctorSidebar` component

### Phase 5: Integration & Testing
- [ ] Integrate consultation request workflow
- [ ] Test permissions
- [ ] Test state transitions
- [ ] Update documentation

---

## 🎯 Success Criteria

### Functional Requirements
- ✅ Doctors can view pending consultation requests
- ✅ Doctors can accept/decline/request info on consultation requests
- ✅ Doctors can set appointment date/time when accepting
- ✅ Dashboard shows decision queue prominently
- ✅ Dashboard shows today's clinical events
- ✅ Dashboard shows pending check-ins
- ✅ All actions are audited
- ✅ All state transitions are validated

### Non-Functional Requirements
- ✅ Dashboard loads in < 2 seconds
- ✅ Decision actions complete in < 1 second
- ✅ All API endpoints enforce RBAC
- ✅ All use cases enforce assignment boundaries
- ✅ All state transitions are validated
- ✅ All events are emitted and audited

---

## 📚 References

1. **Doctor Journey Design Document** (`docs/doctor/doctor-journey-design.md`)
   - Comprehensive 1900+ line design document
   - Foundation layer, workflows, API endpoints, state machines

2. **Doctor Workflow Design Document** (`docs/doctor/doctor-workflow-design.md`)
   - Implementation-ready use case definitions
   - API surface design, read models

3. **Doctor Domain Model** (`docs/doctor/domain-model.md`)
   - Domain entities, event types, decision points, state machines, invariants

4. **Principles Compliance** (`docs/doctor/PRINCIPLES_COMPLIANCE.md`)
   - Design principles validation framework

5. **Complete Consultation Workflow** (`docs/workflow/complete-consultation-workflow.md`)
   - Current workflow status and issues

---

**Status:** Ready for implementation. All documentation analyzed, roadmap defined, checklist created.

**Next Step:** Begin Phase 1 - Create core use cases for doctor consultation request management.
