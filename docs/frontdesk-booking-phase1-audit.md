# Frontdesk Booking Unification — Phase 1 Audit

## Executive Summary

This audit maps all frontdesk booking entry points, API routes, domain structures, and identifies inconsistencies across 3 booking paths. The goal is to unify these into ONE canonical booking flow with consistent UX, status rules, and slot selection.

**Date**: 2026-02-11  
**Scope**: Frontdesk booking flows only (excludes patient self-booking portal)

---

## 1. UI Entry Points Map

### 1.1 Entry Point 1: Frontdesk Dashboard → Quick Book from Available Doctor Card

**Location**: `app/frontdesk/dashboard/page.tsx`  
**Component**: `components/frontdesk/AvailableDoctorsPanel.tsx`

**Flow**:
1. Dashboard displays `AvailableDoctorsPanel` showing doctors with availability for today
2. User clicks "Quick Book" button on a doctor card
3. Navigates to: `/frontdesk/appointments/new?doctorId={doctorId}&source=dashboard`
4. `AppointmentBookingForm` is rendered with:
   - `initialDoctorId` pre-filled
   - `source="FRONTDESK_SCHEDULED"` (hardcoded in `new/page.tsx`)
   - `lockDoctor={false}` (user can change doctor)
   - `mode="full"` (default)

**Key Code**:
```typescript
// AvailableDoctorsPanel.tsx:78-80
const handleQuickBook = (doctor: DoctorAvailabilityWithUI) => {
  router.push(`/frontdesk/appointments/new?doctorId=${doctor.doctorId}&source=dashboard`);
};
```

**Status**: ✅ Uses canonical booking form

---

### 1.2 Entry Point 2: Patient List → "Book" Action

**Location**: `app/frontdesk/patients/page.tsx`

**Flow**:
1. User views patient list (`/frontdesk/patients`)
2. Clicks "Book" button in actions column (desktop) or "Book Appointment" button (mobile)
3. Navigates to: `/frontdesk/appointments/new?patientId={patientId}&source=patients`
4. `AppointmentBookingForm` is rendered with:
   - `initialPatientId` pre-filled
   - `source="FRONTDESK_SCHEDULED"` (hardcoded)
   - `lockDoctor={false}` (user selects doctor)
   - `mode="full"` (default)

**Key Code**:
```typescript
// patients/page.tsx:425
<Link href={`/frontdesk/appointments/new?patientId=${patient.id}&source=patients`}>
  <Button>Book</Button>
</Link>
```

**Status**: ✅ Uses canonical booking form

---

### 1.3 Entry Point 3: Patient Profile → Appointments Tab → "Book Appointment"

**Location**: `app/frontdesk/patient/[patientId]/page.tsx`  
**Component**: `components/patient/PatientAppointmentsPanel.tsx`

**Flow**:
1. User views patient profile (`/frontdesk/patient/{patientId}?cat=appointments`)
2. Clicks "Book Appointment" button (shown if no appointments exist, or in header)
3. Navigates to: `/frontdesk/appointments/new?patientId={patientId}&source=profile`
4. `AppointmentBookingForm` is rendered with:
   - `initialPatientId` pre-filled
   - `source="FRONTDESK_SCHEDULED"` (hardcoded)
   - `lockDoctor={false}` (user selects doctor)
   - `mode="full"` (default)
5. On success, redirects back to: `/frontdesk/patient/{patientId}?cat=appointments`

**Key Code**:
```typescript
// PatientAppointmentsPanel.tsx:122
<Link href={`/frontdesk/appointments/new?patientId=${patientId}&source=profile`}>
  <Button>Book Appointment</Button>
</Link>
```

**Status**: ✅ Uses canonical booking form

---

### 1.4 Shared Booking Form Component

**Location**: `components/appointments/AppointmentBookingForm.tsx`

**Features**:
- Multi-step form (Patient → Doctor → Date/Time → Details/Review)
- Supports pre-filled `initialPatientId`, `initialDoctorId`, `initialDate`, `initialTime`
- Uses `source` prop to determine booking context
- Calls `apiClient.post('/appointments', dto)` to create appointment
- Handles success/error with toast notifications

**Current Source Handling**:
- `source` prop is passed to form but hardcoded to `"FRONTDESK_SCHEDULED"` in `new/page.tsx:109`
- URL query param `source` is used only for UI context banner (dashboard/patients/profile)

**Status**: ⚠️ Source tracking exists but is not fully utilized

---

## 2. API Routes Map

### 2.1 Primary Appointment Creation Endpoint

**Route**: `POST /api/appointments`  
**File**: `app/api/appointments/route.ts`

**Current Implementation**:
- Accepts `CreateAppointmentRequest` body
- Validates `source` field (must be valid `AppointmentSource` enum)
- Role-based source restrictions:
  - `PATIENT` → only `PATIENT_REQUESTED`
  - `DOCTOR` → `DOCTOR_FOLLOW_UP` or `PATIENT_REQUESTED`
  - `FRONTDESK` → `FRONTDESK_SCHEDULED` or `PATIENT_REQUESTED` (cannot create `DOCTOR_FOLLOW_UP`)
  - `ADMIN` → any source
- Default source assignment:
  - `FRONTDESK` → `FRONTDESK_SCHEDULED` (if not provided)
  - `ADMIN` → `ADMIN_SCHEDULED` (if not provided)
  - `PATIENT` → `PATIENT_REQUESTED` (if not provided)
- Calls `ScheduleAppointmentUseCase.execute(dto, userId)`
- Returns `AppointmentResponseDto` with status 201

**Response Format**:
```typescript
{
  success: true,
  data: AppointmentResponseDto,
  message: 'Appointment created successfully'
}
```

**Status**: ✅ Uses use case pattern, but response format is NOT `ApiResponse<T>` (uses `success: boolean` instead of `ApiResponse<T>`)

---

### 2.2 Doctor Availability Endpoints

**Routes**:
- `GET /api/doctors/availability` — Get all doctors' availability for date range
- `GET /api/doctors/[id]/availability` — Get specific doctor's availability
- `GET /api/doctors/[id]/slots` — Get available time slots for a doctor on a specific date
- `GET /api/doctors/[id]/available-dates` — Get list of dates with availability

**Used By**:
- `AvailableDoctorsPanel` → `frontdeskApi.getDoctorsAvailability()`
- `AppointmentBookingForm` → `apiClient.get('/doctors/{id}/slots')` and `/doctors/{id}/available-dates`

**Status**: ✅ Functional, but not standardized to `ApiResponse<T>`

---

### 2.3 Slot Configuration Endpoints

**Routes**:
- `GET /api/doctors/[id]/availability` — Returns `SlotConfiguration` (default_duration, buffer_time, slot_interval)
- `PUT /api/doctors/[id]/availability` — Updates slot configuration

**Model**: `SlotConfiguration` (Prisma)
- `default_duration: Int` (default: 30 minutes)
- `buffer_time: Int` (default: 0 minutes)
- `slot_interval: Int` (default: 15 minutes)

**Status**: ✅ Exists, but slot computation logic may not be consistently applied

---

## 3. Domain & Database Structures

### 3.1 Appointment Model (Prisma)

**File**: `prisma/schema.prisma:293-342`

**Key Fields**:
```prisma
model Appointment {
  id                            Int                        @id @default(autoincrement())
  patient_id                    String
  doctor_id                     String
  appointment_date              DateTime
  time                          String
  status                        AppointmentStatus          @default(PENDING)
  type                          String
  note                          String?
  reason                        String?
  source                        AppointmentSource          @default(PATIENT_REQUESTED)
  slot_start_time               String?
  slot_duration                 Int?                       @default(30)
  duration_minutes              Int?
  parent_appointment_id         Int?
  parent_consultation_id        Int?
  // ... audit fields
  created_at                    DateTime                   @default(now())
  updated_at                    DateTime                   @updatedAt
  // ... relations
}
```

**Missing Fields** (for audit/tracking):
- ❌ `created_by_user_id: String?` — No field to track which frontdesk user created the appointment
- ✅ `source: AppointmentSource` — Exists
- ✅ `parent_appointment_id` — Exists (for follow-ups)
- ✅ `slot_duration` — Exists (but may not be consistently set)

**Indexes**:
- ✅ `patient_id` (via relation)
- ✅ `doctor_id` (via relation)
- ⚠️ No composite index on `(doctor_id, appointment_date, time)` for conflict detection

---

### 3.2 AppointmentStatus Enum

**File**: `domain/enums/AppointmentStatus.ts`

**Values**:
- `PENDING`
- `PENDING_DOCTOR_CONFIRMATION` ⚠️ **ISSUE**: Used for both PATIENT_REQUESTED and FRONTDESK_SCHEDULED
- `SCHEDULED`
- `CONFIRMED` (deprecated, use SCHEDULED)
- `CHECKED_IN`
- `IN_CONSULTATION`
- `COMPLETED`
- `CANCELLED`
- `NO_SHOW`

**Status Mapping Function**: `getDefaultStatusForSource(source: string)`

**Current Logic** (⚠️ **ISSUE**):
```typescript
case 'PATIENT_REQUESTED':
case 'FRONTDESK_SCHEDULED':  // ⚠️ Frontdesk bookings require doctor confirmation
case 'ADMIN_SCHEDULED':
  return AppointmentStatus.PENDING_DOCTOR_CONFIRMATION;
case 'DOCTOR_FOLLOW_UP':
  return AppointmentStatus.SCHEDULED;
```

**Problem**: Frontdesk bookings should NOT require doctor confirmation (staff-driven, trusted source).

---

### 3.3 AppointmentSource Enum

**File**: `domain/enums/AppointmentSource.ts`

**Values**:
- `PATIENT_REQUESTED` — Patient booked via portal
- `FRONTDESK_SCHEDULED` — Frontdesk staff booked
- `DOCTOR_FOLLOW_UP` — Doctor created follow-up
- `ADMIN_SCHEDULED` — Admin scheduled

**Status**: ✅ Well-defined

---

### 3.4 SlotConfiguration Model

**File**: `prisma/schema.prisma:280-291`

**Fields**:
- `default_duration: Int` (default: 30)
- `buffer_time: Int` (default: 0)
- `slot_interval: Int` (default: 15)

**Status**: ✅ Exists, but usage in slot computation needs verification

---

## 4. Current Workflows & Differences

### 4.1 Workflow Comparison

| Entry Point | Pre-filled | Source | Status After Creation | Doctor Confirmation Required? |
|------------|------------|--------|----------------------|-------------------------------|
| Dashboard Quick Book | `doctorId` | `FRONTDESK_SCHEDULED` | `PENDING_DOCTOR_CONFIRMATION` | ✅ Yes (incorrect) |
| Patient List "Book" | `patientId` | `FRONTDESK_SCHEDULED` | `PENDING_DOCTOR_CONFIRMATION` | ✅ Yes (incorrect) |
| Patient Profile "Book" | `patientId` | `FRONTDESK_SCHEDULED` | `PENDING_DOCTOR_CONFIRMATION` | ✅ Yes (incorrect) |

**Issue**: All three paths create appointments with `PENDING_DOCTOR_CONFIRMATION` status, requiring doctor confirmation. This contradicts the requirement that "frontdesk booking is staff-driven (no doctor confirm their own booking redundancy)".

---

### 4.2 Slot Selection Logic

**Current Implementation**:
- `AppointmentBookingForm` calls `/doctors/{id}/slots?date={date}` to get available slots
- Slots are computed server-side (likely in `app/api/doctors/[id]/slots/route.ts`)
- Slot computation should respect:
  - Doctor's `SlotConfiguration` (duration, buffer, interval)
  - Existing appointments (conflict detection)
  - Working days/hours

**Status**: ⚠️ Needs verification that slot computation uses `SlotConfiguration` consistently

---

### 4.3 Concurrency/Double-Booking Prevention

**Current Implementation**:
- `ScheduleAppointmentUseCase` calls `ValidateAppointmentAvailabilityUseCase`
- Validation checks for conflicts (same doctor, same date/time)
- Uses Prisma queries to check existing appointments

**Status**: ✅ Exists, but may need enhancement for slot-level locking (similar to theater booking)

---

## 5. Identified Issues & Gaps

### 5.1 P0 (Critical) Issues

1. **Status Mapping Incorrect for Frontdesk Bookings**
   - **Issue**: `getDefaultStatusForSource('FRONTDESK_SCHEDULED')` returns `PENDING_DOCTOR_CONFIRMATION`
   - **Expected**: Should return `SCHEDULED` (no doctor confirmation needed)
   - **Impact**: Frontdesk bookings require unnecessary doctor confirmation step
   - **Location**: `domain/enums/AppointmentStatus.ts:61-73`

2. **Missing `created_by_user_id` Field**
   - **Issue**: No audit trail for which frontdesk user created the appointment
   - **Expected**: Add `created_by_user_id: String?` to `Appointment` model
   - **Impact**: Cannot track who booked appointments for accountability
   - **Location**: `prisma/schema.prisma:293-342`

3. **API Response Format Inconsistency**
   - **Issue**: `/api/appointments` POST returns `{ success: boolean, data, message }` instead of `ApiResponse<T>`
   - **Expected**: Use `handleApiSuccess` / `handleApiError` from `app/api/_utils/handleApiError.ts`
   - **Impact**: Inconsistent error handling, harder to integrate with standardized clients
   - **Location**: `app/api/appointments/route.ts:323-518`

---

### 5.2 P1 (High Priority) Issues

4. **Source Context Not Fully Utilized**
   - **Issue**: URL query param `source` (dashboard/patients/profile) is only used for UI banner, not passed to API
   - **Expected**: Map UI source to `AppointmentSource` enum and pass to API
   - **Impact**: Cannot distinguish between dashboard quick book vs patient list booking in audit logs
   - **Location**: `app/frontdesk/appointments/new/page.tsx:109` (hardcoded `source="FRONTDESK_SCHEDULED"`)

5. **Slot Configuration Not Verified in Slot Computation**
   - **Issue**: Unclear if slot computation in `/api/doctors/[id]/slots` uses `SlotConfiguration` (duration, buffer, interval)
   - **Expected**: Verify and ensure slot computation respects doctor's slot config
   - **Impact**: Slots may not match doctor's configured duration/buffer
   - **Location**: `app/api/doctors/[id]/slots/route.ts` (needs review)

6. **Missing Composite Index for Conflict Detection**
   - **Issue**: No index on `(doctor_id, appointment_date, time)` for fast conflict queries
   - **Expected**: Add composite index to `Appointment` model
   - **Impact**: Slower conflict detection queries, potential performance issues
   - **Location**: `prisma/schema.prisma:293-342`

---

### 5.3 P2 (Medium Priority) Issues

7. **TypeScript Errors in Frontdesk Pages**
   - **Issue**: `app/frontdesk/appointments/page.tsx` has implicit `any` types (lines 209, 214, 220, 564)
   - **Expected**: Fix TypeScript errors with proper types
   - **Impact**: Type safety violations, potential runtime errors
   - **Location**: `app/frontdesk/appointments/page.tsx`

8. **Inconsistent Source Enum Usage**
   - **Issue**: UI uses string literals (`"FRONTDESK_SCHEDULED"`) instead of `AppointmentSource` enum
   - **Expected**: Import and use `AppointmentSource` enum in UI components
   - **Impact**: Risk of typos, no compile-time validation
   - **Location**: `app/frontdesk/appointments/new/page.tsx:109`

9. **No Slot-Level Locking Mechanism**
   - **Issue**: Concurrency prevention relies on validation at creation time, no optimistic locking
   - **Expected**: Consider slot-level lock (similar to theater booking) for high-concurrency scenarios
   - **Impact**: Race conditions possible if two users book same slot simultaneously
   - **Location**: `application/use-cases/ScheduleAppointmentUseCase.ts`

---

## 6. File Map

### 6.1 UI Pages & Components

| File | Purpose | Used By | Action |
|------|---------|---------|--------|
| `app/frontdesk/dashboard/page.tsx` | Dashboard with AvailableDoctorsPanel | Entry point 1 | Keep, verify source mapping |
| `components/frontdesk/AvailableDoctorsPanel.tsx` | Doctor cards with Quick Book | Dashboard | Keep, verify navigation |
| `app/frontdesk/patients/page.tsx` | Patient list with Book action | Entry point 2 | Keep, verify source mapping |
| `app/frontdesk/patient/[patientId]/page.tsx` | Patient profile | Entry point 3 | Keep |
| `components/patient/PatientAppointmentsPanel.tsx` | Appointments tab with Book button | Patient profile | Keep, verify source mapping |
| `app/frontdesk/appointments/new/page.tsx` | Booking form wrapper | All 3 entry points | Keep, fix source handling |
| `components/appointments/AppointmentBookingForm.tsx` | Shared booking form | All 3 entry points | Keep, verify slot computation |

---

### 6.2 API Routes

| Route | Method | Purpose | Action |
|-------|--------|---------|--------|
| `/api/appointments` | POST | Create appointment | Refactor to `ApiResponse<T>`, fix status mapping |
| `/api/appointments` | GET | List appointments | Keep (outside scope) |
| `/api/doctors/availability` | GET | Get all doctors' availability | Keep, verify `ApiResponse<T>` |
| `/api/doctors/[id]/availability` | GET | Get doctor availability | Keep, verify `ApiResponse<T>` |
| `/api/doctors/[id]/slots` | GET | Get available slots | Keep, verify slot computation |
| `/api/doctors/[id]/available-dates` | GET | Get available dates | Keep, verify `ApiResponse<T>` |

---

### 6.3 Domain & Services

| File | Purpose | Action |
|------|---------|--------|
| `domain/enums/AppointmentStatus.ts` | Status enum + mapping | Fix `getDefaultStatusForSource` for FRONTDESK_SCHEDULED |
| `domain/enums/AppointmentSource.ts` | Source enum | Keep |
| `application/use-cases/ScheduleAppointmentUseCase.ts` | Appointment creation logic | Keep, verify status assignment |
| `application/use-cases/ValidateAppointmentAvailabilityUseCase.ts` | Conflict detection | Keep, consider slot-level locking |
| `prisma/schema.prisma` (Appointment model) | Database schema | Add `created_by_user_id`, add composite index |

---

## 7. Prioritized Action Items

### Phase 2 (Target Design) Prerequisites

1. **Fix Status Mapping** (P0)
   - Update `getDefaultStatusForSource('FRONTDESK_SCHEDULED')` to return `SCHEDULED`
   - Update `getDefaultStatusForSource('ADMIN_SCHEDULED')` to return `SCHEDULED`
   - Only `PATIENT_REQUESTED` should require doctor confirmation

2. **Add `created_by_user_id` Field** (P0)
   - Add field to `Appointment` model
   - Update `ScheduleAppointmentUseCase` to set `created_by_user_id` from `userId` parameter
   - Create migration

3. **Standardize API Response Format** (P0)
   - Refactor `POST /api/appointments` to use `handleApiSuccess` / `handleApiError`
   - Ensure consistent `ApiResponse<T>` structure

4. **Map UI Source to AppointmentSource** (P1)
   - Create mapping: `dashboard` → `FRONTDESK_SCHEDULED`, `patients` → `FRONTDESK_SCHEDULED`, `profile` → `FRONTDESK_SCHEDULED`
   - Pass mapped source to API (currently hardcoded)

5. **Verify Slot Computation** (P1)
   - Review `app/api/doctors/[id]/slots/route.ts` to ensure it uses `SlotConfiguration`
   - Test that slots respect `default_duration`, `buffer_time`, `slot_interval`

6. **Add Composite Index** (P1)
   - Add `@@index([doctor_id, appointment_date, time])` to `Appointment` model
   - Create migration

---

## 8. Summary

### Current State
- ✅ All 3 entry points use the same canonical booking form (`AppointmentBookingForm`)
- ✅ Source tracking exists (`AppointmentSource` enum, `source` field in DB)
- ⚠️ Status mapping is incorrect (frontdesk bookings require doctor confirmation)
- ⚠️ API response format is inconsistent (not using `ApiResponse<T>`)
- ⚠️ Missing audit trail (`created_by_user_id`)

### Target State (After Phase 2)
- ✅ All 3 entry points create appointments with `SCHEDULED` status (no doctor confirmation)
- ✅ Consistent `ApiResponse<T>` format across all endpoints
- ✅ `created_by_user_id` tracks which frontdesk user created the appointment
- ✅ Slot computation respects doctor's `SlotConfiguration`
- ✅ Composite index for fast conflict detection

---

## Next Steps

**STOP HERE** — Wait for Phase 2 design approval before proceeding with implementation.

Phase 2 will define:
- Canonical booking flow state diagram
- DTOs and validation rules
- Status invariants (source → status mapping)
- Concurrency strategy (slot-level locking vs validation-only)
- UI routing rules for the 3 entry points
