# Booking Workflow Documentation

**Last Updated:** January 2025

## Overview

This document describes the unified booking workflow for Nairobi Sculpt. The system uses a **single booking function** (`createNewAppointment` → `ScheduleAppointmentUseCase`) that serves both patient self-booking and frontdesk booking for patients.

---

## Workflow Actors

### 1. **Patient**
- Can submit consultation inquiries through the 7-step booking process
- Cannot directly book confirmed appointments
- Submits inquiries that require frontdesk review

### 2. **Frontdesk (Surgical Assistant)**
- Reviews patient inquiries
- Can book appointments directly for selected patients/clients
- Uses the same underlying booking logic as patient self-booking

### 3. **Doctor (Surgeon)**
- **DOES NOT** book consultations
- Only views confirmed/scheduled sessions
- Never sees pending inquiries or rejected requests

---

## Patient First-Time Login Flow

### Step 1: Patient Logs In
- Patient authenticates via login page
- System checks if this is first login

### Step 2: Welcome Page
- Patient is routed to `/patient/welcome` (or similar)
- Welcome page displays:
  - **Book Consultation** button → Starts 7-step inquiry process
  - **Update Profile** button → Profile management
  - **Learn More** section → Information about procedures
  - **Onboarding** features → Help guides, FAQs

### Step 3: Patient Selects "Book Consultation"
- Patient clicks "Book Consultation" or "Submit Inquiry"
- System routes to `/portal/book-consultation` (7-step process)

---

## 7-Step Consultation Inquiry Process

### Step 1: Procedure Selection
- Patient selects procedure of interest:
  - Rhinoplasty
  - BBL (Brazilian Butt Lift)
  - Liposuction
  - Breast Surgery
  - Skin Procedures
  - Other

### Step 2: Surgeon Selection
- Patient views available surgeons
- Can view surgeon profiles (specialization, experience, etc.)
- Selects preferred surgeon

### Step 3: Preferred Date Selection
- Patient selects preferred date
- Calendar shows available dates
- No time selection yet (time is proposed by frontdesk)

### Step 4: Preferred Time Window
- Patient indicates preferred time window (morning, afternoon, evening)
- Or specific time preference (optional)

### Step 5: Additional Information
- Patient provides:
  - Medical history (if relevant)
  - Goals and expectations
  - Any questions or concerns
  - Special requests

### Step 6: Review Inquiry
- Patient reviews all entered information
- Can go back to edit any step
- Sees summary of:
  - Procedure
  - Selected surgeon
  - Preferred date/time
  - Additional notes

### Step 7: Submit Inquiry
- Patient confirms and submits
- System creates appointment with status: `SUBMITTED` or `PENDING_REVIEW`
- Patient receives confirmation: "Your inquiry has been submitted. We will review it and contact you shortly."
- Inquiry appears in frontdesk "Assistant Console" for review

---

## Frontdesk Booking Workflow

### Scenario: Frontdesk Books Appointment for Patient

1. **Frontdesk selects patient/client**
   - From patient list or search
   - Or from new patient registration

2. **Frontdesk opens booking dialog**
   - Uses same booking form as patient (reusable component)
   - Pre-fills patient information
   - Frontdesk can:
     - Select surgeon
     - Select date and time
     - Set appointment type
     - Add notes

3. **Frontdesk submits booking**
   - Calls same `createNewAppointment` function
   - Uses `ScheduleAppointmentUseCase`
   - Appointment created with status: `SCHEDULED` or `CONFIRMED`
   - (No inquiry review needed - frontdesk is gatekeeper)

4. **System creates appointment**
   - Same validation logic
   - Same conflict checking
   - Same audit trail

---

## Unified Booking Function

### Core Function: `createNewAppointment`
**Location:** `/app/actions/appointment.ts`

```typescript
export async function createNewAppointment(data: any) {
  // Uses ScheduleAppointmentUseCase
  // Handles validation
  // Creates appointment
  // Returns success/error
}
```

### Use Case: `ScheduleAppointmentUseCase`
**Location:** `/application/use-cases/ScheduleAppointmentUseCase.ts`

**Responsibilities:**
- Validates patient exists
- Validates appointment date not in past
- Checks for conflicts (patient/doctor double booking)
- Creates appointment record
- Sets appropriate status based on context:
  - Patient self-booking → `SUBMITTED` or `PENDING_REVIEW`
  - Frontdesk booking → `SCHEDULED` or `CONFIRMED`

**Key Features:**
- Single source of truth for booking logic
- No duplicate booking functionality
- Consistent validation across all booking paths
- Proper audit trail

---

## Status Flow

### Patient Inquiry Flow:
```
SUBMITTED → PENDING_REVIEW → APPROVED → SCHEDULED → CONFIRMED
                ↓
         NEEDS_MORE_INFO → (patient responds) → PENDING_REVIEW
                ↓
         (declined) → Not shown to surgeon
```

### Frontdesk Direct Booking:
```
SCHEDULED → CONFIRMED
(No inquiry review needed)
```

---

## Doctor View Filtering

### What Doctor Sees:
- ✅ **CONFIRMED** sessions
- ✅ **SCHEDULED** sessions
- ❌ **SUBMITTED** inquiries (not shown)
- ❌ **PENDING_REVIEW** (not shown)
- ❌ **NEEDS_MORE_INFO** (not shown)
- ❌ **APPROVED** (not shown until scheduled)

**Rationale:** Surgeon only sees confirmed sessions. All inquiry review happens at frontdesk level.

---

## Component Architecture

### Reusable Components:

1. **`StepByStepBooking`** (7 steps)
   - Used by: Patient inquiry submission
   - Location: `/components/patient/StepByStepBooking.tsx`

2. **`ScheduleAppointmentDialog`** (Single form)
   - Used by: Frontdesk booking for patients
   - Can be reused for: Quick patient booking
   - Location: `/components/patient/ScheduleAppointmentDialog.tsx`

3. **`BookAppointment`** (Sheet form)
   - Used by: Legacy booking (can be deprecated)
   - Location: `/components/forms/book-appointment.tsx`

### Shared Logic:
- All components call `createNewAppointment`
- All use `ScheduleAppointmentUseCase`
- Consistent validation
- Consistent error handling

---

## Integration Points

### Doctor Selection Integration:
- `DoctorSelect` component used in both:
  - Step 2 of 7-step process
  - Frontdesk booking form
- Doctor profiles accessible from both flows
- Same doctor data source

### Frontdesk Integration:
- Frontdesk can access booking form from:
  - Patient profile page
  - Patient search results
  - New patient registration flow
- Uses same components as patient flow
- Same validation and error handling

---

## Key Principles

1. **Single Source of Truth**
   - One booking function (`createNewAppointment`)
   - One use case (`ScheduleAppointmentUseCase`)
   - No duplicate booking logic

2. **Role-Based Views**
   - Patient: Sees inquiry status
   - Frontdesk: Sees all inquiries and can book directly
   - Doctor: Only sees confirmed sessions

3. **Workflow Clarity**
   - Patient submits inquiry (not booking)
   - Frontdesk reviews and gates
   - Only accepted inquiries become sessions
   - Doctor sees only confirmed sessions

4. **Reusable Components**
   - Booking forms can be shared
   - Doctor selection is consistent
   - Validation is unified

---

## Future Enhancements

- [ ] Add availability checking before booking
- [ ] Add conflict detection UI feedback
- [ ] Add notification system for status changes
- [ ] Add calendar integration for doctors
- [ ] Add waitlist functionality
