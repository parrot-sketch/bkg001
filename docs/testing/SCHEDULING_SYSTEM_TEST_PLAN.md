# Scheduling System - Comprehensive Test Plan

## Overview

This test plan ensures the scheduling subsystem is production-ready for healthcare use. Tests are designed to prevent real-world incidents, not just achieve coverage metrics.

**Test Framework**: Vitest  
**Test Style**: Given/When/Then (implicit in structure)  
**Focus**: Production incident prevention

---

## Test Structure

```
tests/
├── unit/
│   ├── domain/
│   │   └── services/
│   │       └── AvailabilityService.test.ts          # NEW
│   └── application/
│       ├── use-cases/
│       │   ├── GetAvailableSlotsForDateUseCase.test.ts    # NEW
│       │   ├── AddScheduleBlockUseCase.test.ts             # NEW
│       │   ├── SetDoctorAvailabilityUseCase.test.ts       # NEW
│       │   ├── RemoveScheduleBlockUseCase.test.ts          # NEW
│       │   └── GetAvailabilityForRangeUseCase.test.ts      # NEW
│       └── validators/
│           └── ScheduleValidationHelpers.test.ts          # NEW
├── integration/
│   └── scheduling/
│       ├── backward-compatibility.test.ts           # NEW
│       ├── multiple-sessions.test.ts                # NEW
│       ├── block-override-interactions.test.ts      # NEW
│       └── layered-resolution.test.ts               # NEW
└── e2e/
    └── scheduling/
        ├── booking-flow-with-blocks.test.ts         # NEW
        └── schedule-management-flow.test.ts         # NEW
```

---

## 1. Unit Tests: AvailabilityService

**File**: `tests/unit/domain/services/AvailabilityService.test.ts`

### Test Suite: Layered Resolution Priority

#### Test 1.1: Block Takes Highest Priority (Full Day)
**Given**: 
- Doctor has weekly schedule: Monday 09:00-17:00
- Block exists: 2026-02-14 (full day, LEAVE)
- Date to check: 2026-02-14 (Monday)

**When**: `getAvailableSlots()` is called

**Then**: 
- Returns empty array `[]`
- Block prevents all slots, even though it's a working day

**Assertions**:
- `result.length === 0`
- No slots generated despite working day

---

#### Test 1.2: Block Takes Highest Priority (Partial Day)
**Given**:
- Doctor has weekly schedule: Monday 09:00-17:00
- Block exists: 2026-02-14, 13:00-15:00 (SURGERY)
- Date to check: 2026-02-14 (Monday)

**When**: `getAvailableSlots()` is called

**Then**:
- Returns slots: 09:00-13:00, 15:00-17:00
- Blocked time (13:00-15:00) excluded

**Assertions**:
- `result.length > 0`
- No slots between 13:00-15:00
- Slots before 13:00 and after 15:00 present

---

#### Test 1.3: Override Replaces Weekly Schedule
**Given**:
- Doctor has weekly schedule: Monday 09:00-17:00
- Override exists: 2026-02-14, custom hours 12:00-16:00
- Date to check: 2026-02-14 (Monday)

**When**: `getAvailableSlots()` is called

**Then**:
- Returns slots: 12:00-16:00 (override hours)
- Weekly schedule (09:00-17:00) ignored

**Assertions**:
- All slots within 12:00-16:00 range
- No slots before 12:00 or after 16:00

---

#### Test 1.4: Override Blocks Date
**Given**:
- Doctor has weekly schedule: Monday 09:00-17:00
- Override exists: 2026-02-14, `isBlocked: true`
- Date to check: 2026-02-14 (Monday)

**When**: `getAvailableSlots()` is called

**Then**:
- Returns empty array `[]`
- Override blocks entire day

**Assertions**:
- `result.length === 0`

---

#### Test 1.5: Sessions Used When No Override
**Given**:
- Doctor has weekly schedule: Monday 09:00-17:00
- Sessions exist: Monday [08:00-11:00 (Clinic), 14:00-17:00 (Consultations)]
- No overrides for 2026-02-14
- Date to check: 2026-02-14 (Monday)

**When**: `getAvailableSlots()` is called

**Then**:
- Returns slots for both sessions: 08:00-11:00, 14:00-17:00
- Weekly schedule (09:00-17:00) ignored

**Assertions**:
- Slots in 08:00-11:00 range
- Slots in 14:00-17:00 range
- No slots between 11:00-14:00

---

#### Test 1.6: Backward Compatibility (No Sessions)
**Given**:
- Doctor has weekly schedule: Monday 09:00-17:00
- No sessions exist for Monday
- No overrides
- Date to check: 2026-02-14 (Monday)

**When**: `getAvailableSlots()` is called

**Then**:
- Returns slots: 09:00-17:00 (from `start_time`/`end_time`)
- System falls back to weekly schedule

**Assertions**:
- All slots within 09:00-17:00 range
- Backward compatibility maintained

---

#### Test 1.7: Breaks Applied Within Sessions
**Given**:
- Doctor has weekly schedule: Monday 09:00-17:00
- Sessions exist: Monday 09:00-17:00
- Break exists: Monday 12:00-13:00 (Lunch)
- Date to check: 2026-02-14 (Monday)

**When**: `getAvailableSlots()` is called

**Then**:
- Returns slots: 09:00-12:00, 13:00-17:00
- Break time (12:00-13:00) excluded

**Assertions**:
- No slots between 12:00-13:00
- Slots before and after break present

---

#### Test 1.8: Appointments Exclude Slots
**Given**:
- Doctor has weekly schedule: Monday 09:00-17:00
- Sessions exist: Monday 09:00-17:00
- Existing appointment: 2026-02-14, 10:00-10:30
- Date to check: 2026-02-14 (Monday)

**When**: `getAvailableSlots()` is called

**Then**:
- Slot at 10:00-10:30 marked as unavailable
- Other slots remain available

**Assertions**:
- Slot at 10:00 has `isAvailable: false` or is filtered out
- Other slots have `isAvailable: true`

---

#### Test 1.9: Multiple Sessions Per Day
**Given**:
- Doctor has weekly schedule: Monday 09:00-17:00
- Sessions exist: Monday [08:00-11:00, 14:00-17:00]
- Date to check: 2026-02-14 (Monday)

**When**: `getAvailableSlots()` is called

**Then**:
- Returns slots for both sessions
- Gap between sessions (11:00-14:00) has no slots

**Assertions**:
- Slots in 08:00-11:00 range
- Slots in 14:00-17:00 range
- No slots between 11:00-14:00

---

#### Test 1.10: Block Overrides Override
**Given**:
- Doctor has weekly schedule: Monday 09:00-17:00
- Override exists: 2026-02-14, custom hours 12:00-16:00
- Block exists: 2026-02-14, 13:00-15:00 (SURGERY)
- Date to check: 2026-02-14 (Monday)

**When**: `getAvailableSlots()` is called

**Then**:
- Returns slots: 12:00-13:00, 15:00-16:00
- Block (13:00-15:00) takes precedence over override

**Assertions**:
- No slots between 13:00-15:00
- Slots before and after block present

---

### Test Suite: Edge Cases

#### Test 1.11: Empty Schedule (No Working Days)
**Given**:
- Doctor has no working days configured
- Date to check: 2026-02-14

**When**: `getAvailableSlots()` is called

**Then**:
- Returns empty array `[]`

**Assertions**:
- `result.length === 0`

---

#### Test 1.12: Non-Working Day
**Given**:
- Doctor has weekly schedule: Monday-Friday 09:00-17:00
- Date to check: 2026-02-15 (Saturday)

**When**: `getAvailableSlots()` is called

**Then**:
- Returns empty array `[]`

**Assertions**:
- `result.length === 0`

---

#### Test 1.13: Slot Configuration (Duration, Interval, Buffer)
**Given**:
- Doctor has weekly schedule: Monday 09:00-17:00
- Slot config: duration=30min, interval=15min, buffer=5min
- Date to check: 2026-02-14 (Monday)

**When**: `getAvailableSlots()` is called

**Then**:
- Slots generated every 15 minutes
- Each slot is 30 minutes duration
- Buffer time respected between slots

**Assertions**:
- Slot times: 09:00, 09:15, 09:30, ...
- Each slot duration is 30 minutes

---

#### Test 1.14: Midnight-Crossing Session (If Supported)
**Given**:
- Doctor has weekly schedule: Monday 22:00-02:00 (next day)
- Date to check: 2026-02-14 (Monday)

**When**: `getAvailableSlots()` is called

**Then**:
- Handles midnight crossing correctly
- Slots generated: 22:00-23:59, 00:00-02:00

**Assertions**:
- Slots don't wrap incorrectly
- Date boundaries respected

**Note**: This test may not be applicable if system doesn't support midnight-crossing sessions.

---

#### Test 1.15: Timezone/DST Boundaries
**Given**:
- Doctor has weekly schedule: Monday 09:00-17:00
- Date to check: 2026-03-13 (DST transition day in some timezones)

**When**: `getAvailableSlots()` is called

**Then**:
- Slots generated correctly despite DST transition
- No duplicate or missing slots

**Assertions**:
- Slot count consistent with normal day
- All slots within 09:00-17:00 range

---

### Test Suite: isSlotAvailable()

#### Test 1.16: Slot Available (No Conflicts)
**Given**:
- Doctor has weekly schedule: Monday 09:00-17:00
- Date: 2026-02-14 (Monday)
- Time: 10:00
- Duration: 30 minutes

**When**: `isSlotAvailable()` is called

**Then**:
- Returns `true`

**Assertions**:
- `result.isAvailable === true`

---

#### Test 1.17: Slot Unavailable (Blocked)
**Given**:
- Doctor has weekly schedule: Monday 09:00-17:00
- Block exists: 2026-02-14, 10:00-11:00
- Date: 2026-02-14 (Monday)
- Time: 10:00
- Duration: 30 minutes

**When**: `isSlotAvailable()` is called

**Then**:
- Returns `false`
- Reason indicates block

**Assertions**:
- `result.isAvailable === false`
- `result.reason` mentions block

---

#### Test 1.18: Slot Unavailable (Existing Appointment)
**Given**:
- Doctor has weekly schedule: Monday 09:00-17:00
- Existing appointment: 2026-02-14, 10:00-10:30
- Date: 2026-02-14 (Monday)
- Time: 10:00
- Duration: 30 minutes

**When**: `isSlotAvailable()` is called

**Then**:
- Returns `false`
- Reason indicates appointment conflict

**Assertions**:
- `result.isAvailable === false`
- `result.reason` mentions appointment

---

### Test Suite: getAvailabilityCalendar()

#### Test 1.19: Calendar View (30 Days)
**Given**:
- Doctor has weekly schedule: Monday-Friday 09:00-17:00
- Date range: 2026-02-01 to 2026-03-02 (30 days)

**When**: `getAvailabilityCalendar()` is called

**Then**:
- Returns array of 30 `AvailabilityCalendarDay` objects
- Each day has `hasAvailability: boolean`
- Working days have `hasAvailability: true`

**Assertions**:
- `result.length === 30`
- Weekdays (Mon-Fri) have `hasAvailability: true`
- Weekends have `hasAvailability: false`

---

#### Test 1.20: Calendar View with Blocks
**Given**:
- Doctor has weekly schedule: Monday-Friday 09:00-17:00
- Block exists: 2026-02-14 to 2026-02-16 (full day)
- Date range: 2026-02-01 to 2026-03-02

**When**: `getAvailabilityCalendar()` is called

**Then**:
- Days 2026-02-14, 2026-02-15, 2026-02-16 have `hasAvailability: false`
- Other weekdays have `hasAvailability: true`

**Assertions**:
- Blocked days marked as unavailable
- Other days unaffected

---

## 2. Unit Tests: GetAvailableSlotsForDateUseCase

**File**: `tests/unit/application/use-cases/GetAvailableSlotsForDateUseCase.test.ts`

### Test Suite: Basic Functionality

#### Test 2.1: Successfully Get Slots
**Given**:
- Doctor exists (ID: "doctor-1")
- Doctor has availability configured
- Date: 2026-02-14 (future date)
- Mock repositories return valid data

**When**: `execute({ doctorId: "doctor-1", date: "2026-02-14" })` is called

**Then**:
- Returns array of `AvailableSlotResponseDto[]`
- All slots have `isAvailable: true`
- Slots formatted as "HH:mm"

**Assertions**:
- `result.length > 0`
- All slots have valid time format
- Use case calls `AvailabilityService.getAvailableSlots()`

---

#### Test 2.2: Doctor Not Found
**Given**:
- Doctor does not exist (ID: "invalid-doctor")
- Mock Prisma returns `null`

**When**: `execute({ doctorId: "invalid-doctor", date: "2026-02-14" })` is called

**Then**:
- Throws `DomainException`
- Error message: "Doctor with ID invalid-doctor not found"

**Assertions**:
- `expect(() => useCase.execute(...)).rejects.toThrow(DomainException)`
- Error metadata includes `doctorId`

---

#### Test 2.3: Past Date Rejected
**Given**:
- Doctor exists
- Date: 2025-01-01 (past date)

**When**: `execute({ doctorId: "doctor-1", date: "2025-01-01" })` is called

**Then**:
- Throws `DomainException`
- Error message: "Cannot get slots for past dates"

**Assertions**:
- `expect(() => useCase.execute(...)).rejects.toThrow(DomainException)`

---

#### Test 2.4: No Availability Configured
**Given**:
- Doctor exists
- Doctor has no availability configured
- Mock repository returns `null`

**When**: `execute({ doctorId: "doctor-1", date: "2026-02-14" })` is called

**Then**:
- Returns empty array `[]`

**Assertions**:
- `result.length === 0`

---

#### Test 2.5: Custom Duration
**Given**:
- Doctor exists
- Doctor has availability configured
- Date: 2026-02-14
- Duration: 60 minutes (custom)

**When**: `execute({ doctorId: "doctor-1", date: "2026-02-14", duration: 60 })` is called

**Then**:
- Slots generated with 60-minute duration
- Slot config uses custom duration

**Assertions**:
- All slots have `duration: 60`

---

### Test Suite: Integration with AvailabilityService

#### Test 2.6: Delegates to AvailabilityService
**Given**:
- Doctor exists
- Mock `AvailabilityService.getAvailableSlots` returns predefined slots

**When**: `execute()` is called

**Then**:
- `AvailabilityService.getAvailableSlots()` is called with correct parameters
- Result is mapped to DTOs

**Assertions**:
- Verify service called with correct date, workingDays, sessions, overrides, blocks, breaks, appointments, slotConfig

---

## 3. Unit Tests: AddScheduleBlockUseCase

**File**: `tests/unit/application/use-cases/AddScheduleBlockUseCase.test.ts`

### Test Suite: Validation

#### Test 3.1: Successfully Create Full-Day Block
**Given**:
- Doctor exists (ID: "doctor-1")
- No existing blocks
- DTO: { doctorId: "doctor-1", startDate: "2026-02-14", endDate: "2026-02-14", blockType: "LEAVE" }

**When**: `execute(dto)` is called

**Then**:
- Block created successfully
- Returns `ScheduleBlockResponseDto`
- Repository `createBlock()` called

**Assertions**:
- `result.id` is defined
- `result.blockType === "LEAVE"`
- `result.startTime === undefined` (full day)

---

#### Test 3.2: Successfully Create Partial-Day Block
**Given**:
- Doctor exists
- No existing blocks
- DTO: { doctorId: "doctor-1", startDate: "2026-02-14", endDate: "2026-02-14", startTime: "10:00", endTime: "12:00", blockType: "SURGERY" }

**When**: `execute(dto)` is called

**Then**:
- Block created successfully
- Returns block with `startTime` and `endTime`

**Assertions**:
- `result.startTime === "10:00"`
- `result.endTime === "12:00"`

---

#### Test 3.3: Doctor Not Found
**Given**:
- Doctor does not exist
- Mock Prisma returns `null`

**When**: `execute(dto)` is called

**Then**:
- Throws `DomainException`
- Error message: "Doctor with ID ... not found"

**Assertions**:
- `expect(() => useCase.execute(...)).rejects.toThrow(DomainException)`

---

#### Test 3.4: Invalid Date Range
**Given**:
- Doctor exists
- DTO: { startDate: "2026-02-15", endDate: "2026-02-14" } (end before start)

**When**: `execute(dto)` is called

**Then**:
- Throws `DomainException`
- Error message: "Start date must be before or equal to end date"

**Assertions**:
- `expect(() => useCase.execute(...)).rejects.toThrow(DomainException)`

---

#### Test 3.5: Invalid Block Type
**Given**:
- Doctor exists
- DTO: { blockType: "INVALID_TYPE" }

**When**: `execute(dto)` is called

**Then**:
- Throws `DomainException`
- Error message lists valid block types

**Assertions**:
- Error message includes valid types: LEAVE, SURGERY, ADMIN, etc.

---

#### Test 3.6: Partial Block on Multi-Day Range
**Given**:
- Doctor exists
- DTO: { startDate: "2026-02-14", endDate: "2026-02-16", startTime: "10:00", endTime: "12:00" }

**When**: `execute(dto)` is called

**Then**:
- Throws `DomainException`
- Error message: "Custom hours can only be set for single-day blocks"

**Assertions**:
- `expect(() => useCase.execute(...)).rejects.toThrow(DomainException)`

---

#### Test 3.7: Invalid Time Format
**Given**:
- Doctor exists
- DTO: { startTime: "25:00", endTime: "12:00" }

**When**: `execute(dto)` is called

**Then**:
- Throws `DomainException`
- Error message: "Time must be in HH:mm format"

**Assertions**:
- `expect(() => useCase.execute(...)).rejects.toThrow(DomainException)`

---

#### Test 3.8: End Time Before Start Time
**Given**:
- Doctor exists
- DTO: { startTime: "12:00", endTime: "10:00" }

**When**: `execute(dto)` is called

**Then**:
- Throws `DomainException`
- Error message: "End time must be after start time"

**Assertions**:
- `expect(() => useCase.execute(...)).rejects.toThrow(DomainException)`

---

### Test Suite: Overlap Validation

#### Test 3.9: Full-Day Block Overlaps Full-Day Block
**Given**:
- Doctor exists
- Existing block: 2026-02-14 (full day, LEAVE)
- New block: 2026-02-14 (full day, SURGERY)

**When**: `execute()` is called

**Then**:
- Throws `DomainException`
- Error message: "Cannot create block: A full-day block already exists on overlapping dates"

**Assertions**:
- Error metadata includes existing block details

---

#### Test 3.10: Full-Day Block Prevents Partial Block
**Given**:
- Doctor exists
- Existing block: 2026-02-14 (full day, LEAVE)
- New block: 2026-02-14, 10:00-12:00 (SURGERY)

**When**: `execute()` is called

**Then**:
- Throws `DomainException`
- Error message: "Cannot create partial block: A full-day block already exists"

**Assertions**:
- Error metadata includes both blocks

---

#### Test 3.11: Partial Block Prevents Full-Day Block
**Given**:
- Doctor exists
- Existing block: 2026-02-14, 10:00-12:00 (SURGERY)
- New block: 2026-02-14 (full day, LEAVE)

**When**: `execute()` is called

**Then**:
- Throws `DomainException`
- Error message: "Cannot create full-day block: A partial block already exists"

**Assertions**:
- Error metadata includes both blocks

---

#### Test 3.12: Partial Blocks Overlap (Same Day)
**Given**:
- Doctor exists
- Existing block: 2026-02-14, 10:00-12:00 (SURGERY)
- New block: 2026-02-14, 11:00-13:00 (ADMIN)

**When**: `execute()` is called

**Then**:
- Throws `DomainException`
- Error message: "Cannot create block: Time range overlaps with existing block"

**Assertions**:
- Error metadata includes conflicting time ranges

---

#### Test 3.13: Partial Blocks Don't Overlap (Different Days)
**Given**:
- Doctor exists
- Existing block: 2026-02-14, 10:00-12:00 (SURGERY)
- New block: 2026-02-15, 10:00-12:00 (ADMIN)

**When**: `execute()` is called

**Then**:
- Block created successfully
- No overlap error

**Assertions**:
- `result.id` is defined
- Both blocks can coexist

---

#### Test 3.14: Multi-Day Partial Block Overlap
**Given**:
- Doctor exists
- Existing block: 2026-02-14, 10:00-12:00 (SURGERY)
- New block: 2026-02-13 to 2026-02-15, 11:00-13:00 (ADMIN)

**When**: `execute()` is called

**Then**:
- Throws `DomainException`
- Error message indicates overlap on 2026-02-14

**Assertions**:
- Error metadata includes `conflictingDate: "2026-02-14"`

---

## 4. Unit Tests: SetDoctorAvailabilityUseCase

**File**: `tests/unit/application/use-cases/SetDoctorAvailabilityUseCase.test.ts`

### Test Suite: Session Validation

#### Test 4.1: Successfully Set Availability with Sessions
**Given**:
- Doctor exists
- DTO: { workingDays: [{ day: "Monday", startTime: "09:00", endTime: "17:00", sessions: [{ startTime: "09:00", endTime: "12:00" }, { startTime: "14:00", endTime: "17:00" }] }] }

**When**: `execute(dto)` is called

**Then**:
- Availability saved successfully
- Sessions saved via repository
- Returns `DoctorAvailabilityResponseDto`

**Assertions**:
- Repository `saveSessionsForWorkingDay()` called
- Response includes sessions

---

#### Test 4.2: Overlapping Sessions Rejected
**Given**:
- Doctor exists
- DTO: { workingDays: [{ day: "Monday", sessions: [{ startTime: "09:00", endTime: "12:00" }, { startTime: "11:00", endTime: "14:00" }] }] }

**When**: `execute(dto)` is called

**Then**:
- Throws `DomainException`
- Error message: "Sessions overlap on Monday"

**Assertions**:
- Error metadata includes day and sessions

---

#### Test 4.3: Non-Overlapping Sessions Accepted
**Given**:
- Doctor exists
- DTO: { workingDays: [{ day: "Monday", sessions: [{ startTime: "09:00", endTime: "12:00" }, { startTime: "14:00", endTime: "17:00" }] }] }

**When**: `execute(dto)` is called

**Then**:
- Availability saved successfully
- Both sessions saved

**Assertions**:
- No errors thrown
- Both sessions in response

---

#### Test 4.4: Backward Compatibility (No Sessions)
**Given**:
- Doctor exists
- DTO: { workingDays: [{ day: "Monday", startTime: "09:00", endTime: "17:00" }] } (no sessions)

**When**: `execute(dto)` is called

**Then**:
- Availability saved successfully
- Uses `startTime`/`endTime` as fallback

**Assertions**:
- No errors thrown
- Working day saved with startTime/endTime

---

## 5. Integration Tests

**Directory**: `tests/integration/scheduling/`

### Test Suite: Backward Compatibility

**File**: `backward-compatibility.test.ts`

#### Test 5.1: Doctor with Only start_time/end_time
**Given**:
- Doctor exists in database
- Doctor has `WorkingDay` with `start_time: "09:00"`, `end_time: "17:00"` (no sessions)
- Date: 2026-02-14 (Monday)

**When**: 
- `GetAvailableSlotsForDateUseCase.execute()` is called

**Then**:
- Returns slots: 09:00-17:00
- System uses `start_time`/`end_time` as single session
- No errors thrown

**Assertions**:
- Slots generated correctly
- Backward compatibility maintained

---

### Test Suite: Multiple Sessions Per Day

**File**: `multiple-sessions.test.ts`

#### Test 5.2: Doctor with Multiple Sessions
**Given**:
- Doctor exists in database
- Doctor has `WorkingDay` with sessions: [08:00-11:00, 14:00-17:00]
- Date: 2026-02-14 (Monday)

**When**:
- `GetAvailableSlotsForDateUseCase.execute()` is called

**Then**:
- Returns slots for both sessions
- Gap between sessions (11:00-14:00) has no slots

**Assertions**:
- Slots in 08:00-11:00 range
- Slots in 14:00-17:00 range
- No slots between 11:00-14:00

---

### Test Suite: Block Override Interactions

**File**: `block-override-interactions.test.ts`

#### Test 5.3: Block Overrides Override
**Given**:
- Doctor exists in database
- Doctor has weekly schedule: Monday 09:00-17:00
- Override exists: 2026-02-14, custom hours 12:00-16:00
- Block exists: 2026-02-14, 13:00-15:00 (SURGERY)

**When**:
- `GetAvailableSlotsForDateUseCase.execute()` is called for 2026-02-14

**Then**:
- Returns slots: 12:00-13:00, 15:00-16:00
- Block takes precedence over override

**Assertions**:
- No slots between 13:00-15:00
- Override hours (12:00-16:00) respected except for block

---

#### Test 5.4: Override Replaces Weekly
**Given**:
- Doctor exists in database
- Doctor has weekly schedule: Monday 09:00-17:00
- Override exists: 2026-02-14, custom hours 12:00-16:00

**When**:
- `GetAvailableSlotsForDateUseCase.execute()` is called for 2026-02-14

**Then**:
- Returns slots: 12:00-16:00
- Weekly schedule ignored

**Assertions**:
- All slots within 12:00-16:00
- No slots outside override hours

---

#### Test 5.5: Full-Day Block Prevents Override
**Given**:
- Doctor exists in database
- Doctor has weekly schedule: Monday 09:00-17:00
- Override exists: 2026-02-14, custom hours 12:00-16:00
- Block exists: 2026-02-14 (full day, LEAVE)

**When**:
- `GetAvailableSlotsForDateUseCase.execute()` is called for 2026-02-14

**Then**:
- Returns empty array `[]`
- Block takes highest priority

**Assertions**:
- `result.length === 0`

---

### Test Suite: Layered Resolution

**File**: `layered-resolution.test.ts`

#### Test 5.6: Complete Layered Resolution
**Given**:
- Doctor exists in database
- Weekly schedule: Monday 09:00-17:00
- Sessions: Monday [08:00-11:00, 14:00-17:00]
- Override: 2026-02-14, custom hours 12:00-16:00
- Block: 2026-02-14, 13:00-15:00 (SURGERY)
- Break: Monday 12:00-13:00 (Lunch)
- Appointment: 2026-02-14, 12:30-13:00

**When**:
- `GetAvailableSlotsForDateUseCase.execute()` is called for 2026-02-14

**Then**:
- Returns slots: 12:00-12:30, 15:00-16:00
- Resolution order: Block > Override > Sessions > Breaks > Appointments

**Assertions**:
- Block (13:00-15:00) excluded
- Override (12:00-16:00) used instead of sessions
- Break (12:00-13:00) excluded
- Appointment (12:30-13:00) excluded
- Final slots: 12:00-12:30, 15:00-16:00

---

## 6. Edge Cases

### Test Suite: Timezone/DST

**File**: `tests/integration/scheduling/timezone-edge-cases.test.ts`

#### Test 6.1: DST Spring Forward
**Given**:
- Doctor has weekly schedule: Monday 09:00-17:00
- Date: 2026-03-13 (DST spring forward day in some timezones)

**When**:
- `GetAvailableSlotsForDateUseCase.execute()` is called

**Then**:
- Slots generated correctly
- No duplicate or missing slots
- Time handling consistent

**Assertions**:
- Slot count matches expected
- All slots within valid time range

---

#### Test 6.2: DST Fall Back
**Given**:
- Doctor has weekly schedule: Monday 09:00-17:00
- Date: 2026-11-06 (DST fall back day in some timezones)

**When**:
- `GetAvailableSlotsForDateUseCase.execute()` is called

**Then**:
- Slots generated correctly
- No duplicate or missing slots

**Assertions**:
- Slot count matches expected

---

### Test Suite: Large Date Ranges

**File**: `tests/integration/scheduling/large-date-ranges.test.ts`

#### Test 6.3: 90-Day Calendar View
**Given**:
- Doctor has weekly schedule: Monday-Friday 09:00-17:00
- Date range: 2026-02-01 to 2026-04-30 (90 days)

**When**:
- `GetAvailabilityForRangeUseCase.execute()` is called

**Then**:
- Returns 90 calendar day objects
- Performance acceptable (< 2 seconds)
- Memory usage reasonable

**Assertions**:
- `result.length === 90`
- Execution time < 2000ms
- No memory leaks

---

#### Test 6.4: Maximum Date Range (90 Days)
**Given**:
- Doctor has weekly schedule
- Date range: exactly 90 days

**When**:
- `GetAvailabilityForRangeUseCase.execute()` is called

**Then**:
- Request succeeds
- All days processed

**Assertions**:
- No errors thrown
- All days in range returned

---

#### Test 6.5: Date Range Exceeds Limit
**Given**:
- Doctor has weekly schedule
- Date range: 2026-02-01 to 2026-06-01 (120 days, exceeds 90-day limit)

**When**:
- `GetAvailabilityForRangeUseCase.execute()` is called

**Then**:
- Throws `DomainException`
- Error message: "Date range cannot exceed 90 days"

**Assertions**:
- `expect(() => useCase.execute(...)).rejects.toThrow(DomainException)`

---

### Test Suite: Empty Schedules

**File**: `tests/integration/scheduling/empty-schedules.test.ts`

#### Test 6.6: Doctor with No Schedule
**Given**:
- Doctor exists in database
- Doctor has no working days configured

**When**:
- `GetAvailableSlotsForDateUseCase.execute()` is called

**Then**:
- Returns empty array `[]`
- No errors thrown

**Assertions**:
- `result.length === 0`

---

#### Test 6.7: Doctor with Schedule But All Days Blocked
**Given**:
- Doctor has weekly schedule: Monday-Friday 09:00-17:00
- Block exists: 2026-02-14 to 2026-02-18 (all weekdays)

**When**:
- `GetAvailableSlotsForDateUseCase.execute()` is called for 2026-02-14

**Then**:
- Returns empty array `[]`
- Block prevents all slots

**Assertions**:
- `result.length === 0`

---

## 7. E2E Tests

**Directory**: `tests/e2e/scheduling/`

### Test Suite: Booking Flow with Blocks

**File**: `booking-flow-with-blocks.test.ts`

#### Test 7.1: Patient Books Appointment (Block Prevents Booking)
**Given**:
- Doctor has weekly schedule: Monday 09:00-17:00
- Block exists: 2026-02-14, 10:00-12:00 (SURGERY)
- Patient logged in
- Patient navigates to booking page

**When**:
- Patient selects doctor
- Patient selects date: 2026-02-14
- Patient tries to select time: 10:30

**Then**:
- Time slot 10:30 not available in UI
- Only available slots shown (09:00-10:00, 12:00-17:00)
- Block prevents booking

**Assertions**:
- UI shows correct available slots
- Blocked time not selectable

---

#### Test 7.2: Patient Books Appointment (Full-Day Block)
**Given**:
- Doctor has weekly schedule: Monday 09:00-17:00
- Block exists: 2026-02-14 (full day, LEAVE)
- Patient logged in

**When**:
- Patient selects doctor
- Patient selects date: 2026-02-14

**Then**:
- Date shows as unavailable in calendar
- No slots shown for that date
- User cannot book

**Assertions**:
- Calendar highlights date as unavailable
- No slots displayed

---

### Test Suite: Schedule Management Flow

**File**: `schedule-management-flow.test.ts`

#### Test 7.3: Doctor Sets Weekly Schedule with Sessions
**Given**:
- Doctor logged in
- Doctor navigates to availability settings

**When**:
- Doctor sets Monday schedule:
  - Session 1: 08:00-11:00 (Clinic)
  - Session 2: 14:00-17:00 (Consultations)
- Doctor saves schedule

**Then**:
- Schedule saved successfully
- Both sessions appear in availability view
- Slots generated for both sessions

**Assertions**:
- UI shows both sessions
- Slots available for both time ranges

---

#### Test 7.4: Doctor Creates Block
**Given**:
- Doctor logged in
- Doctor has weekly schedule configured

**When**:
- Doctor navigates to schedule management
- Doctor creates block: 2026-02-14, 10:00-12:00 (SURGERY)
- Doctor saves block

**Then**:
- Block created successfully
- Block appears in schedule view
- Slots for 2026-02-14 exclude 10:00-12:00

**Assertions**:
- Block visible in UI
- Slots updated correctly

---

#### Test 7.5: Doctor Creates Overlapping Block (Rejected)
**Given**:
- Doctor logged in
- Existing block: 2026-02-14, 10:00-12:00 (SURGERY)

**When**:
- Doctor tries to create block: 2026-02-14, 11:00-13:00 (ADMIN)
- Doctor saves block

**Then**:
- Error message displayed: "Time range overlaps with existing block"
- Block not created
- Existing block remains unchanged

**Assertions**:
- Error message clear and actionable
- No duplicate blocks created

---

## Test Execution Strategy

### Unit Tests
- **Run**: On every commit
- **Timeout**: 5 seconds per test
- **Isolation**: Each test is independent
- **Mocks**: All external dependencies mocked

### Integration Tests
- **Run**: On PR, before merge
- **Timeout**: 30 seconds per test
- **Database**: Use test database (cleaned between tests)
- **Isolation**: Each test cleans up after itself

### E2E Tests
- **Run**: Nightly, before production deployment
- **Timeout**: 60 seconds per test
- **Browser**: Headless Chrome
- **Environment**: Staging environment

---

## Coverage Goals

### Minimum Coverage
- **AvailabilityService**: 95%+ (critical domain logic)
- **Use Cases**: 90%+ (business rules)
- **Validators**: 100% (pure functions, easy to test)

### Critical Paths (Must Have 100% Coverage)
- Layered resolution logic
- Block overlap validation
- Session overlap validation
- Backward compatibility fallback

---

## Test Data Management

### Fixtures
Create reusable test fixtures:
- `fixtures/scheduling/doctor-availability.fixture.ts`
- `fixtures/scheduling/schedule-blocks.fixture.ts`
- `fixtures/scheduling/appointments.fixture.ts`

### Test Database
- Use separate test database
- Clean between test suites
- Seed with minimal required data

---

## Success Criteria

### All Tests Pass
- ✅ Unit tests: < 5 seconds total
- ✅ Integration tests: < 2 minutes total
- ✅ E2E tests: < 10 minutes total

### Production Readiness
- ✅ No known edge cases untested
- ✅ All validation rules tested
- ✅ Backward compatibility verified
- ✅ Performance acceptable for production loads

---

## Notes

1. **DST Testing**: May require timezone-specific test environments
2. **Midnight-Crossing**: Only test if feature is supported
3. **Large Date Ranges**: Monitor performance, may need optimization
4. **Test Data**: Use realistic but minimal data to keep tests fast
5. **Error Messages**: Verify error messages are actionable for users

---

## Next Steps

1. Implement unit tests for `AvailabilityService`
2. Implement unit tests for use cases
3. Implement integration tests
4. Implement E2E tests
5. Set up CI/CD to run tests automatically
6. Monitor test execution time and optimize as needed
