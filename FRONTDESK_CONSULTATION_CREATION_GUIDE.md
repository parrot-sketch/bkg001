# Frontdesk-Initiated Consultation Creation - Implementation Guide

**Date:** January 25, 2026  
**Status:** ✅ Complete - Ready for Testing  
**Phase:** Phase 3 Extended - Workflow Enhancement  

---

## Overview

Frontdesk staff can now create consultation requests directly from the patient listing page. This feature allows frontdesk staff to bypass the patient self-service form and schedule consultations immediately with:

- **Pre-approved status** (no review step needed)
- **Direct doctor assignment** (specific doctor selection)
- **Immediate scheduling** (appointment date/time set at creation)
- **Patient notification** (automatic email sent to patient)

---

## Business Context

### Patient-Initiated vs. Frontdesk-Initiated Consultations

| Aspect | Patient-Initiated | Frontdesk-Initiated |
|--------|-------------------|-------------------|
| **Initiator** | Patient via 7-step form | Frontdesk staff from patient listing |
| **Initial Status** | SUBMITTED | APPROVED |
| **Doctor Assignment** | Patient selects or leaves open | Frontdesk assigns directly |
| **Appointment Details** | Patient provides preferences | Frontdesk sets exact date/time |
| **Review Step** | Required (frontdesk reviews) | Skipped (pre-approved) |
| **Use Case** | New patient inquiry | Walk-in, phone-in, re-engagement |
| **Workflow Steps** | 7-step form → SUBMITTED → APPROVED → SCHEDULED | 1-click dialog → APPROVED → SCHEDULED |

### Clinical Workflow

```
FRONTDESK-INITIATED CONSULTATION FLOW:
====================================

Frontdesk Staff on Patient Listing Page
    │
    ├─ Sees patient in list
    ├─ Clicks: "Create Consultation" button
    │
    └─→ FrontdeskCreateConsultationDialog opens
           │
           ├─ Form fields:
           │  ├─ Select Doctor (required)
           │  ├─ Select Service (required)
           │  ├─ Set Appointment Date (required)
           │  ├─ Set Appointment Time (required)
           │  ├─ Describe Concern (required)
           │  └─ Additional Notes (optional)
           │
           ├─ Form validation:
           │  ├─ All required fields must be filled
           │  ├─ Date must be today or future
           │  ├─ Time must be in working hours (9 AM - 5 PM)
           │  └─ Doctor must exist and be available
           │
           ├─ Click: "Create Consultation"
           │
           └─→ API: POST /api/consultations/frontdesk/create
                   │
                   ├─ Authentication: Validated via JWT middleware
                   ├─ Permissions: Requires frontdesk role (enforced at middleware)
                   ├─ Validation: Required fields checked
                   │
                   └─→ CreateConsultationFromFrontdeskUseCase
                       │
                       ├─ Step 1: Validate patient exists
                       ├─ Step 2: Validate required fields
                       ├─ Step 3: Build note from concern + notes
                       ├─ Step 4: Create appointment domain entity
                       ├─ Step 5: Validate state transition (null → APPROVED)
                       ├─ Step 6: Save with consultation_request_status = APPROVED
                       ├─ Step 7: Retrieve saved appointment
                       ├─ Step 8: Send notification email to patient
                       ├─ Step 9: Record audit event
                       ├─ Step 10: Map to response DTO
                       │
                       └─→ Response: AppointmentResponseDto
                           │
                           └─ Consultation appears in:
                              ├─ /frontdesk/consultations page
                              │  └─ In "Approved" bucket (status filter)
                              ├─ Patient profile page
                              │  └─ In consultation history section
                              └─ Patient receives email:
                                 └─ "Your consultation appointment has been scheduled for [date] at [time]"
```

---

## Implementation Details

### 1. New Use Case: `CreateConsultationFromFrontdeskUseCase`

**File:** `application/use-cases/CreateConsultationFromFrontdeskUseCase.ts`

**Purpose:** Orchestrates consultation creation by frontdesk staff

**Key Differences from Patient-Initiated:**
- Creates appointment with status **APPROVED** (not SUBMITTED)
- Requires **doctorId** to be provided (not optional)
- Requires **appointmentDate** and **appointmentTime** (frontdesk sets specific date/time)
- No review step needed (frontdesk pre-approves)

**Validation Steps:**
1. Patient exists (throws if not found)
2. Concern description provided (required)
3. Doctor ID provided (required)
4. Appointment date provided (required)
5. Appointment time provided (required)
6. State transition validation (null → APPROVED is valid)

**Audit Trail:**
- Records: "Frontdesk staff created consultation request for patient [name] - [concern]"
- Fields: userId, appointmentId, action: 'CREATE', model: 'ConsultationRequest'

**Notification:**
- Email to patient: "Your consultation appointment has been scheduled for [date] at [time]. Please confirm your attendance."

### 2. New DTO: `CreateConsultationFromFrontdeskDto`

**File:** `application/dtos/CreateConsultationFromFrontdeskDto.ts`

```typescript
{
  patientId: string;              // Required
  doctorId: string;               // Required (not optional)
  serviceId: string;              // Required
  appointmentDate: Date;          // Required (specific date)
  appointmentTime: string;        // Required (specific time)
  concernDescription: string;     // Required (reason for consultation)
  notes?: string;                 // Optional (frontdesk notes)
}
```

### 3. New API Route: `/api/consultations/frontdesk/create`

**File:** `app/api/consultations/frontdesk/create/route.ts`

**Method:** `POST`

**Authentication:** ✅ JWT middleware validates frontdesk staff

**Request Body:**
```json
{
  "patientId": "patient-uuid",
  "doctorId": "doctor-uuid",
  "serviceId": "1",
  "appointmentDate": "2026-01-28",
  "appointmentTime": "10:00 AM",
  "concernDescription": "Patient called about knee pain from accident",
  "notes": "Urgent - patient in pain"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": 12345,
    "appointmentDate": "2026-01-28",
    "appointmentTime": "10:00 AM",
    "status": "PENDING",
    "consultation_request_status": "APPROVED",
    "patient": { ... },
    "doctor": { ... },
    "note": "Patient called about knee pain...\nAdditional notes: Urgent - patient in pain\nCreated by: Frontdesk staff on 2026-01-25T14:30:00Z"
  },
  "message": "Consultation request created successfully"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Patient with ID patient-uuid not found"
}
```

### 4. Updated API Client: `frontdeskApi.createConsultation()`

**File:** `lib/api/frontdesk.ts`

**Method Signature:**
```typescript
async createConsultation(
  dto: CreateConsultationFromFrontdeskDto
): Promise<ApiResponse<AppointmentResponseDto>>
```

**Usage:**
```typescript
const response = await frontdeskApi.createConsultation({
  patientId,
  doctorId,
  serviceId,
  appointmentDate,
  appointmentTime,
  concernDescription,
  notes,
});

if (response.success) {
  toast.success('Consultation created for ' + patientName);
  // Dialog closes, page refreshes, etc.
}
```

### 5. Dialog Component: `FrontdeskCreateConsultationDialog`

**File:** `components/frontdesk/FrontdeskCreateConsultationDialog.tsx`

**Features:**
- Modal dialog with form
- Doctor selection dropdown (loads doctors on open)
- Service selection dropdown (hardcoded options)
- Date picker (min date = today)
- Time picker (9 AM - 5 PM, 30-minute intervals)
- Concern description textarea (required)
- Additional notes textarea (optional)
- Submit button with loading state
- Cancel button
- Form validation before submission

**Props:**
```typescript
{
  patientId: string;              // Patient to create consultation for
  patientName: string;            // Display name in dialog header
  isOpen: boolean;                // Dialog visibility
  onOpenChange: (open: boolean) => void;  // Close handler
  onSuccess?: () => void;         // Optional callback after success
}
```

**Time Options:**
- Generated from 9 AM to 5 PM
- 30-minute intervals
- Display format: "9:00 AM", "9:30 AM", "10:00 AM", etc.

**Validation:**
- Required field checks with toast error messages
- Date validation (no past dates)
- Concern description must be non-empty

### 6. Integration: Patient Listing Page

**File:** `app/frontdesk/patients/page.tsx`

**Changes Made:**

1. **Converted to Client Component** (added `'use client'`)
   - Reason: Need state management for dialog open/close
   - Async data fetching moved to separate component

2. **Extracted Content into Separate Component**
   - `FrontdeskPatientsPage` (async) → fetches data
   - `FrontdeskPatientsContent` (client) → renders UI with state
   - Pattern: Async parent, client child for mixed server/client needs

3. **Added "Create Consultation" Button**
   - Mobile view: 3rd button in action column (below View Profile, Schedule Appointment)
   - Desktop view: 3rd button in action row (compact layout with icon only: "Consult")
   - Icon: `Stethoscope` from lucide-react
   - Variant: outline (secondary action)

4. **Dialog State Management**
   - `selectedPatient`: Stores { id, name } for currently open dialog
   - `isDialogOpen`: Controls dialog visibility
   - `handleCreateConsultation()`: Opens dialog with patient data

5. **Dialog Wrapper Component**
   - `ConsultationDialogWrapper` conditionally renders dialog
   - Only renders if `selectedPatient` is set (prevents React warnings)
   - Handles dialog lifecycle independently

---

## User Workflows

### Workflow 1: Create Consultation from Patient Listing (Mobile)

```
1. Frontdesk staff on /frontdesk/patients
   └─ Sees patient card on mobile

2. Scrolls to action buttons:
   ├─ View Profile
   ├─ Schedule Appointment
   └─ Create Consultation  ← Click here

3. Dialog opens: "Create Consultation for [Patient Name]"
   ├─ Select Doctor: "Dr. Smith - Orthopedic Surgery"
   ├─ Select Service: "Surgical Assessment"
   ├─ Set Date: January 28, 2026
   ├─ Set Time: 10:00 AM
   ├─ Concern: "Patient has knee pain from accident"
   ├─ Notes: "Urgent - patient called in pain"
   └─ Click: "Create Consultation"

4. Processing:
   ├─ Form validated
   ├─ API request sent
   ├─ Consultation created with APPROVED status
   └─ Patient email sent

5. Completion:
   ├─ Toast: "Consultation created successfully for [Patient Name]"
   ├─ Dialog closes
   ├─ (Optional) Page refreshes to show updated data
   └─ Consultation visible on /frontdesk/consultations page
```

### Workflow 2: Create Consultation from Patient Listing (Desktop)

```
1. Frontdesk staff on /frontdesk/patients (desktop table)
   └─ Sees patient row in table

2. In Actions column (far right):
   ├─ View (button)
   ├─ Schedule (button)
   └─ Consult (button)  ← Click here (compact icon-only version)

3. Rest is identical to mobile workflow above
```

### Workflow 3: View Created Consultation

After creation, consultation is immediately visible in multiple places:

**Option A: Consultations Page**
```
1. Click: /frontdesk/consultations (in sidebar)
2. Filter: View "Approved" consultations bucket
3. See: Newly created consultation
   ├─ Patient: [Patient Name]
   ├─ Doctor: [Dr. Name]
   ├─ Status: Approved ✓
   ├─ Date: [Appointment Date]
   └─ Action: [Review/Edit buttons if applicable]
```

**Option B: Patient Profile Page**
```
1. Click: "View Profile" from patient listing
2. Navigate to: /frontdesk/patient/[patientId]
3. Scroll to: Consultation History section
4. See: Timeline of consultations
   ├─ Submitted: Jan 25, 2:30 PM
   ├─ Status: Approved ✓
   ├─ Scheduled For: Jan 28, 2026 @ 10:00 AM
   └─ Created By: Frontdesk staff
```

---

## Architecture & Design Patterns

### Clean Architecture Adherence

**Domain Layer** (`domain/`)
- Consultation state machine: `ConsultationRequestStatus.APPROVED`
- Business rules: "Frontdesk pre-approves" encapsulated

**Application Layer** (`application/`)
- Use case: `CreateConsultationFromFrontdeskUseCase` (distinct from patient version)
- DTO: `CreateConsultationFromFrontdeskDto` (different shape than patient DTO)
- Orchestration: All business logic validation

**Infrastructure Layer** (`infrastructure/`)
- Repository: Uses existing `PrismaAppointmentRepository`
- Services: Reuses `EmailNotificationService`, `ConsoleAuditService`, `SystemTimeService`

**Interface Layer** (`app/`, `components/`, `lib/`)
- API route: `/api/consultations/frontdesk/create`
- Dialog component: `FrontdeskCreateConsultationDialog`
- API client: `frontdeskApi.createConsultation()`

### Key Design Principles

1. **Single Responsibility:**
   - Dialog: Only handles form UI and submission
   - Use case: Only orchestrates business logic
   - API route: Only handles HTTP concerns
   - Component: Only manages local state

2. **Separation of Concerns:**
   - Validation logic: In use case (testable, reusable)
   - UI state: In dialog component (React hooks)
   - API communication: In API client (centralized)
   - HTTP handling: In API route (middleware, error handling)

3. **Reusability:**
   - Dialog can be opened from any component (pass patientId)
   - Use case can be called from any endpoint
   - API client method is standardized
   - Notification service is shared

4. **Error Handling:**
   - Use case throws `DomainException` for business rule violations
   - API route catches and returns appropriate HTTP errors
   - Dialog shows toast errors to user
   - Audit logging for all events

---

## Testing Scenarios

### Manual Testing Checklist

**Dialog Opening:**
- [ ] Click "Create Consultation" button on patient
- [ ] Dialog opens with correct patient name
- [ ] Doctors load in dropdown
- [ ] Service options appear
- [ ] Date picker min date is today
- [ ] Time options are available

**Form Validation:**
- [ ] Submit without doctor selected → error toast
- [ ] Submit without service selected → error toast
- [ ] Submit without date selected → error toast
- [ ] Submit without time selected → error toast
- [ ] Submit without concern description → error toast
- [ ] Submit with all fields filled → succeeds

**Successful Creation:**
- [ ] Consultation created with APPROVED status
- [ ] Appointment date/time set correctly
- [ ] Consultation visible on /frontdesk/consultations
- [ ] Consultation visible on patient profile
- [ ] Patient receives email notification
- [ ] Audit log records the event
- [ ] Dialog closes after submission
- [ ] Success toast shown

**Edge Cases:**
- [ ] Create multiple consultations for same patient
- [ ] Create consultation for patient with no prior appointments
- [ ] Create consultation with special characters in concern
- [ ] Network failure during submission → error handled gracefully

### Automated Test Template

```typescript
describe('CreateConsultationFromFrontdeskUseCase', () => {
  it('should create consultation with APPROVED status', async () => {
    // Given: Valid DTO with frontdesk data
    const dto: CreateConsultationFromFrontdeskDto = {
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      serviceId: '1',
      appointmentDate: new Date('2026-01-28'),
      appointmentTime: '10:00 AM',
      concernDescription: 'Knee pain from accident',
      notes: 'Urgent',
    };
    
    // When: Use case executes
    const result = await useCase.execute(dto, 'frontdesk-user-id');
    
    // Then: Appointment created with APPROVED consultation status
    expect(result.consultationRequestStatus).toBe(ConsultationRequestStatus.APPROVED);
    expect(result.appointmentDate).toEqual(dto.appointmentDate);
    expect(result.appointmentTime).toBe(dto.appointmentTime);
  });

  it('should send email notification to patient', async () => {
    // ... (similar setup)
    await useCase.execute(dto, userId);
    
    expect(notificationService.sendEmail).toHaveBeenCalledWith(
      patient.getEmail(),
      expect.stringContaining('scheduled'),
      expect.any(String)
    );
  });
});
```

---

## Data Flow Diagram

```
FRONTDESK CREATES CONSULTATION:
=============================

Patient Record (Prisma)
  ├─ id: patient-uuid
  ├─ firstName: "John"
  ├─ lastName: "Doe"
  ├─ email: "john@example.com"
  └─ ...

FrontdeskCreateConsultationDialog (React Component)
  │
  ├─ State: { doctorId, serviceId, date, time, concern, notes }
  ├─ Validation: All required fields filled
  │
  └─→ frontdeskApi.createConsultation(dto)
      │
      └─→ POST /api/consultations/frontdesk/create
          │
          ├─ JWT Authentication ✓
          ├─ Validate request body ✓
          ├─ Parse date/time ✓
          │
          └─→ CreateConsultationFromFrontdeskUseCase.execute(dto, userId)
              │
              ├─ Step 1: Load patient from database ✓
              ├─ Step 2: Validate all required fields ✓
              ├─ Step 3: Build note string ✓
              ├─ Step 4: Create Appointment domain entity
              │           └─ status: PENDING
              │           └─ type: "Consultation Request"
              │
              ├─ Step 5: Validate state transition (null → APPROVED)
              ├─ Step 6: Save to database
              │           └─ Insert into appointments table
              │           └─ Set consultation_request_status = APPROVED
              │
              ├─ Step 7: Load saved appointment from database ✓
              ├─ Step 8: Send email notification ✓
              ├─ Step 9: Record audit event ✓
              │
              └─→ Return AppointmentResponseDto

Result in Database:
  └─ Appointment record created:
     ├─ id: appointment-id
     ├─ patient_id: patient-uuid
     ├─ doctor_id: doctor-uuid
     ├─ appointment_date: 2026-01-28
     ├─ appointment_time: "10:00 AM"
     ├─ status: PENDING
     ├─ consultation_request_status: APPROVED ← Key difference
     ├─ note: "Knee pain from accident\nAdditional notes: Urgent\nCreated by: Frontdesk staff..."
     ├─ created_at: 2026-01-25T14:30:00Z
     └─ ...

Visibility:
  ├─ /frontdesk/consultations
  │  └─ Appears in "Approved" filter bucket
  ├─ /frontdesk/patient/[patientId]
  │  └─ Appears in Consultation History section
  └─ Patient email inbox
     └─ Notification: "Your consultation appointment has been scheduled..."
```

---

## Files Created/Modified

### New Files Created:
1. ✅ `application/dtos/CreateConsultationFromFrontdeskDto.ts` (15 lines)
2. ✅ `application/use-cases/CreateConsultationFromFrontdeskUseCase.ts` (200+ lines)
3. ✅ `app/api/consultations/frontdesk/create/route.ts` (150+ lines)
4. ✅ `components/frontdesk/FrontdeskCreateConsultationDialog.tsx` (320+ lines)

### Files Modified:
1. ✅ `lib/api/frontdesk.ts` (+import, +method)
2. ✅ `app/frontdesk/patients/page.tsx` (refactored for client state)

### No Files Deleted:
- All existing functionality preserved
- Backward compatible changes only
- No breaking changes

---

## Status & Next Steps

### ✅ Complete
- [x] Use case implementation
- [x] API route creation
- [x] Dialog component
- [x] API client method
- [x] Patient listing integration
- [x] TypeScript compilation (zero errors)
- [x] Documentation

### 📋 Ready for:
- [ ] Manual testing (see testing checklist)
- [ ] Integration testing with actual database
- [ ] UI/UX review
- [ ] Patient notification testing
- [ ] Audit logging verification
- [ ] Production deployment

### 🔄 Optional Enhancements:
1. **Consultation Notes Templates:**
   - Pre-defined concern templates
   - Common reasons dropdown
   - Example: "Acute pain", "Pre-op evaluation", "Follow-up review"

2. **Doctor Availability Check:**
   - Display available time slots only
   - Prevent double-booking
   - Show doctor's schedule inline

3. **Bulk Consultation Creation:**
   - Create multiple consultations at once
   - Batch import from CSV
   - Scheduled creation for future dates

4. **Consultation History in Dialog:**
   - Show previous consultations for patient
   - Prevent duplicate requests
   - Suggest based on history

5. **SMS Notification Option:**
   - Send SMS in addition to email
   - Toggle in dialog
   - Two-factor confirmation

---

## Deployment Checklist

Before deploying to production:

- [ ] All TypeScript errors resolved
- [ ] All tests passing
- [ ] Database migrations run (if needed)
- [ ] API routes tested with curl/Postman
- [ ] Dialog tested on mobile and desktop
- [ ] Email notification template verified
- [ ] Audit logging working
- [ ] Performance tested (no N+1 queries)
- [ ] Security review: JWT, permissions, input validation
- [ ] Documentation updated
- [ ] Team training completed

---

## Troubleshooting

### Dialog won't open
- Check: Is `FrontdeskCreateConsultationDialog` imported?
- Check: Is `isDialogOpen` state being updated?
- Check: Is patient data being passed correctly?

### Consultation not appearing
- Check: API response successful?
- Check: Consultation status is APPROVED?
- Check: Patient ID correct?
- Check: Try clearing browser cache/refresh

### Email not sent
- Check: Email service configured?
- Check: Patient has valid email?
- Check: Look in audit logs for errors

### Doctor dropdown empty
- Check: Doctors exist in database?
- Check: API `getAllDoctors` working?
- Check: Network request completed?

---

## Summary

Frontdesk staff can now create consultations in 1 click from the patient listing page. This streamlines workflows for walk-ins, phone-in requests, and urgent cases where immediate scheduling is needed. The consultation is pre-approved, directly assigned to a specific doctor, and the patient receives immediate notification.

**Key Benefits:**
- ⚡ **Fast:** No multi-step form, no review wait
- 👥 **Flexible:** Frontdesk controls all scheduling details
- 📬 **Professional:** Automatic patient notification
- 📋 **Audited:** Full audit trail of creation
- 🏗️ **Integrated:** Appears everywhere consultations are shown

