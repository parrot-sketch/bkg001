# Doctor Schedule Integration - Complete Implementation Roadmap
**Date:** January 25, 2026  
**Scope:** Foundation-up refactoring from database to UI  
**Duration:** 6-8 weeks with focused effort  
**Team Size:** 2-3 developers  

---

## EXECUTIVE SUMMARY

This document outlines a comprehensive, ground-up implementation of the doctor schedule integration following Clean Architecture principles, with emphasis on:

1. **Database as Foundation** - Properly designed schema with indexes, constraints, temporal tracking
2. **Domain Purity** - Rich domain models with encapsulated business logic
3. **Clean Architecture** - Strict layer separation with testable, maintainable code
4. **Comprehensive Testing** - Unit tests (domain), integration tests (use cases), end-to-end tests (workflows)
5. **Scalability** - From day 1, designed for growth without refactoring

**What This Is NOT:**
- Quick patch job
- Band-aid fixes
- Copy-paste solutions

**What This IS:**
- Production-grade system design
- Fully testable and maintainable
- Follows healthcare data requirements
- Scales to 10,000+ appointments/month
- Complete audit trail for compliance

---

## PHASE BREAKDOWN

### PHASE 0: Infrastructure & Foundation (10-15 hours)

#### Goal
Set up proper development infrastructure for testing-driven development.

#### Deliverables

**0.1 Test Database Setup**
- Create separate test database (PostgreSQL test instance)
- Create database seeding scripts
- Document connection string management

**Files to Create:**
```
/tests/setup/database.ts          # Test DB initialization
/tests/setup/seed.ts              # Test data fixtures
/tests/setup/teardown.ts          # Cleanup after tests
/prisma/test-seed.ts              # Test data seeding
```

**0.2 Fake Repository Implementations**
- FakeAppointmentRepository (in-memory, 100 lines)
- FakeDoctorRepository (in-memory)
- FakePatientRepository (in-memory)
- FakeAvailabilityRepository (in-memory)
- FakeNotificationService (in-memory)
- FakeAuditService (in-memory)
- FakeTimeService (injectable time)

**Files to Create:**
```
/tests/fakes/FakeAppointmentRepository.ts
/tests/fakes/FakeDoctorRepository.ts
/tests/fakes/FakePatientRepository.ts
/tests/fakes/FakeAvailabilityRepository.ts
/tests/fakes/FakeNotificationService.ts
/tests/fakes/FakeAuditService.ts
/tests/fakes/FakeTimeService.ts
/tests/fakes/index.ts              # Export all fakes
```

**0.3 Test Fixtures & Builders**
- AppointmentBuilder (fluent API for creating test appointments)
- DoctorBuilder
- PatientBuilder
- Timestamp utilities

**Files to Create:**
```
/tests/builders/AppointmentBuilder.ts
/tests/builders/DoctorBuilder.ts
/tests/builders/PatientBuilder.ts
/tests/fixtures/index.ts
```

**0.4 Test Utilities**
- Custom Jest matchers
- Assertion helpers
- Database query helpers

**Files to Create:**
```
/tests/utils/matchers.ts
/tests/utils/assertions.ts
/tests/utils/database.ts
/jest.config.ts                    # Update
/vitest.config.ts                  # Update if using Vitest
```

**0.5 Documentation**
- Testing strategy document
- Development setup guide
- Code review checklist

**Estimated Effort:** 10-15 hours

**Success Criteria:**
- [ ] Test database can be provisioned in < 30 seconds
- [ ] All fakes work with the repository interfaces
- [ ] Fixtures can be created in < 5 lines of code
- [ ] New test can be written in < 10 minutes

---

### PHASE 1: Database Refactoring (8-12 hours)

#### Goal
Enhance database schema to support proper appointment workflow with temporal tracking and constraints.

#### Part 1.1: Add Temporal Tracking Columns (2 hours)

**Migration 0001: Add temporal columns to Appointment**

```prisma
model Appointment {
  // EXISTING (keep for backward compatibility during transition)
  appointment_date DateTime
  time             String
  
  // NEW (canonical datetime column)
  scheduled_at     DateTime?           // Full datetime
  
  // Status tracking
  status_changed_at DateTime @default(now())
  status_changed_by String?
  
  // Doctor confirmation (explicit tracking)
  doctor_confirmed_at DateTime?
  doctor_confirmed_by String?
  doctor_rejection_reason String?
  
  // Check-in tracking
  checked_in_at    DateTime?
  checked_in_by    String?
  late_arrival_minutes Int?
  
  // No-show tracking
  marked_no_show_at DateTime?
  no_show_reason   String?
}
```

**SQL Migration:**
```sql
-- Temporal columns
ALTER TABLE appointment ADD COLUMN scheduled_at TIMESTAMP;
ALTER TABLE appointment ADD COLUMN status_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE appointment ADD COLUMN status_changed_by VARCHAR(255);
ALTER TABLE appointment ADD COLUMN doctor_confirmed_at TIMESTAMP;
ALTER TABLE appointment ADD COLUMN doctor_confirmed_by VARCHAR(255);
ALTER TABLE appointment ADD COLUMN doctor_rejection_reason TEXT;

-- Data migration: populate scheduled_at from existing columns
UPDATE appointment 
SET scheduled_at = appointment_date::date + time::time
WHERE scheduled_at IS NULL;

-- Check-in tracking
ALTER TABLE appointment ALTER COLUMN checked_in_at DROP NOT NULL;
ALTER TABLE appointment ADD COLUMN late_arrival_minutes INTEGER;

-- No-show tracking
ALTER TABLE appointment ADD COLUMN marked_no_show_at TIMESTAMP;
ALTER TABLE appointment ADD COLUMN no_show_reason VARCHAR(255);

-- Make created_at, updated_at consistent
ALTER TABLE appointment ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
```

**Tests:**
```typescript
// tests/database/migrations/001-temporal-columns.test.ts
describe('Migration 0001: Temporal Columns', () => {
  it('should add all temporal columns', async () => {
    // Verify columns exist
    const columns = await getTableColumns('appointment');
    expect(columns).toContain('scheduled_at');
    expect(columns).toContain('status_changed_at');
  });

  it('should populate scheduled_at from existing data', async () => {
    // Verify data migration worked
    const appointments = await prisma.appointment.findMany();
    appointments.forEach(a => {
      expect(a.scheduled_at).toBeDefined();
    });
  });
});
```

**Duration:** 2 hours (including tests and verification)

---

#### Part 1.2: Add Duration & Slot Columns (1 hour)

**Migration 0002: Slot duration and configuration**

```prisma
model Appointment {
  // Make duration required (migrate existing nulls to 30)
  duration_minutes Int @default(30)
  
  // Remove redundant slot_start_time
  // slot_start_time removed (use scheduled_at instead)
}

model SlotConfiguration {
  // Existing model, verify all fields are properly required
  default_duration Int @default(30)  // ← Ensure not null
  buffer_time      Int @default(0)   // ← Ensure not null
  slot_interval    Int @default(15)  // ← Ensure not null
}
```

**SQL Migration:**
```sql
-- Update slot_duration to be non-null with sensible default
ALTER TABLE appointment 
  ALTER COLUMN duration_minutes SET DEFAULT 30,
  ALTER COLUMN duration_minutes SET NOT NULL;

-- Verify SlotConfiguration columns are NOT NULL
ALTER TABLE slot_configuration
  ALTER COLUMN default_duration SET NOT NULL,
  ALTER COLUMN buffer_time SET NOT NULL,
  ALTER COLUMN slot_interval SET NOT NULL;
```

**Duration:** 1 hour

---

#### Part 1.3: Add Indexes for Performance (2 hours)

**Migration 0003: Add performance indexes**

```prisma
model Appointment {
  // Doctor scheduling queries
  @@index([doctor_id, scheduled_at])
  @@index([doctor_id, status, scheduled_at])
  
  // Patient queries
  @@index([patient_id, scheduled_at])
  @@index([patient_id, status, scheduled_at])
  
  // Status-based queries
  @@index([status, created_at])
  
  // Audit trail
  @@index([status_changed_at])
  @@index([status_changed_by])
  
  // Unique constraint: Only one SCHEDULED appointment per doctor per time
  @@unique([doctor_id, scheduled_at], where: { status: "SCHEDULED" })
}
```

**SQL:**
```sql
CREATE INDEX idx_appt_doctor_scheduled ON appointment(doctor_id, scheduled_at);
CREATE INDEX idx_appt_doctor_status_scheduled ON appointment(doctor_id, status, scheduled_at);
CREATE INDEX idx_appt_patient_scheduled ON appointment(patient_id, scheduled_at);
CREATE INDEX idx_appt_patient_status_scheduled ON appointment(patient_id, status, scheduled_at);
CREATE INDEX idx_appt_status_created ON appointment(status, created_at);
CREATE INDEX idx_appt_status_changed ON appointment(status_changed_at);
CREATE INDEX idx_appt_status_changed_by ON appointment(status_changed_by);

-- Unique constraint for slot locking
ALTER TABLE appointment 
ADD CONSTRAINT unique_scheduled_appointments 
UNIQUE (doctor_id, scheduled_at) WHERE status = 'SCHEDULED';
```

**Tests:**
```typescript
// tests/database/indexes.test.ts
describe('Appointment Indexes', () => {
  it('should use doctor_scheduled index for doctor schedule query', async () => {
    const explain = await prisma.$queryRaw`
      EXPLAIN ANALYZE
      SELECT * FROM appointment 
      WHERE doctor_id = $1 AND scheduled_at >= $2
    `;
    expect(explain).toContain('Index Scan');
    expect(explain).not.toContain('Seq Scan');
  });

  it('should prevent double-booking with unique constraint', async () => {
    const appt1 = await createAppointment(docId, '2025-02-15 10:00', 'SCHEDULED');
    
    expect(() => 
      createAppointment(docId, '2025-02-15 10:15', 'SCHEDULED')
    ).rejects.toThrow('unique constraint');
  });
});
```

**Duration:** 2 hours (including tests and performance verification)

---

#### Part 1.4: Add Appointment Status Value (1 hour)

**Migration 0004: Add PENDING_DOCTOR_CONFIRMATION status**

```prisma
enum AppointmentStatus {
  PENDING_DOCTOR_CONFIRMATION  // NEW
  SCHEDULED
  CANCELLED
  COMPLETED
  REJECTED_BY_DOCTOR           // NEW
  NO_SHOW
}
```

**SQL:**
```sql
-- PostgreSQL: ALTER ENUM
ALTER TYPE "AppointmentStatus" ADD VALUE 'PENDING_DOCTOR_CONFIRMATION';
ALTER TYPE "AppointmentStatus" ADD VALUE 'REJECTED_BY_DOCTOR';

-- Update default value
ALTER TABLE appointment 
  ALTER COLUMN status SET DEFAULT 'PENDING_DOCTOR_CONFIRMATION';
```

**Duration:** 1 hour

---

#### Part 1.5: Add Link from Appointment to ScheduleSession (1 hour)

**Migration 0005: Link appointments to sessions**

```prisma
model Appointment {
  // NEW: Link to the session this appointment belongs to
  schedule_session_id String?
  
  // Relationships
  session ScheduleSession? @relation(fields: [schedule_session_id], references: [id], onDelete: SetNull)
}

model ScheduleSession {
  // NEW: Track appointments in this session
  appointments Appointment[]
  
  // NEW: Ensure max_patients is not null
  max_patients Int @default(10)
  
  // NEW: Denormalized count for quick checks
  scheduled_count Int @default(0)
}
```

**SQL:**
```sql
-- Add foreign key
ALTER TABLE appointment 
  ADD COLUMN schedule_session_id VARCHAR(255);

ALTER TABLE appointment
  ADD CONSTRAINT fk_appt_schedule_session
  FOREIGN KEY (schedule_session_id) 
  REFERENCES schedule_session(id)
  ON DELETE SET NULL;

-- Ensure ScheduleSession has sensible defaults
ALTER TABLE schedule_session
  ALTER COLUMN max_patients SET DEFAULT 10;

-- Add denormalized count column
ALTER TABLE schedule_session
  ADD COLUMN scheduled_count INT DEFAULT 0;
```

**Duration:** 1 hour

---

#### Part 1.6: Fix Doctor Cascade Delete (1 hour)

**Migration 0006: Fix cascade behaviors**

```prisma
model Appointment {
  doctor_id String
  
  // CHANGE: SetNull instead of Cascade
  doctor Doctor @relation(..., onDelete: SetNull)
  
  // NEW: Track when doctor was deleted
  doctor_deleted_at DateTime?
  doctor_name_snapshot String?  // Store doctor name at time of appointment
}
```

**SQL:**
```sql
-- Change cascade behavior
ALTER TABLE appointment
  DROP CONSTRAINT fk_appointment_doctor;

ALTER TABLE appointment
  ADD CONSTRAINT fk_appointment_doctor
  FOREIGN KEY (doctor_id)
  REFERENCES doctor(id)
  ON DELETE SET NULL;

-- Add snapshot columns
ALTER TABLE appointment
  ADD COLUMN doctor_deleted_at TIMESTAMP,
  ADD COLUMN doctor_name_snapshot VARCHAR(255);
```

**Duration:** 1 hour

---

#### Part 1.7: Verify & Document (1 hour)

**Tasks:**
- [ ] Run all migrations in test environment
- [ ] Verify data integrity
- [ ] Check query performance (use EXPLAIN ANALYZE)
- [ ] Document migration strategy in wiki
- [ ] Create rollback procedures
- [ ] Test on staging database

**Duration:** 1 hour

**PHASE 1 TOTAL:** 8-12 hours

**Success Criteria:**
- [ ] All migrations applied successfully
- [ ] Backward compatible (old code still works during transition)
- [ ] All indexes verified to be used (EXPLAIN shows "Index Scan")
- [ ] Unique constraint prevents double-booking
- [ ] All tests pass (95%+ pass rate)
- [ ] No data loss or corruption
- [ ] Query performance 10-100x better for common queries

---

### PHASE 2: Domain Layer Refactoring (12-16 hours)

#### Goal
Create rich domain models with proper state management, validation, and business logic.

#### Part 2.1: Enhance Appointment Entity (6 hours)

**Files to Create/Update:**
```
/domain/entities/Appointment.ts                  (UPDATE: expand from 350 to 500+ lines)
/domain/value-objects/SlotWindow.ts             (NEW: ~80 lines)
/domain/value-objects/AppointmentStatus.ts      (UPDATE: expand)
/domain/events/AppointmentScheduledEvent.ts     (NEW: ~40 lines)
/domain/events/AppointmentConfirmedEvent.ts     (NEW: ~40 lines)
/domain/events/AppointmentRejectedEvent.ts      (NEW: ~40 lines)
/tests/unit/domain/entities/Appointment.test.ts (UPDATE: comprehensive tests)
```

**Key Changes to Appointment Entity:**

1. **Add State Transition Methods**
   ```typescript
   export class Appointment {
     // Remove: markAsCheckedIn() that returns new instance
     // Add: confirmByDoctor() that modifies internal state
     
     confirmByDoctor(doctorId: string, confirmedAt: Date): void {
       if (this.status !== AppointmentStatus.PENDING_DOCTOR_CONFIRMATION) {
         throw new DomainException(
           'Can only confirm pending appointments',
           { currentStatus: this.status }
         );
       }
       
       if (doctorId !== this.doctorId) {
         throw new DomainException(
           'Doctor can only confirm their own appointments',
           { requester: doctorId, doctor: this.doctorId }
         );
       }
       
       this.status = AppointmentStatus.SCHEDULED;
       this.doctorConfirmedAt = confirmedAt;
       this.doctorConfirmedBy = doctorId;
       this.statusChangedAt = confirmedAt;
       this.statusChangedBy = doctorId;
       
       // Publish domain event for side effects
       this.addDomainEvent(
         new AppointmentConfirmedEvent(this.id, doctorId, confirmedAt)
       );
     }
     
     rejectByDoctor(doctorId: string, reason: string, rejectedAt: Date): void {
       if (this.status !== AppointmentStatus.PENDING_DOCTOR_CONFIRMATION) {
         throw new DomainException('Can only reject pending appointments');
       }
       
       this.status = AppointmentStatus.REJECTED_BY_DOCTOR;
       this.doctorRejectionReason = reason;
       this.statusChangedAt = rejectedAt;
       this.statusChangedBy = doctorId;
       
       this.addDomainEvent(
         new AppointmentRejectedEvent(this.id, doctorId, reason, rejectedAt)
       );
     }
     
     reschedule(newTime: SlotWindow, rescheduledBy: string): Appointment {
       // Create new appointment with same patient/doctor but different time
       const rescheduled = Appointment.create({
         id: 0, // Will be assigned by database
         patientId: this.patientId,
         doctorId: this.doctorId,
         appointmentDate: newTime.getDate(),
         time: newTime.getStartTime(),
         status: AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
         type: this.type,
         // Copy relevant fields
       });
       
       // Mark this one as cancelled with rescheduling reason
       this.status = AppointmentStatus.CANCELLED;
       this.statusChangedBy = rescheduledBy;
       this.statusChangedAt = new Date();
       
       this.addDomainEvent(
         new AppointmentRescheduledEvent(this.id, rescheduled.id, rescheduledBy)
       );
       
       return rescheduled;
     }
   }
   ```

2. **Add Domain Events**
   ```typescript
   // domain/events/AppointmentConfirmedEvent.ts
   export class AppointmentConfirmedEvent extends DomainEvent {
     constructor(
       public readonly appointmentId: number,
       public readonly doctorId: string,
       public readonly confirmedAt: Date
     ) {
       super(appointmentId.toString());
     }
   }
   ```

3. **Add Immutability Enforcement**
   - All constructor parameters private readonly
   - No setters
   - State changes only through methods
   - Proper copying for date objects

4. **Add Comprehensive Validation**
   ```typescript
   private validateScheduledAt(date: Date): void {
     if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
       throw new DomainException('Invalid scheduled date', { date });
     }
     
     // Cannot schedule in past
     if (date < new Date()) {
       throw new DomainException('Cannot schedule in past');
     }
     
     // Cannot schedule > 12 months in future (arbitrary limit)
     const maxFuture = new Date();
     maxFuture.setFullYear(maxFuture.getFullYear() + 1);
     if (date > maxFuture) {
       throw new DomainException('Cannot schedule > 12 months in future');
     }
   }
   ```

**Duration:** 6 hours (including comprehensive tests)

**Tests to Write:**
```typescript
describe('Appointment Entity', () => {
  describe('confirmByDoctor', () => {
    it('should change status to SCHEDULED', () => { });
    it('should set doctor confirmation timestamp', () => { });
    it('should emit AppointmentConfirmedEvent', () => { });
    it('should reject if already confirmed', () => { });
    it('should reject if different doctor', () => { });
  });

  describe('rejectByDoctor', () => {
    it('should change status to REJECTED_BY_DOCTOR', () => { });
    it('should store rejection reason', () => { });
    it('should emit AppointmentRejectedEvent', () => { });
  });

  describe('reschedule', () => {
    it('should create new appointment', () => { });
    it('should cancel original', () => { });
    it('should link original to new', () => { });
  });

  describe('validation', () => {
    it('should reject past dates', () => { });
    it('should reject dates > 12 months future', () => { });
    it('should validate patient/doctor IDs', () => { });
  });
});
```

---

#### Part 2.2: Create Value Objects for Scheduling (3 hours)

**Files to Create:**
```
/domain/value-objects/SlotWindow.ts              (NEW: ~120 lines)
/domain/value-objects/DoctorConfirmation.ts      (NEW: ~80 lines)
/domain/value-objects/AppointmentRejection.ts    (NEW: ~80 lines)
/tests/unit/domain/value-objects/SlotWindow.test.ts
```

**SlotWindow Value Object:**
```typescript
// domain/value-objects/SlotWindow.ts
export class SlotWindow {
  private constructor(
    private readonly date: Date,
    private readonly startTime: string,  // HH:mm format
    private readonly durationMinutes: number
  ) {
    // Immutable after construction
  }

  static create(params: {
    date: Date;
    startTime: string;
    durationMinutes: number;
  }): SlotWindow {
    // Validation
    if (!params.date || !(params.date instanceof Date)) {
      throw new DomainException('Invalid date');
    }

    if (!params.startTime.match(/^\d{2}:\d{2}$/)) {
      throw new DomainException('Start time must be HH:mm format');
    }

    if (params.durationMinutes <= 0 || params.durationMinutes > 480) {
      throw new DomainException('Duration must be 1-480 minutes');
    }

    return new SlotWindow(params.date, params.startTime, params.durationMinutes);
  }

  // Methods
  getDate(): Date {
    return new Date(this.date);  // Return copy
  }

  getStartTime(): string {
    return this.startTime;
  }

  getEndTime(): string {
    // Calculate end time
    const [hours, minutes] = this.startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + this.durationMinutes;
    return `${Math.floor(totalMinutes / 60).toString().padStart(2, '0')}:${(totalMinutes % 60).toString().padStart(2, '0')}`;
  }

  getDurationMinutes(): number {
    return this.durationMinutes;
  }

  // Check if two slots overlap
  overlapsWith(other: SlotWindow): boolean {
    if (!this.isSameDate(other.getDate())) {
      return false;
    }

    const thisStart = this.timeToMinutes(this.startTime);
    const thisEnd = thisStart + this.durationMinutes;
    const otherStart = this.timeToMinutes(other.getStartTime());
    const otherEnd = otherStart + other.getDurationMinutes();

    return thisStart < otherEnd && otherStart < thisEnd;
  }

  private isSameDate(other: Date): boolean {
    return this.date.toDateString() === other.toDateString();
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Equality
  equals(other: SlotWindow | null | undefined): boolean {
    if (!other) return false;
    return this.isSameDate(other.getDate()) &&
           this.startTime === other.getStartTime() &&
           this.durationMinutes === other.getDurationMinutes();
  }
}
```

**DoctorConfirmation Value Object:**
```typescript
// domain/value-objects/DoctorConfirmation.ts
export class DoctorConfirmation {
  private constructor(
    private readonly doctorId: string,
    private readonly confirmedAt: Date,
    private readonly confirmationNotes?: string
  ) {}

  static create(params: {
    doctorId: string;
    confirmedAt: Date;
    confirmationNotes?: string;
  }): DoctorConfirmation {
    if (!params.doctorId) throw new DomainException('Doctor ID required');
    if (!params.confirmedAt) throw new DomainException('Confirmation time required');
    if (params.confirmedAt > new Date()) {
      throw new DomainException('Cannot confirm in future');
    }

    return new DoctorConfirmation(
      params.doctorId,
      params.confirmedAt,
      params.confirmationNotes
    );
  }

  getDoctorId(): string { return this.doctorId; }
  getConfirmedAt(): Date { return new Date(this.confirmedAt); }
  getNotes(): string | undefined { return this.confirmationNotes; }
}
```

**Duration:** 3 hours (including tests)

---

#### Part 2.3: Create Domain Services (2 hours)

**Files to Create:**
```
/domain/services/AvailabilityCheckService.ts    (NEW: ~150 lines)
/domain/services/SlotAllocationService.ts       (NEW: ~100 lines)
/tests/unit/domain/services/AvailabilityCheckService.test.ts
```

**AvailabilityCheckService:**
```typescript
// domain/services/AvailabilityCheckService.ts
export class AvailabilityCheckService {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly availabilityRepository: IAvailabilityRepository
  ) {}

  /**
   * Checks if a slot is available for a doctor
   * 
   * @param doctorId Doctor's ID
   * @param slotWindow Time window to check
   * @param durationMinutes Appointment duration
   * @returns Whether slot is available
   */
  async isSlotAvailable(
    doctorId: string,
    slotWindow: SlotWindow,
    durationMinutes: number
  ): Promise<boolean> {
    // Check 1: Doctor exists and is active
    const doctor = await this.doctorRepository.findById(doctorId);
    if (!doctor) return false;

    // Check 2: Doctor is not on leave/blocked
    const hasBlock = await this.availabilityRepository.hasBlock(
      doctorId,
      slotWindow.getDate(),
      slotWindow.getStartTime()
    );
    if (hasBlock) return false;

    // Check 3: Doctor is scheduled to work this day/time
    const isWorking = await this.availabilityRepository.isWorkingAt(
      doctorId,
      slotWindow.getDate(),
      slotWindow.getStartTime()
    );
    if (!isWorking) return false;

    // Check 4: No overlapping appointments
    const hasConflict = await this.appointmentRepository.hasConflictingSlot(
      doctorId,
      slotWindow,
      durationMinutes
    );
    if (hasConflict) return false;

    // All checks passed
    return true;
  }

  /**
   * Get all available slots for a doctor on a given date
   */
  async getAvailableSlots(
    doctorId: string,
    date: Date,
    durationMinutes: number = 30
  ): Promise<SlotWindow[]> {
    // Complex logic to generate available slots
    // considering working hours, breaks, blocks, appointments
  }
}
```

**Duration:** 2 hours (including tests)

---

#### Part 2.4: Create Domain Event Infrastructure (2 hours)

**Files to Create:**
```
/domain/events/DomainEvent.ts                (NEW: ~50 lines)
/domain/events/DomainEventPublisher.ts       (NEW: ~80 lines)
/domain/events/AppointmentDomainEvents.ts    (NEW: ~120 lines)
/tests/unit/domain/events/DomainEvent.test.ts
```

**DomainEvent Base Class:**
```typescript
// domain/events/DomainEvent.ts
export abstract class DomainEvent {
  private readonly occurredAt: Date;

  constructor(
    private readonly aggregateId: string
  ) {
    this.occurredAt = new Date();
  }

  getAggregateId(): string {
    return this.aggregateId;
  }

  getOccurredAt(): Date {
    return this.occurredAt;
  }

  abstract getEventType(): string;
}
```

**Duration:** 2 hours (including tests)

---

#### Part 2.5: Create AppointmentAggregate Root (2 hours)

**Files to Create/Update:**
```
/domain/aggregates/AppointmentAggregate.ts  (UPDATE: expand)
/domain/aggregates/DoctorAvailabilityAggregate.ts (NEW: ~150 lines)
/tests/unit/domain/aggregates/AppointmentAggregate.test.ts (UPDATE)
```

**Aggregate responsibilities:**
- Ensures consistency between entities
- Manages transactions between related changes
- Publishes domain events

**Example:**
```typescript
export class AppointmentAggregate {
  constructor(
    private appointment: Appointment,
    private patientHistory: AppointmentHistory,
    private doctorSchedule: DoctorAvailability
  ) {
    this.ensureInvariants();
  }

  private ensureInvariants(): void {
    // Invariant: Patient cannot have two SCHEDULED appointments same time
    // Invariant: Doctor cannot have two SCHEDULED appointments overlapping
    // etc.
  }

  // Commands (state changes)
  confirmByDoctor(doctorId: string): void {
    this.appointment.confirmByDoctor(doctorId, new Date());
    this.doctorSchedule.updateSchedule(this.appointment);
  }

  rejectByDoctor(doctorId: string, reason: string): void {
    this.appointment.rejectByDoctor(doctorId, reason, new Date());
    this.doctorSchedule.freeSlot(this.appointment);
  }
}
```

**Duration:** 2 hours (including tests)

---

**PHASE 2 TOTAL:** 12-16 hours

**Success Criteria:**
- [ ] All domain entities fully tested (90%+ coverage)
- [ ] All value objects immutable and validated
- [ ] Domain events properly defined
- [ ] Aggregates enforce consistency
- [ ] No Prisma/framework dependencies in domain layer
- [ ] Business logic encapsulated in entities/services
- [ ] Domain model represents clinical workflows

---

### PHASE 3: Application Layer Implementation (10-14 hours)

#### Goal
Implement use cases with proper error handling, transaction management, and clean input/output contracts.

#### Part 3.1: Create/Update Use Cases (6 hours)

**Files to Create/Update:**
```
/application/use-cases/ScheduleAppointmentUseCase.ts        (UPDATE: major refactoring)
/application/use-cases/ConfirmAppointmentUseCase.ts         (UPDATE: add transaction)
/application/use-cases/RejectAppointmentUseCase.ts          (NEW: ~150 lines)
/application/use-cases/RescheduleAppointmentUseCase.ts      (NEW: ~200 lines)
/application/use-cases/GetDoctorPendingAppointmentsUseCase.ts (NEW: ~100 lines)
/application/use-cases/GetAvailableSlotsByDateUseCase.ts    (NEW: ~120 lines)
```

**ScheduleAppointmentUseCase (Refactored):**

```typescript
// This is the corrected version

export class ScheduleAppointmentUseCase {
  async execute(dto: ScheduleAppointmentDto, userId: string): Promise<AppointmentResponseDto> {
    // Step 0: Validate inputs
    this.validateInputs(dto);

    // Step 1: Load aggregates from database
    const patient = await this.patientRepository.findById(dto.patientId);
    if (!patient) throw new PatientNotFoundError(dto.patientId);

    const doctor = await this.doctorRepository.findById(dto.doctorId);
    if (!doctor) throw new DoctorNotFoundError(dto.doctorId);

    // Step 2: Validate business rules (within transaction)
    const appointment = await this.transactionHandler.execute(async (tx) => {
      // Step 2.1: Check availability
      const slotWindow = SlotWindow.create({
        date: dto.appointmentDate,
        startTime: dto.time,
        durationMinutes: 30  // From config or DTO
      });

      const isAvailable = await this.availabilityService.isSlotAvailable(
        dto.doctorId,
        slotWindow,
        30
      );

      if (!isAvailable) {
        throw new SlotNotAvailableError(dto.doctorId, slotWindow);
      }

      // Step 2.2: Create domain entity
      const appointment = Appointment.create({
        id: 0,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        appointmentDate: dto.appointmentDate,
        time: dto.time,
        status: AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,  // ✅ FIXED
        type: dto.type,
        note: dto.note
      });

      // Step 2.3: Save appointment (transactional)
      const savedAppointment = await this.appointmentRepository.save(
        appointment,
        tx
      );

      return savedAppointment;
    });

    // Step 3: Handle side effects (non-transactional)
    // These can fail without blocking the appointment creation

    // Step 3.1: Notify doctor
    try {
      await this.notificationService.sendDoctorConfirmationRequest(
        doctor,
        patient,
        appointment
      );
    } catch (error) {
      // Log but don't fail
      this.logger.error('Failed to notify doctor', error);
      // Could queue for retry
    }

    // Step 3.2: Notify patient
    try {
      await this.notificationService.sendPatientAppointmentScheduled(
        patient,
        doctor,
        appointment
      );
    } catch (error) {
      this.logger.error('Failed to notify patient', error);
    }

    // Step 3.3: Record audit event
    try {
      await this.auditService.recordEvent({
        userId,
        action: 'APPOINTMENT_SCHEDULED',
        aggregate: 'Appointment',
        aggregateId: appointment.getId(),
        details: {
          patientId: dto.patientId,
          doctorId: dto.doctorId,
          date: dto.appointmentDate
        }
      });
    } catch (error) {
      this.logger.error('Failed to record audit', error);
    }

    // Step 4: Return response
    return AppointmentMapper.toResponseDto(appointment);
  }

  private validateInputs(dto: ScheduleAppointmentDto): void {
    if (!dto.patientId?.trim()) {
      throw new InvalidInputError('Patient ID is required');
    }
    if (!dto.doctorId?.trim()) {
      throw new InvalidInputError('Doctor ID is required');
    }
    if (!dto.appointmentDate) {
      throw new InvalidInputError('Appointment date is required');
    }
    if (!dto.time?.match(/^\d{2}:\d{2}$/)) {
      throw new InvalidInputError('Time must be in HH:mm format');
    }
  }
}
```

**Duration:** 6 hours (2 hours per major use case)

---

#### Part 3.2: Create DTOs & Mappers (2 hours)

**Files to Create/Update:**
```
/application/dtos/ScheduleAppointmentDto.ts         (UPDATE)
/application/dtos/ConfirmAppointmentDto.ts          (UPDATE)
/application/dtos/GetAvailableSlotsDto.ts           (NEW)
/application/dtos/AppointmentResponseDto.ts         (UPDATE)
/application/mappers/AppointmentMapper.ts           (UPDATE)
/application/mappers/SlotWindowMapper.ts            (NEW)
```

**Key Principles:**
- DTOs immutable (readonly properties)
- DTOs validate structure, not business rules
- Mappers handle conversion (DTO → Domain → DTO)
- No business logic in mappers

**Duration:** 2 hours

---

#### Part 3.3: Error Handling & Custom Exceptions (1.5 hours)

**Files to Create:**
```
/application/exceptions/ApplicationException.ts     (NEW: base)
/application/exceptions/SlotNotAvailableError.ts   (NEW)
/application/exceptions/UnauthorizedError.ts        (NEW)
/application/exceptions/AppointmentNotFoundError.ts (NEW)
/application/exceptions/ConcurrencyError.ts         (NEW)
/application/exceptions/ErrorMapper.ts              (NEW: maps to HTTP)
```

**Error Handling Strategy:**

```typescript
// application/exceptions/ApplicationException.ts
export abstract class ApplicationException extends Error {
  abstract readonly httpStatusCode: number;
  abstract readonly errorCode: string;
  readonly details: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.details = details || {};
    Object.setPrototypeOf(this, ApplicationException.prototype);
  }
}

// application/exceptions/SlotNotAvailableError.ts
export class SlotNotAvailableError extends ApplicationException {
  readonly httpStatusCode = 409;  // Conflict
  readonly errorCode = 'SLOT_NOT_AVAILABLE';

  constructor(doctorId: string, slotWindow: SlotWindow) {
    super(
      `Slot not available for doctor ${doctorId} on ${slotWindow.getDate().toISOString()}`,
      { doctorId, slot: slotWindow }
    );
  }
}
```

**Duration:** 1.5 hours

---

#### Part 3.4: Dependency Injection Setup (1.5 hours)

**Files to Create/Update:**
```
/lib/use-case-factory.ts             (UPDATE: add new use cases)
/lib/dependency-container.ts         (UPDATE: expand)
/application/interfaces/IUseCase.ts  (NEW: use case contract)
```

**Goal:** Ensure clean dependency management with proper singleton patterns

**Duration:** 1.5 hours

---

**PHASE 3 TOTAL:** 10-14 hours

**Success Criteria:**
- [ ] All use cases follow same pattern (clear input/output)
- [ ] No PrismaClient in use case constructors (use abstraction)
- [ ] All errors properly typed and mapped
- [ ] Side effects separated from transaction logic
- [ ] Use cases testable with fake repositories
- [ ] DTOs properly validated
- [ ] Complete audit trail

---

### PHASE 4: Infrastructure Layer Implementation (6-8 hours)

#### Goal
Implement repositories with proper database access patterns and error handling.

#### Part 4.1: Enhance AppointmentRepository (3 hours)

**Files to Update:**
```
/domain/interfaces/repositories/IAppointmentRepository.ts    (UPDATE)
/infrastructure/repositories/PrismaAppointmentRepository.ts  (UPDATE: major refactoring)
```

**Key Improvements:**

1. **Add Missing Methods to Interface**
   ```typescript
   interface IAppointmentRepository {
     // Existing
     save(appointment: Appointment, tx?: unknown): Promise<Appointment>;
     findById(id: number, tx?: unknown): Promise<Appointment | null>;
     
     // NEW: Doctor's pending confirmations
     findPendingConfirmation(doctorId: string): Promise<Appointment[]>;
     
     // NEW: Check specific slot availability
     isSlotAvailable(doctorId: string, slotWindow: SlotWindow): Promise<boolean>;
     
     // NEW: Find overlapping appointments
     findOverlapping(doctorId: string, slotWindow: SlotWindow): Promise<Appointment[]>;
     
     // NEW: Get availability report
     getSlotAvailabilityReport(
       doctorId: string,
       startDate: Date,
       endDate: Date
     ): Promise<AvailabilityReport>;
     
     // NEW: Batch operations for performance
     findByIds(ids: number[], tx?: unknown): Promise<Appointment[]>;
   }
   ```

2. **Implement with Database Efficiency**
   ```typescript
   async findPendingConfirmation(doctorId: string): Promise<Appointment[]> {
     return this.prisma.appointment.findMany({
       where: {
         doctor_id: doctorId,
         status: 'PENDING_DOCTOR_CONFIRMATION'
       },
       orderBy: { appointment_date: 'asc' },
       include: { patient: true }  // Avoid N+1
     });
   }

   async isSlotAvailable(
     doctorId: string,
     slotWindow: SlotWindow
   ): Promise<boolean> {
     const conflictingAppt = await this.prisma.appointment.findFirst({
       where: {
         doctor_id: doctorId,
         status: 'SCHEDULED',
         // Simplified: check exact time (production would do interval overlap)
         scheduled_at: slotWindow.getDate()
       }
     });

     return !conflictingAppt;
   }
   ```

3. **Add Transaction Support**
   ```typescript
   async save(
     appointment: Appointment,
     tx?: PrismaClient | Prisma.TransactionClient
   ): Promise<Appointment> {
     const prismaClient = tx || this.prisma;

     try {
       const raw = await prismaClient.appointment.create({
         data: {
           patient_id: appointment.getPatientId(),
           doctor_id: appointment.getDoctorId(),
           appointment_date: appointment.getAppointmentDate(),
           time: appointment.getTime(),
           status: appointment.getStatus(),
           type: appointment.getType(),
           note: appointment.getNote(),
           scheduled_at: appointment.getScheduledAt(),
           duration_minutes: appointment.getDurationMinutes()
         }
       });

       return AppointmentMapper.toDomain(raw);
     } catch (error) {
       if (error instanceof Prisma.PrismaClientKnownRequestError) {
         if (error.code === 'P2002') {
           // Unique constraint violation (duplicate slot)
           throw new SlotAlreadyBookedError(appointment);
         }
       }
       throw new RepositoryError('Failed to save appointment', error);
     }
   }
   ```

4. **Add Error Mapping**
   - Map PrismaClientKnownRequestError to domain exceptions
   - Preserve domain semantics in error messages
   - Log infrastructure errors separately

**Duration:** 3 hours

---

#### Part 4.2: Create Testing Infrastructure (2 hours)

**Files to Create:**
```
/tests/integration/repositories/PrismaAppointmentRepository.test.ts
/tests/integration/repositories/shared.test-utils.ts
```

**Test Strategy:**

```typescript
describe('PrismaAppointmentRepository', () => {
  let repo: PrismaAppointmentRepository;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Use test database
  });

  afterEach(async () => {
    // Clean up
    await prisma.appointment.deleteMany();
  });

  describe('save', () => {
    it('should save appointment with proper fields', async () => {
      const appt = Appointment.create({...});
      const saved = await repo.save(appt);
      
      expect(saved.getId()).toBeGreaterThan(0);
      expect(saved.getPatientId()).toBe(appt.getPatientId());
    });

    it('should prevent double-booking with unique constraint', async () => {
      const appt1 = Appointment.create({...SCHEDULED...});
      await repo.save(appt1);

      const appt2 = Appointment.create({...SCHEDULED same slot...});
      await expect(repo.save(appt2)).rejects.toThrow(SlotAlreadyBookedError);
    });
  });

  describe('findPendingConfirmation', () => {
    it('should return only PENDING_DOCTOR_CONFIRMATION appointments', async () => {
      // Create mixed status appointments
      const pending = Appointment.create({status: PENDING_DOCTOR_CONFIRMATION});
      const scheduled = Appointment.create({status: SCHEDULED});
      
      await repo.save(pending);
      await repo.save(scheduled);

      const results = await repo.findPendingConfirmation(doctorId);
      expect(results.length).toBe(1);
      expect(results[0].getStatus()).toBe(PENDING_DOCTOR_CONFIRMATION);
    });
  });

  describe('query performance', () => {
    it('should use indexes for doctor schedule query', async () => {
      // Create many appointments
      // Query doctor's schedule
      // Verify index usage with EXPLAIN ANALYZE
    });
  });
});
```

**Duration:** 2 hours

---

#### Part 4.3: Add Domain Event Publishing (1.5 hours)

**Files to Create/Update:**
```
/infrastructure/services/DomainEventPublisher.ts (NEW: ~100 lines)
/infrastructure/services/EventBus.ts              (NEW: ~150 lines)
/application/handlers/AppointmentEventHandlers.ts (NEW: ~200 lines)
```

**Event Publishing Flow:**

```typescript
// When appointment is saved in repository:
async save(appointment: Appointment): Promise<Appointment> {
  const saved = await this.prisma.appointment.create({...});
  const domainAppt = AppointmentMapper.toDomain(saved);

  // Publish domain events
  const events = appointment.getDomainEvents();
  await this.eventBus.publish(...events);

  return domainAppt;
}

// Event handlers subscribe to events and execute side effects:
@EventHandler(AppointmentConfirmedEvent)
async onAppointmentConfirmed(event: AppointmentConfirmedEvent) {
  // Notify patient
  // Send SMS
  // Update external calendars
  // etc.
}
```

**Duration:** 1.5 hours

---

**PHASE 4 TOTAL:** 6-8 hours

**Success Criteria:**
- [ ] All repository methods properly implemented
- [ ] Database queries use indexes (EXPLAIN verified)
- [ ] Error mapping from infrastructure to domain exceptions
- [ ] Transaction support tested
- [ ] No N+1 queries in tests
- [ ] Event publishing working
- [ ] Repository tests have 90%+ pass rate

---

### PHASE 5: Comprehensive Testing (12-16 hours)

#### Goal
Achieve 85%+ test coverage with unit, integration, and end-to-end tests.

#### Part 5.1: Unit Tests for Domain Layer (4 hours)

**Expand existing tests:**
```
/tests/unit/domain/entities/Appointment.test.ts           (UPDATE: +200 tests)
/tests/unit/domain/aggregates/AppointmentAggregate.test.ts (UPDATE: +150 tests)
/tests/unit/domain/value-objects/SlotWindow.test.ts       (NEW: +100 tests)
/tests/unit/domain/services/AvailabilityCheckService.test.ts (NEW: +150 tests)
```

**Coverage Target:** 95%+ of domain layer

**Example Test:**
```typescript
describe('Appointment.confirmByDoctor', () => {
  let appointment: Appointment;

  beforeEach(() => {
    appointment = Appointment.create({
      id: 1,
      patientId: 'p1',
      doctorId: 'd1',
      appointmentDate: new Date('2025-02-15'),
      time: '10:00',
      status: AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
      type: 'Consultation'
    });
  });

  it('should change status to SCHEDULED', () => {
    appointment.confirmByDoctor('d1', new Date('2025-01-25'));
    expect(appointment.getStatus()).toBe(AppointmentStatus.SCHEDULED);
  });

  it('should set doctor confirmation timestamp', () => {
    const confirmedAt = new Date('2025-01-25T10:30:00Z');
    appointment.confirmByDoctor('d1', confirmedAt);
    
    expect(appointment.getDoctorConfirmedAt()).toEqual(confirmedAt);
  });

  it('should emit AppointmentConfirmedEvent', () => {
    const events = appointment.getDomainEvents();
    const beforeCount = events.length;

    appointment.confirmByDoctor('d1', new Date());
    const eventsAfter = appointment.getDomainEvents();

    expect(eventsAfter.length).toBe(beforeCount + 1);
    expect(eventsAfter[eventsAfter.length - 1]).toBeInstanceOf(AppointmentConfirmedEvent);
  });

  it('should throw if not in PENDING_DOCTOR_CONFIRMATION status', () => {
    const scheduled = Appointment.create({
      ...appointment params...,
      status: AppointmentStatus.SCHEDULED
    });

    expect(() => scheduled.confirmByDoctor('d1', new Date())).toThrow();
  });

  it('should throw if different doctor tries to confirm', () => {
    expect(() => appointment.confirmByDoctor('d2', new Date())).toThrow();
  });
});
```

**Duration:** 4 hours

---

#### Part 5.2: Integration Tests for Use Cases (4 hours)

**Files to Create:**
```
/tests/integration/use-cases/ScheduleAppointmentUseCase.test.ts
/tests/integration/use-cases/ConfirmAppointmentUseCase.test.ts
/tests/integration/use-cases/RescheduleAppointmentUseCase.test.ts
/tests/integration/use-cases/GetDoctorPendingAppointmentsUseCase.test.ts
```

**Example:**
```typescript
describe('ScheduleAppointmentUseCase Integration', () => {
  let useCase: ScheduleAppointmentUseCase;
  let appointmentRepo: FakeAppointmentRepository;
  let patientRepo: FakePatientRepository;
  let doctorRepo: FakeDoctorRepository;
  let notificationService: FakeNotificationService;

  beforeEach(() => {
    appointmentRepo = new FakeAppointmentRepository();
    patientRepo = new FakePatientRepository();
    doctorRepo = new FakeDoctorRepository();
    notificationService = new FakeNotificationService();

    useCase = new ScheduleAppointmentUseCase(
      appointmentRepo,
      patientRepo,
      doctorRepo,
      notificationService,
      // ... other dependencies
    );

    // Seed data
    patientRepo.add(Patient.create({id: 'p1', ...}));
    doctorRepo.add(Doctor.create({id: 'd1', ...}));
  });

  it('should create appointment with PENDING_DOCTOR_CONFIRMATION status', async () => {
    const dto: ScheduleAppointmentDto = {
      patientId: 'p1',
      doctorId: 'd1',
      appointmentDate: new Date('2025-02-15'),
      time: '10:00',
      type: 'Consultation'
    };

    const result = await useCase.execute(dto, 'frontdesk1');

    expect(result.status).toBe('PENDING_DOCTOR_CONFIRMATION');
  });

  it('should send doctor notification request', async () => {
    await useCase.execute(dto, 'frontdesk1');

    expect(notificationService.doctorNotificationsSent).toContainEqual({
      doctorId: 'd1',
      type: 'APPOINTMENT_CONFIRMATION_REQUEST'
    });
  });

  it('should send patient notification', async () => {
    await useCase.execute(dto, 'frontdesk1');

    expect(notificationService.patientNotificationsSent).toContainEqual({
      patientId: 'p1',
      type: 'APPOINTMENT_SCHEDULED'
    });
  });

  it('should prevent double-booking', async () => {
    const appt1 = Appointment.create({
      id: 1,
      status: AppointmentStatus.SCHEDULED,
      ...same doctor/date/time...
    });
    appointmentRepo.add(appt1);

    // Try to book same slot
    expect(() => useCase.execute(dto, 'frontdesk1')).rejects.toThrow(SlotNotAvailableError);
  });

  it('should record audit event', async () => {
    const auditService = useCase's injected auditService;
    await useCase.execute(dto, 'frontdesk1');

    expect(auditService.recordedEvents).toContainEqual({
      userId: 'frontdesk1',
      action: 'APPOINTMENT_SCHEDULED',
      aggregateId: expect.any(String)
    });
  });

  it('should handle notification failures gracefully', async () => {
    notificationService.throwOnSend = true;

    const result = await useCase.execute(dto, 'frontdesk1');

    // Appointment still created even if notifications fail
    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
  });
});
```

**Coverage Target:** 85%+ of use cases

**Duration:** 4 hours

---

#### Part 5.3: End-to-End Workflow Tests (3 hours)

**Files to Create:**
```
/tests/e2e/workflows/complete-appointment-workflow.test.ts
/tests/e2e/workflows/doctor-confirmation-workflow.test.ts
/tests/e2e/workflows/appointment-rejection-workflow.test.ts
```

**Example:**
```typescript
describe('Complete Appointment Workflow E2E', () => {
  describe('Scheduling → Confirmation → Check-in → Completion', () => {
    it('should execute complete workflow without errors', async () => {
      // 1. Frontdesk schedules appointment
      const scheduleResult = await scheduleAppointmentUseCase.execute(
        {
          patientId: 'patient-1',
          doctorId: 'doctor-1',
          appointmentDate: new Date('2025-02-15'),
          time: '10:00',
          type: 'Consultation'
        },
        'frontdesk-1'
      );

      expect(scheduleResult.status).toBe('PENDING_DOCTOR_CONFIRMATION');
      const appointmentId = scheduleResult.id;

      // 2. Doctor receives notification (simulate)
      const doctorNotifications = await notificationService.getUnread('doctor-1');
      expect(doctorNotifications).toContainEqual({
        type: 'APPOINTMENT_CONFIRMATION_REQUEST',
        appointmentId
      });

      // 3. Doctor confirms appointment
      const confirmResult = await confirmAppointmentUseCase.execute(
        {
          appointmentId,
          action: 'CONFIRM',
          confirmationNotes: 'Confirmed, see you soon'
        },
        'doctor-1'
      );

      expect(confirmResult.status).toBe('SCHEDULED');

      // 4. Patient receives confirmation
      const patientNotifications = await notificationService.getUnread('patient-1');
      expect(patientNotifications).toContainEqual({
        type: 'APPOINTMENT_CONFIRMED',
        appointmentId
      });

      // 5. Frontdesk checks in patient
      const checkinResult = await checkInPatientUseCase.execute(
        {
          appointmentId,
          checkedInBy: 'frontdesk-1'
        }
      );

      expect(checkinResult.status).toBe('CHECKED_IN');

      // 6. Doctor starts consultation
      const consultResult = await startConsultationUseCase.execute(
        {
          appointmentId,
          doctorId: 'doctor-1'
        }
      );

      expect(consultResult).toBeDefined();

      // 7. Doctor completes consultation
      const completeResult = await completeConsultationUseCase.execute(
        {
          appointmentId,
          doctorId: 'doctor-1',
          notes: 'Patient doing well',
          outcome: 'PROCEDURE_RECOMMENDED'
        }
      );

      expect(completeResult.status).toBe('COMPLETED');

      // 8. Verify audit trail
      const auditTrail = await auditService.getAuditTrail(appointmentId);
      expect(auditTrail).toEqual([
        { action: 'APPOINTMENT_SCHEDULED', by: 'frontdesk-1' },
        { action: 'APPOINTMENT_CONFIRMED', by: 'doctor-1' },
        { action: 'PATIENT_CHECKED_IN', by: 'frontdesk-1' },
        { action: 'CONSULTATION_STARTED', by: 'doctor-1' },
        { action: 'CONSULTATION_COMPLETED', by: 'doctor-1' }
      ]);
    });
  });

  describe('Scheduling → Rejection Workflow', () => {
    it('should handle doctor rejection and free up slot', async () => {
      // Schedule appointment
      const appt = await scheduleAppointmentUseCase.execute(dto, 'frontdesk-1');

      // Doctor rejects
      const rejected = await rejectAppointmentUseCase.execute(
        {
          appointmentId: appt.id,
          reason: 'Double-booked',
          alternateTimeSlots: [...]
        },
        'doctor-1'
      );

      expect(rejected.status).toBe('REJECTED_BY_DOCTOR');

      // Slot should be available for re-booking
      const isAvailable = await availabilityService.isSlotAvailable(
        'doctor-1',
        slotWindow,
        30
      );
      expect(isAvailable).toBe(true);
    });
  });
});
```

**Duration:** 3 hours

---

#### Part 5.4: Performance & Load Tests (2 hours)

**Files to Create:**
```
/tests/performance/appointment-scheduling.perf.test.ts
/tests/performance/slot-availability.perf.test.ts
/tests/load/concurrent-bookings.load.test.ts
```

**Example:**
```typescript
describe('Appointment Scheduling Performance', () => {
  it('should schedule appointment in < 100ms', async () => {
    const start = performance.now();
    await useCase.execute(dto, userId);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('should check availability in < 50ms', async () => {
    const start = performance.now();
    await availabilityService.isSlotAvailable(docId, slotWindow, 30);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
  });

  describe('Load Test: Concurrent Bookings', () => {
    it('should handle 100 concurrent booking attempts without conflicts', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          useCase.execute(
            {
              patientId: `patient-${i}`,
              doctorId: 'doctor-1',
              appointmentDate: new Date('2025-02-15'),
              time: '10:00',  // Same slot!
              type: 'Consultation'
            },
            `frontdesk-${i}`
          )
        );
      }

      const results = await Promise.allSettled(promises);

      // Only 1 should succeed, 99 should fail
      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(99);
    });
  });
});
```

**Duration:** 2 hours

---

#### Part 5.5: Test Coverage Reporting (1 hour)

**Setup:**
- Configure coverage reporting
- Add GitHub Actions workflow
- Set coverage thresholds
- Document coverage gaps

**Files to Create/Update:**
```
/.github/workflows/test.yml       (NEW: Run tests + coverage)
/jest.config.js                   (UPDATE: coverage settings)
/coverage-thresholds.json         (NEW: Required coverage)
```

**Target:**
- Statements: 85%+
- Branches: 80%+
- Functions: 85%+
- Lines: 85%+

**Duration:** 1 hour

---

**PHASE 5 TOTAL:** 12-16 hours

**Success Criteria:**
- [ ] 85%+ overall test coverage
- [ ] All critical paths have tests
- [ ] Performance tests pass
- [ ] Load test handles 100+ concurrent requests
- [ ] E2E workflow tests pass
- [ ] No flaky tests
- [ ] Test execution < 5 minutes

---

### PHASE 6: Frontend Integration (12-16 hours)

#### Goal
Update UI components to support new appointment workflow.

#### Part 6.1: Create ScheduleAppointmentDialog (5 hours)

**File to Create:**
```
/components/frontdesk/ScheduleAppointmentDialog.tsx  (NEW: ~400 lines)
/components/frontdesk/hooks/useScheduleAppointment.ts (NEW: ~100 lines)
/components/frontdesk/hooks/useAvailableSlots.ts      (NEW: ~150 lines)
```

**Features:**
- Doctor selector dropdown
- Real-time availability checking
- Date picker with calendar
- Time slot grid showing availability
- Appointment type selector
- Notes field
- Loading states
- Error messages
- Submit with validation

**Key Component:**
```typescript
// components/frontdesk/ScheduleAppointmentDialog.tsx

export function ScheduleAppointmentDialog({
  open,
  onClose,
  patient,
  onScheduled
}: Props) {
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [appointmentType, setAppointmentType] = useState<string>('Consultation');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get available slots when doctor/date changes
  const { availableSlots, isLoadingSlots } = useAvailableSlots(
    selectedDoctor,
    selectedDate
  );

  const handleSchedule = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await frontdeskApi.scheduleAppointment({
        patientId: patient.id,
        doctorId: selectedDoctor,
        appointmentDate: selectedDate,
        time: selectedTime,
        type: appointmentType,
        note: notes
      });

      onScheduled(response);
      onClose();
    } catch (err) {
      setError(
        err instanceof DomainException
          ? err.message
          : 'Failed to schedule appointment'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule Appointment</DialogTitle>
          <DialogDescription>
            for {patient.firstName} {patient.lastName}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Doctor Selector */}
          <div>
            <Label>Doctor</Label>
            <DoctorCombobox
              value={selectedDoctor}
              onValueChange={setSelectedDoctor}
            />
          </div>

          {/* Date Picker */}
          <div>
            <Label>Date</Label>
            <DatePicker
              date={selectedDate}
              onDateChange={setSelectedDate}
              disabledDates={getWeekends()}  // Doctor logic
            />
          </div>

          {/* Time Slots Grid */}
          {selectedDoctor && (
            <div className="col-span-2">
              <Label>Time Slot</Label>
              {isLoadingSlots ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <SlotGrid
                  slots={availableSlots}
                  selectedSlot={selectedTime}
                  onSelectSlot={setSelectedTime}
                />
              )}
            </div>
          )}

          {/* Appointment Type */}
          <div>
            <Label>Type</Label>
            <Select value={appointmentType} onValueChange={setAppointmentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Consultation">Consultation</SelectItem>
                <SelectItem value="Procedure">Procedure</SelectItem>
                <SelectItem value="Follow-up">Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSchedule}
            disabled={!selectedDoctor || !selectedTime || isLoading}
            isLoading={isLoading}
          >
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Duration:** 5 hours

---

#### Part 6.2: Create DoctorPendingAppointments Component (3 hours)

**File to Create:**
```
/components/doctor/PendingAppointmentsList.tsx  (NEW: ~350 lines)
/components/doctor/ConfirmAppointmentDialog.tsx (NEW: ~200 lines)
/components/doctor/hooks/usePendingAppointments.ts (NEW: ~100 lines)
```

**Features:**
- List of PENDING_DOCTOR_CONFIRMATION appointments
- Quick confirm button
- Quick reject button with modal for reason
- Appointment details (patient, date, time, service type)
- Status badge showing "Awaiting confirmation"
- Sort by date
- Filter by status

**Key Component:**
```typescript
// components/doctor/PendingAppointmentsList.tsx

export function PendingAppointmentsList({
  doctorId
}: Props) {
  const {
    appointments,
    isLoading,
    error,
    refetch
  } = usePendingAppointments(doctorId);

  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const handleConfirm = async (appointmentId: number) => {
    await doctorApi.confirmAppointment(appointmentId, {
      action: 'CONFIRM'
    });
    setShowConfirmDialog(false);
    await refetch();
  };

  const handleReject = async (appointmentId: number, reason: string) => {
    await doctorApi.confirmAppointment(appointmentId, {
      action: 'REJECT',
      rejectionReason: reason
    });
    setShowRejectDialog(false);
    await refetch();
  };

  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Pending Confirmations
          <Badge className="ml-2">{appointments.length}</Badge>
        </h2>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <EmptyState
          title="No pending confirmations"
          description="All appointment requests have been confirmed or rejected."
        />
      ) : (
        <div className="space-y-2">
          {appointments.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              actions={
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedAppt(appt);
                      setShowConfirmDialog(true);
                    }}
                  >
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedAppt(appt);
                      setShowRejectDialog(true);
                    }}
                  >
                    Reject
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={showConfirmDialog}
        appointment={selectedAppt}
        onConfirm={() => handleConfirm(selectedAppt!.id)}
        onCancel={() => setShowConfirmDialog(false)}
      />

      {/* Rejection Dialog */}
      <RejectDialog
        open={showRejectDialog}
        appointment={selectedAppt}
        onReject={(reason) => handleReject(selectedAppt!.id, reason)}
        onCancel={() => setShowRejectDialog(false)}
      />
    </div>
  );
}
```

**Duration:** 3 hours

---

#### Part 6.3: Update Existing Components (3 hours)

**Files to Update:**
```
/components/frontdesk/ReviewConsultationDialog.tsx    (UPDATE: add schedule button)
/components/patient/AppointmentCard.tsx               (UPDATE: show status)
/components/doctor/DoctorDashboard.tsx                (UPDATE: add pending count badge)
/app/frontdesk/dashboard/page.tsx                     (UPDATE: use new components)
/app/doctor/dashboard/page.tsx                        (UPDATE: show pending list)
```

**Changes:**

1. ReviewConsultationDialog
   - Add "Schedule Appointment" button when approved
   - Opens ScheduleAppointmentDialog with pre-filled patient

2. AppointmentCard
   - Show status badge with color coding
   - Show "Awaiting doctor confirmation" for PENDING_DOCTOR_CONFIRMATION
   - Show confirmation timeline

3. DoctorDashboard
   - Add PendingAppointmentsList section
   - Show badge with pending count

**Duration:** 3 hours

---

#### Part 6.4: Add API Client Methods (2 hours)

**Files to Update:**
```
/lib/api/frontdesk.ts  (UPDATE: add scheduleAppointment)
/lib/api/doctor.ts     (UPDATE: add confirmAppointment, rejectAppointment)
/lib/api/patient.ts    (UPDATE: add getMyAppointments with status filtering)
```

**Methods to Add:**

```typescript
// lib/api/frontdesk.ts
export const frontdeskApi = {
  async scheduleAppointment(dto: ScheduleAppointmentDto) {
    const response = await fetch('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(dto)
    });
    if (!response.ok) throw new Error('Failed to schedule');
    return response.json();
  }
};

// lib/api/doctor.ts
export const doctorApi = {
  async getPendingAppointments() {
    const response = await fetch('/api/appointments?status=PENDING_DOCTOR_CONFIRMATION');
    return response.json();
  },

  async confirmAppointment(
    id: number,
    data: { action: 'CONFIRM' | 'REJECT'; rejectionReason?: string }
  ) {
    const response = await fetch(`/api/appointments/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to confirm');
    return response.json();
  }
};
```

**Duration:** 2 hours

---

#### Part 6.5: Create Storybook Stories & Visual Tests (2 hours)

**Files to Create:**
```
/components/frontdesk/ScheduleAppointmentDialog.stories.tsx
/components/doctor/PendingAppointmentsList.stories.tsx
/components/patient/AppointmentCard.stories.tsx
```

**Purpose:**
- Visual component testing
- Documentation for designers
- Regression detection

**Duration:** 2 hours

---

#### Part 6.6: Update API Routes (2 hours)

**Files to Update:**
```
/app/api/appointments/route.ts          (UPDATE: handle PENDING_DOCTOR_CONFIRMATION)
/app/api/appointments/[id]/confirm/route.ts (UPDATE: response format)
```

**Changes:**

1. POST /api/appointments
   - Create appointment with PENDING_DOCTOR_CONFIRMATION status
   - Send doctor notification
   - Return appointment with status

2. POST /api/appointments/:id/confirm
   - Validate doctor authorization
   - Update appointment status
   - Send notifications
   - Return updated appointment

**Duration:** 2 hours

---

**PHASE 6 TOTAL:** 12-16 hours

**Success Criteria:**
- [ ] ScheduleAppointmentDialog shows real-time availability
- [ ] PendingAppointmentsList displays correctly
- [ ] Doctor can confirm/reject with one click
- [ ] All status messages clear and helpful
- [ ] Error messages helpful
- [ ] Loading states smooth
- [ ] Responsive on mobile
- [ ] All components have Storybook stories
- [ ] No console errors

---

## FINAL IMPLEMENTATION CHECKLIST

### Pre-Implementation
- [ ] Team trained on clean architecture
- [ ] Database backup strategy documented
- [ ] Rollback procedures documented
- [ ] Communication plan (how to notify stakeholders)

### Phase 0: Infrastructure
- [ ] Test database provisioned
- [ ] Fake repositories created
- [ ] Test builders created
- [ ] Development environment verified

### Phase 1: Database
- [ ] All migrations applied
- [ ] Data migration verified
- [ ] Indexes created and verified
- [ ] Unique constraint working
- [ ] Backward compatibility confirmed
- [ ] Performance benchmarked

### Phase 2: Domain
- [ ] Appointment entity expanded
- [ ] State transition methods working
- [ ] Value objects validated
- [ ] Domain services created
- [ ] Domain events defined
- [ ] 95%+ coverage achieved

### Phase 3: Application
- [ ] All use cases refactored
- [ ] DTOs properly structured
- [ ] Error handling complete
- [ ] Dependency injection working
- [ ] 85%+ coverage achieved

### Phase 4: Infrastructure
- [ ] All repositories implemented
- [ ] Error mapping complete
- [ ] Transaction support working
- [ ] Event publishing working
- [ ] 85%+ coverage achieved

### Phase 5: Testing
- [ ] Unit tests: 95%+ coverage
- [ ] Integration tests: 85%+ coverage
- [ ] E2E tests: All workflows pass
- [ ] Performance tests: < 100ms booking
- [ ] Load tests: 100 concurrent pass
- [ ] No flaky tests

### Phase 6: Frontend
- [ ] ScheduleAppointmentDialog complete
- [ ] PendingAppointmentsList complete
- [ ] All components updated
- [ ] API client methods created
- [ ] Storybook stories complete
- [ ] Mobile responsive

### Deployment
- [ ] Database migrations applied to staging
- [ ] All tests pass on staging
- [ ] Smoke testing complete
- [ ] Monitoring configured
- [ ] Rollback plan tested
- [ ] User documentation complete
- [ ] Support team trained

---

## SUCCESS METRICS

**Quality Metrics:**
- 85%+ test coverage
- 0 high-severity bugs
- < 5 medium-severity bugs
- All critical paths tested

**Performance Metrics:**
- Appointment scheduling: < 100ms
- Availability check: < 50ms
- Doctor pending list: < 200ms
- 100 concurrent bookings: 0 conflicts

**User Experience Metrics:**
- Task completion rate: > 95%
- Time to schedule: < 2 minutes
- Doctor confirmation rate: > 90%
- User satisfaction: > 4.5/5

**Operational Metrics:**
- Production deployment success: 100%
- Error rate: < 0.1%
- Recovery time: < 30 minutes
- Audit trail completeness: 100%

---

## RISK MITIGATION

**Risk 1: Database Migration Failure**
- **Mitigation:** Test all migrations on staging first, keep rollback scripts ready

**Risk 2: Breaking Changes for Existing Code**
- **Mitigation:** Maintain backward compatibility during Phase 1-3, gradual cutover

**Risk 3: Performance Regression**
- **Mitigation:** Run before/after benchmarks, monitor in production

**Risk 4: Insufficient Test Coverage**
- **Mitigation:** Set minimum 85% threshold, fail CI if below

**Risk 5: Team Knowledge Gaps**
- **Mitigation:** Pair programming, architecture reviews, documentation

---

## TOTAL EFFORT SUMMARY

| Phase | Hours | Focus |
|-------|-------|-------|
| Phase 0: Infrastructure | 10-15 | Test setup, fakes, builders |
| Phase 1: Database | 8-12 | Schema, indexes, constraints |
| Phase 2: Domain | 12-16 | Entities, value objects, services |
| Phase 3: Application | 10-14 | Use cases, DTOs, error handling |
| Phase 4: Infrastructure | 6-8 | Repositories, event publishing |
| Phase 5: Testing | 12-16 | Unit, integration, e2e, performance |
| Phase 6: Frontend | 12-16 | Components, API, UI integration |
| **TOTAL** | **70-97 hours** | **~2 weeks with 2-3 developers** |

---

## SUCCESS CRITERIA: APPOINTMENT WORKFLOW

### Before Refactoring (Current State - BROKEN)
```
Frontdesk books → PENDING status → Doctor never confirms → 
Double-booking possible → Patient confusion
```

### After Refactoring (Target State - CORRECT)
```
Frontdesk books (ScheduleAppointmentDialog)
    ↓
Appointment created: PENDING_DOCTOR_CONFIRMATION
Time slot tentatively locked
    ↓
Doctor notified (email + dashboard)
    ↓
Doctor reviews (PendingAppointmentsList)
    ↓
Doctor confirms or rejects
    ↓
If CONFIRMED:
  - Status → SCHEDULED (time permanently locked)
  - Time slot unavailable for other bookings
  - Patient notified

If REJECTED:
  - Status → REJECTED_BY_DOCTOR
  - Time slot freed up
  - Patient offered alternatives
  - Audit trail recorded
    ↓
Patient sees appointment status:
  - "Awaiting doctor confirmation" (PENDING_DOCTOR_CONFIRMATION)
  - "Confirmed" (SCHEDULED)
  - "Doctor rejected, please reschedule" (REJECTED_BY_DOCTOR)
    ↓
Complete audit trail: Who did what, when, why
```

---

## NEXT STEPS

1. **Review this roadmap** with team
2. **Allocate resources** (2-3 developers, 2-3 weeks)
3. **Start Phase 0** (infrastructure)
4. **Execute sequentially** (Phase 0 → 1 → 2 → ... → 6)
5. **Daily standups** to track progress
6. **Weekly demos** of working features
7. **Post-implementation review** and lessons learned

---

**Document Version:** 1.0  
**Last Updated:** January 25, 2026  
**Status:** Ready for Implementation  
**Confidence Level:** High ✅

