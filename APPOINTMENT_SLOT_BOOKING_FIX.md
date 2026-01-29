# Appointment Slot Booking - Critical Bug Fixes

## Date: January 24, 2026

## Problem Summary
Patients were unable to book available appointment slots. The system would display available slots, but when attempting to book, would return the error: **"Time slot is already booked by another patient"** - even for slots that should be available.

---

## Root Causes Identified

### 1. **Time Format Mismatch (CRITICAL)**
**Location**: `components/patient/BookAppointmentDialog.tsx` line 179

**Problem**:
- Frontend was converting time from 24-hour format (HH:mm) to 12-hour format (h:mm a)
- Slots API returns: `"09:00"`, `"14:30"` (24-hour format)
- Frontend was sending: `"9:00 AM"`, `"2:30 PM"` (12-hour format)
- Database stores: `"09:00"`, `"14:30"` (24-hour format)
- Validation logic expects: 24-hour format

**Impact**: Time comparison always failed because `"9:00 AM" !== "09:00"`

**Fix**: Use the slot time directly without format conversion
```typescript
// BEFORE (BROKEN)
const timeStr = format(appointmentDate, 'h:mm a'); // "9:00 AM"

// AFTER (FIXED)
const timeStr = formData.selectedSlot; // "09:00"
```

---

### 2. **Appointment Status Filtering - Enum Mismatch**
**Locations**: 
- `application/use-cases/ValidateAppointmentAvailabilityUseCase.ts`
- `application/use-cases/GetAvailableSlotsForDateUseCase.ts`
- `application/use-cases/ScheduleAppointmentUseCase.ts`
- `domain/services/AvailabilityService.ts`

**Problem**:
- Domain enum defined: `PENDING, CONFIRMED, SCHEDULED, CANCELLED, COMPLETED, NO_SHOW`
- Prisma schema only has: `PENDING, SCHEDULED, CANCELLED, COMPLETED`
- Code was trying to exclude non-existent statuses (`NO_SHOW`, `CONFIRMED`)

**Impact**: Filtering logic failed, causing incorrect slot availability calculations

**Fix**: Only exclude statuses that exist in the database
```typescript
// BEFORE (BROKEN)
const excludedStatuses = [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW];

// AFTER (FIXED)
const excludedStatuses = ['CANCELLED', 'COMPLETED'];
```

---

### 3. **Working Day ID Preservation Issue**
**Location**: `infrastructure/database/repositories/PrismaAvailabilityRepository.ts`

**Problem**:
- `saveWorkingDays()` was deleting and recreating working days
- This changed the working day IDs
- Schedule sessions still referenced old IDs (orphaned)
- Slot generation couldn't find sessions: `sessions.filter((s) => s.workingDayId === workingDay.id)` returned empty

**Impact**: No slots generated even when working days and sessions existed

**Fix**: Update existing working days instead of delete/recreate
```typescript
// BEFORE (BROKEN)
await this.prisma.workingDay.deleteMany({ where: { doctor_id: doctorId } });
await this.prisma.workingDay.createMany({ data: workingDays });

// AFTER (FIXED)
for (const wd of workingDays) {
  const existing = existingMap.get(wd.day);
  if (existing) {
    await this.prisma.workingDay.update({
      where: { id: existing.id },
      data: { /* updates */ }
    });
  } else {
    await this.prisma.workingDay.create({ /* new */ });
  }
}
```

---

### 4. **Schedule Manager - Days with Sessions Not Saved**
**Location**: `components/doctor/EnhancedScheduleManager.tsx`

**Problem**:
- When saving schedule, only days with `isAvailable: true` checkbox were saved
- Days with sessions but unchecked checkbox were filtered out
- Result: Sessions created but working day not marked as available

**Impact**: Slots not generated for days with sessions

**Fix**: Auto-enable days that have sessions
```typescript
// BEFORE (BROKEN)
workingDays: workingDays.filter(wd => wd.isAvailable),

// AFTER (FIXED)
const activeDays = workingDays
  .filter(wd => wd.isAvailable || (wd.sessions && wd.sessions.length > 0))
  .map(wd => ({
    ...wd,
    isAvailable: wd.isAvailable || (wd.sessions && wd.sessions.length > 0),
  }));
```

---

### 5. **Orphaned Sessions Cleanup**
**Location**: `application/use-cases/SetDoctorAvailabilityUseCase.ts`

**Problem**:
- Previous bug (issue #3) left orphaned sessions in database
- These sessions referenced non-existent working day IDs

**Impact**: Corrupted data preventing slot generation

**Fix**: Clean up orphaned sessions before saving schedule
```typescript
// Delete orphaned sessions
await this.prisma.$executeRaw`
  DELETE FROM "ScheduleSession" 
  WHERE working_day_id NOT IN (SELECT id FROM "WorkingDay")
`;
```

---

### 6. **Date Range Calculation Issue**
**Location**: `components/patient/BookAppointmentDialog.tsx`

**Problem**:
- `dateRangeStart` was calculated as `startOfMonth(today)`
- If today is not the 1st of the month, this results in a past date
- API validation rejects past dates

**Impact**: "Start date cannot be in the past" error

**Fix**: Use today as start date
```typescript
// BEFORE (BROKEN)
const dateRangeStart = startOfMonth(today);

// AFTER (FIXED)
const dateRangeStart = today;
```

---

## Testing Performed

### Comprehensive Seed Data Created
- 5 Doctors with full schedules (Monday-Saturday)
- Multiple sessions per day (Clinic, Consultations, Ward Rounds, Surgery)
- Slot configurations (30-min appointments, 5-min buffer, 15-min intervals)
- Schedule blocks (leave, surgery)
- Availability overrides (extended hours)
- 47 Appointments with diverse statuses:
  - PENDING (future, unconfirmed)
  - SCHEDULED (confirmed)
  - COMPLETED (past, should NOT block slots)
  - CANCELLED (should NOT block slots)

### Test Appointments for Validation
Tomorrow's schedule for Dr. Mukami Gathariki:
- ✅ 09:00 - COMPLETED (should NOT block slot)
- ✅ 09:30 - CANCELLED (should NOT block slot)
- ❌ 10:00 - SCHEDULED (SHOULD block slot)
- ❌ 10:30 - PENDING (SHOULD block slot)

**Expected Behavior**:
- Patients can book 09:00 and 09:30 (previously completed/cancelled)
- Patients cannot book 10:00 and 10:30 (active appointments)

---

## Files Modified

1. `components/patient/BookAppointmentDialog.tsx` - Fixed time format
2. `application/use-cases/ValidateAppointmentAvailabilityUseCase.ts` - Fixed status filtering
3. `application/use-cases/GetAvailableSlotsForDateUseCase.ts` - Fixed status filtering
4. `application/use-cases/ScheduleAppointmentUseCase.ts` - Fixed status filtering
5. `domain/services/AvailabilityService.ts` - Fixed status filtering, improved time parsing
6. `infrastructure/database/repositories/PrismaAvailabilityRepository.ts` - Preserve working day IDs
7. `components/doctor/EnhancedScheduleManager.tsx` - Auto-enable days with sessions
8. `application/use-cases/SetDoctorAvailabilityUseCase.ts` - Clean up orphaned sessions
9. `prisma/seed.ts` - Comprehensive test data

---

## Verification Steps

1. **Run the seed**: `npm run db:seed`
2. **Login as patient**: test.patient@test.com / patient123
3. **Book appointment**:
   - Select Dr. Mukami Gathariki
   - Select tomorrow's date
   - Verify slots 09:00 and 09:30 are available
   - Verify slots 10:00 and 10:30 are NOT available
   - Successfully book 09:00 or 09:30
4. **Verify booking**: Check appointment appears in patient's appointments list

---

## Key Learnings

1. **Always use consistent time formats** across frontend, backend, and database
2. **Validate enum values** match between domain models and database schema
3. **Preserve database IDs** when updating records with foreign key relationships
4. **Add comprehensive logging** for complex validation logic
5. **Create realistic test data** that covers edge cases (different statuses, times, dates)

---

## Status: ✅ RESOLVED

All identified issues have been fixed and tested with comprehensive seed data.
