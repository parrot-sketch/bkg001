# Doctor Schedule Integration Analysis
## System Architecture, Data Flows & UI Integration

**Date:** January 25, 2026  
**Focus:** Frontdesk appointment scheduling with doctor availability  
**Status:** Comprehensive audit and integration plan

---

## PART 1: SYSTEM OVERVIEW

### Architecture Context

```
┌─────────────────────────────────────────────────────────────────┐
│                   HEALTHCARE SCHEDULING SYSTEM                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  DOCTOR LAYER               FRONTDESK LAYER          PATIENT     │
│  ═════════════               ═══════════════          ══════     │
│                                                                   │
│  • Set Schedule      ←→   • View Availability   ←→   • Browse   │
│  • View Own Schedule      • Book Appointments        • Schedule  │
│  • Manage Breaks          • View Consultations       • Check     │
│  • Block Time             • Review Inquiries            Status   │
│                           • Check-in Patients                    │
│                                                                   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              DATABASE LAYER (Core Models)               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │  WorkingDay  │  │ Appointment  │  │  Patient     │  │   │
│  │  ├──────────────┤  ├──────────────┤  ├──────────────┤  │   │
│  │  │ day          │  │ status       │  │ id           │  │   │
│  │  │ startTime    │  │ doctor_id    │  │ first_name   │  │   │
│  │  │ endTime      │  │ patient_id   │  │ email        │  │   │
│  │  │ isAvailable  │  │ date         │  │ phone        │  │   │
│  │  │ doctor_id    │  │ time         │  └──────────────┘  │   │
│  │  └──────────────┘  └──────────────┘                    │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │     OTHER SUPPORTING MODELS                     │  │   │
│  │  │  SlotConfiguration, AvailabilityBreak,         │  │   │
│  │  │  AvailabilityOverride, ScheduleSession         │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              API LAYER (RESTful Endpoints)              │   │
│  │                                                          │   │
│  │  Doctor Endpoints:                                     │   │
│  │  • GET /api/doctors/me/availability                   │   │
│  │  • PUT /api/doctors/me/availability                   │   │
│  │                                                          │   │
│  │  Frontdesk Endpoints:                                  │   │
│  │  • GET /api/doctors/availability                      │   │
│  │  • GET /api/doctors/:id/slots                         │   │
│  │  • POST /api/appointments                             │   │
│  │                                                          │   │
│  │  Shared Endpoints:                                     │   │
│  │  • GET /api/appointments                              │   │
│  │  • GET /api/appointments/:id/confirm                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## PART 2: CURRENT SYSTEM STATE

### 2.1 Doctor Availability Management

**Status:** ✅ BACKEND COMPLETE | ⚠️ UI PARTIAL

**What Exists:**
- Database models: `WorkingDay`, `AvailabilityBreak`, `SlotConfiguration`, `AvailabilityOverride`
- Use cases: `GetMyAvailabilityUseCase`, `SetDoctorAvailabilityUseCase`
- API endpoints:
  - `GET /api/doctors/me/availability` (read)
  - `PUT /api/doctors/me/availability` (update)
- API client: `doctorApi.getMyAvailability()`, `doctorApi.setMyAvailability()`
- Components: `ManageAvailabilityDialog` (exists in components/doctor/)

**What's Missing:**
- [ ] Full doctor availability management page (`/app/doctor/availability/page.tsx`)
- [ ] Doctor availability form integration
- [ ] Onboarding flow for initial availability setup
- [ ] Doctor dashboard integration

**Data Structure Example:**
```typescript
// Doctor sets working days and breaks
{
  workingDays: [
    {
      day: "Monday",
      startTime: "09:00",
      endTime: "17:00",
      isAvailable: true,
      breaks: [{ startTime: "13:00", endTime: "14:00", reason: "Lunch" }]
    },
    // Tuesday-Friday similar...
  ],
  slotConfiguration: {
    defaultDuration: 30,      // Each appointment = 30 mins
    bufferTime: 15,           // 15 min buffer between appointments
    slotInterval: 15          // Generate slots every 15 mins
  }
}
```

### 2.2 Appointment Availability Checking

**Status:** ✅ BACKEND COMPLETE | ✅ FRONTDESK UI INTEGRATED

**What Exists:**
- Use case: `GetAvailableSlotsForDateUseCase`
- Domain service: `AvailabilitySlotService` (generates slots from doctor availability)
- API endpoint: `GET /api/doctors/:id/slots?date=YYYY-MM-DD`
- API client method: (via generic apiClient.get)
- React hook: `useAvailableSlots` (in `hooks/useAvailableSlots.ts`)
- Frontdesk component: `AvailableDoctorsPanel` (shows all doctors + availability)

**How It Works:**
```
Frontdesk Dashboard
    ↓
AvailableDoctorsPanel component
    ↓
useAvailableSlots hook
    ↓
GET /api/doctors/[id]/slots?date=2025-01-25
    ↓
GetAvailableSlotsForDateUseCase
    ↓
AvailabilitySlotService (generates slots)
    ↓
Returns: [{startTime: "09:00", endTime: "09:30", isAvailable: true}, ...]
    ↓
Display as interactive calendar/grid to frontdesk
```

**Display Example (AvailableDoctorsPanel):**
```
┌─────────────────────────────────────────┐
│ DOCTORS AVAILABLE TODAY                 │
├─────────────────────────────────────────┤
│                                           │
│ Dr. Smith | Orthopedics   ✅ Available  │
│ Today: 09:00 - 17:00 (Lunch 13-14)      │
│ Mon Tue Wed Thu Fri Sat Sun              │
│ ✓   ✓   ✓   ✓   ✗   ✗   ✗             │
│                                           │
│ Dr. Johnson | Cardiology  ✅ Available  │
│ Today: 10:00 - 16:00                    │
│ Mon Tue Wed Thu Fri Sat Sun              │
│ ✓   ✓   ✓   ✓   ✓   ✗   ✗             │
│                                           │
└─────────────────────────────────────────┘
```

### 2.3 Appointment Scheduling

**Status:** ✅ BACKEND COMPLETE | ⚠️ UI NEEDS ENHANCEMENT

**Current Flow:**
```
Frontdesk User
    ↓
Selects doctor, date, time, type
    ↓
POST /api/appointments
    ↓
ScheduleAppointmentUseCase
    ├─ Validate patient exists
    ├─ Validate date not in past
    ├─ Validate availability (GetAvailableSlotsForDateUseCase)
    ├─ Check for doctor conflicts (transaction)
    ├─ Create appointment with status: PENDING
    ├─ Send notification to patient
    └─ Record audit event
    ↓
Returns: AppointmentResponseDto {status: PENDING, ...}
    ↓
Frontdesk sees confirmation
Patient sees notification
```

**Current Status Creation:**
```typescript
// Line 145 in ScheduleAppointmentUseCase
const appointment = ApplicationAppointmentMapper.fromScheduleDto(
  dto,
  AppointmentStatus.PENDING,  // ← Always creates as PENDING
  0, // Temporary ID
);
```

**Issue to Fix:** Appointment should be created as `PENDING_DOCTOR_CONFIRMATION` instead of `PENDING` when frontdesk schedules.

---

## PART 3: FRONTDESK APPOINTMENT BOOKING FLOW

### 3.1 Current UI Flow

**Location:** `/app/frontdesk/` (dashboard.tsx, appointments.tsx, consultations.tsx)

**Current User Experience:**

```
Frontdesk Dashboard
├── Today's Metrics Card
│   ├─ Expected Patients (count)
│   ├─ Checked In (count)
│   └─ Pending Check-ins (count)
│
├── Available Doctors Panel
│   ├─ Shows all doctors
│   ├─ Shows weekly schedule
│   ├─ Refresh button
│   └─ "Unavailable" state if no one available
│
├── New Inquiries Section
│   └─ Link to /frontdesk/consultations?status=SUBMITTED
│
├── Awaiting Clarification Section
│   └─ Link to /frontdesk/consultations?status=NEEDS_MORE_INFO
│
└── Awaiting Scheduling Section (CRITICAL INTEGRATION)
    └─ Link to /frontdesk/consultations?status=APPROVED
        (This is where frontdesk schedules approved consultations)

Frontdesk Consultations Page (/app/frontdesk/consultations)
├── Filter by status (SUBMITTED, APPROVED, NEEDS_MORE_INFO, etc.)
├── Review Consultation Dialog
│   ├─ Show patient details
│   ├─ Show consultation reason
│   ├─ Actions:
│   │  ├─ [Approve] → Status: APPROVED (ready to schedule)
│   │  ├─ [Request Info] → Status: NEEDS_MORE_INFO
│   │  └─ [Reject] → Status: REJECTED
│   └─ For APPROVED: Show "Schedule" button
│
└── Schedule Dialog (NEEDS ENHANCEMENT)
    ├─ Select Doctor (dropdown)
    ├─ Select Date (calendar)
    ├─ Select Time Slot (picker - loads from /api/doctors/:id/slots)
    ├─ Appointment Type (radio buttons)
    └─ [Confirm Schedule] → POST /api/appointments
```

### 3.2 Doctor Availability Integration in Scheduling

**Current Implementation Location:** `AvailableDoctorsPanel` component

**What Works:**
- ✅ Shows all doctors with their weekly schedule
- ✅ Displays "Available Today" badges
- ✅ Shows working hours
- ✅ Refresh button to reload availability

**What's Missing:**
- ❌ No time slot picker integrated into appointment scheduling
- ❌ No "Schedule for this doctor" quick action
- ❌ Schedule dialog doesn't show real-time available slots
- ❌ No visual calendar for date/time selection with slots

**Integration Gap:**
```
CURRENT STATE:
Frontdesk sees: Doctor Smith | Available 09:00-17:00
But cannot: Click to see specific available time slots
And cannot: Schedule appointment directly from availability view

DESIRED STATE:
Frontdesk sees: Doctor Smith | Available 09:00-17:00
Can click: "Schedule" button
Leads to: Calendar/slot picker showing:
  Date: [Calendar]
  Available slots: [09:00] [09:30] [10:00] [10:30] ...
  Select slot → [Schedule]
```

---

## PART 4: DATA FLOW - FRONTDESK SCHEDULING AN APPOINTMENT

### 4.1 Complete End-to-End Flow (WITH Doctor Confirmation)

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPOINTMENT LIFECYCLE                          │
└─────────────────────────────────────────────────────────────────┘

STEP 1: FRONTDESK REVIEWS CONSULTATION REQUEST
═══════════════════════════════════════════════

Frontend: /frontdesk/consultations?status=APPROVED
  ├─ Shows: Patient inquiry details
  ├─ Shows: Reason for consultation
  ├─ Button: "Schedule Appointment"
  └─ Opens: Schedule Dialog

Database State:
  appointment.status = CONSULTATION_REQUEST_SUBMITTED
  appointment.consultation_request_status = APPROVED


STEP 2: FRONTDESK CHECKS DOCTOR AVAILABILITY
═════════════════════════════════════════════

Frontend: Schedule Dialog
  ├─ Doctor dropdown (loads available doctors)
  ├─ Date picker
  └─ Triggers: GET /api/doctors/:id/slots?date=2025-01-26

Backend API Route: GET /api/doctors/:id/slots
  ├─ Authentication: Verify frontdesk role
  ├─ Fetch: Doctor's availability (working days, breaks)
  ├─ Fetch: Existing appointments for that date
  ├─ Calculate: Available slots
  └─ Return: [{startTime: "09:00", endTime: "09:30"}, ...]

Database Queries:
  ├─ SELECT * FROM working_day WHERE doctor_id = ?
  ├─ SELECT * FROM availability_break WHERE doctor_id = ?
  ├─ SELECT * FROM appointment WHERE doctor_id = ? AND date = ?
  ├─ SELECT * FROM slot_configuration WHERE doctor_id = ?
  └─ SELECT * FROM availability_override WHERE doctor_id = ?

Frontend: Slot Display
  ├─ Grid/Calendar showing: [09:00] [09:30] [10:00] ...
  └─ User selects: 09:30


STEP 3: FRONTDESK SUBMITS APPOINTMENT BOOKING
══════════════════════════════════════════════

Frontend: POST /api/appointments
  {
    "patientId": "pat_123",
    "doctorId": "doc_456",
    "appointmentDate": "2025-01-26",
    "time": "09:30",
    "type": "SURGICAL_CONSULTATION",
    "note": "Pre-op assessment"
  }

Backend API Route: POST /api/appointments
  1. Authenticate request (verify frontdesk role)
  2. Validate: All required fields present
  3. Validate: Patient exists
  4. Resolve: Patient ID from user ID if needed
  5. Call: ScheduleAppointmentUseCase.execute()


STEP 4: APPOINTMENT CREATION & VALIDATION
═════════════════════════════════════════

ScheduleAppointmentUseCase (90 lines of business logic)
  1. Validate: Doctor ID provided ✓
  2. Validate: Patient exists ✓
  3. Validate: Appointment date not in past ✓
  4. Validate: Time slot is available
     └─ Call: ValidateAppointmentAvailabilityUseCase
        ├─ Get slot configuration (30 min default)
        ├─ Check working days
        ├─ Check breaks
        ├─ Check existing appointments
        └─ Return: {isAvailable: true, reason: null}
  5. Create: Appointment domain entity
  6. Save: Within transaction (prevents race conditions)
     └─ Database: INSERT appointment
        {
          status: PENDING_DOCTOR_CONFIRMATION,  ← NEW STATUS
          doctor_id: doc_456,
          patient_id: pat_123,
          appointment_date: 2025-01-26,
          time: 09:30,
          type: SURGICAL_CONSULTATION,
          consultation_request_status: APPROVED
        }
  7. Notify: Send emails
     ├─ To Patient: "Your appointment is pending doctor confirmation"
     └─ To Doctor: "You have a new pending appointment confirmation"
  8. Audit: Log the action
  9. Return: AppointmentResponseDto with new status


STEP 5: APPOINTMENT SHOWS IN DOCTOR'S PENDING CONFIRMATIONS
═══════════════════════════════════════════════════════════

Doctor Portal: /doctor/appointments (NEEDS UI)
  └─ Section: Pending Confirmations (2)
     ├─ Patient: John Doe
     │  Date/Time: Jan 26, 09:30 AM
     │  Type: Surgical Consultation
     │  [CONFIRM] [REJECT]
     │
     └─ Patient: Jane Smith
        Date/Time: Jan 26, 02:00 PM
        Type: Post-op Assessment
        [CONFIRM] [REJECT]

Database State:
  appointment.status = PENDING_DOCTOR_CONFIRMATION
  appointment.consultation_request_status = APPROVED


STEP 6: DOCTOR REVIEWS & CONFIRMS APPOINTMENT
═════════════════════════════════════════════

Frontend: Doctor clicks [CONFIRM]
  └─ Call: POST /api/appointments/:id/confirm
     {
       "action": "confirm",
       "notes": "Confirmed - block my time"
     }

Backend API Route: POST /api/appointments/:id/confirm
  1. Authenticate: Verify doctor role
  2. Validate: Appointment ID valid
  3. Validate: Action is 'confirm' or 'reject'
  4. Call: ConfirmAppointmentUseCase.execute()

ConfirmAppointmentUseCase
  1. Load: Appointment from database
  2. Validate: Status is PENDING_DOCTOR_CONFIRMATION
  3. Load: Patient for notifications
  4. If rejecting: Validate rejection reason provided
  5. Determine: New status
     ├─ If confirm → SCHEDULED (time slot locked)
     └─ If reject → CANCELLED (time slot freed)
  6. Update: Appointment status
  7. Save: To database
  8. Notify:
     ├─ If confirm → Patient: "Your appointment is confirmed!"
     └─ If reject → Patient: "Your appointment was cancelled"
  9. Audit: Log doctor's action
  10. Return: Updated AppointmentResponseDto


STEP 7: APPOINTMENT NOW LOCKED (CONFIRMED)
═════════════════════════════════════════

Frontend: Patient's Appointment View
  └─ Status: SCHEDULED (green checkmark)
     Date: Jan 26, 09:30 AM
     Doctor: Dr. Smith
     Type: Surgical Consultation

Database State:
  appointment.status = SCHEDULED  ← LOCKED
  Time slot 09:30-10:00 is now unavailable for other patients

Frontend: Frontdesk Dashboard
  └─ Appointment appears in: Today's/Upcoming view
     Ready for: Check-in on appointment day

Frontend: Doctor's Confirmed Appointments
  └─ Appointment shows in: Confirmed list
     Ready for: Consultation execution


STEP 8: APPOINTMENT DAY - CHECK-IN
═════════════════════════════════

Frontdesk: /frontdesk/appointments
  ├─ Filter by: Today's date
  ├─ Show: All PENDING (waiting to check in) appointments
  ├─ Patient arrives
  ├─ Click: [CHECK IN] button
  └─ Call: POST /api/appointments/:id/check-in
     Updates: appointment.status = CHECKED_IN

Time Slot Becomes: UNAVAILABLE
  Doctor: Cannot book another appointment 09:30-10:00 on Jan 26


STEP 9: CONSULTATION & COMPLETION
═════════════════════════════════

Doctor Portal: /doctor/consultations
  ├─ Shows: CHECKED_IN appointments
  ├─ Click: [START CONSULTATION]
  └─ Leads to: Consultation record/notes

After consultation:
  ├─ Doctor: [MARK COMPLETE]
  └─ Status: COMPLETED

Database:
  appointment.status = COMPLETED
  Time slot: Becomes available for historical reporting
```

---

## PART 5: CURRENT ISSUES & GAPS

### 5.1 Critical Issues

| Issue | Current State | Impact | Severity |
|-------|---------------|--------|----------|
| **Appointment Status on Creation** | Creates as `PENDING` | Should be `PENDING_DOCTOR_CONFIRMATION` when frontdesk schedules | **CRITICAL** |
| **No Doctor Confirmation UI** | No component exists | Doctors can't see/confirm pending appointments | **CRITICAL** |
| **Time Slot Picker Missing** | Basic calendar select | Frontdesk can't see available slots when scheduling | **HIGH** |
| **Consultation → Appointment Flow** | Manual, disconnected | Frontdesk must manually create appointment after approving consultation | **HIGH** |
| **Doctor Notification on Schedule** | No notification sent | Doctor doesn't know about pending appointment | **HIGH** |

### 5.2 Integration Gaps

**Gap 1: AvailableDoctorsPanel is Display-Only**
```
Current:
  AvailableDoctorsPanel
  ├─ Shows doctor info
  ├─ Shows working hours
  └─ No action buttons

Should Be:
  AvailableDoctorsPanel
  ├─ Shows doctor info
  ├─ Shows working hours
  ├─ [View Schedule] button
  ├─ [Schedule Appointment] button
  └─ Links to: Slot picker dialog
```

**Gap 2: Schedule Dialog Doesn't Show Slots**
```
Current:
  Schedule Dialog
  ├─ Doctor (select)
  ├─ Date (select)
  ├─ Time (text input or simple picker)
  └─ No validation of available slots

Should Be:
  Schedule Dialog
  ├─ Doctor (select) ← Triggers GET /api/doctors/:id/slots
  ├─ Date (calendar) ← Updates available slots
  ├─ Time Slots (grid showing available slots)
  │   [09:00] [09:30] [10:00] [10:30] ...
  │   (grayed out if unavailable)
  └─ [Schedule] button
```

**Gap 3: Consultation Status → Appointment Workflow Unclear**
```
Current Workflow:
  1. Patient submits consultation inquiry
  2. Frontdesk reviews (approve/reject)
  3. If approved, frontdesk must MANUALLY create appointment
  4. Patient doesn't see clear connection

Should Be:
  1. Patient submits consultation inquiry
  2. Frontdesk reviews (approve/reject)
  3. If approved, show: [Schedule Appointment] button
  4. Click button → Opens schedule dialog (pre-filled with patient/doctor)
  5. Frontdesk selects date/time from available slots
  6. [Confirm] → Appointment created
  7. Patient sees: "Consultation approved! Appointment scheduled for [date/time]"
```

### 5.3 UI/UX Issues

| Component | Issue | Impact |
|-----------|-------|--------|
| AvailableDoctorsPanel | Display-only, no action | Frontdesk can't quickly book from dashboard |
| Schedule Dialog | No real-time slot validation | May book unavailable times |
| Consultation Page | No integrated scheduling | Frontdesk must navigate elsewhere |
| Doctor Dashboard | No pending confirmations section | Doctors don't see what needs confirmation |
| Patient View | No distinction between PENDING vs SCHEDULED | Confusing status messages |

---

## PART 6: RECOMMENDED IMPLEMENTATION ROADMAP

### Phase 1: Fix Appointment Status (URGENT - 2 hours)

```typescript
// File: application/use-cases/ScheduleAppointmentUseCase.ts (Line 145)

// CURRENT:
const appointment = ApplicationAppointmentMapper.fromScheduleDto(
  dto,
  AppointmentStatus.PENDING,  // ← WRONG
  0,
);

// SHOULD BE:
const appointment = ApplicationAppointmentMapper.fromScheduleDto(
  dto,
  AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,  // ← CORRECT
  0,
);
```

**Why This Matters:**
- Prevents double-booking issues
- Ensures doctor explicitly confirms before time is locked
- Clear workflow for all stakeholders
- Matches clinical process (doctor must approve)

### Phase 2: Enhance Schedule Dialog (4-6 hours)

**Location:** Create new component: `components/frontdesk/ScheduleAppointmentDialog.tsx`

**Features:**
1. Doctor selector (dropdown with search)
2. Date picker (calendar)
3. Real-time slot loading (GET /api/doctors/:id/slots)
4. Time slot grid display
5. Appointment type selector
6. Notes field
7. Validation before submission

**Integration Points:**
- Use in: ReviewConsultationDialog
- Use in: Standalone scheduling page
- API: POST /api/appointments

### Phase 3: Create Doctor Pending Confirmations Component (3-4 hours)

**Location:** Create: `components/doctor/PendingAppointmentsList.tsx`

**Features:**
1. List of PENDING_DOCTOR_CONFIRMATION appointments
2. Filter/sort options
3. Quick confirm/reject buttons
4. Rejection reason dialog
5. Success notifications

**Integration Points:**
- Add to: Doctor dashboard
- Create route: /doctor/appointments/pending
- API: POST /api/appointments/:id/confirm

### Phase 4: Update Patient Appointment View (2-3 hours)

**Location:** Update: `components/patient/AppointmentCard.tsx` and detail view

**Features:**
1. Show appointment status clearly
2. If PENDING_DOCTOR_CONFIRMATION: "Awaiting doctor confirmation"
3. If SCHEDULED: "Confirmed - Ready to go"
4. If CANCELLED: "Cancelled - [reason if rejected]"
5. Timeline of status changes

### Phase 5: Create Unified Scheduling Workflow (3-4 hours)

**Location:** New page: `/app/frontdesk/schedule-appointment/page.tsx`

**Features:**
1. Full appointment scheduling workflow
2. Consultation → Appointment transition
3. Doctor availability integration
4. Confirmation summary
5. Error handling and validation

---

## PART 7: TECHNICAL IMPLEMENTATION DETAILS

### 7.1 Updated ScheduleAppointmentUseCase

```typescript
// application/use-cases/ScheduleAppointmentUseCase.ts

async execute(dto: ScheduleAppointmentDto, userId: string): Promise<AppointmentResponseDto> {
  // ... existing validation steps ...
  
  // Step 3: Create appointment domain entity
  const appointment = ApplicationAppointmentMapper.fromScheduleDto(
    dto,
    AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,  // ← CHANGED
    0,
  );

  // ... existing save steps ...
  
  // Step 9: SEND DOCTOR NOTIFICATION (NEW)
  // Doctor needs to know about pending confirmation
  const doctor = await this.doctorRepository.findById(dto.doctorId);
  if (doctor?.email) {
    await this.notificationService.sendEmail(
      doctor.email,
      'Appointment Pending Your Confirmation',
      `Patient ${patient.firstName} ${patient.lastName} has a pending appointment on ${dto.appointmentDate} at ${dto.time}. Please confirm or reject within 24 hours.`
    );
  }
  
  // ... rest of implementation ...
}
```

### 7.2 Enhanced ReviewConsultationDialog

```typescript
// components/frontdesk/ReviewConsultationDialog.tsx

// Add "Schedule" action alongside approve/reject
{action === 'approve' && (
  <Button onClick={() => setShowScheduleDialog(true)}>
    Schedule Appointment
  </Button>
)}

// Embedded or separate schedule dialog
{showScheduleDialog && (
  <ScheduleAppointmentDialog
    consultationId={selectedAppointment.id}
    patientId={selectedAppointment.patientId}
    doctorId={selectedAppointment.doctorId}
    onSuccess={() => {
      setShowScheduleDialog(false);
      handleReviewSuccess();
    }}
  />
)}
```

### 7.3 New Schedule Appointment Dialog

```typescript
// components/frontdesk/ScheduleAppointmentDialog.tsx

export function ScheduleAppointmentDialog({
  patientId,
  doctorId,
  consultationId,
  onSuccess
}: ScheduleAppointmentDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch available slots when date or doctor changes
  useEffect(() => {
    if (!doctorId || !selectedDate) return;
    
    const fetchSlots = async () => {
      setLoading(true);
      const response = await apiClient.get(
        `/doctors/${doctorId}/slots?date=${selectedDate.toISOString().split('T')[0]}`
      );
      setSlots(response.data || []);
      setLoading(false);
    };
    
    fetchSlots();
  }, [doctorId, selectedDate]);

  const handleSchedule = async () => {
    // Validate selections
    if (!doctorId || !selectedSlot) {
      toast.error('Please select doctor and time slot');
      return;
    }

    // Call appointment API
    const response = await frontdeskApi.scheduleAppointment({
      patientId,
      doctorId,
      appointmentDate: selectedDate,
      time: selectedSlot,
      type: 'SURGICAL_CONSULTATION'
    });

    if (response.success) {
      toast.success('Appointment scheduled! Doctor will confirm within 24 hours.');
      onSuccess();
    }
  };

  return (
    <Dialog>
      <DialogHeader>Schedule Appointment</DialogHeader>
      <DialogContent>
        {/* Doctor selector */}
        <Select value={doctorId}>
          <SelectTrigger>
            <SelectValue placeholder="Select Doctor" />
          </SelectTrigger>
          <SelectContent>
            {doctors.map(doc => (
              <SelectItem key={doc.id} value={doc.id}>
                {doc.name} - {doc.specialization}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date picker */}
        <Calendar
          selected={selectedDate}
          onSelect={setSelectedDate}
        />

        {/* Available slots */}
        {slots.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {slots.map(slot => (
              <Button
                key={slot.startTime}
                variant={selectedSlot === slot.startTime ? 'default' : 'outline'}
                onClick={() => setSelectedSlot(slot.startTime)}
              >
                {slot.startTime}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No available slots on this date</p>
        )}

        <Button onClick={handleSchedule} disabled={loading}>
          Schedule Appointment
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

### 7.4 Doctor Pending Confirmations Component

```typescript
// components/doctor/PendingAppointmentsList.tsx

export function PendingAppointmentsList() {
  const [appointments, setAppointments] = useState<AppointmentResponseDto[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [action, setAction] = useState<'confirm' | 'reject' | null>(null);

  useEffect(() => {
    // Fetch pending appointments
    const fetchPending = async () => {
      const response = await doctorApi.getPendingAppointments();
      setAppointments(response.data || []);
    };
    fetchPending();
  }, []);

  const handleConfirm = async (appointmentId: number) => {
    const response = await doctorApi.confirmAppointment(appointmentId, 'confirm');
    if (response.success) {
      toast.success('Appointment confirmed!');
      // Remove from pending list
      setAppointments(prev => prev.filter(a => a.id !== appointmentId));
    }
  };

  const handleReject = async (appointmentId: number, reason: string) => {
    const response = await doctorApi.confirmAppointment(appointmentId, 'reject', {
      rejectionReason: reason
    });
    if (response.success) {
      toast.success('Appointment rejected. Patient has been notified.');
      setAppointments(prev => prev.filter(a => a.id !== appointmentId));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Confirmations ({appointments.length})</CardTitle>
        <CardDescription>
          Appointments awaiting your confirmation
        </CardDescription>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <p className="text-muted-foreground">No pending appointments</p>
        ) : (
          <div className="space-y-4">
            {appointments.map(apt => (
              <div key={apt.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{apt.patientId}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(apt.appointmentDate), 'MMM dd, yyyy')} at {apt.time}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(apt.id)}
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedId(apt.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## PART 8: TESTING & VALIDATION CHECKLIST

### Pre-Implementation Testing

- [ ] Doctor sets availability for next week (Monday-Friday 09:00-17:00)
- [ ] Verify availability saved correctly in database
- [ ] Test slot generation: 30-min appointments with 15-min buffer
- [ ] Verify GET /api/doctors/:id/slots returns correct slots

### Integration Testing

- [ ] Frontdesk views AvailableDoctorsPanel, sees all doctors
- [ ] Frontdesk clicks doctor → can view that doctor's schedule
- [ ] Frontdesk selects date → loads available slots
- [ ] Frontdesk selects time slot → books appointment
- [ ] Appointment created with PENDING_DOCTOR_CONFIRMATION status
- [ ] Doctor sees notification email: "New appointment pending confirmation"
- [ ] Doctor views dashboard → sees pending confirmations
- [ ] Doctor confirms appointment → status changes to SCHEDULED
- [ ] Patient sees notification: "Appointment confirmed!"
- [ ] Another frontdesk attempt to book same slot → prevented (slot now locked)

### End-to-End Workflow

```
Timeline: Monday 9:00 AM
──────────────────────

9:00 AM - Frontdesk reviews consultation request (Patient: John, Doctor: Smith)
  ├─ Click: [Schedule]
  ├─ Opens: Schedule dialog
  └─ Status: CONSULTATION_REQUEST_APPROVED

9:05 AM - Frontdesk schedules appointment
  ├─ Select: Dr. Smith
  ├─ Select: Tuesday 2:00 PM
  ├─ Select: Available slot [14:00-14:30]
  ├─ Click: [Schedule]
  └─ Status: PENDING_DOCTOR_CONFIRMATION created

9:10 AM - Doctor receives email
  ├─ Subject: "Appointment Pending Your Confirmation"
  ├─ Details: Patient John Doe, Tuesday 2:00 PM, Surgical Consultation
  └─ CTA: [Confirm] or [Reject]

9:15 AM - Patient receives email
  ├─ Subject: "Your Appointment is Pending Doctor Confirmation"
  ├─ Details: Scheduled for Tuesday 2:00 PM with Dr. Smith
  └─ Status: "Awaiting doctor confirmation"

9:30 AM - Doctor logs in
  ├─ Opens: Doctor dashboard
  ├─ Sees: Pending Confirmations (1)
  ├─ Reviews: John Doe appointment details
  ├─ Click: [Confirm]
  └─ Status: SCHEDULED (time slot locked)

9:35 AM - Patient receives notification
  ├─ Subject: "Your Appointment is Confirmed!"
  ├─ Details: Tuesday 2:00 PM with Dr. Smith confirmed
  └─ Status: SCHEDULED (green checkmark)

Tuesday 1:55 PM - Patient arrives
  ├─ Frontdesk: Sees John Doe in pending check-ins
  ├─ Click: [Check In]
  └─ Status: CHECKED_IN

Tuesday 2:00 PM - Doctor starts consultation
  ├─ Opens: Consultation record
  ├─ Status: CHECKED_IN
  └─ Records: Consultation notes

Tuesday 2:45 PM - Consultation completes
  ├─ Click: [Mark Complete]
  └─ Status: COMPLETED
```

---

## PART 9: SUMMARY & NEXT STEPS

### Current State
- ✅ Doctor availability system: Fully implemented backend, partial UI
- ✅ Appointment availability checking: Fully implemented
- ⚠️ Appointment creation: Correct flow but wrong status (PENDING vs PENDING_DOCTOR_CONFIRMATION)
- ❌ Doctor confirmation UI: No components exist
- ❌ Integrated scheduling: Missing time slot picker in dialogs

### Critical Path (Must Fix First)
1. **FIX:** Change appointment status from PENDING → PENDING_DOCTOR_CONFIRMATION in ScheduleAppointmentUseCase
2. **ADD:** Doctor notification when appointment is scheduled (send email to doctor)
3. **CREATE:** PendingAppointmentsList component for doctor dashboard
4. **ENHANCE:** ScheduleAppointmentDialog with real-time slot loading

### Full Implementation Roadmap
1. Phase 1: Fix status + doctor notifications (2 hours)
2. Phase 2: Enhanced schedule dialog with slot picker (4 hours)
3. Phase 3: Doctor pending confirmations UI (3 hours)
4. Phase 4: Patient appointment status display (2 hours)
5. Phase 5: Unified consultation → appointment workflow (3 hours)

### Key Files to Modify
- `application/use-cases/ScheduleAppointmentUseCase.ts` - Change status
- `components/frontdesk/ReviewConsultationDialog.tsx` - Add schedule action
- `components/frontdesk/ScheduleAppointmentDialog.tsx` - New enhanced dialog
- `components/doctor/PendingAppointmentsList.tsx` - New pending list
- `components/patient/AppointmentCard.tsx` - Update status display
- `app/doctor/appointments/page.tsx` - Add pending section

### Success Criteria
✅ Frontdesk can book appointments with real-time availability validation
✅ Doctor receives notification and must confirm appointment
✅ Time slot is locked only after doctor confirmation
✅ Patient sees clear appointment status throughout journey
✅ Complete audit trail of all actions
✅ Zero double-booking issues

