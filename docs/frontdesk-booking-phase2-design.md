# Frontdesk Booking Unification — Phase 2 Design

## Executive Summary

This document defines the canonical design for frontdesk booking unification. It establishes:
- **State rules**: Source → status mapping, role enforcement, mutability invariants
- **Canonical flow**: Single booking path with 3 UI entry contexts
- **Concurrency strategy**: Validation-only approach (no slot locking)
- **DTOs & validation**: Zod schemas for request validation
- **API contract**: Standardized `ApiResponse<T>` format

**Date**: 2026-02-11  
**Status**: Design Phase (No Implementation)

---

## A. Canonical Booking State Rules

### A.1 Source → Default Status Mapping

**Invariant**: The `getDefaultStatusForSource()` function is the SINGLE SOURCE OF TRUTH for status assignment.

**Mapping Rules**:

| Source | Default Status | Doctor Confirmation Required? | Justification |
|--------|---------------|------------------------------|---------------|
| `PATIENT_REQUESTED` | `PENDING_DOCTOR_CONFIRMATION` | ✅ Yes | Patient self-booking requires doctor review |
| `FRONTDESK_SCHEDULED` | `SCHEDULED` | ❌ No | Frontdesk staff are trusted; no confirmation needed |
| `ADMIN_SCHEDULED` | `SCHEDULED` | ❌ No | Admin is trusted; no confirmation needed |
| `DOCTOR_FOLLOW_UP` | `SCHEDULED` | ❌ No | Doctor created it; auto-confirmed |

**Implementation**:
```typescript
// domain/enums/AppointmentStatus.ts
export function getDefaultStatusForSource(source: AppointmentSource): AppointmentStatus {
  switch (source) {
    case AppointmentSource.PATIENT_REQUESTED:
      return AppointmentStatus.PENDING_DOCTOR_CONFIRMATION;
    case AppointmentSource.FRONTDESK_SCHEDULED:
    case AppointmentSource.ADMIN_SCHEDULED:
    case AppointmentSource.DOCTOR_FOLLOW_UP:
      return AppointmentStatus.SCHEDULED;
    default:
      // Defensive: unknown sources require confirmation
      return AppointmentStatus.PENDING_DOCTOR_CONFIRMATION;
  }
}
```

**Breaking Change**: This fixes the bug where `FRONTDESK_SCHEDULED` incorrectly required doctor confirmation.

---

### A.2 Role-Based Source Enforcement

**Rule**: Only certain roles can create appointments with specific sources.

**Enforcement Matrix**:

| Role | Allowed Sources | Forbidden Sources | Default if Not Provided |
|------|----------------|-------------------|------------------------|
| `PATIENT` | `PATIENT_REQUESTED` | All others | `PATIENT_REQUESTED` |
| `FRONTDESK` | `FRONTDESK_SCHEDULED`, `PATIENT_REQUESTED` | `DOCTOR_FOLLOW_UP` | `FRONTDESK_SCHEDULED` |
| `DOCTOR` | `DOCTOR_FOLLOW_UP`, `PATIENT_REQUESTED` | `FRONTDESK_SCHEDULED`, `ADMIN_SCHEDULED` | `PATIENT_REQUESTED` (backward compat) |
| `ADMIN` | All sources | None | `ADMIN_SCHEDULED` |

**Implementation Location**: `app/api/appointments/route.ts` (POST handler)

**Validation Logic**:
```typescript
// Validate role-based source restrictions
if (userRole === 'PATIENT' && source !== AppointmentSource.PATIENT_REQUESTED) {
  throw new ForbiddenError('Patients can only create patient-requested appointments');
}
if (userRole === 'FRONTDESK' && source === AppointmentSource.DOCTOR_FOLLOW_UP) {
  throw new ForbiddenError('Frontdesk cannot create doctor follow-up appointments');
}
// ... etc
```

---

### A.3 Status Mutation Rules

**Rule**: Who can change appointment status and when.

**Status Transition Matrix**:

| From Status | To Status | Allowed By | Notes |
|------------|----------|------------|-------|
| `PENDING_DOCTOR_CONFIRMATION` | `SCHEDULED` | `DOCTOR`, `ADMIN` | Doctor confirms appointment |
| `PENDING_DOCTOR_CONFIRMATION` | `CANCELLED` | `DOCTOR`, `ADMIN`, `FRONTDESK` | Doctor rejects or staff cancels |
| `SCHEDULED` | `CHECKED_IN` | `FRONTDESK`, `ADMIN` | Patient arrives |
| `SCHEDULED` | `CANCELLED` | `FRONTDESK`, `ADMIN`, `DOCTOR` | Cancellation |
| `SCHEDULED` | `NO_SHOW` | `FRONTDESK`, `ADMIN` | Patient didn't arrive |
| `CHECKED_IN` | `IN_CONSULTATION` | `DOCTOR`, `ADMIN` | Doctor starts consultation |
| `IN_CONSULTATION` | `COMPLETED` | `DOCTOR`, `ADMIN` | Consultation finished |
| `CHECKED_IN` | `CANCELLED` | `FRONTDESK`, `ADMIN` | Rare: cancel after check-in |

**Implementation**: Status transitions are enforced in domain entity methods or dedicated transition services (outside scope of this design, but must be consistent).

---

### A.4 Immutability Rules

**Rule**: Certain fields cannot be changed after appointment creation.

**Immutable Fields** (after creation):
- `patient_id` — Cannot change patient
- `doctor_id` — Cannot change doctor (reschedule creates new appointment)
- `appointment_date` — Cannot change date (reschedule creates new appointment)
- `time` — Cannot change time (reschedule creates new appointment)
- `source` — Cannot change source (audit integrity)
- `created_by_user_id` — Cannot change creator (audit integrity)

**Mutable Fields** (can be updated):
- `status` — Via status transitions
- `note` — Can be updated
- `reason` — Can be updated
- `slot_duration` — Can be adjusted (if needed)
- `duration_minutes` — Can be updated (actual duration)

**Implementation**: Enforce immutability in `ScheduleAppointmentUseCase` and any update endpoints.

---

## B. Canonical Create Flow

### B.1 UI Context Enum (Navigation Only)

**Purpose**: Track which UI entry point initiated the booking (for analytics/UX, not business logic).

**Enum Definition**:
```typescript
// domain/enums/BookingChannel.ts (NEW)
export enum BookingChannel {
  /** Dashboard quick book from available doctor card */
  DASHBOARD = 'DASHBOARD',
  /** Patient list "Book" action */
  PATIENT_LIST = 'PATIENT_LIST',
  /** Patient profile appointments tab */
  PATIENT_PROFILE = 'PATIENT_PROFILE',
}

export function isBookingChannel(value: string): value is BookingChannel {
  return Object.values(BookingChannel).includes(value as BookingChannel);
}
```

**Decision**: Add `booking_channel` as an **optional** field to `Appointment` model.

**Justification**:
- **Pros**: Enables analytics (which entry point is most used), UX improvements (context-aware messaging)
- **Cons**: Adds a field that doesn't affect business logic
- **Decision**: Add as optional field. If not provided, leave `null`. This is audit/analytics metadata, not business logic.

---

### B.2 UI Context → AppointmentSource Mapping

**Rule**: All 3 frontdesk entry points map to the same `AppointmentSource`.

**Mapping**:

| UI Entry Point | URL Query `source` | BookingChannel | AppointmentSource |
|----------------|-------------------|----------------|-------------------|
| Dashboard Quick Book | `dashboard` | `DASHBOARD` | `FRONTDESK_SCHEDULED` |
| Patient List "Book" | `patients` | `PATIENT_LIST` | `FRONTDESK_SCHEDULED` |
| Patient Profile "Book" | `profile` | `PATIENT_PROFILE` | `FRONTDESK_SCHEDULED` |

**Implementation**:
```typescript
// app/frontdesk/appointments/new/page.tsx
const sourceParam = searchParams.get('source'); // 'dashboard' | 'patients' | 'profile'

// Map UI source to BookingChannel
const bookingChannel = sourceParam === 'dashboard' 
  ? BookingChannel.DASHBOARD
  : sourceParam === 'patients'
  ? BookingChannel.PATIENT_LIST
  : sourceParam === 'profile'
  ? BookingChannel.PATIENT_PROFILE
  : undefined;

// AppointmentSource is always FRONTDESK_SCHEDULED for frontdesk bookings
const appointmentSource = AppointmentSource.FRONTDESK_SCHEDULED;
```

**Key Point**: `BookingChannel` is for UI/analytics tracking. `AppointmentSource` is for business logic (status determination, role enforcement).

---

### B.3 Canonical Booking Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Entry Point (1 of 3)                                        │
│ - Dashboard Quick Book                                      │
│ - Patient List "Book"                                       │
│ - Patient Profile "Book"                                    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ /frontdesk/appointments/new                                 │
│ - Reads query params (patientId?, doctorId?, source)       │
│ - Maps source → BookingChannel                              │
│ - Sets AppointmentSource = FRONTDESK_SCHEDULED              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ AppointmentBookingForm Component                            │
│ - Step 1: Patient (pre-filled if from patient list/profile) │
│ - Step 2: Doctor (pre-filled if from dashboard)            │
│ - Step 3: Date/Time (slot selection)                        │
│ - Step 4: Details/Review                                    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ POST /api/appointments                                      │
│ - Validates request body (Zod schema)                       │
│ - Enforces role-based source rules                          │
│ - Calls ScheduleAppointmentUseCase                          │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ ScheduleAppointmentUseCase                                  │
│ - Validates availability (no conflicts)                     │
│ - Sets created_by_user_id (from userId param)               │
│ - Sets source (from DTO)                                    │
│ - Sets status = getDefaultStatusForSource(source)            │
│ - Sets booking_channel (optional, from DTO)                  │
│ - Creates Appointment record                                │
│ - Sends notifications                                       │
│ - Records audit event                                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Response: ApiResponse<AppointmentResponseDto>               │
│ - status: 201 (Created)                                     │
│ - data: AppointmentResponseDto                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ UI Success Handler                                          │
│ - Shows success toast                                        │
│ - Redirects based on entry point:                            │
│   - Dashboard → /frontdesk/appointments                     │
│   - Patient List → /frontdesk/appointments                  │
│   - Patient Profile → /frontdesk/patient/{id}?cat=appointments │
└─────────────────────────────────────────────────────────────┘
```

---

## C. Concurrency Strategy

### C.1 Decision: Validation-Only (No Slot Locking)

**Decision**: **Do NOT implement slot locking for appointment booking.**

**Justification**:

1. **Theater Booking Context is Different**:
   - Theater booking involves **provisional locks** with TTL (5 minutes) and a **confirm step**
   - This is necessary because theater scheduling is a **multi-step process** (select date → select theater → select slot → confirm)
   - Appointment booking is a **single-step process** (fill form → submit → done)

2. **Appointment Booking is Simpler**:
   - Form submission is atomic (single API call)
   - No multi-step confirmation flow
   - Conflict detection happens at creation time

3. **Database-Level Safety**:
   - Use **unique constraint** on `(doctor_id, appointment_date, time)` to prevent duplicates
   - Use **transaction isolation** (Prisma default: READ COMMITTED, sufficient for this use case)
   - Use **optimistic locking** via `version` field if needed (already exists in schema)

4. **Performance Considerations**:
   - Appointment booking is less concurrent than theater booking (fewer simultaneous users)
   - Validation query is fast (indexed lookup)
   - No need for lock TTL management overhead

5. **User Experience**:
   - Slot locking would require a "confirm" step, adding friction
   - Current flow is: select slot → submit → done (better UX)

**Alternative Considered**: Slot locking with TTL (like theater booking)
- **Rejected** because: Adds complexity without sufficient benefit, worse UX (extra confirm step)

---

### C.2 Conflict Detection Implementation

**Strategy**: Validate availability at creation time using transaction.

**Implementation**:

1. **Unique Constraint** (Database Level):
   ```prisma
   model Appointment {
     // ... fields ...
     @@unique([doctor_id, appointment_date, time])
   }
   ```
   - **Note**: This constraint may be too strict (what if doctor has multiple slots at same time?).
   - **Alternative**: Use composite index + application-level validation.

2. **Composite Index** (Recommended):
   ```prisma
   model Appointment {
     // ... fields ...
     @@index([doctor_id, appointment_date, time])
   }
   ```
   - Enables fast conflict queries
   - Allows application-level validation (can check slot overlap, not just exact match)

3. **Application-Level Validation**:
   ```typescript
   // ValidateAppointmentAvailabilityUseCase
   async validate(dto: ScheduleAppointmentDto): Promise<ValidationResult> {
     // Query existing appointments for doctor on same date
     const conflicts = await this.appointmentRepository.findConflicts(
       dto.doctorId,
       dto.appointmentDate,
       dto.time,
       dto.durationMinutes || 30
     );
     
     if (conflicts.length > 0) {
       throw new ConflictError('Appointment slot is already booked');
     }
     
     return { isAvailable: true };
   }
   ```

4. **Transaction Safety**:
   ```typescript
   // ScheduleAppointmentUseCase.execute()
   await this.prisma.$transaction(async (tx) => {
     // 1. Validate availability (within transaction)
     await this.validateAvailabilityUseCase.validate(dto);
     
     // 2. Create appointment (within same transaction)
     const appointment = await tx.appointment.create({ ... });
     
     return appointment;
   });
   ```

**Error Handling**:
- If unique constraint violation: Return `409 CONFLICT` with `ApiResponse` error
- If validation fails: Return `409 CONFLICT` with structured error message

---

## D. DTOs & Validation

### D.1 CreateAppointmentRequest Schema (Zod)

**Location**: `application/dtos/CreateAppointmentDto.ts` (or new file)

**Schema Definition**:
```typescript
import { z } from 'zod';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';

export const createAppointmentRequestSchema = z.object({
  // Required fields
  patientId: z.string().uuid('Patient ID must be a valid UUID'),
  doctorId: z.string().uuid('Doctor ID must be a valid UUID'),
  appointmentDate: z.coerce.date({
    required_error: 'Appointment date is required',
    invalid_type_error: 'Appointment date must be a valid date',
  }).refine(
    (date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    },
    { message: 'Appointment date cannot be in the past' }
  ),
  time: z.string().regex(
    /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
    'Time must be in HH:mm format (24-hour)'
  ),
  type: z.string().min(1, 'Appointment type is required'),
  
  // Optional fields
  durationMinutes: z.number().int().min(15).max(240).optional(),
  reason: z.string().max(1000).optional(),
  note: z.string().max(2000).optional(),
  
  // Source (optional, will be defaulted based on role)
  source: z.nativeEnum(AppointmentSource).optional(),
  
  // Booking channel (optional, for analytics)
  bookingChannel: z.nativeEnum(BookingChannel).optional(),
  
  // Follow-up linkage (optional)
  parentAppointmentId: z.number().int().positive().optional(),
  parentConsultationId: z.number().int().positive().optional(),
});

export type CreateAppointmentRequest = z.infer<typeof createAppointmentRequestSchema>;
```

**Validation Rules**:
- `patientId`, `doctorId`: Must be valid UUIDs
- `appointmentDate`: Must be a date, cannot be in the past
- `time`: Must be HH:mm format (24-hour)
- `type`: Required, non-empty string
- `durationMinutes`: Optional, 15-240 minutes (if not provided, use doctor's `SlotConfiguration.default_duration`)
- `source`: Optional, must be valid `AppointmentSource` enum (will be defaulted based on role)
- `bookingChannel`: Optional, must be valid `BookingChannel` enum

---

### D.2 Role-Based Source Validation

**Implementation**: In `POST /api/appointments` route handler, after Zod validation:

```typescript
// 1. Parse and validate request body
const validation = createAppointmentRequestSchema.safeParse(body);
if (!validation.success) {
  return handleApiError(ValidationError.fromZodError(validation.error));
}

// 2. Determine source (default if not provided)
let source = validation.data.source;
if (!source) {
  if (userRole === 'FRONTDESK') source = AppointmentSource.FRONTDESK_SCHEDULED;
  else if (userRole === 'ADMIN') source = AppointmentSource.ADMIN_SCHEDULED;
  else if (userRole === 'PATIENT') source = AppointmentSource.PATIENT_REQUESTED;
  else source = AppointmentSource.PATIENT_REQUESTED; // Default fallback
}

// 3. Enforce role-based source restrictions
if (userRole === 'PATIENT' && source !== AppointmentSource.PATIENT_REQUESTED) {
  return handleApiError(
    new ForbiddenError('Patients can only create patient-requested appointments')
  );
}
if (userRole === 'FRONTDESK' && source === AppointmentSource.DOCTOR_FOLLOW_UP) {
  return handleApiError(
    new ForbiddenError('Frontdesk cannot create doctor follow-up appointments')
  );
}
if (userRole === 'DOCTOR' && 
    source !== AppointmentSource.DOCTOR_FOLLOW_UP && 
    source !== AppointmentSource.PATIENT_REQUESTED) {
  return handleApiError(
    new ForbiddenError('Doctors can only create follow-up or patient-requested appointments')
  );
}
```

---

### D.3 Slot Field Validation

**Rules**:
- `time` format: HH:mm (24-hour)
- `durationMinutes`: If provided, must be 15-240 minutes
- If `durationMinutes` not provided, use doctor's `SlotConfiguration.default_duration` (default: 30)
- `appointmentDate` + `time` must not be in the past
- `appointmentDate` + `time` must be within doctor's working hours (validated by availability endpoint)

**Implementation**: Zod schema handles format validation. Business rules (working hours, availability) are validated in `ValidateAppointmentAvailabilityUseCase`.

---

## E. API Contract

### E.1 Standardized Response Format

**Rule**: All endpoints return `ApiResponse<T>` format.

**Success Response**:
```typescript
{
  success: true,
  data: AppointmentResponseDto,
  message?: string,  // Optional success message
  meta?: {            // Optional metadata (pagination, etc.)
    // ...
  }
}
```

**Error Response**:
```typescript
{
  success: false,
  code: ApiErrorCode,
  message: string,
  metadata?: {
    errors?: Array<{ field: string; message: string }>,
    // ... other metadata
  }
}
```

---

### E.2 POST /api/appointments Contract

**Endpoint**: `POST /api/appointments`

**Request Body**: `CreateAppointmentRequest` (validated by Zod schema)

**Success Response** (201 Created):
```typescript
ApiResponse<AppointmentResponseDto>
```

**Error Responses**:

| Status | Code | Scenario |
|--------|------|----------|
| 400 | `VALIDATION_ERROR` | Invalid request body (Zod validation failed) |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 403 | `FORBIDDEN` | Role cannot create appointments with specified source |
| 404 | `NOT_FOUND` | Patient or doctor not found |
| 409 | `CONFLICT` | Appointment slot is already booked (conflict detected) |
| 422 | `GATE_BLOCKED` | Business rule violation (e.g., slot outside working hours) |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error |

**Implementation**:
```typescript
// app/api/appointments/route.ts
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return handleApiError(new ForbiddenError('Authentication required'));
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const validation = createAppointmentRequestSchema.safeParse(body);
    if (!validation.success) {
      return handleApiError(ValidationError.fromZodError(validation.error));
    }

    // 3. Enforce role-based source rules (see D.2)

    // 4. Call use case
    const useCase = getScheduleAppointmentUseCase();
    const result = await useCase.execute(validation.data, authResult.user.userId);

    // 5. Return success
    return handleApiSuccess(result, 'Appointment created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

### E.3 Error Code Mapping

**Standard Mapping** (via `handleApiError`):

| Error Type | HTTP Status | ApiErrorCode |
|------------|-------------|--------------|
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ConflictError` | 409 | `CONFLICT` |
| `GateBlockedError` | 422 | `GATE_BLOCKED` |
| `DomainException` (generic) | 500 | `INTERNAL_SERVER_ERROR` |
| Unknown error | 500 | `INTERNAL_SERVER_ERROR` |

---

## F. Database Schema Changes

### F.1 New Fields

**Appointment Model**:
```prisma
model Appointment {
  // ... existing fields ...
  
  // NEW: Audit trail for who created the appointment
  created_by_user_id String?
  
  // NEW: UI entry point tracking (analytics)
  booking_channel    BookingChannel?
  
  // ... rest of fields ...
  
  // NEW: Relation to User (creator)
  created_by_user    User? @relation("AppointmentCreator", fields: [created_by_user_id], references: [id])
  
  // NEW: Composite index for conflict detection
  @@index([doctor_id, appointment_date, time])
}
```

**BookingChannel Enum** (add to Prisma schema):
```prisma
enum BookingChannel {
  DASHBOARD
  PATIENT_LIST
  PATIENT_PROFILE
}
```

**User Model** (add relation):
```prisma
model User {
  // ... existing fields ...
  created_appointments Appointment[] @relation("AppointmentCreator")
}
```

---

### F.2 Migration Strategy

1. **Add `created_by_user_id` field**:
   - Type: `String?` (nullable, for backward compatibility with existing appointments)
   - Migration: `ALTER TABLE "Appointment" ADD COLUMN "created_by_user_id" TEXT;`

2. **Add `booking_channel` field**:
   - Type: `BookingChannel?` (nullable enum)
   - Migration: Create enum type, add column

3. **Add composite index**:
   - Migration: `CREATE INDEX "Appointment_doctor_id_appointment_date_time_idx" ON "Appointment"("doctor_id", "appointment_date", "time");`

4. **Add foreign key constraint** (optional, for referential integrity):
   - Migration: `ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id");`

---

## G. Implementation Checklist

### Phase 3 Implementation Order

1. **Database (Prisma)**:
   - [ ] Add `BookingChannel` enum to schema
   - [ ] Add `created_by_user_id` field to `Appointment`
   - [ ] Add `booking_channel` field to `Appointment`
   - [ ] Add composite index `@@index([doctor_id, appointment_date, time])`
   - [ ] Add `created_by_user` relation to `User`
   - [ ] Generate migration: `pnpm prisma migrate dev --name add_appointment_audit_fields`

2. **Domain**:
   - [ ] Create `BookingChannel` enum in `domain/enums/BookingChannel.ts`
   - [ ] Fix `getDefaultStatusForSource()` in `domain/enums/AppointmentStatus.ts`
   - [ ] Update `ScheduleAppointmentUseCase` to:
     - [ ] Set `created_by_user_id` from `userId` parameter
     - [ ] Set `booking_channel` from DTO (if provided)
     - [ ] Use `getDefaultStatusForSource()` for status assignment

3. **Application DTOs**:
   - [ ] Create `CreateAppointmentRequest` Zod schema
   - [ ] Update `ScheduleAppointmentDto` to include `bookingChannel` (optional)

4. **API Routes**:
   - [ ] Refactor `POST /api/appointments` to:
     - [ ] Use Zod validation (`createAppointmentRequestSchema`)
     - [ ] Use `handleApiSuccess` / `handleApiError`
     - [ ] Return `ApiResponse<AppointmentResponseDto>`
     - [ ] Enforce role-based source rules
   - [ ] Update error responses to use standardized codes

5. **UI**:
   - [ ] Update `/frontdesk/appointments/new/page.tsx` to:
     - [ ] Map URL `source` param to `BookingChannel` enum
     - [ ] Pass `AppointmentSource.FRONTDESK_SCHEDULED` (enum, not string)
     - [ ] Pass `bookingChannel` to form
   - [ ] Update `AppointmentBookingForm` to:
     - [ ] Accept `bookingChannel` prop (optional)
     - [ ] Pass `bookingChannel` in API request

6. **Cleanup**:
   - [ ] Replace string literals with `AppointmentSource` enum in UI
   - [ ] Remove any duplicate booking form components
   - [ ] Update imports to use new enums

---

## H. Testing Requirements

### Unit Tests

1. **Status Mapping**:
   - `getDefaultStatusForSource('FRONTDESK_SCHEDULED')` → `SCHEDULED`
   - `getDefaultStatusForSource('ADMIN_SCHEDULED')` → `SCHEDULED`
   - `getDefaultStatusForSource('PATIENT_REQUESTED')` → `PENDING_DOCTOR_CONFIRMATION`
   - `getDefaultStatusForSource('DOCTOR_FOLLOW_UP')` → `SCHEDULED`

2. **Role-Source Enforcement**:
   - `FRONTDESK` can create `FRONTDESK_SCHEDULED`
   - `FRONTDESK` cannot create `DOCTOR_FOLLOW_UP`
   - `PATIENT` can only create `PATIENT_REQUESTED`
   - `DOCTOR` can create `DOCTOR_FOLLOW_UP` and `PATIENT_REQUESTED`

3. **Zod Schema Validation**:
   - Valid request passes
   - Invalid UUIDs fail
   - Past dates fail
   - Invalid time format fails
   - Missing required fields fail

---

### Integration/Contract Tests

1. **POST /api/appointments**:
   - ✅ `FRONTDESK` creates appointment → `SCHEDULED` status, `created_by_user_id` set
   - ✅ `PATIENT` creates appointment → `PENDING_DOCTOR_CONFIRMATION` status
   - ✅ `FRONTDESK` tries to create `DOCTOR_FOLLOW_UP` → `403 FORBIDDEN`
   - ✅ Conflict (same doctor/date/time) → `409 CONFLICT` with `ApiResponse` error
   - ✅ Invalid request body → `400 VALIDATION_ERROR` with field errors
   - ✅ Patient not found → `404 NOT_FOUND`
   - ✅ Response format is `ApiResponse<AppointmentResponseDto>`

---

## I. Summary

### Key Design Decisions

1. **Status Mapping**: Fixed bug where `FRONTDESK_SCHEDULED` incorrectly required doctor confirmation. Now maps to `SCHEDULED`.

2. **Booking Channel**: Added optional `booking_channel` field for UI/analytics tracking, separate from business logic (`AppointmentSource`).

3. **Concurrency**: Chose validation-only approach (no slot locking) because appointment booking is simpler than theater booking (single-step, less concurrent).

4. **API Standardization**: All endpoints return `ApiResponse<T>` format for consistency.

5. **Audit Trail**: Added `created_by_user_id` to track which frontdesk user created appointments.

### Breaking Changes

- **Status Behavior**: Frontdesk bookings will now create `SCHEDULED` appointments instead of `PENDING_DOCTOR_CONFIRMATION`. This is the intended behavior (no doctor confirmation needed for staff bookings).

### Non-Breaking Changes

- `booking_channel` is optional (backward compatible)
- `created_by_user_id` is nullable (backward compatible with existing appointments)
- API response format change (from `{ success: boolean }` to `ApiResponse<T>`) is backward compatible if clients check `success` field

---

## Next Steps

**STOP HERE** — Design phase complete. Wait for approval before proceeding to Phase 3 (Implementation).

Phase 3 will implement:
1. Database migrations
2. Domain layer updates
3. API route refactoring
4. UI updates
5. Tests
