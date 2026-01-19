# Phase 2 Cleanup Complete ✅

**Date:** January 2025  
**Phase:** Refactor Business Logic - Server Actions to Use Cases

## Summary

Successfully refactored Server Actions to use Clean Architecture use cases where available. Created infrastructure for future refactoring of remaining actions.

## Changes Made

### 1. Created Use Case Factory

**New File:** `lib/use-cases.ts`
- Centralized factory for instantiating use cases
- Provides consistent dependency injection
- Singleton pattern for infrastructure dependencies
- Exports: `getCreatePatientUseCase()`, `getScheduleAppointmentUseCase()`

### 2. Refactored Appointment Actions

**File:** `app/actions/appointment.ts`

**Before:**
```typescript
// Direct Prisma call
await db.appointment.create({
  data: { ... }
});
```

**After:**
```typescript
// Use case pattern
const scheduleAppointmentUseCase = getScheduleAppointmentUseCase();
const result = await scheduleAppointmentUseCase.execute(dto, userId);
```

**Changes:**
- ✅ `createNewAppointment()` now uses `ScheduleAppointmentUseCase`
- ✅ Proper error handling with `DomainException`
- ✅ Audit trail via use case
- ✅ Business rule validation (no double booking, date validation)
- ✅ Notification sending via use case

**Benefits:**
- Business logic centralized in use case
- Better testability
- Consistent error handling
- Audit trail automatically recorded

### 3. Patient Actions Analysis

**File:** `app/actions/patient.ts`

**Status:** ⚠️ **Partially Refactored**

**Analysis:**
- `createNewPatient()` creates both User and Patient entities
- `CreatePatientUseCase` only creates Patient (assumes User exists)
- Current implementation uses `UserProfileService.createUserWithPatient()`
- This is a valid pattern for creating user+patient together

**Decision:** Keep current implementation for now
- `UserProfileService` handles the complex user+patient creation
- Could be refactored later to:
  1. Create User via `RegisterUserUseCase`
  2. Create Patient via `CreatePatientUseCase`
- This would require coordination between two use cases

**Future Improvement:**
- Consider creating a `CreateUserWithPatientUseCase` that orchestrates both
- Or refactor to call `RegisterUserUseCase` then `CreatePatientUseCase`

### 4. Other Actions Status

**Actions without use cases (kept as-is):**
- `app/actions/appointment.ts`:
  - `appointmentAction()` - Updates appointment status (no use case yet)
  - `addVitalSigns()` - Adds vital signs (no use case yet)

- `app/actions/admin.ts`:
  - `createNewStaff()` - Not implemented
  - `createNewDoctor()` - Uses `UserProfileService` (acceptable pattern)
  - `addNewService()` - Creates service (no use case yet)

- `app/actions/medical.ts`:
  - `addDiagnosis()` - Adds diagnosis (no use case yet)
  - `addNewBill()` - Creates bill (no use case yet)
  - `generateBill()` - Generates bill (no use case yet)

- `app/actions/general.ts`:
  - `deleteDataById()` - Deletes records (no use case yet)
  - `createReview()` - Creates review (no use case yet)

## Pattern Established

### Use Case Pattern in Server Actions

```typescript
"use server";

import { getScheduleAppointmentUseCase } from "@/lib/use-cases";
import { DomainException } from "@/domain/exceptions/DomainException";
import { getCurrentUser } from "@/lib/auth/server-auth";

export async function createNewAppointment(data: any) {
  try {
    // 1. Get current user for audit
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, msg: "Unauthorized" };
    }

    // 2. Validate input
    const validatedData = Schema.safeParse(data);
    if (!validatedData.success) {
      return { success: false, msg: "Invalid data" };
    }

    // 3. Get use case instance
    const useCase = getScheduleAppointmentUseCase();
    
    // 4. Execute use case
    const result = await useCase.execute(dto, user.userId);

    // 5. Return success
    return {
      success: true,
      message: "Operation successful",
      data: result,
    };
  } catch (error) {
    // Handle domain exceptions
    if (error instanceof DomainException) {
      return { 
        success: false, 
        msg: error.message 
      };
    }

    // Handle unexpected errors
    console.error('Error:', error);
    return { success: false, msg: "Internal Server Error" };
  }
}
```

## Metrics

### Before Phase 2
- **Server Actions with direct Prisma:** All actions
- **Server Actions using use cases:** 0
- **Business logic in Server Actions:** Yes

### After Phase 2
- **Server Actions with direct Prisma:** Most (no use cases available yet)
- **Server Actions using use cases:** 1 (`createNewAppointment`)
- **Business logic in Server Actions:** Reduced (moved to use cases where available)

## Next Steps

### Immediate (Phase 3)
1. Continue refactoring as use cases become available
2. Create use cases for:
   - Update appointment status
   - Add vital signs
   - Add diagnosis
   - Create bill
   - Delete records

### Future Improvements
1. **Create `CreateUserWithPatientUseCase`**
   - Orchestrates user and patient creation
   - Replaces `UserProfileService` usage in Server Actions

2. **Create Update Use Cases**
   - `UpdatePatientUseCase`
   - `UpdateAppointmentUseCase`
   - Refactor `updatePatient()` to use use case

3. **Create Delete Use Cases**
   - `DeletePatientUseCase`
   - `DeleteAppointmentUseCase`
   - Refactor `deleteDataById()` to use use cases

4. **Create Medical Use Cases**
   - `AddVitalSignsUseCase`
   - `AddDiagnosisUseCase`
   - `CreateBillUseCase`

## Verification

- ✅ `createNewAppointment` uses `ScheduleAppointmentUseCase`
- ✅ Error handling works correctly
- ✅ Audit trail recorded
- ✅ Business rules enforced (no double booking)
- ✅ No broken imports
- ✅ Linter checks pass

## Notes

- Most Server Actions still use direct Prisma calls because use cases don't exist yet
- This is expected and acceptable - refactoring happens incrementally
- The pattern is established for future refactoring
- `UserProfileService` is a valid service layer pattern for complex operations

---

**Next Phase:** Phase 3 - Consolidate Utilities (lib/ vs utils/)
