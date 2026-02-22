# Check-In, Queue Management, and Consultation Room Integration

## Overview

This document describes the comprehensive integration of:
1. **Check-In System** - Frontdesk checks in patients
2. **Queue Management** - Ordered list of checked-in patients waiting for consultation
3. **Consultation Room** - Active consultation session with time tracking
4. **Slot Duration Integration** - Consultation time linked to appointment slot duration

## Workflow

### 1. Booking → Confirmation → Check-In Flow

```
Frontdesk Books Appointment
  ↓
Status: PENDING_DOCTOR_CONFIRMATION
  ↓
Doctor Confirms
  ↓
Status: SCHEDULED
  ↓
Patient Arrives (Day of Appointment)
  ↓
Frontdesk Checks In Patient
  ↓
Status: CHECKED_IN
  ↓
Patient Enters Queue (Ordered by check-in time)
```

### 2. Queue Management System

**Queue Order (Priority):**
1. **IN_CONSULTATION** - Currently active consultations (highest priority)
2. **CHECKED_IN** - Patients checked in, waiting (ordered by `checked_in_at` time)
3. **READY_FOR_CONSULTATION** - Optional: Nurse prep completed
4. **SCHEDULED** - Confirmed but not yet checked in

**Queue Visibility:**
- **Frontdesk**: Sees all appointments with status indicators
- **Doctor**: Sees queue in `/doctor/appointments` page, sorted by priority
- **Queue API**: `/api/appointments?status=CHECKED_IN&doctorId=...` returns ordered list

### 3. Consultation Room Integration

**Starting Consultation:**
```
Doctor clicks "Start Consultation" on checked-in patient
  ↓
POST /api/appointments/[id]/start-consultation
  ↓
Status: IN_CONSULTATION
  ↓
consultation_started_at: NOW
consultation_duration: slot_duration (from appointment)
  ↓
Patient removed from queue (now in active consultation)
```

**Consultation Time Tracking:**
- **Duration Source**: `appointment.duration_minutes` OR `appointment.slot_duration` OR default 30 minutes
- **Start Time**: `appointment.consultation_started_at`
- **End Time**: Calculated as `consultation_started_at + consultation_duration`
- **Remaining Time**: Displayed in consultation room UI

**What Happens When Duration Expires:**
1. **Warning (5 minutes before)**: UI shows warning banner
2. **At Expiration**: 
   - System doesn't auto-end (doctor controls completion)
   - UI shows "Time exceeded" indicator
   - Next patient in queue can be notified (optional)
3. **Doctor Completes**: 
   - Status: COMPLETED
   - `consultation_ended_at`: NOW
   - Actual duration calculated: `consultation_ended_at - consultation_started_at`
   - Next patient in queue becomes available

### 4. Slot Duration Integration

**Database Fields:**
- `appointment.duration_minutes` - Explicit duration set during booking
- `appointment.slot_duration` - Duration from slot configuration (30 min default)
- `appointment.consultation_duration` - Duration used for consultation (set when consultation starts)

**Priority Order:**
1. `duration_minutes` (if set during booking)
2. `slot_duration` (from doctor's slot configuration)
3. Default: 30 minutes

**Usage:**
- **Booking**: Uses slot configuration to set `slot_duration`
- **Consultation Start**: Sets `consultation_duration` based on priority above
- **Time Tracking**: Uses `consultation_duration` for countdown
- **Completion**: Calculates actual duration for billing/records

## API Endpoints

### Check-In
```
POST /api/appointments/:id/check-in
POST /api/appointments/:id/checkin (alias)

Body: { notes?: string }
Response: { success: true, data: AppointmentResponseDto }

Requirements:
- Role: FRONTDESK or ADMIN
- Status: SCHEDULED or CONFIRMED
- Result: Status → CHECKED_IN, patient enters queue
```

### Start Consultation
```
POST /api/appointments/:id/start-consultation

Body: { doctorId?: string }
Response: { success: true, data: AppointmentResponseDto }

Requirements:
- Role: DOCTOR
- Status: CHECKED_IN or READY_FOR_CONSULTATION
- Result: 
  - Status → IN_CONSULTATION
  - consultation_started_at: NOW
  - consultation_duration: slot_duration
```

### Get Queue
```
GET /api/appointments?status=CHECKED_IN&doctorId=...

Response: { success: true, data: AppointmentResponseDto[] }

Order: By checked_in_at (FIFO)
```

## Status Transitions

```
PENDING_DOCTOR_CONFIRMATION
  ↓ (doctor confirms)
SCHEDULED
  ↓ (frontdesk checks in)
CHECKED_IN ← Queue Entry Point
  ↓ (doctor starts consultation)
IN_CONSULTATION ← Active Consultation
  ↓ (doctor completes)
COMPLETED
```

## Integration Points

### 1. Check-In → Queue
- **Trigger**: `CheckInPatientUseCase.execute()`
- **Action**: Status → `CHECKED_IN`, sets `checked_in_at`
- **Queue Impact**: Patient appears in doctor's queue (sorted by `checked_in_at`)

### 2. Queue → Consultation Room
- **Trigger**: Doctor clicks "Start Consultation"
- **Action**: Status → `IN_CONSULTATION`, sets `consultation_started_at` and `consultation_duration`
- **Queue Impact**: Patient removed from waiting queue, enters active consultation

### 3. Consultation Room → Duration Tracking
- **Source**: `appointment.consultation_duration` (set from slot duration)
- **Start**: `appointment.consultation_started_at`
- **UI**: Real-time countdown in consultation room
- **Expiration**: Warning at 5 min, indicator at 0 min (no auto-end)

### 4. Consultation Completion → Next Patient
- **Trigger**: `CompleteConsultationUseCase.execute()`
- **Action**: Status → `COMPLETED`, sets `consultation_ended_at`
- **Queue Impact**: Next patient in queue becomes available for consultation

## UI Components

### Frontdesk
- **Check-In Dialog**: `components/frontdesk/CheckInDialog.tsx`
- **Today's Schedule**: `components/frontdesk/TodaysSchedule.tsx`
- **Queue View**: Shows checked-in patients grouped by status

### Doctor
- **Appointments Page**: `app/doctor/appointments/page.tsx`
- **Queue Display**: Sorted by priority (IN_CONSULTATION → CHECKED_IN → SCHEDULED)
- **Consultation Room**: `app/doctor/consultations/[id]/session/page.tsx`
- **Time Tracker**: Shows remaining time based on `consultation_duration`

## Database Schema

```prisma
model Appointment {
  // Status tracking
  status                    AppointmentStatus
  
  // Check-in tracking
  checked_in_at             DateTime?
  checked_in_by             String?
  late_arrival              Boolean?
  late_by_minutes           Int?
  
  // Consultation tracking
  consultation_started_at   DateTime?
  consultation_ended_at     DateTime?
  consultation_duration     Int?  // Duration in minutes (from slot)
  
  // Slot duration
  slot_duration             Int?  // From slot configuration
  duration_minutes          Int?  // Explicit duration set during booking
}
```

## Key Business Rules

1. **Check-In Requirements:**
   - Appointment must be `SCHEDULED` or `CONFIRMED` (doctor must have confirmed)
   - Only `FRONTDESK` or `ADMIN` can check in patients
   - Check-in sets `checked_in_at` timestamp for queue ordering

2. **Queue Ordering:**
   - Active consultations first (IN_CONSULTATION)
   - Then checked-in patients (CHECKED_IN), ordered by `checked_in_at` (FIFO)
   - Then scheduled patients (SCHEDULED), ordered by appointment time

3. **Consultation Duration:**
   - Uses `duration_minutes` if set, else `slot_duration`, else 30 min default
   - Set when consultation starts (`consultation_duration`)
   - Used for time tracking in consultation room
   - Actual duration calculated on completion

4. **Time Expiration:**
   - System warns at 5 minutes remaining
   - System shows "Time exceeded" at 0 minutes
   - **No auto-end**: Doctor must manually complete consultation
   - Next patient can be notified when current consultation exceeds duration

## Testing Checklist

- [x] Check-in route works (`/check-in` and `/checkin`)
- [x] Check-in requires doctor confirmation
- [x] Check-in adds patient to queue
- [x] Queue shows checked-in patients in correct order
- [x] Consultation start uses slot duration
- [x] Consultation room tracks time correctly
- [x] Time expiration shows warnings
- [x] Completion removes patient from queue
- [x] Next patient becomes available after completion

---

**Status**: ✅ **Integrated**

All components are now properly integrated:
- Check-in → Queue → Consultation Room → Duration Tracking → Completion → Next Patient
