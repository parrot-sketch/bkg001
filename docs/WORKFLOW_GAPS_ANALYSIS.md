# Workflow Gaps Analysis

**Date:** 2026-02-05  
**Scope:** Frontdesk Dashboard → Quick Book → Consultation Interface

---

## Complete Workflow Trace

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. FRONTDESK DASHBOARD                                                       │
│    → AvailableDoctorsPanel shows doctors                                     │
│    → "Quick Book" button triggers QuickBookingDialog                         │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. QUICK BOOKING DIALOG                                                      │
│    → Select patient (PatientCombobox)                                        │
│    → Select time slot                                                        │
│    → Select appointment type                                                 │
│    → frontdeskApi.scheduleAppointment() → POST /api/appointments             │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. APPOINTMENT CREATION (ScheduleAppointmentUseCase)                         │
│    → Creates with status: PENDING  ⚠️ GAP: Should be PENDING_DOCTOR_CONFIRM  │
│    → No doctor notification triggered ⚠️ GAP                                 │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ (Expected: Doctor confirms)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. DAY OF APPOINTMENT - CHECK-IN                                             │
│    → FrontdeskAppointmentCard shows "Check In" button                        │
│    → canCheckIn() allows: PENDING, PENDING_DOCTOR_CONFIRMATION,              │
│      SCHEDULED, CONFIRMED                                                    │
│    → POST /api/appointments/:id/checkin → status: CHECKED_IN                 │
│    ✅ This step works correctly                                              │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. DOCTOR DASHBOARD                                                          │
│    → useDoctorTodayAppointments fetches SCHEDULED, CONFIRMED,                │
│      CHECKED_IN, READY_FOR_CONSULTATION, IN_CONSULTATION                     │
│    → WaitingQueue shows CHECKED_IN patients                                  │
│    → "Start" button → StartConsultationDialog                                │
│    ✅ This step works correctly                                              │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 6. START CONSULTATION                                                        │
│    → POST /api/appointments/:id/start-consultation                           │
│    → Validates: CHECKED_IN or READY_FOR_CONSULTATION required                │
│    → Creates/updates Consultation record                                     │
│    → Transitions to IN_CONSULTATION                                          │
│    ⚠️ GAP: Uses new PrismaClient() instead of singleton                      │
│    ⚠️ GAP: Doctor name mapping uses firstName/lastName but model has name    │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 7. CONSULTATION INTERFACE                                                    │
│    → /doctor/consultations/[appointmentId]/session/page.tsx                  │
│    ⚠️ GAP: Optimized version (page-optimized.tsx) NOT ACTIVE                 │
│    ⚠️ GAP: ConsultationQueuePanel added but context not integrated           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Critical Gaps Found

### GAP 1: Wrong Initial Status (CRITICAL)

**Location:** `ScheduleAppointmentUseCase.ts` line 158-162

**Problem:**
```typescript
const appointment = ApplicationAppointmentMapper.fromScheduleDto(
  dto,
  AppointmentStatus.PENDING,  // ← This should be PENDING_DOCTOR_CONFIRMATION
  0,
);
```

**Expected Workflow:**
- Frontdesk books → `PENDING_DOCTOR_CONFIRMATION`
- Doctor confirms → `CONFIRMED`
- Day of → Check-in → `CHECKED_IN`

**Current Behavior:**
- Frontdesk books → `PENDING` (No doctor notification)
- Doctor never sees it to confirm
- Patient shows up, can still check in (canCheckIn allows PENDING)

**Fix Required:** Change status to `PENDING_DOCTOR_CONFIRMATION` and trigger doctor notification.

---

### GAP 2: Optimized Page Not Active (HIGH)

**Location:** `app/doctor/consultations/[appointmentId]/session/`

**Problem:**
- `page.tsx` - Original complex page (586+ lines) still active
- `page-optimized.tsx` - New architecture with context/lazy loading NOT USED

**Impact:**
- Performance optimizations not applied
- ConsultationContext not being used
- Queue panel integration incomplete

**Fix Required:** Replace `page.tsx` with `page-optimized.tsx` content.

---

### GAP 3: PrismaClient Instantiation Bug (HIGH)

**Location:** `app/api/appointments/[id]/start-consultation/route.ts` line 6

**Problem:**
```typescript
const prisma = new PrismaClient();  // ← Creates new instance on every import
```

**Impact:**
- Connection pool exhaustion under load
- Memory leaks
- Potential database connection limits exceeded

**Fix Required:** Use singleton from `@/lib/db`:
```typescript
import db from '@/lib/db';
```

---

### GAP 4: Doctor Name Field Mismatch (MEDIUM)

**Location:** `app/api/appointments/[id]/start-consultation/route.ts` lines 171-172

**Problem:**
```typescript
doctor: {
  name: `${updatedAppointment.doctor.firstName} ${updatedAppointment.doctor.lastName}`,
}
```

**Reality:** The `Doctor` model has a single `name` field, not `firstName`/`lastName`.

**Fix Required:**
```typescript
name: updatedAppointment.doctor.name,
```

---

### GAP 5: Doctor Confirmation Flow Missing (MEDIUM)

**Location:** Workflow between booking and check-in

**Problem:**
- No clear path for doctor to see pending bookings
- No notification sent when frontdesk books
- `ConfirmAppointmentDialog` exists but not surfaced in doctor workflow

**Current Doctor Dashboard:**
- Shows `SCHEDULED`, `CONFIRMED`, `CHECKED_IN`, etc.
- Does NOT show `PENDING_DOCTOR_CONFIRMATION` in main queue

**Fix Required:** 
1. Add "Pending Confirmations" section to doctor dashboard
2. Trigger notification on booking
3. Surface confirmation action

---

## Fixes Applied

### ✅ FIX 1: Initial Status Changed (CRITICAL)
- **File:** `ScheduleAppointmentUseCase.ts`
- **Change:** `PENDING` → `PENDING_DOCTOR_CONFIRMATION`
- **Result:** Frontdesk bookings now require doctor confirmation

### ✅ FIX 2: Optimized Page Activated (HIGH)
- **File:** `app/doctor/consultations/[appointmentId]/session/`
- **Change:** Swapped `page.tsx` with `page-optimized.tsx`
- **Result:** New architecture with Context, lazy loading, queue panel active

### ✅ FIX 3: PrismaClient Bug Fixed (HIGH)
- **File:** `app/api/appointments/[id]/start-consultation/route.ts`
- **Change:** `new PrismaClient()` → `import db from '@/lib/db'`
- **Result:** Using singleton, no connection pool issues

### ✅ FIX 4: Doctor Name Field Fixed (MEDIUM)
- **File:** `app/api/appointments/[id]/start-consultation/route.ts`
- **Change:** `firstName + lastName` → `name`
- **Result:** Correct field mapping for Doctor model

### ✅ FIX 5: Doctor Notification Enhanced (LOW)
- **File:** `ScheduleAppointmentUseCase.ts`
- **Change:** Updated notification type to `action_required` with actionable message
- **Result:** Doctor sees "Please confirm or reschedule" with link to appointment

---

## Testing Checklist

After fixes, verify:

- [ ] Frontdesk Quick Book creates `PENDING_DOCTOR_CONFIRMATION`
- [ ] Doctor receives notification
- [ ] Doctor can confirm/reject from dashboard
- [ ] Confirmed appointments can be checked in
- [ ] Checked-in patients appear in doctor queue
- [ ] Starting consultation works without error
- [ ] Consultation interface shows queue panel
- [ ] Notes auto-save works
- [ ] Complete consultation transitions correctly
