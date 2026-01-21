# P0 Critical Fixes - 3-Day Sprint Plan

**Objective:** Fix non-negotiable issues before real users touch the system.

**Timeline:** 3 days  
**Risk Level:** CRITICAL - System will fail in production without these fixes.

---

## DAY 1: UX + Compliance Stability

### Task 1.1: Add Consent Checkboxes (Legal + Trust)
**Files:**
- `components/forms/book-appointment.tsx`
- `components/patient/ScheduleAppointmentDialog.tsx`

**Changes:**
- Add consent checkboxes (not pre-checked)
- Require explicit user interaction
- Store consent in DTO
- Show consent text clearly

**Estimate:** 2 hours

---

### Task 1.2: Add Success Confirmation Screen
**Files:**
- `components/forms/book-appointment.tsx`
- `components/patient/ScheduleAppointmentDialog.tsx`
- `components/patient/BookAppointmentDialog.tsx`

**Changes:**
- Create `ConsultationRequestConfirmationDialog` component
- Show confirmation after successful submission
- Display request ID, status, next steps
- Option to view in appointments page

**Estimate:** 2 hours

---

### Task 1.3: Expose BookAppointmentDialog in UI
**Files:**
- `app/patient/dashboard/page.tsx`
- `app/patient/appointments/page.tsx`

**Changes:**
- Add "Book Appointment" button alongside "Request Consultation"
- Import and use `BookAppointmentDialog`
- Clear distinction between two flows

**Estimate:** 1 hour

---

### Task 1.4: Rename ScheduleAppointmentDialog
**Files:**
- `components/patient/ScheduleAppointmentDialog.tsx` → `RequestConsultationDialog.tsx`
- All imports of this component

**Changes:**
- Rename component and file
- Update all imports
- Update component name in exports

**Estimate:** 30 minutes

**Day 1 Total:** ~5.5 hours

---

## DAY 2: Data Integrity

### Task 2.1: Add Slot Reservation System
**Files:**
- `app/api/doctors/[id]/slots/[time]/reserve/route.ts` (new)
- `components/patient/BookAppointmentDialog.tsx`
- `hooks/useAvailableSlots.ts`

**Changes:**
- Create slot reservation API endpoint (5-minute reservation)
- Reserve slot when user selects it
- Show reservation countdown timer
- Release reservation on booking or timeout

**Estimate:** 4 hours

---

### Task 2.2: Add Refetch on Slot Failure
**Files:**
- `components/patient/BookAppointmentDialog.tsx`
- `hooks/useAvailableSlots.ts`

**Changes:**
- Detect "slot already booked" error
- Auto-refetch available slots
- Show user-friendly error message
- Allow user to select different slot

**Estimate:** 1 hour

---

### Task 2.3: Add Front-End Conflict Feedback
**Files:**
- `components/patient/BookAppointmentDialog.tsx`
- `hooks/useAppointmentConflicts.ts` (new)

**Changes:**
- Create hook to check for patient appointment conflicts
- Show warning if patient has overlapping appointment
- Allow user to proceed with confirmation

**Estimate:** 2 hours

**Day 2 Total:** ~7 hours

---

## DAY 3: Communication Trust

### Task 3.1: Replace MockNotificationService with Real Email
**Files:**
- `infrastructure/services/EmailNotificationService.ts` (new)
- `lib/use-cases.ts`
- Environment variables setup

**Changes:**
- Create real email service (using Resend/SendGrid/SES)
- Replace MockNotificationService in use case factories
- Add email templates for:
  - Consultation request received
  - Appointment booked confirmation
  - Appointment reminder (24h before)

**Estimate:** 4 hours

---

### Task 3.2: Add Notification Logging
**Files:**
- `infrastructure/services/EmailNotificationService.ts`
- Database schema (if needed)

**Changes:**
- Log all notification attempts (success/failure)
- Store notification history
- Add error handling for failed sends

**Estimate:** 2 hours

---

### Task 3.3: Integrate Notifications in Use Cases
**Files:**
- `application/use-cases/SubmitConsultationRequestUseCase.ts`
- `application/use-cases/ScheduleAppointmentUseCase.ts`

**Changes:**
- Ensure notification calls are working
- Add proper error handling (notification failure shouldn't break booking)
- Test end-to-end notification flow

**Estimate:** 1 hour

**Day 3 Total:** ~7 hours

---

## DELIBERATELY POSTPONED (Not Blockers)

These are good improvements but not required for initial production:

- ❌ Full audit log UI
- ❌ Form draft persistence
- ❌ Reschedule flows
- ❌ Cancellation policy enforcement
- ❌ Advanced retry systems
- ❌ useDoctors refactor

**Reason:** These are scaling/maturity improvements, not production blockers.

---

## SUCCESS CRITERIA

After 3-day sprint, system must have:

✅ **Legal Compliance:**
- Explicit consent captured from users
- Consent stored with timestamps

✅ **Feature Completeness:**
- Patients can request consultations
- Patients can book appointments with availability
- Both flows clearly distinguished in UI

✅ **Data Integrity:**
- No double bookings possible
- Slot conflicts detected and prevented
- Reservation system prevents race conditions

✅ **User Trust:**
- Success confirmation after every submission
- Real email notifications sent
- Users know their request was received

✅ **Code Quality:**
- Component names match behavior
- Clear separation of concerns
- Proper error handling

---

## IMPLEMENTATION ORDER

**Start with Day 1 tasks** - These provide immediate UX improvements and legal compliance.

**Then Day 2** - Critical for data integrity.

**Finally Day 3** - Communication trust (can be done in parallel with Day 2 if needed).

---

**Status:** Ready for implementation.
