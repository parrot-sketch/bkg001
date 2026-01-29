# Doctor Schedule Integration - Visual Reference Guide

**Purpose:** Quick reference for understanding how doctor schedule integrates with frontdesk, patient, and consultation workflows.

---

## 1. SYSTEM ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     HEALTHCARE APPOINTMENT SYSTEM                       │
└─────────────────────────────────────────────────────────────────────────┘

                          THREE MAIN ACTORS

       ┌──────────────┐           ┌──────────────┐        ┌────────────┐
       │   DOCTOR     │           │  FRONTDESK   │        │  PATIENT   │
       │   (Surgeon)  │           │    (Staff)   │        │            │
       └──────────────┘           └──────────────┘        └────────────┘
              ▲                           ▲                      ▲
              │                           │                      │
              └───────────────────┬───────┴──────────────────────┘
                                  │
                    ┌─────────────────────────┐
                    │   APPOINTMENT SYSTEM    │
                    │   (Central Orchestration)│
                    └─────────────────────────┘
                           ▲        ▲
                           │        │
           ┌───────────────┘        └───────────────┐
           │                                        │
      ┌────────────────┐                   ┌────────────────┐
      │   DATABASES    │                   │  INTEGRATIONS  │
      │  (What's Stored)                  │ (Notifications)│
      │                │                   │                │
      │ • Appointments │                   │ • Email        │
      │ • Working Days │                   │ • SMS          │
      │ • Availability │                   │ • Audit Logs   │
      │ • Consultations│                   └────────────────┘
      └────────────────┘
```

---

## 2. APPOINTMENT STATUS FLOW DIAGRAM

```
                        APPOINTMENT LIFECYCLE

      ┌──────────────────────────────────────────────────┐
      │ PATIENT SUBMITS CONSULTATION REQUEST             │
      │ Status: CONSULTATION_REQUEST_SUBMITTED           │
      └──────────────────────┬───────────────────────────┘
                             │
                             ▼
      ┌──────────────────────────────────────────────────┐
      │ FRONTDESK REVIEWS REQUEST                        │
      │ Options:                                          │
      │ • Approve → Status: CONSULTATION_REQUEST_APPROVED │
      │ • Request More Info                               │
      │ • Reject                                          │
      └──────────────────────┬───────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
    ┌─────────────────────┐   ┌────────────────────┐
    │ APPROVED            │   │ REJECTED/PENDING   │
    │ (Ready to Schedule) │   │ (Waiting for Info) │
    └────────────┬────────┘   └────────────────────┘
                 │
                 ▼
    ┌─────────────────────────────────────────────┐
    │ FRONTDESK SCHEDULES APPOINTMENT             │
    │ Creates: appointment.status =                │
    │ PENDING_DOCTOR_CONFIRMATION ← ⭐ KEY STATUS│
    └────────────┬────────────────────────────────┘
                 │
                 ▼
    ┌─────────────────────────────────────────────┐
    │ DOCTOR RECEIVES NOTIFICATION                │
    │ Email: "New appointment pending confirmation│
    │ Doctor must confirm or reject within 24hrs  │
    └────────────┬────────────────────────────────┘
                 │
        ┌────────┴─────────┐
        │                  │
        ▼                  ▼
    [CONFIRM]         [REJECT]
        │                  │
        ▼                  ▼
    SCHEDULED          CANCELLED
    ✓ Time locked      ✗ Time freed
    ✓ Patient notified ✓ Patient notified
    ✓ Ready for checkin

        │
        ▼
    PATIENT RECEIVES CONFIRMATION
    "Your appointment is confirmed for [date/time]"
    
        │
        ▼ (Day of appointment)
    
    PATIENT CHECKS IN
    Status: CHECKED_IN
    
        │
        ▼ (During appointment)
    
    CONSULTATION HAPPENS
    Status: IN_PROGRESS → COMPLETED
```

---

## 3. DATA FLOW - FRONTDESK SCHEDULING

```
STEP 1: FRONTDESK DASHBOARD
════════════════════════════
  ┌─────────────────────────────────┐
  │ Frontdesk opens dashboard      │
  │ Sees: AvailableDoctorsPanel    │
  │                                 │
  │ Dr. Smith | Orthopedics        │
  │ Available 09:00-17:00          │
  │ Mon✓ Tue✓ Wed✓ Thu✓ Fri✗      │
  │                                 │
  │ [Schedule] button              │
  └────────────────┬────────────────┘
                   │
                   ▼
STEP 2: SCHEDULE DIALOG OPENS
══════════════════════════════
  ┌─────────────────────────────────┐
  │ Doctor: Dr. Smith (selected)    │
  │ Date: [Calendar Picker]         │
  │ Time: [Slot Grid]               │
  │       Loading available slots...│
  └────────────────┬────────────────┘
                   │
                   ▼ GET /api/doctors/:id/slots
STEP 3: FETCH AVAILABLE SLOTS
═════════════════════════════
  Doctor: doc_123
  Date: 2025-01-26
  
  Backend:
  ├─ Get doctor working day (Monday = 09:00-17:00)
  ├─ Get doctor breaks (13:00-14:00 lunch)
  ├─ Get existing appointments for that day
  ├─ Generate available slots (30 min, 15 min buffer)
  │  [09:00] [09:30] [10:00] [10:30] ... [16:30]
  └─ Filter out booked times
  
  Returns:
  [
    {startTime: "09:00", endTime: "09:30", isAvailable: true},
    {startTime: "09:30", endTime: "10:00", isAvailable: true},
    ...
  ]
                   │
                   ▼
STEP 4: FRONTDESK SELECTS SLOT
═══════════════════════════════
  ┌─────────────────────────────────┐
  │ Available slots displayed:      │
  │ [09:00] [09:30] [10:00] [10:30] │
  │ [11:00] [11:30] [14:00] [14:30] │
  │ [15:00] [15:30] [16:00] [16:30] │
  │                                 │
  │ Frontdesk clicks: [14:00]       │
  │ Sets: appointmentDate: 2025-01-26
  │       time: 14:00               │
  │       type: SURGICAL_CONSULT    │
  └────────────────┬────────────────┘
                   │
                   ▼ POST /api/appointments
STEP 5: CREATE APPOINTMENT
═══════════════════════════
  Request Body:
  {
    "patientId": "pat_789",
    "doctorId": "doc_123",
    "appointmentDate": "2025-01-26",
    "time": "14:00",
    "type": "SURGICAL_CONSULTATION"
  }
  
  Backend Processing:
  ├─ Validate patient exists ✓
  ├─ Validate doctor exists ✓
  ├─ Validate date not in past ✓
  ├─ Validate time available ✓
  ├─ Check for doctor conflicts (transaction) ✓
  ├─ Create appointment
  │  status: PENDING_DOCTOR_CONFIRMATION ← ⭐
  ├─ Save to database
  ├─ Send email to doctor
  ├─ Send notification to patient
  └─ Log audit event
                   │
                   ▼
STEP 6: APPOINTMENT CREATED
════════════════════════════
  Database Record:
  {
    id: 1001,
    patientId: "pat_789",
    doctorId: "doc_123",
    appointmentDate: "2025-01-26",
    time: "14:00",
    status: "PENDING_DOCTOR_CONFIRMATION",
    createdAt: "2025-01-25T14:05:00Z"
  }
  
  Notifications Sent:
  ✉️ Doctor: "New appointment pending confirmation"
  ✉️ Patient: "Your appointment is pending doctor confirmation"
  
  Frontdesk Feedback:
  ✓ "Appointment scheduled! Dr. Smith must confirm within 24 hours"
```

---

## 4. DOCTOR CONFIRMATION FLOW

```
STEP 1: DOCTOR RECEIVES EMAIL
══════════════════════════════
  From: noreply@clinic.com
  Subject: Appointment Pending Your Confirmation
  
  Dear Dr. Smith,
  
  A new appointment has been scheduled pending your confirmation:
  
  Patient: John Doe
  Date: January 26, 2025
  Time: 2:00 PM
  Type: Surgical Consultation
  
  Please confirm or reject by [deadline].
  
  [CONFIRM] [REJECT]


STEP 2: DOCTOR OPENS DASHBOARD
═══════════════════════════════
  /doctor/dashboard
  
  ┌─────────────────────────────────┐
  │ Pending Confirmations (2)        │
  │                                 │
  │ 📌 John Doe                     │
  │    Jan 26, 2:00 PM              │
  │    Surgical Consultation        │
  │    [CONFIRM] [REJECT]           │
  │                                 │
  │ 📌 Jane Smith                   │
  │    Jan 26, 3:30 PM              │
  │    Post-op Assessment           │
  │    [CONFIRM] [REJECT]           │
  └─────────────────────────────────┘


STEP 3: DOCTOR CLICKS CONFIRM
════════════════════════════════
  POST /api/appointments/1001/confirm
  {
    "action": "confirm",
    "notes": "Confirmed - patient should arrive 15 min early"
  }
  
  Backend:
  ├─ Validate appointment exists ✓
  ├─ Validate status is PENDING_DOCTOR_CONFIRMATION ✓
  ├─ Update status: SCHEDULED ← ⭐ TIME LOCKED
  ├─ Save to database
  ├─ Send email to patient: "Appointment Confirmed!"
  ├─ Log audit event
  └─ Return updated appointment


STEP 4: PATIENT RECEIVES CONFIRMATION
══════════════════════════════════════
  ✉️ Your appointment is confirmed!
  
  Dr. Smith
  January 26, 2025 at 2:00 PM
  Surgical Consultation
  
  Location: [clinic address]
  Please arrive 15 minutes early.


STEP 5: TIME SLOT BECOMES LOCKED
═════════════════════════════════
  14:00-14:30 on Jan 26 for Dr. Smith
  
  Future booking attempts will fail:
  "This time slot is no longer available"
  
  GET /api/doctors/doc_123/slots?date=2025-01-26
  Response will NOT include 14:00-14:30
```

---

## 5. PATIENT VIEW THROUGHOUT JOURNEY

```
PATIENT EXPERIENCE TIMELINE

Day 1: Submits Consultation
════════════════════════════
  Patient Portal
  ┌─────────────────────────────┐
  │ My Appointments             │
  │                             │
  │ Consultation Request        │
  │ To: Dr. Smith, Orthopedics │
  │ Reason: Knee pain          │
  │ Status: ⏳ Under Review    │
  │                             │
  │ Message: "We'll review your │
  │ request and contact you     │
  │ within 24 hours"            │
  └─────────────────────────────┘


Day 2: Request Approved, Awaiting Schedule
═══════════════════════════════════════════
  Patient Portal
  ┌─────────────────────────────────┐
  │ My Appointments                 │
  │                                 │
  │ 📋 Consultation Approved        │
  │    To: Dr. Smith                │
  │    Status: ⏳ Awaiting Schedule │
  │                                 │
  │ Message: "Your consultation    │
  │ has been approved. We are      │
  │ scheduling your appointment."   │
  └─────────────────────────────────┘
  
  Email: "Your consultation has been approved!"


Day 3: Appointment Scheduled, Pending Confirmation
══════════════════════════════════════════════════
  Patient Portal
  ┌─────────────────────────────────┐
  │ My Appointments                 │
  │                                 │
  │ 📅 Appointment Scheduled        │
  │    Dr. Smith, Orthopedics       │
  │    Jan 26, 2025 at 2:00 PM      │
  │    Status: ⏳ Pending Confirm   │
  │                                 │
  │ Message: "Your appointment has │
  │ been scheduled. Doctor will    │
  │ confirm within 24 hours."      │
  └─────────────────────────────────┘
  
  Email: "Appointment pending doctor confirmation"


Day 4: Doctor Confirms
══════════════════════
  Patient Portal
  ┌─────────────────────────────────┐
  │ My Appointments                 │
  │                                 │
  │ 📅 Appointment Confirmed ✅     │
  │    Dr. Smith, Orthopedics       │
  │    Jan 26, 2025 at 2:00 PM      │
  │    Status: ✅ SCHEDULED         │
  │                                 │
  │ Message: "Your appointment has │
  │ been confirmed by Dr. Smith.   │
  │ Please arrive 15 minutes early."│
  │                                 │
  │ [ADD TO CALENDAR] [DIRECTIONS]  │
  └─────────────────────────────────┘
  
  Email: "Your appointment is confirmed!"


Day of Appointment
══════════════════
  Patient Portal
  ┌─────────────────────────────────┐
  │ My Appointments                 │
  │                                 │
  │ 🔵 Appointment Today            │
  │    Dr. Smith, Orthopedics       │
  │    Jan 26, 2025 at 2:00 PM      │
  │    Status: ⏰ Due Soon          │
  │                                 │
  │ Reminder: Your appointment is in│
  │ 2 hours. Please arrive early.   │
  │                                 │
  │ [CHECK IN]                      │
  └─────────────────────────────────┘


After Check-in
═══════════════
  Patient Portal
  ┌─────────────────────────────────┐
  │ My Appointments                 │
  │                                 │
  │ 🟢 Checked In                   │
  │    Dr. Smith, Orthopedics       │
  │    Jan 26, 2025 at 2:00 PM      │
  │    Status: ✓ In Progress        │
  │                                 │
  │ Message: "Thank you for checking│
  │ in. Doctor will see you soon."  │
  └─────────────────────────────────┘


After Consultation
═══════════════════
  Patient Portal
  ┌─────────────────────────────────┐
  │ My Appointments                 │
  │                                 │
  │ ✅ Completed                    │
  │    Dr. Smith, Orthopedics       │
  │    Jan 26, 2025 at 2:00 PM      │
  │    Status: ✓ COMPLETED          │
  │                                 │
  │ Summary: [Dr's notes]           │
  │ Next Steps: [Follow-up plan]    │
  │                                 │
  │ [BOOK FOLLOW-UP] [GIVE FEEDBACK]│
  └─────────────────────────────────┘
```

---

## 6. KEY INTEGRATION POINTS

### For Frontdesk
```
Dashboard:
├─ AvailableDoctorsPanel
│  └─ Shows doctor availability
│     [Click to Schedule]
│
├─ Consultations Page
│  ├─ New Inquiries
│  ├─ Awaiting Clarification
│  └─ Awaiting Scheduling (APPROVED consultations)
│     └─ [Schedule] button opens ScheduleAppointmentDialog
│
└─ Appointments Page
   ├─ View today's appointments
   ├─ Filter by status
   └─ [Check In] button
```

### For Doctor
```
Dashboard:
├─ Pending Confirmations (NEW)
│  ├─ Shows appointments awaiting confirmation
│  ├─ [CONFIRM] button
│  └─ [REJECT] button with reason dialog
│
├─ Scheduled Appointments
│  ├─ Today's confirmed appointments
│  └─ [START CONSULTATION] button
│
└─ Completed Consultations
   └─ View patient notes and follow-ups
```

### For Patient
```
My Appointments:
├─ Consultation Requests (submitted)
│  └─ Status: Under Review
│
├─ Pending Confirmation (approved, awaiting doctor)
│  └─ Status: Pending Doctor Confirmation
│     [Awaiting Dr. Smith's confirmation]
│
├─ Confirmed Appointments (ready to go)
│  └─ Status: Scheduled
│     [See you on Jan 26!]
│
└─ Completed Appointments
   └─ View notes and feedback
```

---

## 7. DATABASE STATE AT EACH STEP

```
STEP 1: Initial Consultation Request
═════════════════════════════════════
appointment {
  id: 1001,
  patient_id: "pat_789",
  doctor_id: "doc_123",
  appointment_date: NULL,
  time: NULL,
  status: "CONSULTATION_REQUEST_SUBMITTED",
  consultation_request_status: "SUBMITTED",
  created_at: "2025-01-25 09:00:00"
}

workingDay {
  doctor_id: "doc_123",
  day: "Monday",
  start_time: "09:00",
  end_time: "17:00",
  is_available: true
}


STEP 2: Frontdesk Approves Request
═══════════════════════════════════
appointment {
  id: 1001,
  ...
  status: "CONSULTATION_REQUEST_SUBMITTED",
  consultation_request_status: "APPROVED",  ← CHANGED
  reviewed_by: "fd_staff_456",
  reviewed_at: "2025-01-25 10:00:00"
}


STEP 3: Frontdesk Schedules Appointment
════════════════════════════════════════
appointment {
  id: 1001,
  patient_id: "pat_789",
  doctor_id: "doc_123",
  appointment_date: "2025-01-26",  ← SET
  time: "14:00",                   ← SET
  status: "PENDING_DOCTOR_CONFIRMATION",  ← CHANGED (NEW)
  consultation_request_status: "APPROVED",
  reviewed_by: "fd_staff_456",
  reviewed_at: "2025-01-25 10:00:00",
  created_at: "2025-01-25 10:05:00"
}


STEP 4: Doctor Confirms
════════════════════════
appointment {
  id: 1001,
  ...
  status: "SCHEDULED",  ← CHANGED (LOCKED)
  appointment_confirmed_by: "doc_123",
  appointment_confirmed_at: "2025-01-25 11:00:00"
}

→ Time slot 14:00-14:30 on Jan 26 is now UNAVAILABLE
→ Another appointment request for same slot will be REJECTED


STEP 5: Patient Checks In
═══════════════════════════
appointment {
  id: 1001,
  ...
  status: "CHECKED_IN",  ← CHANGED
  checked_in_at: "2025-01-26 13:58:00"
}


STEP 6: Consultation Completed
════════════════════════════════
appointment {
  id: 1001,
  ...
  status: "COMPLETED",  ← CHANGED
  completed_at: "2025-01-26 14:30:00"
}

consultationRecord {
  appointment_id: 1001,
  notes: "Patient presents with knee pain...",
  follow_up_required: true,
  follow_up_date: "2025-02-09"
}
```

---

## 8. KEY CONCEPTS

### PENDING_DOCTOR_CONFIRMATION Status (NEW)
- **When:** Created when frontdesk schedules appointment
- **Why:** Ensures doctor explicitly confirms before time slot is locked
- **Duration:** 24 hours (configurable)
- **Actions:**
  - Doctor confirms → SCHEDULED (time locked)
  - Doctor rejects → CANCELLED (time freed)
  - Timeout → Escalate to admin/doctor

### Time Slot Locking
```
Available Slot: Dr. Smith, Jan 26, 14:00-14:30
    ↓
Frontdesk books → PENDING_DOCTOR_CONFIRMATION
    ↓ (Tentatively blocked, can still be released)
    ↓
Doctor confirms → SCHEDULED
    ↓ (Permanently locked, no other patient can book)
```

### Doctor Notifications
```
Email Trigger: Appointment status = PENDING_DOCTOR_CONFIRMATION
Recipients: Doctor who the appointment is for
Content:
  - Patient name
  - Appointment date/time
  - Service type
  - Request to confirm/reject
  - CTA link to dashboard
```

---

## 9. ERROR SCENARIOS

### Scenario 1: Slot Becomes Unavailable During Booking
```
Frontdesk selects: Dr. Smith, Jan 26, 14:00
  ↓
Another frontdesk staff books same slot
  ↓
First frontdesk submits request
  ↓
Backend checks transaction:
"Doctor already has appointment at this time"
  ↓
Return: 400 Bad Request
"Time slot no longer available, please select another"
  ↓
Reload available slots, show updated grid
```

### Scenario 2: Doctor Rejects Appointment
```
Doctor clicks: [REJECT]
  ↓
Dialog: "Why are you rejecting?"
  [Doctor is unavailable on this date]
  ↓
POST /api/appointments/:id/confirm
{
  "action": "reject",
  "rejectionReason": "Doctor is out of country"
}
  ↓
Status: CANCELLED
  ↓
Patient Email: "Your appointment was cancelled"
"Reason: Doctor is out of country"
"Please schedule with another doctor or contact us"
  ↓
Time slot: FREED for other patients
  ↓
Frontdesk: Can now book same slot with different doctor
```

### Scenario 3: Doctor Doesn't Confirm Within 24 Hours
```
Appointment created: Jan 25, 10:00 AM
Status: PENDING_DOCTOR_CONFIRMATION
  ↓ (no action for 24 hours)
  ↓ Jan 26, 10:00 AM
  ↓
System triggers escalation:
├─ Reminder email to doctor
├─ Alert to admin
└─ Patient gets: "Doctor needs to confirm, we're following up"
  ↓
Options:
├─ Auto-confirm after 48 hours (configurable)
├─ Require manual admin confirmation
└─ Automatically cancel and suggest rebooking
```

