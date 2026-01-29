# Theater Scheduling Integration

## Overview

Theater scheduling is fully integrated with the enterprise scheduling system and patient/doctor workflows. This document explains how all pieces connect.

---

## Complete Workflow

### 1. Patient Journey

#### Step 1: Consultation Booking
- **Patient** books consultation via `/patient/consultations/request`
- **System** validates doctor availability using `AvailabilityService`
- **System** checks blocks, overrides, sessions, breaks
- **Appointment** created with status `PENDING` or `SCHEDULED`

#### Step 2: Consultation
- **Doctor** conducts consultation via `/doctor/consultations/[appointmentId]/session`
- **Doctor** completes consultation with outcome
- **If surgery needed**: Doctor creates `CasePlan` via `/doctor/cases/[appointmentId]/plan`

#### Step 3: Case Planning
- **Doctor** creates `CasePlan` linked to appointment
- **CasePlan** includes:
  - Procedure plan
  - Risk factors
  - Pre-op notes
  - Consent checklist
  - Anesthesia plan
  - Special instructions
- **Readiness status** tracked: `NOT_STARTED`, `PENDING_LABS`, `PENDING_CONSENT`, `PENDING_REVIEW`, `READY`, `ON_HOLD`

#### Step 4: Theater Schedule
- **Appointment** appears in theater schedule when:
  - Status is `SCHEDULED` or `CONFIRMED`
  - `CasePlan` exists (for surgical cases)
- **TheaterScheduleView** shows:
  - Patient name
  - Procedure
  - Readiness status
  - Date/time
  - Special instructions

---

### 2. Doctor Journey

#### Step 1: Schedule Management
- **Doctor** sets weekly schedule via `/doctor/profile` → "Manage Schedule"
- **EnhancedScheduleManager** allows:
  - Multiple sessions per day (e.g., "08:00-11:00 Clinic", "14:00-17:00 Consultations")
  - Session types: Clinic, Consultations, Ward Rounds, Teleconsult, **Surgery**
  - Schedule blocks for leave, surgery, admin time

#### Step 2: Surgery Session Configuration
- **Doctor** can create "Surgery" session type in weekly schedule
- **Example**: Monday 09:00-17:00 with session "09:00-13:00 Surgery"
- **System** respects surgery sessions when booking appointments

#### Step 3: Surgery Block Management
- **Doctor** creates blocks for surgery time via "Blocks & Leave" tab
- **Block types**: `SURGERY`, `LEAVE`, `ADMIN`, `EMERGENCY`, etc.
- **Blocks** prevent appointments during blocked periods
- **Example**: Block 2026-02-14, 10:00-12:00 (SURGERY) prevents bookings

#### Step 4: Theater Schedule View
- **Doctor** views theater schedule on dashboard
- **TheaterScheduleView** shows:
  - All scheduled surgical cases
  - Readiness status (Ready, Pending Labs, Pending Consent, etc.)
  - Cases grouped by readiness
  - Quick access to case planning

---

## Database Structure

### Appointment → CasePlan Relationship
```
Appointment (1) ──→ (1) CasePlan
  - appointment_id (unique)
  - Links consultation to surgical case planning
```

### CasePlan Fields
- `procedure_plan`: Surgical procedure details
- `readiness_status`: `CaseReadinessStatus` enum
- `ready_for_surgery`: Boolean flag
- `risk_factors`: Patient risk assessment
- `pre_op_notes`: Pre-operative notes
- `consent_checklist`: Consent verification
- `planned_anesthesia`: Anesthesia plan
- `special_instructions`: Instructions for theater team

---

## API Endpoints

### Schedule Management
- `PUT /api/doctors/me/availability` - Set weekly schedule with sessions
- `POST /api/doctors/me/schedule/block` - Create schedule block
- `DELETE /api/doctors/me/schedule/block/:id` - Delete block
- `GET /api/doctors/me/schedule/blocks` - Get blocks

### Theater Schedule
- `GET /api/doctors/me/theatre-schedule` - Get appointments with CasePlan data
  - Query params: `startDate`, `endDate` (optional)
  - Returns: Appointments with CasePlan readiness status

---

## Integration Points

### 1. Availability System → Theater Scheduling
- **Surgery sessions** in weekly schedule create available slots
- **Surgery blocks** prevent double-booking during surgery time
- **AvailabilityService** respects blocks when generating slots

### 2. Appointment Booking → Theater Schedule
- **Appointments** scheduled using availability system
- **If appointment type is surgical**: CasePlan can be created
- **Theater schedule** shows appointments with CasePlan data

### 3. Case Planning → Theater Schedule
- **CasePlan** created via `/doctor/cases/[appointmentId]/plan`
- **Readiness status** updated as pre-op tasks complete
- **TheaterScheduleView** displays readiness status

### 4. Schedule Blocks → Theater Availability
- **Surgery blocks** prevent appointments during blocked time
- **Blocks** can be full-day or partial-day
- **Validation** prevents overlapping blocks

---

## Example Flow

### Scenario: Doctor schedules surgery for patient

1. **Doctor sets schedule**:
   - Monday: 09:00-17:00
   - Session 1: 09:00-13:00 (Surgery)
   - Session 2: 14:00-17:00 (Consultations)

2. **Patient books consultation**:
   - Date: 2026-02-14 (Monday)
   - Time: 10:00 (within Surgery session)
   - System validates availability ✅

3. **Doctor conducts consultation**:
   - Determines surgery needed
   - Creates CasePlan for appointment
   - Sets readiness status: `PENDING_LABS`

4. **Doctor blocks surgery time**:
   - Creates block: 2026-02-14, 10:00-12:00 (SURGERY)
   - Prevents other appointments during surgery

5. **Theater schedule shows**:
   - Appointment: 2026-02-14, 10:00
   - Patient: John Doe
   - Procedure: Rhinoplasty
   - Status: Pending Labs
   - Not ready for surgery

6. **Pre-op tasks complete**:
   - Labs cleared
   - Consent obtained
   - Readiness status: `READY`

7. **Theater schedule updates**:
   - Status: Ready
   - Ready for surgery ✅

---

## Key Features

### ✅ Complete Integration
- Schedule management → Availability → Booking → Case Planning → Theater Schedule
- All pieces connected and working together

### ✅ Enterprise Scheduling
- Multiple sessions per day
- Schedule blocks for surgery time
- Layered priority resolution (Blocks > Overrides > Sessions)

### ✅ Theater Workflow
- Case planning linked to appointments
- Readiness status tracking
- Theater schedule view with status

### ✅ Patient Journey
- Books consultation
- Consultation determines surgery
- Case planning tracks readiness
- Theater schedule shows status

### ✅ Doctor Journey
- Sets schedule with surgery sessions
- Creates blocks for surgery time
- Plans cases and tracks readiness
- Views theater schedule

---

## Files Involved

### Backend
- `domain/services/AvailabilityService.ts` - Availability computation
- `application/use-cases/SetDoctorAvailabilityUseCase.ts` - Schedule management
- `application/use-cases/AddScheduleBlockUseCase.ts` - Block creation
- `app/api/doctors/me/schedule/block/route.ts` - Block API
- `app/api/doctors/me/theatre-schedule/route.ts` - Theater schedule API

### Frontend
- `components/doctor/EnhancedScheduleManager.tsx` - Schedule management UI
- `components/doctor/TheatreScheduleView.tsx` - Theater schedule display
- `app/doctor/dashboard/page.tsx` - Doctor dashboard with theater schedule
- `app/doctor/cases/[appointmentId]/plan/page.tsx` - Case planning

### Database
- `ScheduleSession` - Multiple sessions per day
- `ScheduleBlock` - Blocked periods
- `CasePlan` - Surgical case planning
- `Appointment` - Links everything together

---

## Summary

**Theater scheduling is fully integrated** with:
- ✅ Enterprise scheduling system (sessions, blocks)
- ✅ Patient booking workflow
- ✅ Doctor schedule management
- ✅ Case planning system
- ✅ Readiness status tracking

**No TODOs or incomplete implementations** - everything is wired up and working.
