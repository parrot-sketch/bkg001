# Frontdesk Booking Doctor Confirmation Hardening

## Problem

When frontdesk users book appointments with available doctors, the appointments were being created with `SCHEDULED` status directly, **skipping the doctor confirmation step**. This meant:
- Doctors couldn't review appointments before they were finalized
- Doctors couldn't cancel or reschedule appointments before confirmation
- The workflow bypassed an important quality control step

## Solution

**Changed the status mapping** so that `FRONTDESK_SCHEDULED` appointments now require doctor confirmation, just like `PATIENT_REQUESTED` appointments.

---

## Changes Made

### 1. **Status Mapping Update** (`domain/enums/AppointmentStatus.ts`)

**Before:**
```typescript
export function getDefaultStatusForSource(source: string): AppointmentStatus {
  switch (source) {
    case 'PATIENT_REQUESTED':
      return AppointmentStatus.PENDING_DOCTOR_CONFIRMATION;
    case 'FRONTDESK_SCHEDULED':
    case 'ADMIN_SCHEDULED':
    case 'DOCTOR_FOLLOW_UP':
      return AppointmentStatus.SCHEDULED; // ❌ Auto-scheduled, no confirmation needed
    default:
      return AppointmentStatus.PENDING_DOCTOR_CONFIRMATION;
  }
}
```

**After:**
```typescript
export function getDefaultStatusForSource(source: string): AppointmentStatus {
  switch (source) {
    case 'PATIENT_REQUESTED':
    case 'FRONTDESK_SCHEDULED':  // ✅ Now requires confirmation
    case 'ADMIN_SCHEDULED':      // ✅ Now requires confirmation
      return AppointmentStatus.PENDING_DOCTOR_CONFIRMATION;
    case 'DOCTOR_FOLLOW_UP':
      return AppointmentStatus.SCHEDULED; // Only doctor's own follow-ups are auto-confirmed
    default:
      return AppointmentStatus.PENDING_DOCTOR_CONFIRMATION;
  }
}
```

**Rationale:**
- **All appointments require doctor confirmation** except when the doctor schedules their own follow-up
- This ensures doctors have control over their schedule
- Prevents double-booking and scheduling conflicts
- Maintains quality control

---

### 2. **Notification Update** (`application/use-cases/ScheduleAppointmentUseCase.ts`)

**Before:**
- Notification only mentioned "patient-requested" appointments
- Generic message didn't indicate who scheduled it

**After:**
- Notification now includes source information:
  - "Frontdesk has scheduled..."
  - "Admin has scheduled..."
  - "Patient has requested..."
- More context for doctors to understand who created the appointment

---

## Workflow After Changes

### Frontdesk Books Appointment

1. **Frontdesk creates appointment** → Status: `PENDING_DOCTOR_CONFIRMATION`
2. **Doctor receives notification** → "Frontdesk has scheduled an appointment for [Patient] on [Date] at [Time]. Please confirm, cancel, or reschedule."
3. **Doctor reviews appointment** → Can see patient details, time, date
4. **Doctor takes action:**
   - **Confirm** → Status: `SCHEDULED` → Appointment is finalized
   - **Reject** → Status: `CANCELLED` → Slot is freed, patient notified
   - **Reschedule** → New time/date proposed → Status remains `PENDING_DOCTOR_CONFIRMATION` until confirmed

---

## API Endpoints

### 1. **Confirm/Reject Appointment**
```
POST /api/appointments/[id]/confirm
```

**Request Body:**
```json
{
  "action": "confirm" | "reject",
  "notes": "Optional confirmation notes",
  "rejectionReason": "Required if action is 'reject'"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* AppointmentResponseDto */ },
  "message": "Appointment confirmed successfully"
}
```

**Status Transitions:**
- `confirm`: `PENDING_DOCTOR_CONFIRMATION` → `SCHEDULED`
- `reject`: `PENDING_DOCTOR_CONFIRMATION` → `CANCELLED`

---

### 2. **Reschedule Appointment**
```
POST /api/appointments/[id]/reschedule
```

**Request Body:**
```json
{
  "newDate": "2024-02-20",
  "newTime": "14:30",
  "reason": "Optional reason for rescheduling"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* AppointmentResponseDto */ },
  "message": "Appointment rescheduled successfully"
}
```

**Status:**
- Remains `PENDING_DOCTOR_CONFIRMATION` after reschedule
- Doctor must confirm the new time

---

## Status Flow

```
┌─────────────────────────────────────┐
│ Frontdesk Books Appointment        │
│ Source: FRONTDESK_SCHEDULED         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Status: PENDING_DOCTOR_CONFIRMATION │
│ Doctor receives notification        │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
┌──────────────┐  ┌──────────────┐
│   CONFIRM    │  │    REJECT    │
│              │  │              │
│ Status:      │  │ Status:       │
│ SCHEDULED    │  │ CANCELLED    │
└──────────────┘  └──────────────┘
       │
       ▼
┌──────────────┐
│ RESCHEDULE   │
│              │
│ New time     │
│ proposed     │
│              │
│ Status:      │
│ PENDING_...  │
│ (still)      │
└──────────────┘
```

---

## Benefits

### ✅ **Doctor Control**
- Doctors can review all appointments before they're finalized
- Prevents scheduling conflicts
- Allows doctors to manage their availability

### ✅ **Quality Control**
- Doctors can reject inappropriate appointments
- Doctors can reschedule if time doesn't work
- Reduces no-shows and cancellations

### ✅ **Better Communication**
- Doctors are notified immediately when appointments are created
- Clear notification messages indicate who scheduled the appointment
- Patient is notified when doctor confirms or rejects

### ✅ **Consistent Workflow**
- All appointments (except doctor's own follow-ups) follow the same confirmation process
- Unified experience for doctors
- Predictable status transitions

---

## Testing Checklist

- [x] Frontdesk booking creates `PENDING_DOCTOR_CONFIRMATION` status
- [x] Doctor receives notification when frontdesk books
- [x] Doctor can confirm appointment → Status becomes `SCHEDULED`
- [x] Doctor can reject appointment → Status becomes `CANCELLED`
- [x] Doctor can reschedule appointment → New time proposed, status remains `PENDING_DOCTOR_CONFIRMATION`
- [x] Patient is notified when doctor confirms
- [x] Patient is notified when doctor rejects
- [x] Frontdesk can see appointment status changes
- [x] Check-in is blocked until doctor confirms (status must be `SCHEDULED`)

---

## Migration Notes

### Existing Appointments
- **No migration needed** - existing `SCHEDULED` appointments remain valid
- Only **new** appointments created after this change will require confirmation

### Breaking Changes
- **Frontdesk UI** may need to show "Awaiting Doctor Confirmation" status
- **Doctor Dashboard** should show pending appointments requiring confirmation
- **Check-in workflow** already blocks check-in for non-`SCHEDULED` appointments (no change needed)

---

## Related Files

1. **`domain/enums/AppointmentStatus.ts`** - Status mapping logic
2. **`application/use-cases/ScheduleAppointmentUseCase.ts`** - Appointment creation and notifications
3. **`application/use-cases/ConfirmAppointmentUseCase.ts`** - Doctor confirmation/rejection
4. **`application/use-cases/RescheduleAppointmentUseCase.ts`** - Appointment rescheduling
5. **`app/api/appointments/[id]/confirm/route.ts`** - Confirm/reject API endpoint
6. **`app/api/appointments/[id]/reschedule/route.ts`** - Reschedule API endpoint

---

## Status Summary

| Source | Old Status | New Status | Requires Confirmation |
|--------|-----------|------------|----------------------|
| `PATIENT_REQUESTED` | `PENDING_DOCTOR_CONFIRMATION` | `PENDING_DOCTOR_CONFIRMATION` | ✅ Yes |
| `FRONTDESK_SCHEDULED` | `SCHEDULED` ❌ | `PENDING_DOCTOR_CONFIRMATION` ✅ | ✅ Yes |
| `ADMIN_SCHEDULED` | `SCHEDULED` ❌ | `PENDING_DOCTOR_CONFIRMATION` ✅ | ✅ Yes |
| `DOCTOR_FOLLOW_UP` | `SCHEDULED` | `SCHEDULED` | ❌ No (doctor's own) |

---

**Status**: ✅ **Complete and Hardened**

The workflow now ensures all appointments (except doctor's own follow-ups) require doctor confirmation before being finalized.
