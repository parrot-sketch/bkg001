# Frontdesk Workflow Clarification - Appointment Scheduling

**Date:** January 25, 2026  
**Status:** ✅ Corrected  
**Scope:** Clarified frontdesk role and removed incorrect "Create Consultation" feature  

---

## What Was Wrong

I mistakenly added a "Create Consultation" button to the patient listing page. This was **incorrect** because:

1. **Frontdesk does NOT create consultations** - they only schedule appointments
2. **Patient requests consultations** - via the 7-step self-service form
3. **Frontdesk reviews requests** - on the `/frontdesk/consultations` page
4. **"Schedule Appointment" already exists** - no need for a separate consultation button

---

## Correct Frontdesk Workflow

### Step 1: Patient Requests Consultation
- Patient: Fills 7-step form at `/patient/consultations/request`
- Creates: Appointment with `consultation_request_status: SUBMITTED`
- Status: Awaiting frontdesk review

### Step 2: Frontdesk Reviews Request
- Location: `/frontdesk/consultations` page
- Reviews: Patient's concern, preferred doctor, requested date/time
- Actions: Approve, Request More Info, or Reject
- Dialog: `ReviewConsultationDialog` handles review actions

### Step 3: Once Approved
- Status changes: `SUBMITTED` → `APPROVED`
- Frontdesk can then schedule (set appointment date/time)
- OR patient confirms existing preferred date/time

### Step 4: Direct Appointment Scheduling
- Frontdesk can also **directly schedule appointments** without consultation review
- Use: "Schedule Appointment" button on patient listing
- Creates: Appointment that doctor must confirm

---

## The Real Schedule Appointment Workflow

When frontdesk schedules an appointment directly (without consultation request):

```
Frontdesk on Patient Listing
    ↓
Click: "Schedule Appointment" button
    ↓
Navigate to: /frontdesk/appointments?patientId=[patientId]
    ↓
Frontdesk selects:
├─ Doctor
├─ Service/Type
├─ Date
├─ Time
    ↓
Click: "Schedule"
    ↓
Appointment created with status: PENDING_DOCTOR_CONFIRMATION
    ↓
Doctor receives notification:
├─ Email: "New appointment scheduled"
├─ Dashboard: Pending confirmation badge
├─ Must confirm before time slot is locked
    ↓
Patient receives notification:
├─ Email: "Your appointment has been scheduled"
├─ Shows: Doctor, Date, Time, Status: "Awaiting Confirmation"
    ↓
Doctor confirms:
├─ Status: PENDING_DOCTOR_CONFIRMATION → SCHEDULED
├─ Time slot: NOW LOCKED (no longer available)
├─ Patient: Receives "Appointment confirmed" notification
```

---

## Files Modified (REVERTED)

### Removed/Reverted:
- ❌ `components/frontdesk/FrontdeskCreateConsultationDialog.tsx` - (not needed)
- ❌ `application/use-cases/CreateConsultationFromFrontdeskUseCase.ts` - (not needed)
- ❌ `application/dtos/CreateConsultationFromFrontdeskDto.ts` - (not needed)
- ❌ `app/api/consultations/frontdesk/create/route.ts` - (not needed)
- ✅ `app/frontdesk/patients/page.tsx` - Reverted to server component (removed dialog state)
- ✅ `lib/api/frontdesk.ts` - Removed `createConsultation()` method

### Current State:
- Patient listing: **Only** "View Profile" and "Schedule Appointment" buttons
- No "Create Consultation" button
- Clean, focused workflow

---

## What Needs to Be Enhanced

The existing "Schedule Appointment" workflow should include:

### 1. Patient Notification on Scheduling
```
When frontdesk schedules appointment:
├─ Patient receives email with:
│  ├─ Doctor name
│  ├─ Date and time
│  ├─ Location/contact info
│  └─ Status: "Awaiting doctor confirmation"
```

### 2. Doctor Notification & Confirmation
```
When frontdesk schedules appointment:
├─ Doctor receives notification:
│  ├─ Email alert
│  ├─ Dashboard badge: "Pending Appointments"
│  └─ Shows appointment details
│
├─ Doctor can:
│  ├─ Confirm appointment
│  │  └─ Status: PENDING_DOCTOR_CONFIRMATION → SCHEDULED
│  │  └─ Time slot locked
│  │  └─ Patient notified: "Confirmed"
│  │
│  ├─ Request reschedule
│  │  └─ Status remains PENDING_DOCTOR_CONFIRMATION
│  │  └─ Time slot NOT locked
│  │  └─ Frontdesk receives notification
│  │
│  └─ Reject appointment
│     └─ Status: CANCELLED
│     └─ Time slot freed
│     └─ Patient notified: "Rejected"
```

### 3. Appointment Status Enum Enhancement
```typescript
enum AppointmentStatus {
  PENDING,                        // Initial state
  PENDING_DOCTOR_CONFIRMATION,    // NEW: Waiting for doctor to confirm
  SCHEDULED,                      // Confirmed, time slot locked
  CHECKED_IN,                     // Patient checked in
  COMPLETED,                      // Appointment done
  CANCELLED,                      // Cancelled
  NO_SHOW,                        // Patient didn't show
}
```

### 4. Time Slot Blocking
```
Current Behavior: Time slot might be available immediately after scheduling
Desired Behavior:
├─ When PENDING_DOCTOR_CONFIRMATION:
│  └─ Time slot is TENTATIVELY BLOCKED (shows as unavailable)
│
├─ When SCHEDULED (doctor confirmed):
│  └─ Time slot is PERMANENTLY LOCKED (cannot be double-booked)
│
└─ If doctor rejects:
   └─ Time slot is IMMEDIATELY FREED (available again)
```

---

## Correct Role Definitions

### Frontdesk Staff Can:
✅ **Schedule Appointments**
- Select patient
- Choose doctor
- Set date and time
- Send patient notification

✅ **Review Consultation Requests**
- See pending patient consultations
- Approve and set appointment date
- Request more information
- Reject requests

✅ **View Patient Profiles**
- See consultation history
- See appointment history
- View medical records

### Frontdesk Staff Cannot:
❌ Create consultation requests (only patients can)
❌ Confirm appointments (only doctors can)
❌ Conduct consultations (only doctors can)
❌ Modify appointment after doctor confirms

### Doctors Must:
✅ Confirm appointments before time slot is locked
✅ Review pending appointments daily
✅ Request reschedule if needed
✅ Conduct actual consultations/appointments

---

## Next Steps

To implement proper appointment scheduling workflow:

### Phase 1: Doctor Confirmation Feature
1. Add `PENDING_DOCTOR_CONFIRMATION` status to `AppointmentStatus` enum
2. Update appointment creation to use new status
3. Create doctor notification service
4. Create doctor confirmation endpoint
5. Add confirmation UI to doctor dashboard

### Phase 2: Patient Notification
1. Enhance email template with appointment details
2. Add SMS option for appointment reminders
3. Add patient notification on doctor confirmation
4. Add cancelation/reschedule notification

### Phase 3: Time Slot Management
1. Block time slots at `PENDING_DOCTOR_CONFIRMATION`
2. Prevent double-booking during confirmation period
3. Show available slots only (exclude pending slots)
4. Free slots if doctor rejects

### Phase 4: Doctor Dashboard
1. Show "Pending Confirmations" section
2. Quick confirm/reject buttons
3. Reschedule capability
4. Bulk operations (confirm multiple at once)

---

## Summary

**What Was Fixed:**
- ✅ Removed incorrect "Create Consultation" feature
- ✅ Clarified that frontdesk only schedules, doesn't create consultations
- ✅ Reverted unnecessary code changes
- ✅ Patient listing back to simple "View Profile" + "Schedule Appointment"

**What Needs Enhancement:**
- Doctor confirmation workflow
- Patient notifications on scheduling
- Time slot blocking logic
- Doctor dashboard with pending confirmations

**Correct Frontdesk Workflow:**
1. View patient list
2. Click "Schedule Appointment" (for direct scheduling)
3. OR click "View Profile" → then interact with consultations
4. Patient and doctor get notified
5. Doctor must confirm before slot is locked

