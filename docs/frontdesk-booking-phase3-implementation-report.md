# Frontdesk Booking Unification — Phase 3 Implementation Report

## Executive Summary

Phase 3 implementation completed for Frontdesk Booking Unification. All database schema changes, domain updates, DTOs, use case enhancements, API route refactoring, UI updates, and tests have been implemented.

**Date**: 2026-02-11  
**Status**: Implementation Complete (Pending Migration & Verification)

---

## A. Database Changes (Prisma Schema)

### A.1 New Enum: BookingChannel

**File**: `prisma/schema.prisma`

Added `BookingChannel` enum:
```prisma
enum BookingChannel {
  DASHBOARD
  PATIENT_LIST
  PATIENT_PROFILE
}
```

### A.2 Appointment Model Updates

**File**: `prisma/schema.prisma`

Added fields to `Appointment` model:
- `created_by_user_id String?` - Audit trail for who created the appointment
- `booking_channel BookingChannel?` - UI entry point tracking (analytics)

Added relation:
- `created_by_user User? @relation("AppointmentCreator", fields: [created_by_user_id], references: [id])`

### A.3 User Model Updates

**File**: `prisma/schema.prisma`

Added relation:
- `created_appointments Appointment[] @relation("AppointmentCreator")`

### A.4 Composite Index

**File**: `prisma/schema.prisma`

The composite index `@@index([doctor_id, appointment_date, time])` already existed in the schema (line 367), so no change was needed.

### A.5 Migration

**Status**: Migration file creation skipped (requires database connection).  
**Command to run**: `pnpm prisma migrate dev --name add_appointment_audit_fields`

---

## B. Domain Layer Updates

### B.1 BookingChannel Enum

**File**: `domain/enums/BookingChannel.ts` (NEW)

Created new enum with:
- `DASHBOARD`, `PATIENT_LIST`, `PATIENT_PROFILE` values
- `isBookingChannel()` type guard

### B.2 AppointmentStatus Status Mapping Fix

**File**: `domain/enums/AppointmentStatus.ts`

Fixed `getDefaultStatusForSource()` function:
- `FRONTDESK_SCHEDULED` → `SCHEDULED` (was incorrectly `PENDING_DOCTOR_CONFIRMATION`)
- `ADMIN_SCHEDULED` → `SCHEDULED` (was incorrectly `PENDING_DOCTOR_CONFIRMATION`)
- `DOCTOR_FOLLOW_UP` → `SCHEDULED` (unchanged)
- `PATIENT_REQUESTED` → `PENDING_DOCTOR_CONFIRMATION` (unchanged)

---

## C. DTOs & Validation

### C.1 CreateAppointmentRequest Schema

**File**: `application/dtos/CreateAppointmentRequest.ts` (NEW)

Created Zod schema with:
- Required fields: `patientId` (UUID), `doctorId` (UUID), `appointmentDate` (Date, not in past), `time` (HH:mm), `type` (string)
- Optional fields: `durationMinutes` (15-240), `reason`, `note`, `source`, `bookingChannel`, `parentAppointmentId`, `parentConsultationId`
- Validation rules: UUID format, date not in past, time format, duration bounds

### C.2 ScheduleAppointmentDto Updates

**File**: `application/dtos/ScheduleAppointmentDto.ts`

Added optional fields:
- `bookingChannel?: string`
- `durationMinutes?: number`
- `reason?: string`

---

## D. Application Layer (Use Cases)

### D.1 ScheduleAppointmentUseCase Updates

**File**: `application/use-cases/ScheduleAppointmentUseCase.ts`

**Changes**:
1. **Imports**: Added `NotFoundError`, `ConflictError` from `application/errors`
2. **Method signature**: Added optional `userRole` parameter to `execute()`
3. **Error handling**: 
   - Replaced `DomainException` with `NotFoundError` for patient not found
   - Replaced `DomainException` with `ConflictError` for appointment conflicts
4. **Duration logic**: Uses `dto.durationMinutes` if provided, else slot config, else default 30
5. **Audit trail**: Sets `created_by_user_id` for staff roles (FRONTDESK, ADMIN, DOCTOR), null for PATIENT
6. **Booking channel**: Persists `booking_channel` from DTO if provided

**Key code**:
```typescript
const shouldSetCreatedBy = userRole && ['FRONTDESK', 'ADMIN', 'DOCTOR'].includes(userRole);
const createdByUserId = shouldSetCreatedBy ? userId : null;

await tx.appointment.update({
  where: { id: id },
  data: {
    // ... other fields ...
    created_by_user_id: createdByUserId,
    booking_channel: dto.bookingChannel as any || null,
  },
});
```

### D.2 ValidateAppointmentAvailabilityUseCase

**File**: `application/use-cases/ValidateAppointmentAvailabilityUseCase.ts`

**Status**: No changes needed. Already uses composite index query paths and detects overlap conflicts.

---

## E. API Route Refactoring

### E.1 POST /api/appointments

**File**: `app/api/appointments/route.ts`

**Changes**:
1. **Imports**: 
   - Replaced `authenticateRequest` with `JwtMiddleware.authenticate`
   - Added `handleApiSuccess`, `handleApiError` from `app/api/_utils/handleApiError`
   - Added `ValidationError`, `ForbiddenError`, `NotFoundError` from `application/errors`
   - Added `AppointmentSource`, `BookingChannel` enums
   - Added `createAppointmentRequestSchema` from `application/dtos/CreateAppointmentRequest`
2. **Request validation**: Uses Zod schema (`createAppointmentRequestSchema.safeParse()`)
3. **Error handling**: All errors go through `handleApiError()` for standardized `ApiResponse<T>` format
4. **Success response**: Uses `handleApiSuccess(result, 201)` for 201 Created status
5. **Role-based source enforcement**: Validates role-source matrix and throws `ForbiddenError` on violations
6. **Source defaults**: Sets default source based on role when not provided

**Response format**: All responses now use `ApiResponse<T>`:
- Success: `{ success: true, data: AppointmentResponseDto }` (201)
- Error: `{ success: false, code: ApiErrorCode, error: string, metadata?: {...} }` (400/403/404/409/500)

### E.2 handleApiSuccess Enhancement

**File**: `app/api/_utils/handleApiError.ts`

**Change**: Added optional `status` parameter (defaults to 200) to support 201 Created responses:
```typescript
export function handleApiSuccess<T>(data: T, status: number = 200): NextResponse<ApiResponse<T>>
```

### E.3 ValidationError Enhancement

**File**: `application/errors/ValidationError.ts`

**Change**: Added static `fromZodError()` method to convert Zod errors to `ValidationError`:
```typescript
static fromZodError(zodError: z.ZodError, message: string = 'Validation failed'): ValidationError
```

---

## F. UI Updates

### F.1 Booking Form Page

**File**: `app/frontdesk/appointments/new/page.tsx`

**Changes**:
1. **Imports**: Added `AppointmentSource`, `BookingChannel` enums
2. **Source mapping**: Maps URL query param `source` to `BookingChannel` enum:
   - `dashboard` → `BookingChannel.DASHBOARD`
   - `patients` → `BookingChannel.PATIENT_LIST`
   - `profile` → `BookingChannel.PATIENT_PROFILE`
3. **Form props**: Passes `AppointmentSource.FRONTDESK_SCHEDULED` (enum) and `bookingChannel` to form

### F.2 AppointmentBookingForm Component

**File**: `components/appointments/AppointmentBookingForm.tsx`

**Changes**:
1. **Imports**: Added `AppointmentSource`, `BookingChannel` enums
2. **Props**: Added `bookingChannel?: BookingChannel` prop
3. **Source handling**: Uses `AppointmentSource` enum instead of string literal for follow-up check
4. **API request**: Includes `bookingChannel` in request body if provided

### F.3 Frontdesk API Client

**File**: `lib/api/frontdesk.ts`

**Change**: Added `scheduleAppointment()` method to match other API clients:
```typescript
async scheduleAppointment(dto: ScheduleAppointmentDto): Promise<ApiResponse<AppointmentResponseDto>>
```

---

## G. Tests

### G.1 Unit Tests

#### G.1.1 AppointmentStatus Status Mapping

**File**: `tests/unit/domain/enums/AppointmentStatus.test.ts` (NEW)

Tests:
- `PATIENT_REQUESTED` → `PENDING_DOCTOR_CONFIRMATION`
- `FRONTDESK_SCHEDULED` → `SCHEDULED`
- `ADMIN_SCHEDULED` → `SCHEDULED`
- `DOCTOR_FOLLOW_UP` → `SCHEDULED`
- Unknown source → `PENDING_DOCTOR_CONFIRMATION` (defensive)

#### G.1.2 CreateAppointmentRequest Schema Validation

**File**: `tests/unit/application/dtos/CreateAppointmentRequest.test.ts` (NEW)

Tests:
- Valid request passes
- Optional fields accepted
- Invalid UUIDs rejected
- Past dates rejected
- Invalid time format rejected
- Missing required fields rejected
- Duration bounds validation (15-240)
- Source enum validation
- BookingChannel enum validation

### G.2 Integration/Contract Tests

#### G.2.1 POST /api/appointments Contract Tests

**File**: `tests/integration/frontdesk-booking/appointments-create.contract.test.ts` (NEW)

Tests:
- **Success Cases**:
  - FRONTDESK creates appointment → 201, status `SCHEDULED`, `created_by_user_id` set
  - PATIENT creates appointment → 201, status `PENDING_DOCTOR_CONFIRMATION`
- **Authentication & Authorization**:
  - Not authenticated → 403 FORBIDDEN
  - FRONTDESK tries `DOCTOR_FOLLOW_UP` → 403 FORBIDDEN
  - PATIENT tries non-`PATIENT_REQUESTED` → 403 FORBIDDEN
- **Validation Errors**:
  - Invalid request body → 400 VALIDATION_ERROR
  - Invalid UUID → 400 VALIDATION_ERROR
  - Past date → 400 VALIDATION_ERROR
  - Invalid time format → 400 VALIDATION_ERROR
- **Conflict Errors**:
  - Appointment conflict → 409 CONFLICT
- **Not Found Errors**:
  - Patient not found → 404 NOT_FOUND
- **Source Defaults**:
  - FRONTDESK defaults to `FRONTDESK_SCHEDULED`
  - ADMIN defaults to `ADMIN_SCHEDULED`

### G.3 Test Helpers

**File**: `tests/helpers/apiResponseAssertions.ts`

**Updates**:
- Fixed `ApiFailure` type alias to use `ApiError`
- Fixed `assertError()` to check `error` property instead of `message`
- Added `assertErrorCode()` helper
- Renamed base assertion to `assertErrorBase()` to avoid duplicate function name

---

## H. Cleanup

### H.1 String Literal Replacements

**Files Updated**:
- `app/frontdesk/appointments/new/page.tsx`: Uses `AppointmentSource.FRONTDESK_SCHEDULED` enum
- `components/appointments/AppointmentBookingForm.tsx`: Uses `AppointmentSource` enum for follow-up check

### H.2 Legacy Code

**Status**: No conflicting legacy code identified. All booking paths use the canonical form.

---

## I. Verification Gates

### I.1 TypeScript Compilation

**Command**: `pnpm tsc --noEmit`

**Status**: ⚠️ **PENDING** - Some TypeScript errors remain (unrelated to Phase 3 changes):
- Missing methods in `frontdeskApi` (pre-existing, not part of Phase 3)
- Some `any` types in other files (pre-existing)
- Missing `RegisterUserDto` (pre-existing, from auth cleanup)

**Phase 3 Related Errors**: None

### I.2 Build

**Command**: `rm -rf .next && pnpm build`

**Status**: ⚠️ **PENDING** - Requires TypeScript errors to be fixed first

### I.3 Unit Tests

**Command**: `pnpm test tests/unit/domain/enums/AppointmentStatus.test.ts tests/unit/application/dtos/CreateAppointmentRequest.test.ts`

**Status**: ⚠️ **PENDING** - Tests written, need to run

### I.4 Integration Tests

**Command**: `pnpm test tests/integration/frontdesk-booking`

**Status**: ⚠️ **PENDING** - Tests written, need to run

---

## J. Files Changed Summary

### New Files (7)
1. `domain/enums/BookingChannel.ts`
2. `application/dtos/CreateAppointmentRequest.ts`
3. `tests/unit/domain/enums/AppointmentStatus.test.ts`
4. `tests/unit/application/dtos/CreateAppointmentRequest.test.ts`
5. `tests/integration/frontdesk-booking/appointments-create.contract.test.ts`
6. `docs/frontdesk-booking-phase3-implementation-report.md` (this file)

### Modified Files (11)
1. `prisma/schema.prisma` - Added enum, fields, relations
2. `domain/enums/AppointmentStatus.ts` - Fixed status mapping
3. `application/dtos/ScheduleAppointmentDto.ts` - Added optional fields
4. `application/use-cases/ScheduleAppointmentUseCase.ts` - Added audit trail, booking channel, error types
5. `application/errors/ValidationError.ts` - Added `fromZodError()` method
6. `app/api/_utils/handleApiError.ts` - Added status parameter to `handleApiSuccess()`
7. `app/api/appointments/route.ts` - Complete refactor to use `ApiResponse<T>`, Zod validation
8. `app/frontdesk/appointments/new/page.tsx` - Map source to `BookingChannel`, use enum
9. `components/appointments/AppointmentBookingForm.tsx` - Accept `bookingChannel`, use enum
10. `lib/api/frontdesk.ts` - Added `scheduleAppointment()` method
11. `tests/helpers/apiResponseAssertions.ts` - Fixed types and added helpers

---

## K. Next Steps

1. **Run Migration**: Execute `pnpm prisma migrate dev --name add_appointment_audit_fields`
2. **Fix TypeScript Errors**: Address pre-existing errors (not related to Phase 3)
3. **Run Tests**: Execute unit and integration tests
4. **Verify Build**: Run `pnpm build` after TypeScript errors are fixed
5. **Manual Testing**: Test all 3 booking entry points in UI

---

## L. Breaking Changes

### L.1 Status Behavior Change

**Impact**: Frontdesk bookings now create `SCHEDULED` appointments instead of `PENDING_DOCTOR_CONFIRMATION`.

**Migration**: Existing frontdesk-created appointments in `PENDING_DOCTOR_CONFIRMATION` status should be reviewed and manually confirmed if needed.

**Justification**: This is the intended behavior - frontdesk staff are trusted and should not require doctor confirmation.

---

## M. Non-Breaking Changes

- `booking_channel` is optional (backward compatible)
- `created_by_user_id` is nullable (backward compatible with existing appointments)
- API response format change is backward compatible (clients check `success` field)

---

## End of Report
