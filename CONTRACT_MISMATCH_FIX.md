# Contract Mismatch Fix: snake_case vs camelCase

## Problem

Build was failing with:
```
Type error: Property 'patient_id' does not exist on type 'CreateAppointmentRequest'. 
Did you mean 'patientId'?
```

## Root Cause

**Contract Drift** between layers:

1. **Frontend/Zod Schema** (`lib/schema.ts`): Uses `snake_case` 
   - `doctor_id`, `appointment_date`, `patient_id`

2. **TypeScript Types** (`types/api-requests.ts`): Uses `camelCase`
   - `doctorId`, `appointmentDate`, `patientId`

3. **Code Implementation**: Was trying to access `data.patient_id` on a type that only has `patientId`

This is a **real production bug risk** - not just a TypeScript error.

## Solution: Normalization Layer

Created a **boundary normalization layer** that:

1. ✅ Accepts both formats (backward compatible)
2. ✅ Normalizes to internal type contract (camelCase)
3. ✅ Maintains type safety
4. ✅ Prevents runtime errors

### Implementation

**File:** `lib/normalize-api-requests.ts`

```typescript
export function normalizeAppointmentRequest(
  data: Record<string, unknown>
): CreateAppointmentRequest {
  // Handles both snake_case and camelCase
  return {
    patientId: getValue('patientId', 'patient_id'),
    doctorId: getValue('doctorId', 'doctor_id'),
    appointmentDate: getValue('appointmentDate', 'appointment_date'),
    // ...
  };
}
```

**Usage in `app/actions/appointment.ts`:**

```typescript
// Before (BROKEN):
let patientId = data.patient_id; // ❌ Type error

// After (FIXED):
const normalized = normalizeAppointmentRequest(data);
let patientId = normalized.patientId; // ✅ Type safe
```

## Why This Approach

### ❌ Bad Fixes (Don't Do This)

1. **Type assertion hack:**
   ```typescript
   (data as any).patient_id // Destroys type safety
   ```

2. **Modify type to include both:**
   ```typescript
   interface CreateAppointmentRequest {
     patientId?: string;
     patient_id?: string; // Wrong - duplicates contract
   }
   ```

### ✅ Correct Fix (What We Did)

1. **Normalize at boundary** - Single source of truth
2. **Maintain type safety** - Internal code uses camelCase
3. **Backward compatible** - Accepts both formats
4. **Future-proof** - Easy to migrate frontend later

## Architecture Benefits

1. **Clean Domain Layer** - Domain code uses consistent camelCase
2. **Type Safety** - TypeScript catches errors at compile time
3. **Runtime Safety** - No field name mismatches
4. **Migration Path** - Can gradually move frontend to camelCase

## Files Changed

- ✅ `lib/normalize-api-requests.ts` (NEW) - Normalization utilities
- ✅ `app/actions/appointment.ts` - Uses normalization
- ✅ `types/api-requests.ts` - Type definitions (unchanged - correct)

## Testing

The fix ensures:
- ✅ Build passes (TypeScript errors resolved)
- ✅ Backward compatible (accepts snake_case from forms)
- ✅ Type safe (internal code uses camelCase)
- ✅ Runtime safe (no field name mismatches)

## Future Work

1. **Gradually migrate frontend** to send camelCase
2. **Update Zod schemas** to use camelCase (breaking change - plan migration)
3. **Remove normalization** once all clients use camelCase

## Key Takeaway

> **Contract mismatches are not TypeScript noise - they're real bugs.**
> 
> Fix them properly with normalization layers, not type assertions.
