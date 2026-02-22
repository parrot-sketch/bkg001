# Reschedule Availability Check Fix

## Problem

When rescheduling an appointment, the system was showing available slots, but when selecting a slot, it would say "slot is not available". This was because the availability validation was checking for conflicts with **all** appointments, including the appointment being rescheduled itself.

## Root Cause

The `ValidateAppointmentAvailabilityUseCase` was checking for conflicts with all appointments on the target date, but it wasn't excluding the appointment being rescheduled. So when you tried to reschedule an appointment:

1. System shows available slots (correctly generated)
2. User selects a slot
3. System checks for conflicts → Finds the appointment being rescheduled → Reports conflict ❌

## Solution

Added an optional `excludeAppointmentId` parameter to `ValidateAvailabilityDto` that allows excluding a specific appointment from the conflict check. This is used when rescheduling to exclude the appointment being moved.

### Changes Made

1. **`ValidateAppointmentAvailabilityUseCase.ts`**
   - Added `excludeAppointmentId?: number` to `ValidateAvailabilityDto`
   - Updated filter logic to exclude the appointment if `excludeAppointmentId` is provided

2. **`RescheduleAppointmentUseCase.ts`**
   - Now passes `excludeAppointmentId: appointment.getId()` when checking availability
   - This ensures the appointment being rescheduled doesn't conflict with itself

## Code Changes

### Before:
```typescript
const availabilityResult = await this.validateAvailabilityUseCase.execute({
    doctorId: appointment.getDoctorId(),
    date: newDate,
    time: dto.newTime,
    duration: duration
});
```

### After:
```typescript
const availabilityResult = await this.validateAvailabilityUseCase.execute({
    doctorId: appointment.getDoctorId(),
    date: newDate,
    time: dto.newTime,
    duration: duration,
    excludeAppointmentId: appointment.getId() // ✅ Exclude self from conflict check
});
```

## Testing

### Test Scenario:
1. Create an appointment for Doctor A at 9:00 AM on 2024-02-20
2. Try to reschedule it to 10:00 AM on the same date
3. **Before fix**: ❌ "Slot is not available" (conflict with itself)
4. **After fix**: ✅ Slot is available, reschedule succeeds

### Edge Cases:
- ✅ Rescheduling to same time on same date (should work - no conflict with self)
- ✅ Rescheduling to different date (should work - no conflict with self)
- ✅ Rescheduling when another appointment exists at target time (should fail correctly)
- ✅ Rescheduling when target time is free (should succeed)

## Impact

- **No breaking changes**: The `excludeAppointmentId` parameter is optional
- **Backward compatible**: Existing calls to `validateAvailabilityUseCase.execute()` still work
- **Only affects rescheduling**: New appointments still check all conflicts correctly

---

**Status**: ✅ **Fixed**

The reschedule feature now correctly excludes the appointment being rescheduled from conflict checks, allowing doctors to reschedule appointments without false "slot not available" errors.
