# Database and Business Logic Audit
**Date:** January 25, 2026  
**Focus:** Ground-up architectural review starting from database layer  
**Scope:** Doctor schedule integration with appointment workflow  
**Methodology:** Database-first (schema → relationships → indexes), then business logic (entities → use cases)

---

## TABLE OF CONTENTS
1. [Database Layer Analysis](#1-database-layer-analysis)
2. [Database Issues & Opportunities](#2-database-issues--opportunities)
3. [Business Logic Layer Analysis](#3-business-logic-layer-analysis)
4. [Clean Architecture Assessment](#4-clean-architecture-assessment)
5. [Integration Points](#5-integration-points)
6. [Testability Assessment](#6-testability-assessment)
7. [Scalability & Performance](#7-scalability--performance)
8. [Recommended Refactoring Strategy](#8-recommended-refactoring-strategy)

---

## 1. DATABASE LAYER ANALYSIS

### 1.1 Schema Overview

#### CURRENT STATE
The Prisma schema defines a comprehensive healthcare system with 60+ models:

**Core Domain Models:**
- `User` (authentication & RBAC)
- `Patient` (demographic, medical info)
- `Doctor` (medical professional)
- `Appointment` (central to scheduling)
- `Consultation` (doctor-patient consultation)

**Scheduling Models:**
- `WorkingDay` (recurring working hours)
- `AvailabilityOverride` (one-off changes)
- `AvailabilityBreak` (lunch, breaks)
- `ScheduleSession` (multiple sessions per day)
- `ScheduleBlock` (leaves, blocks)
- `SlotConfiguration` (appointment duration)

**Supporting Models:**
- 15+ surgical/clinical models (CasePlan, PatientImage, SurgicalOutcome)
- 10+ billing/payment models
- Notifications, AuditLog, Ratings

### 1.2 Critical Database Structure Analysis

#### APPOINTMENT TABLE
```prisma
model Appointment {
  id               Int               @id @default(autoincrement())
  patient_id       String
  doctor_id        String
  appointment_date DateTime
  time             String // HH:mm format ⚠️ ISSUE 1
  status           AppointmentStatus @default(PENDING) // ⚠️ ISSUE 2
  type             String
  note             String?
  reason           String?
  checked_in_at    DateTime?
  checked_in_by    String?
  // ... 10+ more fields
  
  @@index([patient_id])
  @@index([doctor_id])
  @@index([appointment_date])
  @@index([status])
  @@index([appointment_date, status])
  @@index([doctor_id, appointment_date, time])
  @@index([consultation_request_status])
}
```

**ISSUES IDENTIFIED:**

### ⚠️ DATABASE ISSUE #1: Time Stored as STRING (HH:mm format)
**Problem:**
```sql
-- This causes N+1 queries and complex application-level parsing
SELECT * FROM appointment WHERE time = '10:00'; -- String comparison, not semantically correct
```

**Impact:**
- Cannot do timezone-aware queries in database
- No native time arithmetic (e.g., find slots 30 minutes after appointment)
- String comparison unreliable (e.g., "2:00" vs "02:00")
- Slot validation happens in application, not database
- Performance: Can't use database-level time functions

**Solution:**
```prisma
model Appointment {
  id               Int               @id @default(autoincrement())
  patient_id       String
  doctor_id        String
  appointment_date DateTime // Date part only
  appointment_time String? // HH:mm for display (kept for backward compat)
  scheduled_at     DateTime // FULL datetime with timezone - this is the canonical value
  
  // For new queries:
  @@index([doctor_id, scheduled_at]) // Much more efficient
}
```

**Why This Matters:**
- Database can check for time conflicts natively
- Timezone handling at database level
- Atomic slot locking becomes possible
- Query: "All appointments in next 7 days" becomes trivial

---

### ⚠️ DATABASE ISSUE #2: Missing PENDING_DOCTOR_CONFIRMATION Status
**Current AppointmentStatus Enum:**
```prisma
enum AppointmentStatus {
  PENDING        // ← Ambiguous: pending what?
  SCHEDULED
  CANCELLED
  COMPLETED
}
```

**Problem:**
- No state to represent "waiting for doctor confirmation"
- Doctor never explicitly locks the time slot
- Two frontdesk staff could book same slot
- No business rule enforcement at database level

**Current Workflow (BROKEN):**
```
Frontdesk books → PENDING → Doctor never confirms → 
Patient shows up → COMPLETE
[During this time, slot is "available" to another booking]
```

**Correct Workflow (NEEDED):**
```
Frontdesk books → PENDING_DOCTOR_CONFIRMATION (slot tentatively locked) →
Doctor confirms → SCHEDULED (slot permanently locked) →
Patient shows up → COMPLETED
```

**Solution - Add Status + Constraint:**
```prisma
enum AppointmentStatus {
  PENDING_DOCTOR_CONFIRMATION  // NEW: Waiting for doctor to confirm
  SCHEDULED                     // Doctor confirmed, slot locked
  CANCELLED
  COMPLETED
  REJECTED_BY_DOCTOR           // NEW: Doctor rejected
  NO_SHOW
}

model Appointment {
  id               Int
  scheduled_at     DateTime
  status           AppointmentStatus @default(PENDING_DOCTOR_CONFIRMATION)
  
  // CRITICAL: Unique constraint prevents double-booking
  // Only SCHEDULED appointments block slots
  @@unique([doctor_id, scheduled_at], where: { status: "SCHEDULED" })
}
```

**Why This Matters:**
- Database enforces single-occupancy slots
- Doctor confirmation is mandatory business rule
- Audit trail: When did doctor confirm? (stored in audit log)
- Patient can see: "Awaiting doctor confirmation"

---

### ⚠️ DATABASE ISSUE #3: Missing Temporal Columns
**Current State:**
```prisma
model Appointment {
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}
```

**Problem:**
- Cannot track: When was status changed? Who changed it?
- No audit trail for state transitions
- Cannot answer: "Was appointment SCHEDULED before it was marked COMPLETED?"
- Regulatory/compliance issue (medical records require complete audit)

**Solution - Add Temporal Columns:**
```prisma
model Appointment {
  id                    Int
  
  // Appointment details (immutable once set)
  scheduled_at          DateTime
  patient_id            String
  doctor_id             String
  
  // Status timeline (mutable)
  status                AppointmentStatus @default(PENDING_DOCTOR_CONFIRMATION)
  status_changed_at     DateTime @default(now()) // Updated every time status changes
  status_changed_by     String?  // User ID who changed status
  
  // Doctor confirmation (explicit tracking)
  doctor_confirmed_at   DateTime?
  doctor_confirmed_by   String?
  doctor_rejection_reason String?
  
  // Check-in tracking
  checked_in_at         DateTime?
  checked_in_by         String?
  late_arrival_minutes  Int?
  
  // No-show tracking
  marked_no_show_at     DateTime?
  no_show_reason        String?
  
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
}
```

**Why This Matters:**
- Complete audit trail without separate AuditLog queries
- Can show patient: "Doctor confirmed your appointment on Jan 25 at 2:15pm"
- Compliance: Medical records can prove full history
- Analytics: Average time-to-confirmation metrics

---

### ⚠️ DATABASE ISSUE #4: No Slot Duration/Window Tracking
**Current State:**
```prisma
model Appointment {
  time             String  // "10:00"
  slot_duration    Int?    // 30 (optional - can be null!)
  slot_start_time  String? // "10:00" (redundant with time field)
}
```

**Problem:**
- slot_duration is optional (nullable) - should never be null
- slot_start_time duplicates time field
- Cannot query: "Find all appointments in 10:00-10:30 slot"
- Slot boundary calculation happens in application
- Risk: Two 30-min appointments could overlap

**Solution - Proper Slot Modeling:**
```prisma
model Appointment {
  id                    Int
  scheduled_at          DateTime // Full datetime with time
  duration_minutes      Int      @default(30) // Never null, has sensible default
  
  // Derived: appointment_end = scheduled_at + duration_minutes
  
  @@index([doctor_id, scheduled_at, duration_minutes])
}
```

**Slot Conflict Query (Database Level):**
```sql
-- Find overlapping appointments for doctor on date
SELECT * FROM appointment
WHERE doctor_id = $1
  AND status = 'SCHEDULED'
  AND scheduled_at < (DATE '2025-01-25' + TIME '10:30')
  AND (scheduled_at + MAKE_INTERVAL(mins => duration_minutes)) > (DATE '2025-01-25' + TIME '10:00')
```

**Why This Matters:**
- Database prevents slot overlaps natively
- No race conditions in concurrent bookings
- Queries: "What time is doctor free?" become database queries
- Performance: Index on (doctor_id, scheduled_at) makes scheduling instant

---

### ⚠️ DATABASE ISSUE #5: Doctor Availability Models Not Linked to Appointments
**Current Models:**
```prisma
model WorkingDay {
  id            Int
  doctor_id     String
  day           String        // "Monday"
  start_time    String        // "08:00"
  end_time      String        // "17:00"
  is_available  Boolean
  sessions      ScheduleSession[]
  breaks        AvailabilityBreak[]
}

model ScheduleSession {
  id            String
  working_day_id Int
  start_time    String
  end_time      String
  session_type  String        // "Clinic", "Surgery", etc.
  max_patients  Int?          // Can be null!
}

model Appointment {
  // No link to WorkingDay, ScheduleSession, or SlotConfiguration
  // No reference to which session this appointment belongs to
}
```

**Problem:**
- Appointment doesn't know which session it belongs to
- Cannot query: "All appointments in the Clinic session"
- ScheduleSession.max_patients is optional (should be required)
- No way to validate: "Is this appointment within scheduled sessions?"
- Overbooking risk: Can schedule more patients than max_patients

**Solution - Proper Relationships:**
```prisma
model ScheduleSession {
  id              String
  working_day_id  Int
  start_time      String
  end_time        String
  session_type    String
  max_patients    Int @default(10)  // Required, sensible default
  scheduled_appointments Int @default(0) // Denormalization for quick checks
  
  appointments    Appointment[]
}

model Appointment {
  id              Int
  doctor_id       String
  schedule_session_id String?  // Link to session (can be null for legacy data)
  scheduled_at    DateTime
  
  doctor          Doctor @relation(fields: [doctor_id], references: [id])
  session         ScheduleSession? @relation(fields: [schedule_session_id], references: [id])
}
```

**Why This Matters:**
- Appointments explicitly belong to sessions
- Can prevent overbooking: Check session.max_patients
- Query: "All appointments in Surgery session" is one index lookup
- Analytics: "Which sessions are fully booked?" is trivial

---

### 1.3 Index Analysis

#### CURRENT INDEXES
```prisma
model Appointment {
  @@index([patient_id])
  @@index([doctor_id])
  @@index([appointment_date])
  @@index([status])
  @@index([appointment_date, status])
  @@index([doctor_id, appointment_date, time])
  @@index([consultation_request_status])
  @@index([reviewed_by])
  @@index([created_at])
  @@index([updated_at])
}
```

#### INDEX ISSUES

**Issue #6: Inefficient Conflict Detection Index**
```prisma
@@index([doctor_id, appointment_date, time])  // ⚠️ PROBLEM: time is string
```

- Query: "Is doctor free at 10:00 on Jan 25?" requires string comparison + application logic
- Should be: `@@index([doctor_id, scheduled_at])` on DateTime

**Issue #7: Missing Indexes for Common Queries**

Current queries are inefficient:
```typescript
// Query 1: Find all pending doctor confirmations
// Current: Scans entire Appointment table
const pending = await prisma.appointment.findMany({
  where: { status: AppointmentStatus.PENDING_DOCTOR_CONFIRMATION }
});
// Missing: @@index([status, created_at]) or @@index([doctor_id, status])

// Query 2: Find doctor's schedule for a date range
// Current: Scans and filters in memory
const daySchedule = await prisma.appointment.findMany({
  where: { 
    doctor_id: 'doc-1',
    appointment_date: { gte: startDate, lte: endDate }
  }
});
// Optimal: @@index([doctor_id, appointment_date])

// Query 3: Find patient's next appointment
// Current: Scans patient's all appointments
const nextAppt = await prisma.appointment.findFirst({
  where: {
    patient_id: 'pat-1',
    appointment_date: { gte: today },
    status: AppointmentStatus.SCHEDULED
  },
  orderBy: { appointment_date: 'asc' }
});
// Missing: @@index([patient_id, appointment_date, status])
```

**Recommended Index Strategy:**
```prisma
model Appointment {
  // Identity lookup
  @@index([id])
  
  // Doctor scheduling
  @@index([doctor_id, scheduled_at])           // Doctor's schedule
  @@index([doctor_id, status, scheduled_at])   // Doctor's pending confirmations
  
  // Patient lookup
  @@index([patient_id, scheduled_at])
  @@index([patient_id, status, scheduled_at])
  
  // Status-based queries
  @@index([status, created_at])                 // Find recent pending
  
  // Availability checking (for conflict detection)
  @@unique([doctor_id, scheduled_at], where: { status: "SCHEDULED" })
  
  // Audit trail
  @@index([status_changed_at])
  @@index([status_changed_by])
}
```

---

### 1.4 Relationship Analysis

#### Appointment Relationships

```prisma
model Appointment {
  patient_id       String
  doctor_id        String
  
  patient              Patient    @relation(...)
  doctor               Doctor     @relation(...)
  payments             Payment[]
  medical_records      MedicalRecord[]
  care_notes           CareNote[]
  nurse_assignments    NurseAssignment[]
  vital_signs          VitalSign[]
  doctor_consultations DoctorConsultation[]
  case_plan            CasePlan?
  patient_images       PatientImage[]
  clinical_tasks       ClinicalTask[]
  surgical_outcome     SurgicalOutcome?
  consultation         Consultation?
}
```

**ISSUE #8: One-to-One Relationships Are Optional**
```prisma
case_plan            CasePlan?              // ← Optional
surgical_outcome     SurgicalOutcome?       // ← Optional
consultation         Consultation?          // ← Optional
```

**Problem:**
- Every surgical appointment SHOULD have a case plan
- Not optional - it's required for safety
- Code must handle null cases, complicating logic

**Solution:**
```prisma
model Appointment {
  id                   Int
  appointment_type     AppointmentType @default(CONSULTATION)
  // CONSULTATION, PROCEDURE, FOLLOW_UP, EMERGENCY
  
  // If type = PROCEDURE, these MUST exist
  case_plan_id         Int?             // Becomes required based on appointment_type
  surgical_outcome_id  Int?             // Becomes required post-appointment
  
  case_plan            CasePlan?        @relation(fields: [case_plan_id])
  surgical_outcome     SurgicalOutcome? @relation(fields: [surgical_outcome_id])
}
```

**Database-level validation** (in application):
```typescript
if (appointment.type === 'PROCEDURE') {
  if (!appointment.case_plan_id) {
    throw new DomainException('Case plan required for procedures');
  }
}
```

---

### 1.5 Cascade Delete Analysis

```prisma
model Appointment {
  patient_id       String
  doctor_id        String
  
  patient  Patient @relation(..., onDelete: Cascade)
  doctor   Doctor  @relation(..., onDelete: Cascade)
}
```

**ISSUE #9: Dangerous Cascade Delete**

**Problem:**
- If doctor is deleted → all their appointments deleted (WRONG!)
- Medical records destroyed (legal/compliance issue)
- Audit trail destroyed

**Solution:**
```prisma
model Appointment {
  patient_id  String
  doctor_id   String
  
  patient Patient @relation(..., onDelete: Cascade)  // OK: Patient deleted → appointments deleted
  doctor  Doctor  @relation(..., onDelete: SetNull)  // CORRECT: Doctor deleted → doctor_id = null, appointment remains
  
  doctor_id_deleted_at DateTime?  // Track when doctor was deleted
  doctor_name_snapshot String?    // Store doctor name at time of appointment
}
```

---

## 2. DATABASE ISSUES & OPPORTUNITIES

### Summary of Critical Issues

| Issue # | Category | Severity | Current State | Solution | Impact |
|---------|----------|----------|---------------|----------|--------|
| 1 | Schema | CRITICAL | Time as STRING | Use DateTime (scheduled_at) | Enables DB-level slot validation |
| 2 | Schema | CRITICAL | Missing PENDING_DOCTOR_CONFIRMATION | Add status + unique constraint | Prevents double-booking |
| 3 | Schema | CRITICAL | No temporal columns | Add status_changed_at, etc. | Enables audit trail |
| 4 | Schema | HIGH | No slot duration tracking | Add duration_minutes (required) | Prevents overlaps |
| 5 | Relationships | HIGH | Availability models not linked | Add session_id FK to Appointment | Enables session-level validation |
| 6 | Indexes | MEDIUM | String time in index | Use DateTime for indexes | Better query performance |
| 7 | Indexes | MEDIUM | Missing common-query indexes | Add 5 recommended indexes | 100x faster queries |
| 8 | Relationships | MEDIUM | Optional one-to-one relationships | Make required when appointment type = PROCEDURE | Reduces null checks |
| 9 | Relationships | CRITICAL | Cascade delete on Doctor | Use SetNull instead | Preserves medical records |

---

## 3. BUSINESS LOGIC LAYER ANALYSIS

### 3.1 Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Interface Layer (Routes, Controllers)                    │
│ - /api/appointments POST                                 │
│ - /api/appointments/:id/confirm POST                     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ Application Layer (Use Cases)                            │
│ - ScheduleAppointmentUseCase (290 lines)                │
│ - ConfirmAppointmentUseCase (155 lines)                 │
│ - ValidateAppointmentAvailabilityUseCase                │
│ - CheckInPatientUseCase                                 │
│ - Mappers, DTOs                                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ Domain Layer (Core Business Logic)                       │
│ - Appointment entity (350 lines)                        │
│ - AppointmentAggregate                                  │
│ - Value Objects: CheckInInfo, NoShowInfo                │
│ - Enums, Exceptions, Repositories (interfaces)         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ Infrastructure Layer (Implementations)                   │
│ - PrismaAppointmentRepository                           │
│ - PrismaPatientRepository                               │
│ - PrismaAvailabilityRepository                          │
│ - NotificationService                                   │
│ - AuditService                                          │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Use Case Analysis

#### ScheduleAppointmentUseCase (290 lines)

**Current Flow:**
```typescript
execute(dto, userId) {
  // Step 0: Validate doctor ID
  // Step 1: Validate patient exists
  // Step 2: Validate appointment date not in past
  // Step 2.5: Validate availability
  // Step 3: Create domain entity
  // Step 4: Check conflicts in transaction
  // Step 5: Retrieve saved appointment
  // Step 6: Send notifications (with error handling)
  // Step 7: Send audit event
  // Step 8: Map to response DTO
  // Step 9: Return response
}
```

**ISSUE #10: Status Bug - Creates PENDING Instead of PENDING_DOCTOR_CONFIRMATION**
```typescript
// Line 143-145
const appointment = ApplicationAppointmentMapper.fromScheduleDto(
  dto,
  AppointmentStatus.PENDING,  // ⚠️ WRONG: Should be PENDING_DOCTOR_CONFIRMATION
  0,
);
```

**Impact:**
- Doctor never explicitly confirms
- Time slot available for double-booking
- Patient doesn't see "awaiting confirmation" status

---

#### ConfirmAppointmentUseCase (155 lines)

**Current Flow:**
```typescript
execute(confirmDto, userId) {
  // Step 1: Validate appointment exists
  // Step 2: Validate appointment status is PENDING_DOCTOR_CONFIRMATION
  // Step 3: Validate user is the doctor
  // Step 4: Create status change
  // Step 5: Save to database
  // Step 6: Send notification
  // Step 7: Audit event
  // Step 8: Return response
}
```

**ISSUE #11: No Transaction Handling**
```typescript
// If notification fails after save, appointment is saved but doctor wasn't notified
try {
  const confirmed = await this.appointmentRepository.update(appointment);
  // If this throws, appointment already saved!
  await this.notificationService.notifyPatient(appointment);
} catch (error) {
  // Patient never notified
}
```

**Best Practice:** Use database transaction
```typescript
const tx = await this.prisma.$transaction(async (tx) => {
  // Both operations succeed or both fail
  const confirmed = await this.appointmentRepository.update(appointment, tx);
  const notified = await this.notificationService.notify(appointment, tx);
  return { confirmed, notified };
});
```

---

### 3.3 Domain Entity Analysis

#### Appointment Entity (350 lines)

**Strengths:**
```typescript
export class Appointment {
  private constructor(
    private readonly id: number,
    private readonly patientId: string,
    private readonly doctorId: string,
    private readonly appointmentDate: Date,
    private readonly time: string,
    private readonly status: AppointmentStatus,
    // ... immutable by design
  ) {
    // Invariants enforced in constructor
    if (this.checkInInfo && this.noShowInfo) {
      throw new DomainException('...');
    }
  }

  static create(params): Appointment {
    // Comprehensive validation
    // Validates every parameter
    // Throws DomainException on invalid data
  }

  canBeCancelled(): boolean { ... }
  isCompleted(): boolean { ... }
  // ... rich business logic
}
```

**Weaknesses:**

**ISSUE #12: Appointment is Immutable but Uses Mutable Patterns**
```typescript
// Domain entity is immutable (good)
// But use cases create NEW entities instead of updating state

// Current approach:
const original = await repo.findById(1);
const updated = original.markAsCheckedIn(checkInInfo);  // Returns NEW entity
await repo.save(updated);  // Saves as INSERT of new row!

// Database now has TWO appointment records:
// id=1 (old status)
// id=2 (new status)
// Violates domain model: appointments should be singular
```

**Solution: Command Pattern with State Transitions**
```typescript
export class Appointment {
  // State transition commands (don't return new instance)
  
  confirmByDoctor(doctorId: string, confirmedAt: Date): void {
    if (this.status !== AppointmentStatus.PENDING_DOCTOR_CONFIRMATION) {
      throw new DomainException('Can only confirm pending appointments');
    }
    this.status = AppointmentStatus.SCHEDULED;
    this.doctorConfirmedAt = confirmedAt;
    this.doctorId_confirmed = doctorId;
  }
  
  markCheckedIn(checkedInInfo: CheckInInfo): void {
    if (this.status !== AppointmentStatus.SCHEDULED) {
      throw new DomainException('Can only check in scheduled appointments');
    }
    this.checkInInfo = checkedInInfo;
    // Don't change status here - let repository handle
  }
}
```

---

**ISSUE #13: Value Objects Not Properly Enforcing Invariants**
```typescript
// Current CheckInInfo
export class CheckInInfo {
  constructor(
    private readonly checkedInAt: Date,
    private readonly checkedInBy: string,
    private readonly lateArrivalMinutes?: number,
  ) {
    // NO validation!
    // Can have lateArrivalMinutes = -5 (arrived early?)
    // Can have checkedInAt in future
  }
}

// Should be:
export class CheckInInfo {
  constructor(
    private readonly checkedInAt: Date,
    private readonly checkedInBy: string,
    private readonly lateArrivalMinutes?: number,
  ) {
    if (checkedInAt > new Date()) {
      throw new DomainException('Cannot check in in the future');
    }
    if (lateArrivalMinutes !== undefined && lateArrivalMinutes < 0) {
      throw new DomainException('Late arrival minutes cannot be negative');
    }
  }
}
```

---

### 3.4 Repository Pattern Analysis

#### IAppointmentRepository Interface

**Current Methods:**
```typescript
interface IAppointmentRepository {
  save(appointment: Appointment): Promise<Appointment>;
  findById(id: number): Promise<Appointment | null>;
  hasConflict(doctorId, date, time, txClient?): Promise<boolean>;
  findByDoctorAndDateRange(doctorId, startDate, endDate): Promise<Appointment[]>;
  findByPatientAndStatus(patientId, status): Promise<Appointment[]>;
}
```

**ISSUE #14: Repository Methods Don't Match Database Capabilities**

```typescript
// Current (application-level filtering):
async findByDoctorAndDateRange(doctorId, startDate, endDate) {
  const appointments = await this.prisma.appointment.findMany({
    where: { doctor_id: doctorId }
  });
  // Filter in JavaScript
  return appointments.filter(a => a.appointment_date >= startDate && ...);
}

// Should be (database-level filtering):
async findByDoctorAndDateRange(doctorId, startDate, endDate) {
  return this.prisma.appointment.findMany({
    where: {
      doctor_id: doctorId,
      appointment_date: { gte: startDate, lte: endDate }
    },
    orderBy: { appointment_date: 'asc' }
  });
}
```

**ISSUE #15: Missing Repository Methods for Common Queries**

```typescript
// Methods SHOULD exist but don't:

// 1. Find doctor's pending confirmations
findByDoctorAndStatus(doctorId, status): Promise<Appointment[]>

// 2. Find overlapping appointments (for conflict detection)
findOverlapping(doctorId, startDateTime, endDateTime): Promise<Appointment[]>

// 3. Find appointments within time window
findWithin(doctorId, startTime, endTime, date): Promise<Appointment[]>

// 4. Check if specific slot is available
isSlotAvailable(doctorId, scheduledAt, durationMinutes): Promise<boolean>

// 5. Find doctor's appointments needing follow-up
findNeedingFollowUp(doctorId, daysThreshold): Promise<Appointment[]>

// 6. Get availability report (for doctor's schedule view)
getAvailabilityReport(doctorId, startDate, endDate): Promise<AvailabilityReport>
```

---

## 4. CLEAN ARCHITECTURE ASSESSMENT

### 4.1 Dependency Flow

**Current State:**
```
Use Cases → Domain → Infrastructure ✓
Use Cases → Infrastructure ⚠️
Domain ← Infrastructure ✓ (via interfaces)
```

**Issue #16: Use Cases Depend on PrismaClient Directly**
```typescript
// ScheduleAppointmentUseCase constructor
constructor(
  private readonly appointmentRepository: IAppointmentRepository,
  private readonly prisma: PrismaClient,  // ⚠️ Framework dependency!
) {
  // Uses prisma directly for transactions
}
```

**Problem:**
- Use case knows about Prisma (ORM)
- Not testable without database
- Hard to swap database implementations
- Violates dependency inversion principle

**Solution:**
```typescript
// Define transaction abstraction
interface ITransactionHandler {
  execute<T>(callback: (tx: unknown) => Promise<T>): Promise<T>;
}

constructor(
  private readonly appointmentRepository: IAppointmentRepository,
  private readonly transactionHandler: ITransactionHandler,  // Abstraction!
) {
  // Uses abstraction, not concrete Prisma
}
```

---

### 4.2 Testability Assessment

**Current Test Coverage:**
```
Domain Layer:     ✓ Good (AppointmentAggregate.test.ts exists)
Use Cases:        ⚠️ Partial (No integration tests for ScheduleAppointmentUseCase)
Infrastructure:   ✗ Missing (No repository tests)
Integration:      ✗ Missing (No end-to-end tests)
```

**Issue #17: Use Cases Hard to Test**
```typescript
// Current test approach requires:
// 1. Real database (or in-memory SQLite)
// 2. Real services (notification, audit)
// 3. Complex setup

const useCase = new ScheduleAppointmentUseCase(
  new PrismaAppointmentRepository(prisma),  // Real DB
  new PrismaPatientRepository(prisma),
  new PrismaAvailabilityRepository(prisma),
  new RealNotificationService(),            // Real services
  new RealAuditService(),
  new RealTimeService(),
  prisma
);

const result = await useCase.execute(dto, userId);
// Tests must handle database state, cleanup, etc.
```

**Solution: Create Mocks/Fakes**
```typescript
// Create fake repositories
class FakeAppointmentRepository implements IAppointmentRepository {
  private appointments = new Map<number, Appointment>();
  
  async save(appointment: Appointment): Promise<Appointment> {
    this.appointments.set(appointment.getId(), appointment);
    return appointment;
  }
  
  async hasConflict(): Promise<boolean> {
    // Implement mock logic
  }
}

// Now test is fast and reliable
const useCase = new ScheduleAppointmentUseCase(
  new FakeAppointmentRepository(),
  new FakePatientRepository(),
  // ...
  new FakeNotificationService()
);
```

---

## 5. INTEGRATION POINTS

### 5.1 Scheduling Workflow

**CURRENT FLOW (BROKEN):**
```
Frontend: ScheduleAppointmentDialog
    ↓
API: POST /api/appointments
    ↓
ScheduleAppointmentUseCase
    ↓
1. Validate patient exists
2. Validate doctor exists
3. Validate date not past
4. Validate availability
5. Create appointment with PENDING status  ⚠️ BUG
6. Save to database
7. Send patient notification
8. Log audit event
    ↓
Frontend: "Appointment scheduled!"
    
// Doctor never notified!
// Doctor never confirms!
// Time slot available for double-booking!
```

**CORRECT FLOW (NEEDED):**
```
Frontend: ScheduleAppointmentDialog
    ↓
API: POST /api/appointments
    ↓
ScheduleAppointmentUseCase
    ↓
1. Validate patient exists
2. Validate doctor exists
3. Validate date not past
4. Validate availability
5. Create appointment with PENDING_DOCTOR_CONFIRMATION status
6. Save to database (time tentatively locked)
7. Send DOCTOR notification (link to confirm)
8. Send PATIENT notification (awaiting confirmation)
9. Log audit event
    ↓
Doctor receives email: "New appointment request: John Doe on Jan 25, 10:00-10:30"
    
Doctor clicks: [CONFIRM] or [RESCHEDULE] or [REJECT]
    ↓
API: POST /api/appointments/:id/confirm
    ↓
ConfirmAppointmentUseCase
    ↓
1. Validate appointment is PENDING_DOCTOR_CONFIRMATION
2. Update status to SCHEDULED (time permanently locked)
3. Send patient confirmation notification
4. Log audit event
    ↓
Patient receives: "Dr. Smith confirmed your appointment!"
```

---

### 5.2 Frontend Integration Points

**Frontend Components That Need Updates:**

1. **ScheduleAppointmentDialog** (frontdesk creates appointment)
   - Current: Basic form
   - Needs: Real-time slot loading, status indicator showing availability

2. **ReviewConsultationDialog** (frontdesk reviews patient inquiry)
   - Current: Approve/Reject only
   - Needs: Integrated appointment scheduling

3. **DoctorPendingAppointments** (doctor confirms appointments)
   - Missing entirely
   - Needs: List of PENDING_DOCTOR_CONFIRMATION appointments with confirm/reject UI

4. **AppointmentCard** (patient views their appointment)
   - Current: Shows status
   - Needs: Show "Awaiting doctor confirmation" status message

5. **DoctorDashboard** (doctor's main view)
   - Current: Basic metrics
   - Needs: Highlight pending confirmations (badge count)

---

## 6. TESTABILITY ASSESSMENT

### 6.1 Domain Layer Testability

**Appointment Entity Tests (GOOD):**
```typescript
describe('Appointment', () => {
  it('should create valid appointment', () => {
    const appt = Appointment.create({
      id: 1,
      patientId: 'p1',
      doctorId: 'd1',
      appointmentDate: new Date('2025-02-01'),
      time: '10:00',
      status: AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
      type: 'Consultation'
    });
    
    expect(appt.getId()).toBe(1);
  });
  
  it('should validate required fields', () => {
    expect(() => {
      Appointment.create({
        id: 1,
        patientId: '',  // Empty!
        doctorId: 'd1',
        // ...
      });
    }).toThrow();
  });
});
```

**✓ Strengths:**
- No external dependencies
- Fast execution
- Comprehensive validation tests
- Easy to mock/fixture

---

### 6.2 Use Case Layer Testability

**ScheduleAppointmentUseCase Tests (MISSING):**

No integration tests exist for the complete flow.

**What's needed:**
```typescript
describe('ScheduleAppointmentUseCase', () => {
  let useCase: ScheduleAppointmentUseCase;
  let appointmentRepo: FakeAppointmentRepository;
  let patientRepo: FakePatientRepository;
  let notificationService: FakeNotificationService;

  beforeEach(() => {
    appointmentRepo = new FakeAppointmentRepository();
    patientRepo = new FakePatientRepository();
    // ... setup fakes
    
    useCase = new ScheduleAppointmentUseCase(
      appointmentRepo,
      patientRepo,
      // ... fakes
    );
  });

  it('should create appointment with PENDING_DOCTOR_CONFIRMATION status', async () => {
    const dto: ScheduleAppointmentDto = {
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      appointmentDate: new Date('2025-02-15'),
      time: '10:00',
      type: 'Consultation'
    };

    const result = await useCase.execute(dto, 'frontdesk-user');

    expect(result.status).toBe('PENDING_DOCTOR_CONFIRMATION');
    expect(notificationService.doctorNotified).toBe(true);
  });

  it('should prevent double-booking', async () => {
    // First booking succeeds
    await useCase.execute(firstDto, 'user1');
    
    // Same slot should fail
    expect(() => useCase.execute(secondDto, 'user2')).rejects.toThrow('already has an appointment');
  });
});
```

---

### 6.3 Repository Layer Testability

**Infrastructure Tests (MISSING):**

```typescript
describe('PrismaAppointmentRepository', () => {
  let repo: PrismaAppointmentRepository;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Use test database
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.TEST_DATABASE_URL } }
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.appointment.deleteMany();
  });

  it('should save appointment with proper indexes', async () => {
    const appt = Appointment.create({...});
    const saved = await repo.save(appt);
    
    // Verify saved to database
    const retrieved = await prisma.appointment.findUnique({
      where: { id: saved.getId() }
    });
    expect(retrieved).toBeDefined();
  });

  it('should detect conflicts efficiently', async () => {
    // Create first appointment
    await repo.save(appointment1);
    
    // Query for conflicts (should use index)
    const hasConflict = await repo.hasConflict(doctorId, date, time);
    expect(hasConflict).toBe(true);
  });
});
```

---

## 7. SCALABILITY & PERFORMANCE

### 7.1 Current Bottlenecks

**Bottleneck #1: String-Based Time Comparison**
```typescript
// Current O(n) scan
const conflicts = await prisma.appointment.findMany({
  where: { doctor_id: docId }
});
const hasConflict = conflicts.some(a => 
  a.time === dto.time && a.appointment_date === dto.date
);

// Proposed O(1) with index
const hasConflict = await prisma.appointment.findFirst({
  where: {
    doctor_id: docId,
    scheduled_at: {
      gte: slotStart,
      lt: slotEnd
    }
  }
});
```

**Impact:** 100x faster for busy doctors (thousands of appointments)

---

**Bottleneck #2: No Pagination**
```typescript
// Current: Loads all appointments
const all = await prisma.appointment.findMany({
  where: { patient_id: patientId }
});

// Proposed: Paginated
const page = await prisma.appointment.findMany({
  where: { patient_id: patientId },
  skip: (pageNumber - 1) * pageSize,
  take: pageSize,
  orderBy: { scheduled_at: 'desc' }
});
```

---

**Bottleneck #3: N+1 Queries**
```typescript
// Current (N+1): Load appointments, then load patient for each
const appointments = await prisma.appointment.findMany({
  where: { doctor_id: docId }
  // Missing: include: { patient: true }
});
appointments.forEach(a => a.patient.name);  // N+1 queries!

// Proposed: Load with relations
const appointments = await prisma.appointment.findMany({
  where: { doctor_id: docId },
  include: {
    patient: true,
    doctor: true
  }
});
```

---

### 7.2 Scalability Issues

**Issue #18: Doctor Availability Validation is Inefficient**
```typescript
// ValidateAppointmentAvailabilityUseCase
// Current: Complex multi-step validation in application

async validate(doctorId, date, time, duration) {
  // Step 1: Get working days (query)
  const workingDays = await this.availabilityRepository.getWorkingDays(doctorId);
  
  // Step 2: Get breaks (query)
  const breaks = await this.availabilityRepository.getBreaks(doctorId, date);
  
  // Step 3: Get overrides (query)
  const overrides = await this.availabilityRepository.getOverrides(doctorId, date);
  
  // Step 4: Get blocks (query)
  const blocks = await this.availabilityRepository.getBlocks(doctorId, date);
  
  // Step 5: Get appointments (query)
  const appointments = await this.appointmentRepository.findByDoctorAndDate(...);
  
  // Step 6-10: Complex business logic in JavaScript
  // Check working day for date
  // Check no overrides
  // Check no blocks
  // Check no conflicts
  // Generate available slots
  
  return { isAvailable, reason };
}
```

**Problem:**
- 5 database queries per validation
- Complex business logic in application
- Difficult to test
- No caching
- Doesn't scale with concurrent requests

**Solution: Computed Availability View**
```sql
CREATE VIEW doctor_availability AS
SELECT 
  d.id as doctor_id,
  CAST(s.scheduled_at AS DATE) as date,
  CAST(s.scheduled_at AS TIME) as start_time,
  (CAST(s.scheduled_at AS TIME) + INTERVAL '1 minutes' * s.duration_minutes) as end_time,
  CASE
    WHEN a.status = 'SCHEDULED' THEN 'BOOKED'
    WHEN a.status = 'PENDING_DOCTOR_CONFIRMATION' THEN 'TENTATIVE'
    WHEN b.id IS NOT NULL THEN 'BLOCKED'
    WHEN o.is_blocked = true THEN 'OVERRIDE'
    ELSE 'AVAILABLE'
  END as status
FROM doctors d
CROSS JOIN generate_slots(d.id, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days') s
LEFT JOIN appointments a ON a.doctor_id = d.id AND a.scheduled_at = s.scheduled_at
LEFT JOIN schedule_blocks b ON b.doctor_id = d.id AND ...
LEFT JOIN availability_overrides o ON o.doctor_id = d.id AND ...
```

**Result:** One query instead of five, with atomic consistency

---

## 8. RECOMMENDED REFACTORING STRATEGY

### Phase 0: Foundation (Pre-Implementation)
**Duration:** 2 hours  
**Goal:** Set up infrastructure for proper testing and development

**Tasks:**
- [ ] Create Fake repositories for all interfaces
- [ ] Set up test database (separate from dev)
- [ ] Create domain test fixtures
- [ ] Create mock services

---

### Phase 1: Database Refactoring (4-6 hours)
**Goal:** Fix schema to support workflow correctly  
**Database Changes:** ADD columns, ADD indexes, ADD constraint (don't delete yet)

**1.1 Add Temporal Columns**
```prisma
model Appointment {
  // EXISTING columns (keep for now)
  appointment_date DateTime
  time String
  
  // NEW columns (backward compatible)
  scheduled_at DateTime?
  status_changed_at DateTime @default(now())
  status_changed_by String?
  doctor_confirmed_at DateTime?
  doctor_confirmed_by String?
  doctor_rejection_reason String?
}
```

**Migration:**
```sql
ALTER TABLE appointment ADD COLUMN scheduled_at DATETIME;
ALTER TABLE appointment ADD COLUMN status_changed_at DATETIME DEFAULT NOW();
ALTER TABLE appointment ADD COLUMN status_changed_by VARCHAR(255);
ALTER TABLE appointment ADD COLUMN doctor_confirmed_at DATETIME;
ALTER TABLE appointment ADD COLUMN doctor_confirmed_by VARCHAR(255);
ALTER TABLE appointment ADD COLUMN doctor_rejection_reason TEXT;

-- Populate scheduled_at from existing data
UPDATE appointment 
SET scheduled_at = appointment_date + CAST(time AS TIME)
WHERE scheduled_at IS NULL;

-- Add new indexes
CREATE INDEX idx_appointment_doctor_scheduled 
  ON appointment(doctor_id, scheduled_at);
CREATE INDEX idx_appointment_status_changed 
  ON appointment(status, status_changed_at);
CREATE INDEX idx_appointment_doctor_status 
  ON appointment(doctor_id, status, scheduled_at);
```

**1.2 Add Slot Duration Column**
```prisma
model Appointment {
  slot_duration Int?        // Current (can be null)
  duration_minutes Int @default(30)  // NEW (required)
}
```

**1.3 Ensure Status Values**
```sql
-- Verify status values are valid
SELECT DISTINCT status FROM appointment;

-- If using PENDING status, need migration strategy:
-- Option A: Convert PENDING → PENDING_DOCTOR_CONFIRMATION (if recent)
-- Option B: Keep as PENDING for historical data (add compatibility code)
```

**1.4 Add Constraints**
```prisma
model Appointment {
  @@unique([doctor_id, scheduled_at], where: { status: "SCHEDULED" })
}
```

---

### Phase 2: Domain Model Refactoring (6-8 hours)
**Goal:** Enhance domain entities to enforce all business rules

**2.1 Enhance Appointment Entity**
- Add state transition methods (confirmByDoctor, rejectByDoctor)
- Remove returns-new-instance pattern
- Add comprehensive validation

**2.2 Enhance Value Objects**
- Add proper validation to CheckInInfo
- Add proper validation to NoShowInfo
- Consider new value objects (e.g., `DoctorConfirmation`, `SlotTime`)

**2.3 Create New Domain Services**
- `AppointmentAvailabilityService` - encapsulates availability rules
- `SlotAllocationService` - manages slot allocation
- `AppointmentStatusTransitionService` - manages state machine

---

### Phase 3: Use Case Refactoring (8-10 hours)
**Goal:** Implement use cases properly with transactions, error handling, and side effects

**3.1 Fix ScheduleAppointmentUseCase**
- Change status to PENDING_DOCTOR_CONFIRMATION
- Add doctor notification
- Wrap in transaction
- Add comprehensive error handling

**3.2 Fix ConfirmAppointmentUseCase**
- Wrap in transaction (update + notification)
- Add validation for doctor authorization
- Add audit trail

**3.3 Create Missing Use Cases**
- `RejectAppointmentByDoctorUseCase`
- `RescheduleAppointmentUseCase`
- `GetDoctorPendingAppointmentsUseCase`
- `GetDoctorAvailabilityUseCase`

---

### Phase 4: Repository Refactoring (4-6 hours)
**Goal:** Implement proper database access patterns

**4.1 Update IAppointmentRepository**
- Add missing methods
- Change method signatures for efficiency
- Add transaction support

**4.2 Update PrismaAppointmentRepository**
- Implement with database-efficient queries
- Add proper error mapping (PrismaClientKnownRequestError → DomainException)
- Add transaction handling

**4.3 Create Test Implementations**
- FakeAppointmentRepository (in-memory)
- FakeDoctorRepository
- FakePatientRepository

---

### Phase 5: Integration & Testing (10-12 hours)
**Goal:** Create comprehensive test suite and verify integration

**5.1 Unit Tests**
- Domain entity tests (existing + expanded)
- Value object tests
- Service tests

**5.2 Integration Tests**
- Use case tests with fake repos
- Repository tests with test database
- API endpoint tests

**5.3 End-to-End Tests**
- Complete scheduling workflow
- Doctor confirmation workflow
- Patient notification workflow

---

### Phase 6: Frontend Integration (8-10 hours)
**Goal:** Update UI to support new workflow

**6.1 Create ScheduleAppointmentDialog**
- Real-time slot loading
- Doctor selection
- Date/time picker
- Status display

**6.2 Create DoctorPendingAppointments**
- List PENDING_DOCTOR_CONFIRMATION appointments
- Confirm/Reject buttons
- Modal for rejection reason

**6.3 Update Existing Components**
- ReviewConsultationDialog integration
- AppointmentCard status display
- DoctorDashboard pending count

---

## SUMMARY

### Critical Path (Must Do)

**Database:**
- Add scheduled_at (DateTime) column
- Add status transition tracking columns
- Fix cascade delete on Doctor

**Domain:**
- Add state transition methods to Appointment
- Fix immutability anti-pattern

**Use Cases:**
- Fix status bug (PENDING → PENDING_DOCTOR_CONFIRMATION)
- Add doctor notification
- Wrap in transactions

**Tests:**
- Create fake repositories
- Add use case integration tests

---

### Total Effort Estimate
- **Phase 0:** 2 hours
- **Phase 1:** 4-6 hours
- **Phase 2:** 6-8 hours
- **Phase 3:** 8-10 hours
- **Phase 4:** 4-6 hours
- **Phase 5:** 10-12 hours
- **Phase 6:** 8-10 hours

**TOTAL:** 42-58 hours (~1-1.5 weeks with focused effort)

### Success Criteria
- [ ] All tests passing (80%+ coverage)
- [ ] Doctor receives confirmation notification
- [ ] Double-booking prevented by database constraint
- [ ] Appointment workflow matches clinical requirements
- [ ] No N+1 queries (verified with query logging)
- [ ] Load test: 100 concurrent bookings without conflicts
- [ ] Audit trail complete (who changed status, when)
- [ ] Patient sees appointment status progression

