# Doctor Profile Revamp - Comprehensive Implementation Plan

## Executive Summary

This document outlines the complete revamp of the Doctor Profile experience (`/doctor/profile`) to transform it from a basic information display into a professional clinical dashboard that integrates seamlessly with the surgical clinic's operational lifecycle.

**Key Objectives:**
1. Fix layout issues (clipped images, poor hierarchy)
2. Enable doctor self-management (profile editing, schedule management)
3. Integrate with system-wide workflow (booking, front desk, patient flow)
4. Maintain architectural integrity with existing models and flows

---

## 1. Current State Analysis

### 1.1 Existing Implementation

**File:** `app/doctor/profile/page.tsx`

**Current Features:**
- ✅ Basic profile display (name, specialization, contact)
- ✅ Working days display
- ✅ Stats cards (appointments, working days, today's hours)
- ✅ Edit Profile dialog (basic fields: bio, education, focus areas)
- ✅ Manage Availability dialog (working days, slot config)
- ✅ Professional information section

**Current Problems:**
1. **Layout Issues:**
   - Profile image is clipped by container (line 169: `w-24 h-24` in constrained space)
   - Poor visual hierarchy
   - Stats cards cramped in small space
   - No clear section separation

2. **Missing Functionality:**
   - Cannot edit specialization (affects booking filters)
   - Cannot edit years of experience
   - Cannot manage consultation types
   - No visual schedule overview (only dialog)
   - No activity snapshot (today's appointments, pending consultations)
   - No view of assigned patients
   - No integration with CasePlan/SurgicalOutcome workflow

3. **Workflow Gaps:**
   - Profile changes don't reflect in patient search immediately
   - Schedule changes not visible to front desk in real-time
   - No connection to pre/post-op workflow visibility

### 1.2 Existing Backend Infrastructure

**Database Models:**
- `Doctor` - Core doctor profile
- `WorkingDay` - Weekly recurring availability
- `AvailabilityOverride` - One-off blocks (holidays, leave)
- `AvailabilityBreak` - Recurring breaks (lunch, admin time)
- `SlotConfiguration` - Appointment duration, buffer, intervals

**API Endpoints:**
- `GET /api/doctors/me/profile` - Get doctor's own profile
- `PUT /api/doctors/me/profile` - Update profile (limited fields)
- `GET /api/doctors/me/availability` - Get availability
- `PUT /api/doctors/me/availability` - Set availability
- `GET /api/doctors/:id/slots?date=YYYY-MM-DD` - Get available slots (for booking)

**Use Cases:**
- `GetMyAvailabilityUseCase` - ✅ Exists
- `SetDoctorAvailabilityUseCase` - ✅ Exists
- `GetAllDoctorsAvailabilityUseCase` - ✅ Exists (for front desk)
- `ValidateAppointmentAvailabilityUseCase` - ✅ Exists (for booking)

**Gaps:**
- Profile update endpoint doesn't support specialization/experience updates
- No endpoint to get doctor's assigned patients
- No endpoint to get doctor's upcoming procedures (CasePlan-based)

---

## 2. UX Proposal

### 2.1 Page Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Header: "Doctor Profile" + Action Buttons (Edit, Schedule)  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SECTION 1: Doctor Identity Card (Full Width)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  [Large Profile Image - Not Clipped]                 │   │
│  │  Name, Title, Specialization                          │   │
│  │  License, Credentials                                 │   │
│  │  Contact Info (Email, Phone, Location)                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────┬──────────────────────────────┐
│  SECTION 2: Profile Actions   │  SECTION 3: Schedule Overview│
│  ┌────────────────────────┐  │  ┌────────────────────────┐  │
│  │  [Edit Profile Button] │  │  │  Weekly Grid          │  │
│  │  [Manage Schedule]     │  │  │  Mon-Sun with          │  │
│  │  [View Appointments]   │  │  │  Available/Booked     │  │
│  │  [View Patients]       │  │  │  slots highlighted     │  │
│  └────────────────────────┘  │  └────────────────────────┘  │
└──────────────────────────────┴──────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SECTION 4: Activity Snapshot                                 │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │ Today's      │ Pending      │ Upcoming     │            │
│  │ Appointments │ Consultations│ Procedures   │            │
│  │ (List)       │ (List)       │ (CasePlan)   │            │
│  └──────────────┴──────────────┴──────────────┘            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SECTION 5: Professional Information                         │
│  Bio, Education, Focus Areas, Affiliations                   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Component Breakdown

#### A. DoctorIdentityCard
- **Purpose:** Prominent display of doctor identity
- **Features:**
  - Large profile image (responsive, not clipped)
  - Name with title prefix
  - Specialization badge
  - License number
  - Contact information
  - Years of experience (if available)
- **Layout:** Full-width card, horizontal layout on desktop, stacked on mobile

#### B. ProfileActionsPanel
- **Purpose:** Quick access to profile management
- **Actions:**
  - Edit Profile (opens enhanced dialog)
  - Manage Schedule (opens availability dialog)
  - View Appointments (link to `/doctor/appointments`)
  - View Assigned Patients (new page or dialog)
- **Layout:** Vertical button list or grid

#### C. WeeklyAvailabilityGrid
- **Purpose:** Visual overview of weekly schedule
- **Features:**
  - 7-day grid (Mon-Sun)
  - Each day shows:
    - Working hours (if available)
    - Number of booked slots
    - Number of available slots
    - Color coding (green=available, red=booked, gray=unavailable)
  - Click to open detailed availability manager
- **Layout:** Responsive grid, collapses on mobile

#### D. ActivitySnapshot
- **Purpose:** Quick view of today's work and upcoming tasks
- **Sections:**
  1. **Today's Appointments** - List of scheduled appointments today
  2. **Pending Consultations** - Consultation requests awaiting review
  3. **Upcoming Procedures** - CasePlans with scheduled procedures
- **Layout:** Three-column grid on desktop, stacked on mobile

#### E. Enhanced EditDoctorProfileDialog
- **Purpose:** Comprehensive profile editing
- **New Fields:**
  - Specialization (dropdown or multi-select)
  - Years of Experience (number input)
  - Consultation Types (checkboxes: Consultation, Procedure, Follow-up)
  - Profile Image (file upload or URL)
  - All existing fields (bio, education, etc.)
- **Validation:** Ensure specialization changes reflect in booking

#### F. Enhanced ManageAvailabilityDialog
- **Purpose:** Comprehensive schedule management
- **Enhancements:**
  - Visual weekly calendar view
  - Override management (holidays, leave)
  - Break management (lunch, admin time)
  - Real-time conflict detection
  - Integration with existing appointments

---

## 3. Data Flow & Integration

### 3.1 Profile Update Flow

```
Doctor clicks "Edit Profile"
  ↓
EditDoctorProfileDialog opens
  ↓
Doctor updates fields (specialization, experience, etc.)
  ↓
PUT /api/doctors/me/profile
  ↓
Backend validates and updates Doctor model
  ↓
Profile page refreshes
  ↓
Patient search/filter updates (if specialization changed)
  ↓
Booking flow reflects new specialization
```

### 3.2 Schedule Update Flow

```
Doctor clicks "Manage Schedule"
  ↓
ManageAvailabilityDialog opens
  ↓
Doctor updates working days/breaks/overrides
  ↓
PUT /api/doctors/me/availability
  ↓
SetDoctorAvailabilityUseCase executes
  ↓
WorkingDay, AvailabilityBreak, AvailabilityOverride updated
  ↓
SlotConfiguration updated
  ↓
Profile page refreshes (WeeklyAvailabilityGrid updates)
  ↓
Front desk availability view updates (via GetAllDoctorsAvailabilityUseCase)
  ↓
Patient booking availability updates (via GetAvailableSlotsForDateUseCase)
```

### 3.3 Activity Snapshot Data Flow

```
Profile page loads
  ↓
Parallel API calls:
  - GET /api/doctors/:id/appointments/today
  - GET /api/doctors/:id/consultations?status=PENDING_REVIEW
  - GET /api/doctors/:id/case-plans?upcoming=true
  ↓
ActivitySnapshot component renders data
```

---

## 4. Gap Analysis

### 4.1 Missing Backend Endpoints

1. **GET /api/doctors/me/assigned-patients**
   - **Purpose:** Get list of patients assigned to doctor
   - **Returns:** `PatientResponseDto[]`
   - **Use Case:** New `GetMyAssignedPatientsUseCase`

2. **GET /api/doctors/me/case-plans?upcoming=true**
   - **Purpose:** Get upcoming procedures (CasePlans)
   - **Returns:** `CasePlanResponseDto[]`
   - **Use Case:** New `GetMyUpcomingCasePlansUseCase`

3. **PUT /api/doctors/me/profile** (Enhanced)
   - **Current:** Only supports bio, education, focus areas, profile image, clinic location
   - **Needed:** Support specialization, years of experience, consultation types
   - **Note:** May need to add `years_of_experience` and `consultation_types` fields to Doctor model

### 4.2 Missing Database Fields

1. **Doctor Model:**
   - `years_of_experience` (Int?) - Years of clinical experience
   - `consultation_types` (String[]?) - Array of consultation types doctor offers

2. **Considerations:**
   - These may already exist in a different form
   - Need to check if specialization covers consultation types
   - May need migration if adding new fields

### 4.3 Missing Components

1. **WeeklyAvailabilityGrid** - Visual schedule overview
2. **ActivitySnapshot** - Today/upcoming activity panel
3. **AssignedPatientsList** - List of doctor's patients
4. **Enhanced EditDoctorProfileDialog** - With all new fields
5. **Enhanced ManageAvailabilityDialog** - With visual calendar

### 4.4 Integration Gaps

1. **Front Desk Integration:**
   - Front desk should see doctor availability changes in real-time
   - Current: Uses `GetAllDoctorsAvailabilityUseCase` (should work, but needs testing)

2. **Patient Booking Integration:**
   - Patient booking should reflect specialization changes immediately
   - Current: Uses doctor search/filter (needs verification)

3. **Workflow Integration:**
   - Profile should show connection to CasePlan/SurgicalOutcome workflow
   - Current: No visibility of pre/post-op status on profile

---

## 5. Implementation Plan

### Phase 1: Backend Enhancements

#### Step 1.1: Database Schema Review
- [ ] Check if `years_of_experience` and `consultation_types` exist in Doctor model
- [ ] If not, create migration to add fields
- [ ] Update Prisma schema

#### Step 1.2: API Endpoint Enhancements
- [ ] Enhance `PUT /api/doctors/me/profile` to accept specialization, experience, consultation types
- [ ] Create `GET /api/doctors/me/assigned-patients` endpoint
- [ ] Create `GET /api/doctors/me/case-plans?upcoming=true` endpoint
- [ ] Update `UpdateDoctorProfileUseCase` to handle new fields

#### Step 1.3: Use Case Creation
- [ ] Create `GetMyAssignedPatientsUseCase`
- [ ] Create `GetMyUpcomingCasePlansUseCase`
- [ ] Update `UpdateDoctorProfileUseCase` for new fields

### Phase 2: Component Development

#### Step 2.1: Core Layout Components
- [ ] Create `DoctorIdentityCard` component
- [ ] Create `ProfileActionsPanel` component
- [ ] Create `WeeklyAvailabilityGrid` component
- [ ] Create `ActivitySnapshot` component

#### Step 2.2: Enhanced Dialogs
- [ ] Enhance `EditDoctorProfileDialog` with new fields
- [ ] Enhance `ManageAvailabilityDialog` with visual calendar
- [ ] Add validation and error handling

#### Step 2.3: Profile Page Redesign
- [ ] Redesign `app/doctor/profile/page.tsx` with new layout
- [ ] Integrate all new components
- [ ] Fix image clipping issue
- [ ] Improve responsive design

### Phase 3: Integration & Testing

#### Step 3.1: Front Desk Integration
- [ ] Verify front desk can see doctor availability changes
- [ ] Test `GetAllDoctorsAvailabilityUseCase` with updated schedules
- [ ] Ensure real-time updates work

#### Step 3.2: Patient Booking Integration
- [ ] Verify patient booking reflects specialization changes
- [ ] Test availability slots update when schedule changes
- [ ] Ensure conflict prevention works

#### Step 3.3: Workflow Integration
- [ ] Verify CasePlan visibility on profile
- [ ] Test pre/post-op workflow connections
- [ ] Ensure appointment statuses reflect correctly

### Phase 4: Polish & Documentation

#### Step 4.1: UX Polish
- [ ] Improve loading states
- [ ] Add error boundaries
- [ ] Optimize performance (lazy loading, memoization)
- [ ] Add accessibility features

#### Step 4.2: Documentation
- [ ] Update API documentation
- [ ] Document new components
- [ ] Create user guide for doctors

---

## 6. Technical Specifications

### 6.1 Component Props & Types

```typescript
// DoctorIdentityCard
interface DoctorIdentityCardProps {
  doctor: DoctorResponseDto;
  workingDays: WorkingDay[];
  totalAppointments: number;
}

// WeeklyAvailabilityGrid
interface WeeklyAvailabilityGridProps {
  doctorId: string;
  availability: DoctorAvailabilityResponseDto;
  appointments: AppointmentResponseDto[];
  onManageClick: () => void;
}

// ActivitySnapshot
interface ActivitySnapshotProps {
  todayAppointments: AppointmentResponseDto[];
  pendingConsultations: ConsultationRequestDto[];
  upcomingProcedures: CasePlanResponseDto[];
}

// Enhanced EditDoctorProfileDialog
interface EditDoctorProfileDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  doctor: DoctorResponseDto;
}
```

### 6.2 API Contracts

```typescript
// Enhanced Profile Update
PUT /api/doctors/me/profile
Body: {
  bio?: string;
  education?: string;
  focusAreas?: string;
  professionalAffiliations?: string;
  profileImage?: string;
  clinicLocation?: string;
  specialization?: string; // NEW
  yearsOfExperience?: number; // NEW
  consultationTypes?: string[]; // NEW
}

// Get Assigned Patients
GET /api/doctors/me/assigned-patients
Response: PatientResponseDto[]

// Get Upcoming Case Plans
GET /api/doctors/me/case-plans?upcoming=true
Response: CasePlanResponseDto[]
```

### 6.3 Validation Rules

1. **Profile Updates:**
   - Specialization: Required if provided, must be valid specialization
   - Years of Experience: Must be >= 0, <= 50
   - Consultation Types: Array of valid types (Consultation, Procedure, Follow-up)

2. **Schedule Updates:**
   - Working days: At least one day must be available
   - Time ranges: Start time < End time
   - No overlapping breaks
   - Overrides: Start date <= End date

---

## 7. Constraints & Considerations

### 7.1 Workflow Constraints

- **MUST NOT** break existing appointment booking flow
- **MUST NOT** break front desk scheduling
- **MUST** respect existing Appointment, CasePlan, CareNote models
- **MUST** maintain audit trail for profile changes

### 7.2 Performance Considerations

- Profile page should load in < 2 seconds
- Availability grid should update without full page reload
- Activity snapshot should use parallel API calls
- Consider caching for frequently accessed data

### 7.3 Security Considerations

- Doctors can only edit their own profile
- Schedule changes must validate against existing appointments
- Profile image uploads must be validated (size, type)
- All changes must be audited

---

## 8. Success Criteria

### 8.1 Functional Requirements

- ✅ Doctor can edit all profile fields (including specialization, experience)
- ✅ Doctor can manage schedule with visual feedback
- ✅ Profile changes reflect in patient search immediately
- ✅ Schedule changes visible to front desk in real-time
- ✅ Activity snapshot shows accurate today/upcoming data
- ✅ No image clipping or layout issues
- ✅ Responsive design works on tablet and laptop

### 8.2 Integration Requirements

- ✅ Front desk can view updated doctor availability
- ✅ Patient booking respects updated availability
- ✅ Profile shows connection to pre/post-op workflow
- ✅ No breaking changes to existing flows

### 8.3 UX Requirements

- ✅ Clean, medical-grade design (not consumer social app)
- ✅ Clear visual hierarchy
- ✅ Intuitive navigation
- ✅ Fast load times
- ✅ Accessible (keyboard navigation, screen readers)

---

## 9. Next Steps

1. **Review & Approval:** Review this plan with stakeholders
2. **Database Migration:** If needed, create migration for new fields
3. **Backend Implementation:** Start with Phase 1 (backend enhancements)
4. **Component Development:** Build components in Phase 2
5. **Integration Testing:** Verify all integration points in Phase 3
6. **Deployment:** Deploy with proper testing and rollback plan

---

## Appendix: File Structure

```
app/doctor/profile/
  └── page.tsx (redesigned)

components/doctor/
  ├── DoctorIdentityCard.tsx (new)
  ├── ProfileActionsPanel.tsx (new)
  ├── WeeklyAvailabilityGrid.tsx (new)
  ├── ActivitySnapshot.tsx (new)
  ├── EditDoctorProfileDialog.tsx (enhanced)
  └── ManageAvailabilityDialog.tsx (enhanced)

app/api/doctors/me/
  ├── profile/route.ts (enhanced)
  ├── assigned-patients/route.ts (new)
  └── case-plans/route.ts (new)

application/use-cases/
  ├── GetMyAssignedPatientsUseCase.ts (new)
  └── GetMyUpcomingCasePlansUseCase.ts (new)
```

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Author:** Senior Product Engineer
