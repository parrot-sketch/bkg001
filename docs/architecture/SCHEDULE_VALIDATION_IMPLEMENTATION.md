# Schedule Validation Implementation

## Overview

Validation rules have been implemented at the use case layer to prevent invalid schedule configurations. All validation logic is centralized in pure helper functions and used by use cases.

---

## Validation Rules Implemented

### Rule 1: No Overlapping Sessions on Same Day ✅
**Location**: `SetDoctorAvailabilityUseCase`
**Validation**: `validateSessionsNoOverlap()` in `ScheduleValidationHelpers`

**Behavior**:
- When a doctor sets multiple sessions for the same working day, the system validates that no two sessions overlap in time.
- Example: Monday cannot have both "08:00-11:00" and "10:00-13:00" (they overlap).

**Error Message**:
```
"Sessions overlap on Monday: 08:00-11:00 overlaps with 10:00-13:00"
```

---

### Rule 2: No Overlapping Schedule Blocks ✅
**Location**: `AddScheduleBlockUseCase`
**Validation**: Block overlap checking in use case

**Behavior**:
- Full-day blocks cannot overlap with other full-day blocks.
- Full-day blocks prevent any partial blocks on overlapping dates.
- Partial blocks cannot overlap with full-day blocks.
- Partial blocks cannot overlap with other partial blocks on the same day(s).

**Error Messages**:
- Full-day vs full-day: `"Cannot create block: A full-day block already exists on overlapping dates"`
- Full-day vs partial: `"Cannot create partial block: A full-day block already exists on overlapping dates"`
- Partial vs full-day: `"Cannot create full-day block: A partial block already exists on overlapping dates"`
- Partial vs partial: `"Cannot create block: Time range overlaps with existing block"`

---

### Rule 3: Full-Day Block Prevents Partial Blocks ✅
**Location**: `AddScheduleBlockUseCase`
**Validation**: Part of Rule 2 implementation

**Behavior**:
- If a full-day block exists for a date range, no partial blocks can be created on overlapping dates.
- If a partial block exists, a full-day block cannot be created on overlapping dates.

**Rationale**: Full-day blocks mean the doctor is completely unavailable, so partial blocks are meaningless.

---

### Rule 4: Partial Blocks Cannot Overlap ✅
**Location**: `AddScheduleBlockUseCase`
**Validation**: Part of Rule 2 implementation

**Behavior**:
- Two partial blocks with overlapping time ranges cannot exist on the same calendar day.
- For multi-day blocks, the system checks each day in the overlap and validates time ranges.

**Example**:
- Block 1: 2026-02-14, 10:00-12:00 ✅
- Block 2: 2026-02-14, 11:00-13:00 ❌ (overlaps)
- Block 3: 2026-02-15, 10:00-12:00 ✅ (different day)

---

## Architecture

### Validation Helpers (`ScheduleValidationHelpers.ts`)

Pure functions with no side effects:

1. **`timeRangesOverlap()`** - Check if two time ranges overlap
2. **`timeToMinutes()`** - Convert HH:mm to minutes (0-1439)
3. **`sessionsOverlap()`** - Check if two sessions overlap
4. **`dateRangesOverlap()`** - Check if two date ranges overlap
5. **`isSameDay()`** - Check if two dates are on the same calendar day
6. **`dateInRange()`** - Check if a date falls within a date range
7. **`isFullDayBlock()`** - Check if a block is full-day (no time specified)
8. **`validateSessionsNoOverlap()`** - Validate sessions don't overlap (throws error)

**Design Principle**: All validation logic is pure and testable. No dependencies on repositories or external services.

---

### Use Case Integration

#### `SetDoctorAvailabilityUseCase`
- **Location**: After session time format validation, before saving
- **Validation**: Calls `validateSessionsNoOverlap()` for each working day with sessions
- **Error Handling**: Wraps validation error in `DomainException` with metadata

#### `AddScheduleBlockUseCase`
- **Location**: After basic validation (dates, times, block type), before creating block
- **Validation**: 
  1. Fetches existing blocks for the date range
  2. Checks each existing block for overlaps
  3. Applies rules 2, 3, and 4
- **Error Handling**: Throws `DomainException` with detailed metadata about conflicting blocks

---

## Error Handling

### Typed Errors
All validation errors are `DomainException` instances with:
- **Message**: Human-readable error message
- **Metadata**: Structured data about the conflict (existing block/session, new block/session, dates, times)

### Example Error Structure
```typescript
throw new DomainException(
  "Cannot create block: Time range overlaps with existing block",
  {
    existingBlock: {
      id: "block-123",
      startDate: "2026-02-14",
      endDate: "2026-02-14",
      startTime: "10:00",
      endTime: "12:00",
      blockType: "SURGERY",
    },
    newBlock: {
      startDate: "2026-02-14",
      endDate: "2026-02-14",
      startTime: "11:00",
      endTime: "13:00",
    },
    conflictingDate: "2026-02-14",
  }
);
```

---

## Safety Guarantees

### ✅ No Breaking Changes
- Validation is additive (only prevents invalid configurations)
- Existing valid configurations continue to work
- No changes to API contracts
- No changes to data models

### ✅ Architecture Compliance
- Validation logic in use cases (not controllers)
- Pure helper functions (no side effects)
- Typed errors (DomainException)
- No business logic in repositories

### ✅ Backward Compatibility
- Existing schedules without sessions: ✅ Work (no validation triggered)
- Existing schedules with non-overlapping sessions: ✅ Work
- Existing blocks: ✅ Work (validation only on creation)

---

## Testing Recommendations

### Unit Tests (Recommended)
1. **`ScheduleValidationHelpers.test.ts`**
   - Test `timeRangesOverlap()` with various scenarios
   - Test `sessionsOverlap()` with edge cases
   - Test `dateRangesOverlap()` with multi-day ranges
   - Test `validateSessionsNoOverlap()` with overlapping/non-overlapping sessions

2. **`SetDoctorAvailabilityUseCase.test.ts`**
   - Test session overlap validation
   - Test that non-overlapping sessions are accepted
   - Test error messages are clear

3. **`AddScheduleBlockUseCase.test.ts`**
   - Test full-day vs partial block conflicts
   - Test partial block time overlap
   - Test multi-day block validation
   - Test that non-overlapping blocks are accepted

### Integration Tests (Recommended)
1. End-to-end: Doctor sets schedule with overlapping sessions → Error returned
2. End-to-end: Doctor creates block overlapping existing block → Error returned
3. End-to-end: Doctor creates non-overlapping blocks → Success

---

## Edge Cases Handled

### Multi-Day Blocks
- **Issue**: Partial blocks spanning multiple days need careful validation
- **Solution**: Iterate through each day in the overlap and check time ranges
- **Example**: Block 1: 2026-02-14 to 2026-02-16, 10:00-12:00
  - Block 2: 2026-02-15, 11:00-13:00 → ❌ Overlaps on 2026-02-15

### Full-Day vs Partial-Day
- **Issue**: Full-day blocks should prevent any partial blocks on same dates
- **Solution**: Check if either block is full-day and reject if date ranges overlap
- **Example**: Block 1: 2026-02-14 (full day)
  - Block 2: 2026-02-14, 10:00-12:00 → ❌ Rejected

### Same-Day Time Overlap
- **Issue**: Partial blocks on different days shouldn't conflict
- **Solution**: Only check time overlap if blocks share at least one calendar day
- **Example**: Block 1: 2026-02-14, 10:00-12:00
  - Block 2: 2026-02-15, 10:00-12:00 → ✅ Allowed (different days)

---

## Files Changed

### Created
1. **`application/validators/ScheduleValidationHelpers.ts`**
   - Pure validation functions
   - No dependencies on repositories or services
   - Fully testable

### Modified
1. **`application/use-cases/SetDoctorAvailabilityUseCase.ts`**
   - Added session overlap validation
   - Imports `validateSessionsNoOverlap()`
   - Wraps validation errors in `DomainException`

2. **`application/use-cases/AddScheduleBlockUseCase.ts`**
   - Added block overlap validation
   - Imports validation helpers
   - Fetches existing blocks and checks for conflicts
   - Applies all 4 validation rules

---

## Summary

✅ **All validation rules implemented**
✅ **Architecture compliant** (use case layer only)
✅ **Typed errors** (DomainException with metadata)
✅ **Backward compatible** (no breaking changes)
✅ **Pure functions** (testable, no side effects)
✅ **Clear error messages** (actionable for users)

**Status**: Production-ready validation layer
