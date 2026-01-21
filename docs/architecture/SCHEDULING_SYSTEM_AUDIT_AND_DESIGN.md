# Clinical Scheduling System - Critical Audit & Design

**Date:** January 2025  
**Status:** Design Phase  
**Author:** Principal Software Engineer

---

## PART 1 — CRITICAL AUDIT

### 1.1 Existing State Analysis

#### What EXISTS:

**Doctor Model:**
- ✅ Basic doctor profile fields (name, specialization, license, bio, education)
- ✅ `WorkingDay` model with day, start_time, end_time, is_available
- ✅ `UpdateDoctorAvailabilityUseCase` - Updates working days
- ✅ `UpdateDoctorProfileUseCase` - Updates profile fields
- ✅ API: `GET/PUT /api/doctors/:id/availability`
- ✅ API: `GET/PUT /api/doctors/:id/profile`

**Appointment Model:**
- ✅ Appointment entity with date, time, status
- ✅ `ScheduleAppointmentUseCase` - Creates appointments
- ✅ Double-booking prevention (checks existing appointments)
- ✅ Appointment status workflow (PENDING → SCHEDULED → COMPLETED)

**Consultation Workflow:**
- ✅ Consultation request submission
- ✅ Front desk review workflow
- ✅ Doctor consultation execution
- ✅ Consultation completion

#### What is MISSING (Critical Gaps):

### 1.2 Critical Gaps Identified

#### GAP 1: No Availability Validation in Scheduling
**Current State:**
- `ScheduleAppointmentUseCase` checks for double-booking (same doctor/date/time)
- **DOES NOT** check if appointment time falls within doctor's working hours
- **DOES NOT** check if doctor is available on that day
- **DOES NOT** validate against `WorkingDay` records

**Impact:**
- ❌ Front desk can book appointments outside doctor availability
- ❌ Appointments can be scheduled on days doctor doesn't work
- ❌ Appointments can be scheduled outside working hours
- ❌ Breaks real clinic operations (doctor unavailable but appointment exists)

**Example Failure:**
```
Doctor works: Mon-Fri 09:00-17:00
Front desk books: Saturday 10:00 AM
Result: Appointment created, doctor unavailable → Operational failure
```

#### GAP 2: No Slot-Based Booking System
**Current State:**
- Appointments use free-form `time` string (e.g., "10:00 AM")
- No standardized slot duration (30min, 45min, 60min)
- No slot generation from availability windows
- No buffer time between appointments

**Impact:**
- ❌ Cannot enforce consistent appointment durations
- ❌ Cannot calculate available slots for front desk
- ❌ Cannot prevent back-to-back bookings without buffer
- ❌ Front desk must manually calculate available times

**Example Failure:**
```
Doctor available: 09:00-17:00
Existing appointment: 10:00-10:30
Front desk tries to book: 10:15
Result: Overlapping appointments → Double-booking
```

#### GAP 3: No Break/Override System
**Current State:**
- `WorkingDay` only supports: day, start_time, end_time, is_available
- No lunch breaks
- No one-off date overrides (e.g., unavailable this Friday)
- No time-specific blocks (e.g., 13:00-14:00 unavailable)

**Impact:**
- ❌ Cannot model lunch breaks
- ❌ Cannot block specific dates (holidays, leave)
- ❌ Cannot handle irregular schedules
- ❌ Breaks real clinic operations (doctor on leave but appointments scheduled)

#### GAP 4: No Front Desk Availability View
**Current State:**
- Front desk can see appointments
- Front desk **CANNOT** see unified doctor availability calendar
- Front desk **CANNOT** query available slots for a date
- Front desk must guess availability or call doctor

**Impact:**
- ❌ Front desk cannot efficiently schedule consultations
- ❌ Front desk cannot see which doctors are available when
- ❌ Manual coordination required (phone calls, emails)
- ❌ Poor user experience, operational inefficiency

#### GAP 5: No Multi-Location Support
**Current State:**
- Doctor has `clinic_location` (string field)
- No location entity
- No location-specific availability
- No location-based scheduling

**Impact:**
- ❌ Cannot support multi-location clinics
- ❌ Cannot schedule based on location
- ❌ Blocks future scalability

#### GAP 6: No Doctor Self-Service Profile Management
**Current State:**
- `UpdateDoctorProfileUseCase` exists but:
  - No API endpoint for `/api/doctors/me/profile` (only `/api/doctors/:id/profile`)
  - No RBAC enforcement for self-service
  - Doctors cannot update their own profiles via UI

**Impact:**
- ❌ Doctors must contact admin to update profile
- ❌ Operational friction
- ❌ Profile data becomes stale

#### GAP 7: No Availability Repository/Service
**Current State:**
- `UpdateDoctorAvailabilityUseCase` uses `PrismaClient` directly
- No `IAvailabilityRepository` interface
- No domain service for availability calculations
- Availability logic scattered in use cases

**Impact:**
- ❌ Violates clean architecture (use case depends on infrastructure)
- ❌ Cannot test availability logic in isolation
- ❌ Difficult to extend (multi-location, breaks, overrides)

#### GAP 8: No Integration with Consultation Lifecycle
**Current State:**
- Consultation requests submitted → Front desk reviews → Doctor accepts
- **NO** availability checking during consultation request submission
- **NO** availability checking during front desk review
- **NO** automatic slot assignment

**Impact:**
- ❌ Consultation requests can be approved for unavailable times
- ❌ Manual coordination required
- ❌ Broken workflow integration

### 1.3 Missing Entities

1. **AvailabilitySlot** - Represents a bookable time slot
2. **AvailabilityOverride** - One-off date/time blocks (holidays, leave)
3. **AvailabilityBreak** - Recurring breaks (lunch, etc.)
4. **ClinicLocation** - Multi-location support (future)

### 1.4 Missing Use Cases

1. **GetMyAvailabilityUseCase** - Doctor views own availability
2. **GetAllDoctorsAvailabilityUseCase** - Front desk views all doctors
3. **GetAvailableSlotsForDateUseCase** - Get available slots for a date
4. **ValidateAppointmentAvailabilityUseCase** - Validate slot availability
5. **ScheduleConsultationUseCase** - Schedule with availability validation

### 1.5 Missing Relationships

1. **Appointment → WorkingDay** - No direct link
2. **Appointment → AvailabilitySlot** - No slot concept
3. **Doctor → AvailabilityOverride** - No override system
4. **Doctor → AvailabilityBreak** - No break system

### 1.6 Broken Assumptions

1. **Assumption:** "Time string is sufficient for scheduling"
   - **Reality:** Need slot-based system for consistency

2. **Assumption:** "Double-booking check is enough"
   - **Reality:** Must validate against availability windows

3. **Assumption:** "WorkingDay covers all availability needs"
   - **Reality:** Need breaks, overrides, slot durations

4. **Assumption:** "Front desk can manually coordinate"
   - **Reality:** Need automated availability visibility

### 1.7 Incomplete Domain Modeling

**Current Domain:**
```
Doctor → WorkingDay (day, start_time, end_time)
Appointment → (date, time, status)
```

**Required Domain:**
```
Doctor → AvailabilityWindow (recurring)
Doctor → AvailabilityOverride (one-off blocks)
Doctor → AvailabilityBreak (recurring breaks)
AvailabilityWindow → AvailabilitySlot (generated slots)
Appointment → AvailabilitySlot (booked slot)
```

---

## PART 2 — DOMAIN DESIGN

### 2.1 Schema Design

#### New Models:

```prisma
// Availability Override (one-off blocks: holidays, leave, etc.)
model AvailabilityOverride {
  id          String   @id @default(uuid())
  doctor_id   String
  start_date  DateTime
  end_date    DateTime
  reason      String?  // "Holiday", "Leave", "Emergency", etc.
  is_blocked  Boolean  @default(true) // true = unavailable, false = available
  
  doctor      Doctor   @relation(fields: [doctor_id], references: [id], onDelete: Cascade)
  
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
  
  @@index([doctor_id])
  @@index([start_date, end_date])
}

// Availability Break (recurring breaks: lunch, etc.)
model AvailabilityBreak {
  id           String   @id @default(uuid())
  doctor_id    String
  working_day_id Int?   // If null, applies to all days
  day_of_week  String?  // "Monday", "Tuesday", etc. (if working_day_id is null)
  start_time   String   // HH:mm format
  end_time     String   // HH:mm format
  reason       String?  // "Lunch", "Break", etc.
  
  doctor       Doctor   @relation(fields: [doctor_id], references: [id], onDelete: Cascade)
  working_day  WorkingDay? @relation(fields: [working_day_id], references: [id], onDelete: Cascade)
  
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt
  
  @@index([doctor_id])
  @@index([working_day_id])
}

// Slot Duration Configuration (per doctor)
model SlotConfiguration {
  id                String   @id @default(uuid())
  doctor_id         String   @unique
  default_duration  Int      @default(30) // minutes
  buffer_time       Int      @default(0)  // minutes between appointments
  slot_interval     Int      @default(15) // minutes (15min slots: 09:00, 09:15, 09:30, etc.)
  
  doctor            Doctor   @relation(fields: [doctor_id], references: [id], onDelete: Cascade)
  
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
  
  @@index([doctor_id])
}
```

#### Updated Models:

```prisma
model WorkingDay {
  id           Int     @id @default(autoincrement())
  doctor_id    String
  day          String  // Monday, Tuesday, etc.
  start_time   String  // HH:mm format
  end_time     String  // HH:mm format
  is_available Boolean @default(true)
  
  // NEW: Add breaks relation
  breaks       AvailabilityBreak[]
  
  doctor       Doctor  @relation(fields: [doctor_id], references: [id], onDelete: Cascade)
  
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt
  
  @@unique([doctor_id, day])
  @@index([doctor_id])
}

model Doctor {
  // ... existing fields ...
  
  // NEW: Add relations
  availability_overrides AvailabilityOverride[]
  availability_breaks    AvailabilityBreak[]
  slot_configuration     SlotConfiguration?
  
  // ... existing relations ...
}

model Appointment {
  // ... existing fields ...
  
  // NEW: Add slot tracking (optional, for future slot-based booking)
  slot_start_time String? // HH:mm format of slot start
  slot_duration   Int?    // minutes
  
  // ... existing relations ...
}
```

### 2.2 Domain Entities

#### AvailabilityWindow (Value Object)
```typescript
// Represents a recurring availability window (from WorkingDay)
export class AvailabilityWindow {
  constructor(
    private readonly dayOfWeek: string,
    private readonly startTime: string, // HH:mm
    private readonly endTime: string,   // HH:mm
    private readonly breaks: AvailabilityBreak[] = []
  ) {}
  
  // Generate available slots for a specific date
  generateSlots(date: Date, slotDuration: number, bufferTime: number): AvailabilitySlot[] {
    // Implementation: Generate slots excluding breaks
  }
  
  // Check if time falls within window (excluding breaks)
  isAvailable(time: string): boolean {
    // Implementation
  }
}
```

#### AvailabilitySlot (Value Object)
```typescript
export class AvailabilitySlot {
  constructor(
    private readonly startTime: Date,
    private readonly endTime: Date,
    private readonly duration: number, // minutes
    private readonly isAvailable: boolean
  ) {}
  
  // Check if slot conflicts with appointment
  conflictsWith(appointment: Appointment): boolean {
    // Implementation
  }
}
```

### 2.3 DTOs

#### UpdateDoctorProfileDto
```typescript
export interface UpdateDoctorProfileDto {
  readonly bio?: string;
  readonly education?: string;
  readonly focusAreas?: string;
  readonly professionalAffiliations?: string;
  readonly phone?: string;
  readonly address?: string;
  readonly clinicLocation?: string;
}
```

#### SetDoctorAvailabilityDto
```typescript
export interface SetDoctorAvailabilityDto {
  readonly doctorId: string;
  readonly workingDays: WorkingDayDto[];
  readonly slotConfiguration?: SlotConfigurationDto;
}

export interface WorkingDayDto {
  readonly day: string; // Monday, Tuesday, etc.
  readonly startTime: string; // HH:mm
  readonly endTime: string;   // HH:mm
  readonly isAvailable: boolean;
  readonly breaks?: AvailabilityBreakDto[];
}

export interface AvailabilityBreakDto {
  readonly startTime: string; // HH:mm
  readonly endTime: string;   // HH:mm
  readonly reason?: string;
}

export interface SlotConfigurationDto {
  readonly defaultDuration: number; // minutes
  readonly bufferTime: number;      // minutes
  readonly slotInterval: number;    // minutes
}
```

#### GetAvailableSlotsDto
```typescript
export interface GetAvailableSlotsDto {
  readonly doctorId: string;
  readonly date: Date;
  readonly duration?: number; // Optional: filter by slot duration
}
```

#### AvailableSlotResponseDto
```typescript
export interface AvailableSlotResponseDto {
  readonly startTime: string; // HH:mm
  readonly endTime: string;   // HH:mm
  readonly duration: number;  // minutes
  readonly isAvailable: boolean;
}
```

#### DoctorAvailabilityResponseDto
```typescript
export interface DoctorAvailabilityResponseDto {
  readonly doctorId: string;
  readonly doctorName: string;
  readonly specialization: string;
  readonly workingDays: WorkingDayDto[];
  readonly slotConfiguration?: SlotConfigurationDto;
  readonly overrides: AvailabilityOverrideDto[];
}
```

### 2.4 Validation Rules

1. **WorkingDay Validation:**
   - Day must be valid day name
   - Time format: HH:mm (24-hour)
   - End time > start time
   - No overlapping breaks

2. **AvailabilityOverride Validation:**
   - End date >= start date
   - No overlapping overrides for same doctor

3. **Slot Generation:**
   - Slots must fall within working hours
   - Slots must exclude breaks
   - Slots must exclude overrides
   - Slots must exclude existing appointments

4. **Appointment Scheduling:**
   - Must validate against availability windows
   - Must validate against overrides
   - Must validate against breaks
   - Must validate against existing appointments
   - Must respect slot duration and buffer time

### 2.5 Domain Invariants

1. **Doctor Availability Invariant:**
   - A doctor cannot have overlapping working days
   - A doctor cannot have overlapping overrides
   - Breaks must fall within working day hours

2. **Appointment Invariant:**
   - Appointment time must fall within doctor's available hours
   - Appointment cannot conflict with existing appointments
   - Appointment cannot be scheduled during breaks or overrides

3. **Slot Invariant:**
   - Slots are generated from availability windows
   - Slots exclude breaks and overrides
   - Slots exclude booked appointments

---

## PART 3 — REQUIRED USE CASES

### 3.1 Doctor Side Use Cases

#### UpdateDoctorProfileUseCase (ENHANCE)
**File:** `application/use-cases/UpdateDoctorProfileUseCase.ts`

**Changes:**
- Add RBAC check: Doctor can only update own profile (unless admin)
- Add validation for profile fields
- Support `/api/doctors/me/profile` endpoint

#### SetDoctorAvailabilityUseCase (NEW)
**File:** `application/use-cases/SetDoctorAvailabilityUseCase.ts`

**Purpose:**
- Update working days, breaks, slot configuration
- Replace `UpdateDoctorAvailabilityUseCase` (more comprehensive)

**Input:** `SetDoctorAvailabilityDto`
**Output:** `DoctorAvailabilityResponseDto`

**Business Rules:**
- Doctor can only update own availability (unless admin)
- Validate working days
- Validate breaks (must be within working hours)
- Validate slot configuration

#### GetMyAvailabilityUseCase (NEW)
**File:** `application/use-cases/GetMyAvailabilityUseCase.ts`

**Purpose:**
- Doctor views own availability (working days, breaks, overrides, slot config)

**Input:** `{ doctorId: string }`
**Output:** `DoctorAvailabilityResponseDto`

### 3.2 Front Desk Use Cases

#### GetAllDoctorsAvailabilityUseCase (NEW)
**File:** `application/use-cases/GetAllDoctorsAvailabilityUseCase.ts`

**Purpose:**
- Front desk views all doctors' availability for a date range
- Used for unified availability calendar

**Input:** `{ startDate: Date, endDate: Date, specialization?: string }`
**Output:** `DoctorAvailabilityResponseDto[]`

#### GetAvailableSlotsForDateUseCase (NEW)
**File:** `application/use-cases/GetAvailableSlotsForDateUseCase.ts`

**Purpose:**
- Get available time slots for a doctor on a specific date
- Used for front desk scheduling UI

**Input:** `GetAvailableSlotsDto`
**Output:** `AvailableSlotResponseDto[]`

**Business Rules:**
- Generate slots from working days
- Exclude breaks
- Exclude overrides
- Exclude existing appointments
- Respect slot duration and buffer time

#### ScheduleConsultationUseCase (NEW)
**File:** `application/use-cases/ScheduleConsultationUseCase.ts`

**Purpose:**
- Schedule consultation appointment with availability validation
- Replaces/enhances `ScheduleAppointmentUseCase` for consultation workflow

**Input:** `ScheduleConsultationDto` (extends `ScheduleAppointmentDto`)
**Output:** `AppointmentResponseDto`

**Business Rules:**
- Validate slot availability
- Validate against working hours
- Validate against breaks/overrides
- Validate against existing appointments
- Create appointment with SCHEDULED status

### 3.3 System Rules Use Cases

#### ValidateAppointmentAvailabilityUseCase (NEW)
**File:** `application/use-cases/ValidateAppointmentAvailabilityUseCase.ts`

**Purpose:**
- Validate if a time slot is available for booking
- Used by scheduling use cases

**Input:** `{ doctorId: string, date: Date, time: string, duration: number }`
**Output:** `{ isAvailable: boolean, reason?: string }`

**Business Rules:**
- Check working hours
- Check breaks
- Check overrides
- Check existing appointments
- Check buffer time

---

## PART 4 — API DESIGN

### 4.1 Doctor Endpoints

#### GET /api/doctors/me/profile
**Purpose:** Get current doctor's profile
**Auth:** DOCTOR (own profile)
**Response:** `DoctorResponseDto`

#### PUT /api/doctors/me/profile
**Purpose:** Update current doctor's profile
**Auth:** DOCTOR (own profile) or ADMIN
**Request:** `UpdateDoctorProfileDto`
**Response:** `DoctorResponseDto`

#### GET /api/doctors/me/availability
**Purpose:** Get current doctor's availability
**Auth:** DOCTOR (own availability)
**Response:** `DoctorAvailabilityResponseDto`

#### PUT /api/doctors/me/availability
**Purpose:** Update current doctor's availability
**Auth:** DOCTOR (own availability) or ADMIN
**Request:** `SetDoctorAvailabilityDto`
**Response:** `DoctorAvailabilityResponseDto`

### 4.2 Front Desk Endpoints

#### GET /api/doctors/availability
**Purpose:** Get all doctors' availability for date range
**Auth:** FRONTDESK, ADMIN
**Query Params:** `startDate`, `endDate`, `specialization?`
**Response:** `DoctorAvailabilityResponseDto[]`

#### GET /api/doctors/:id/slots
**Purpose:** Get available slots for a doctor on a date
**Auth:** FRONTDESK, ADMIN, DOCTOR
**Query Params:** `date`, `duration?`
**Response:** `AvailableSlotResponseDto[]`

#### POST /api/appointments
**Purpose:** Schedule appointment (with availability validation)
**Auth:** FRONTDESK, ADMIN
**Request:** `ScheduleAppointmentDto` (enhanced with availability validation)
**Response:** `AppointmentResponseDto`

---

## PART 5 — INTEGRATION WITH EXISTING SYSTEM

### 5.1 Integration Points

#### Consultation Workflow Integration
1. **Consultation Request Submission:**
   - Add availability check (optional: suggest available times)
   - Store preferred date/time

2. **Front Desk Review:**
   - Use `GetAvailableSlotsForDateUseCase` to show available slots
   - Validate proposed date/time against availability
   - Auto-assign slot if available

3. **Doctor Acceptance:**
   - Validate availability before accepting
   - Auto-schedule if slot available

#### Appointment Scheduling Integration
1. **Enhance `ScheduleAppointmentUseCase`:**
   - Add availability validation step
   - Use `ValidateAppointmentAvailabilityUseCase`
   - Throw `DomainException` if slot unavailable

2. **Update Appointment Creation:**
   - Store slot_start_time and slot_duration
   - Link to availability window (future)

#### RBAC Integration
1. **Doctor Self-Service:**
   - Add `/api/doctors/me/*` endpoints
   - Enforce: Doctor can only access own data (unless admin)

2. **Front Desk Access:**
   - Allow front desk to view all doctors' availability
   - Allow front desk to schedule appointments

#### Audit Logging Integration
1. **Availability Changes:**
   - Log when doctor updates availability
   - Log when overrides/breaks are added/removed

2. **Scheduling:**
   - Log availability validation results
   - Log slot assignments

### 5.2 Refactoring Required

#### Refactor `UpdateDoctorAvailabilityUseCase`
**Why:** Current implementation uses `PrismaClient` directly, violates clean architecture
**What:** 
- Create `IAvailabilityRepository` interface
- Move Prisma logic to `PrismaAvailabilityRepository`
- Use repository in use case

**How:**
```typescript
// Before
export class UpdateDoctorAvailabilityUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    // ...
  ) {}
}

// After
export class UpdateDoctorAvailabilityUseCase {
  constructor(
    private readonly availabilityRepository: IAvailabilityRepository,
    // ...
  ) {}
}
```

#### Refactor `ScheduleAppointmentUseCase`
**Why:** Missing availability validation
**What:**
- Add availability validation step
- Use `ValidateAppointmentAvailabilityUseCase`
- Throw exception if unavailable

**How:**
```typescript
// Add to ScheduleAppointmentUseCase.execute()
// Step 2.5: Validate availability
const availabilityCheck = await this.validateAppointmentAvailabilityUseCase.execute({
  doctorId: dto.doctorId,
  date: dto.appointmentDate,
  time: dto.time,
  duration: 30, // Default or from slot config
});

if (!availabilityCheck.isAvailable) {
  throw new DomainException(
    `Appointment time is not available: ${availabilityCheck.reason}`,
    { doctorId: dto.doctorId, date: dto.appointmentDate, time: dto.time }
  );
}
```

---

## PART 6 — ENGINEERING QUALITY

### 6.1 Clean Architecture Compliance

**Layers:**
- **Domain:** Entities, Value Objects, Interfaces
- **Application:** Use Cases, DTOs, Mappers
- **Infrastructure:** Repositories, Services
- **Interface:** API Routes, Controllers

**Dependencies:**
- Domain ← Application ← Infrastructure ← Interface
- No circular dependencies
- Interfaces in domain, implementations in infrastructure

### 6.2 Single Responsibility

- **Use Cases:** One business operation each
- **Repositories:** Data access only
- **Services:** Cross-cutting concerns (audit, notifications)
- **DTOs:** Data transfer only

### 6.3 Testability

- Use cases testable with mock repositories
- Domain logic testable in isolation
- Integration tests for API endpoints

### 6.4 Naming Conventions

- Use cases: `{Action}{Entity}UseCase`
- DTOs: `{Action}{Entity}Dto` or `{Entity}ResponseDto`
- Repositories: `I{Entity}Repository`
- Services: `I{Service}Service`

### 6.5 No Overengineering

- Start with core requirements
- Add complexity only when needed
- Multi-location support: Design for it, implement later

### 6.6 Real-World Clinic Logic

- Slot durations: 15min, 30min, 45min, 60min
- Buffer time: 5-15 minutes between appointments
- Working hours: Respect clinic hours
- Breaks: Lunch, admin time
- Overrides: Holidays, leave, emergency blocks

---

## IMPLEMENTATION PRIORITY

### Phase 1: Core Availability (Week 1)
1. ✅ Schema updates (WorkingDay, AvailabilityOverride, AvailabilityBreak, SlotConfiguration)
2. ✅ `IAvailabilityRepository` interface
3. ✅ `PrismaAvailabilityRepository` implementation
4. ✅ `GetMyAvailabilityUseCase`
5. ✅ `SetDoctorAvailabilityUseCase` (replaces UpdateDoctorAvailabilityUseCase)
6. ✅ API: `/api/doctors/me/availability` (GET/PUT)

### Phase 2: Front Desk Visibility (Week 2)
1. ✅ `GetAllDoctorsAvailabilityUseCase`
2. ✅ `GetAvailableSlotsForDateUseCase`
3. ✅ API: `/api/doctors/availability` (GET)
4. ✅ API: `/api/doctors/:id/slots` (GET)

### Phase 3: Scheduling Integration (Week 3)
1. ✅ `ValidateAppointmentAvailabilityUseCase`
2. ✅ Enhance `ScheduleAppointmentUseCase` with availability validation
3. ✅ `ScheduleConsultationUseCase` (for consultation workflow)
4. ✅ Update consultation workflow to use availability

### Phase 4: Doctor Profile Self-Service (Week 4)
1. ✅ Enhance `UpdateDoctorProfileUseCase` with RBAC
2. ✅ API: `/api/doctors/me/profile` (GET/PUT)

---

## KEY ARCHITECTURAL DECISIONS

1. **Slot-Based System:**
   - Why: Consistency, prevents overlaps, enables automation
   - Trade-off: Less flexible than free-form time, but necessary for clinic operations

2. **Availability Overrides:**
   - Why: Real clinics need to block dates (holidays, leave)
   - Design: Separate model for one-off blocks, not in WorkingDay

3. **Availability Breaks:**
   - Why: Lunch breaks, admin time are recurring
   - Design: Separate model, linked to WorkingDay or day-of-week

4. **Slot Configuration Per Doctor:**
   - Why: Different doctors have different slot durations
   - Design: Separate model, one per doctor

5. **Repository Pattern:**
   - Why: Clean architecture, testability
   - Design: Interface in domain, implementation in infrastructure

6. **Use Case Composition:**
   - Why: Reusability, single responsibility
   - Design: `ValidateAppointmentAvailabilityUseCase` used by scheduling use cases

---

**End of Design Document**
