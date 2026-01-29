# Appointment Booking Workflow - Complete Journey

## Overview
This document outlines the complete end-to-end workflow for appointment booking in the Nairobi Sculpt Healthcare System, from patient booking to consultation completion.

---

## 🔄 Complete Appointment Lifecycle

### **Status Progression:**
```
PENDING → SCHEDULED → IN_PROGRESS (Consultation) → COMPLETED
```

---

## 📋 Detailed Workflow Stages

### **Stage 1: Patient Books Appointment**

#### **Patient Action:**
1. Patient logs into their dashboard at `/patient/dashboard`
2. Clicks "Book Appointment" button
3. Selects a doctor from available surgeons
4. Views doctor's profile and specializations
5. Selects appointment date from calendar (shows dates with available slots)
6. Selects specific time slot from available times
7. Enters procedure type and optional notes
8. Submits booking

#### **System Actions:**
- **Use Case**: `ScheduleAppointmentUseCase`
- Validates doctor availability
- Checks for scheduling conflicts (no double booking)
- Creates appointment with **status: PENDING**
- Stores appointment details:
  - Patient ID
  - Doctor ID
  - Appointment date & time
  - Procedure type
  - Notes
  - Slot information (start time, duration)

#### **Patient Experience:**
- **Confirmation Dialog** appears showing:
  - ✅ "Appointment Booked!" success message
  - 📅 Appointment date (e.g., "Friday, January 26, 2026")
  - 🕐 Appointment time (e.g., "10:30 AM")
  - 📝 Procedure type
  - **Reminders:**
    - Email/SMS reminders sent 24 hours before
    - Arrive 15 minutes early for check-in
    - Bring valid ID and insurance card
- **Actions:**
  - "Close" button to return to dashboard
  - "View My Appointment" button → redirects to `/patient/appointments`

#### **Patient Appointments View** (`/patient/appointments`):
- Shows all appointments (upcoming and past)
- Each appointment card displays:
  - Doctor name and specialization
  - Date and time
  - Status badge (PENDING, SCHEDULED, COMPLETED)
  - Appointment type
- **Actions available:**
  - Book new appointment
  - Request consultation (alternative workflow)
  - View appointment details
  - Cancel appointment (if needed)

---

### **Stage 2: Patient Arrives & Check-In**

#### **Frontdesk/Nurse Action:**
1. Patient arrives at clinic
2. Frontdesk staff opens `/frontdesk/appointments`
3. Views today's appointments list
4. Identifies patient's appointment (status: PENDING)
5. Clicks "Check In" button
6. Confirms check-in in dialog

#### **System Actions:**
- **Use Case**: `CheckInPatientUseCase`
- Updates appointment status from **PENDING → SCHEDULED**
- Records check-in details:
  - `checked_in_at`: Current timestamp
  - `checked_in_by`: Frontdesk user ID
  - `late_arrival`: Boolean (if patient is late)
  - `late_by_minutes`: Minutes late (if applicable)
- Creates audit trail for compliance

#### **Frontdesk View Features:**
- Dashboard shows:
  - 📊 Pending check-ins count
  - ✅ Checked-in patients count
  - 📅 Date filter for appointments
  - 🔍 Search by patient name, doctor, type
  - 🏷️ Filter by status (All, Pending, Checked In, Completed)
- Real-time updates after check-in

---

### **Stage 3: Doctor Views Scheduled Appointments**

#### **Doctor Access:**
1. Doctor logs into system
2. Opens `/doctor/appointments`
3. Views all scheduled appointments

#### **Doctor Appointments View:**
- Shows appointments with status: **SCHEDULED** (checked in) or **PENDING**
- Each appointment card displays:
  - Patient information (name, file number)
  - Appointment date and time
  - Procedure type
  - Check-in status
  - Patient profile preview
- **Actions available:**
  - **"Check In"** - If not yet checked in (changes PENDING → SCHEDULED)
  - **"Begin Consultation"** - For checked-in patients
  - **"View Profile"** - Navigate to patient's full medical profile
  - **"Complete"** - If consultation is in progress

---

### **Stage 4: Doctor Starts Consultation**

#### **Doctor Action:**
1. Doctor identifies checked-in patient
2. Clicks "Begin Consultation" button
3. **Start Consultation Dialog** opens:
   - Shows patient safety alerts/warnings (if any)
   - Pre-consultation notes field (optional)
   - Important patient information
4. Doctor enters any pre-consultation notes
5. Clicks "Begin Consultation"

#### **System Actions:**
- **Use Case**: `StartConsultationUseCase`
- Creates `Consultation` record (if doesn't exist)
- Sets consultation status to **IN_PROGRESS**
- Links consultation to appointment
- Records:
  - Start time
  - Doctor ID (user who started)
  - Initial notes
- Keeps appointment status as **SCHEDULED**

#### **Navigation:**
- Doctor is automatically redirected to:
  - **Consultation Session Page**: `/doctor/consultations/{appointmentId}/session`

---

### **Stage 5: Active Consultation Session**

#### **Consultation Workspace** (`/doctor/consultations/{appointmentId}/session`):

#### **Interface Sections:**

1. **Patient Overview Header:**
   - Patient name, age, file number
   - Current vital signs (if available)
   - Allergies and conditions
   - Appointment details

2. **Consultation Tabs:**
   - **Overview**: Patient summary, key info, recent history
   - **Clinical Notes**: Structured note-taking interface
   - **Examination**: Physical examination findings
   - **Images**: View and manage patient images
   - **History**: Past consultations and procedures

3. **Clinical Notes Section:**
   - **Structured fields:**
     - Chief Complaint
     - History of Present Illness (HPI)
     - Assessment
     - Plan
   - **Consultation Outcome Type:**
     - TREATMENT_PLAN_PROVIDED
     - SURGERY_RECOMMENDED
     - REFERRAL_MADE
     - FOLLOW_UP_SCHEDULED
     - NO_TREATMENT_REQUIRED
   - **Patient Decision** (for surgical cases):
     - ACCEPTED
     - DECLINED
     - NEEDS_TIME_TO_DECIDE
   - Auto-save functionality
   - Real-time updates

4. **Quick Actions:**
   - 👤 **"View Full Profile"** - Navigate to patient's complete profile
     - Shows "Back to Consultation" button for easy return
     - Includes query params: `?from=consultation&appointmentId={id}`
   - 📋 **"Add Vital Signs"** - Record vitals during consultation
   - 🎯 **"Cases & Procedures"** - View/manage surgical cases

5. **Consultation Controls:**
   - **"Save Notes"** - Save progress without completing
   - **"Complete Consultation"** - Finish and close session

---

### **Stage 6: Doctor Completes Consultation**

#### **Doctor Action:**
1. Doctor finishes examination and discussion
2. Completes all clinical notes
3. Clicks "Complete Consultation" button
4. **Complete Consultation Dialog** opens:
   - Consultation outcome summary
   - Follow-up scheduling (optional):
     - Select date
     - Select time
     - Set appointment type
   - Final notes confirmation
5. Clicks "Complete" to finalize

#### **System Actions:**
- **Use Case**: `CompleteConsultationUseCase`
- Updates appointment status from **SCHEDULED → COMPLETED**
- Updates consultation status to **COMPLETED**
- Records:
  - Completion timestamp
  - Final outcome
  - Patient decision (if applicable)
  - Complete clinical notes
- **If follow-up scheduled:**
  - Creates new appointment with status **PENDING**
  - Links to original appointment
  - Adds note: "Follow-up appointment for appointment #{id}"
- Creates audit trail
- Sends notification to patient (future enhancement)

#### **Doctor Experience:**
- Success message displayed
- Redirected to `/doctor/appointments` or `/doctor/consultations`
- Completed appointment removed from active list
- Available in consultation history

---

### **Stage 7: Post-Consultation**

#### **Patient View** (`/patient/appointments`):
- Appointment now shows status: **COMPLETED**
- Patient can:
  - View consultation summary (future enhancement)
  - See follow-up appointments (if scheduled)
  - Download consultation report (future enhancement)
  - Rate consultation (future enhancement)

#### **Doctor View** (`/doctor/consultations`):
- Completed consultations appear in history
- Each completed consultation card shows:
  - Patient name and details
  - Date completed
  - Outcome type
  - **"View Profile"** button - Navigate to patient profile

#### **Patient Profile Access** (`/doctor/patients/{patientId}`):
- **Tabs:**
  - **Overview**: Demographics, vitals, allergies
  - **Clinical History**: All past consultations
  - **Cases & Procedures**: Surgical cases and procedures
  - **Timeline**: Chronological patient journey
- **Navigation Context:**
  - If accessed from consultation: Shows "Back to Consultation" button
  - Otherwise: Shows "Back to Patients" button

---

## 🔄 Alternative Workflows

### **Consultation Request Workflow** (Different from Direct Booking):

1. **Patient submits consultation request**:
   - Does NOT select specific date/time
   - Provides preferred time range (Morning/Afternoon/Evening)
   - Describes concern/reason
   - Status: `consultation_request_status: PENDING_REVIEW`

2. **Frontdesk/Doctor reviews request**:
   - Views request details
   - Approves or requests more information
   - Status changes: `PENDING_REVIEW → APPROVED` or `INFO_REQUESTED`

3. **If approved**:
   - Frontdesk/Doctor selects specific date/time
   - Status changes: `APPROVED → SCHEDULED`
   - Patient receives notification

4. **Patient confirms**:
   - Patient reviews scheduled time
   - Confirms or requests reschedule
   - Status changes: `SCHEDULED → CONFIRMED`

5. **Then follows standard workflow** from Stage 2 (Check-in)

---

## 📊 Status Reference

### **Appointment Status:**
- `PENDING` - Booked, awaiting patient arrival
- `SCHEDULED` - Patient checked in, waiting for doctor
- `COMPLETED` - Consultation finished
- `CANCELLED` - Appointment cancelled

### **Consultation Status:**
- `NOT_STARTED` - Created but not begun
- `IN_PROGRESS` - Active consultation session
- `COMPLETED` - Consultation finished

### **Consultation Request Status** (Alternative workflow):
- `PENDING_REVIEW` - Awaiting review
- `INFO_REQUESTED` - More information needed
- `APPROVED` - Approved, awaiting scheduling
- `SCHEDULED` - Date/time assigned
- `CONFIRMED` - Patient confirmed
- `REJECTED` - Request declined

---

## 🎯 Key Integration Points

### **API Endpoints:**
- `POST /api/appointments` - Book appointment
- `GET /api/appointments/patient/:patientId` - Get patient's appointments
- `GET /api/appointments/doctor/:doctorId` - Get doctor's appointments
- `POST /api/appointments/:id/check-in` - Check in patient
- `POST /api/consultations/:id/start` - Start consultation
- `PUT /api/consultations/:id/complete` - Complete consultation
- `GET /api/doctors/:id/available-dates` - Get available booking dates
- `GET /api/doctors/:id/slots` - Get available time slots for date

### **Key Components:**
- `BookAppointmentDialog` - Patient booking interface
- `AppointmentBookingConfirmationDialog` - Success confirmation
- `CheckInDialog` - Frontdesk check-in interface
- `StartConsultationDialog` - Consultation initiation
- `ConsultationWorkspace` - Main consultation interface
- `CompleteConsultationDialog` - Consultation completion

### **Data Models:**
- `Appointment` - Core appointment entity
- `Consultation` - Consultation session record
- `Patient` - Patient information
- `Doctor` - Doctor/surgeon information
- `WorkingDay` - Doctor's weekly schedule
- `ScheduleSession` - Time blocks within working days
- `SlotConfiguration` - Appointment slot settings

---

## ✅ Validation & Business Rules

### **Booking Rules:**
- ✓ Patient must be authenticated
- ✓ Doctor must have availability configured
- ✓ Selected date must not be in the past
- ✓ Selected time slot must be available
- ✓ No double booking (same doctor, date, time)
- ✓ Appointment excludes CANCELLED/COMPLETED slots

### **Check-In Rules:**
- ✓ Appointment must exist
- ✓ Appointment status must be PENDING
- ✓ Patient must arrive on or after appointment date

### **Consultation Rules:**
- ✓ Appointment must be SCHEDULED (checked in)
- ✓ Doctor must be authorized for this patient
- ✓ Only one active consultation per appointment

### **Completion Rules:**
- ✓ Consultation must be IN_PROGRESS
- ✓ Clinical notes must be provided
- ✓ Outcome type must be selected
- ✓ If surgical case: Patient decision required

---

## 🚀 Future Enhancements

### **Planned Features:**
- [ ] Email/SMS appointment reminders (24 hours before)
- [ ] Patient notifications on status changes
- [ ] Consultation report generation (PDF)
- [ ] Consultation rating/feedback
- [ ] Virtual consultations (telemedicine)
- [ ] Appointment rescheduling by patient
- [ ] Waitlist management
- [ ] Multi-doctor availability sync
- [ ] Calendar integration (Google Calendar, Outlook)
- [ ] Payment integration
- [ ] Insurance verification

---

## 📝 Notes

### **Current Implementation Status:**
- ✅ Complete booking workflow
- ✅ Slot validation and conflict detection
- ✅ Check-in process
- ✅ Consultation session interface
- ✅ Structured clinical notes
- ✅ Patient profile integration
- ✅ Navigation context preservation
- ✅ Cases & procedures tracking
- ✅ Follow-up scheduling
- ✅ Audit trail for compliance

### **Known Issues (Resolved):**
- ✅ Fixed: Time format mismatch (12h vs 24h)
- ✅ Fixed: Slot availability not reflecting booked slots
- ✅ Fixed: Working day ID changes breaking sessions
- ✅ Fixed: File number validation too restrictive
- ✅ Fixed: Appointment ID not returned after booking

---

## 🔗 Related Documentation
- [Doctor Availability Guide](../DOCTOR_AVAILABILITY_GUIDE.md)
- [Consultation Workflow Journey Map](../CONSULTATION_WORKFLOW_JOURNEY_MAP.md)
- [Appointment Slot Booking Fix](../APPOINTMENT_SLOT_BOOKING_FIX.md)
- [Authentication Pages Audit](../AUTHENTICATION_PAGES_AUDIT.md)
