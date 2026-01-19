# Consultation Domain Architecture

**Last Updated:** January 2025  
**Status:** Design Document

## Overview

This document defines the clean domain architecture for the consultation system in the surgical EHR. The architecture follows Domain-Driven Design (DDD) principles with explicit state modeling, clear aggregates, and deterministic workflows.

---

## Architecture Principles

1. **Explicit State Modeling:** All state transitions are explicit and validated
2. **Aggregate Boundaries:** Clear consistency boundaries prevent invalid states
3. **Immutable Value Objects:** All value objects are immutable
4. **Domain Events:** Important state changes emit events for side effects
5. **Service Boundaries:** Domain services encapsulate complex business logic
6. **Invariant Enforcement:** Business rules are enforced at the aggregate root level

---

## Core Domain Entities

### 1. Consultation Entity

**Purpose:** Represents a consultation session between a doctor and patient.

**Lifecycle:**
- Created when consultation is started
- Updated during active session (drafts, notes)
- Completed when consultation ends

**Invariants:**
- Consultation must have an appointment (1:1 relationship)
- Consultation can only be started if appointment is SCHEDULED or PENDING
- Consultation can only be completed if it has been started
- Consultation must have an outcome when completed
- If outcome is PROCEDURE_RECOMMENDED, patient decision must be captured

**State Machine:** See ConsultationStateMachine below

```typescript
// domain/entities/Consultation.ts

import { ConsultationState } from '../enums/ConsultationState';
import { ConsultationOutcomeType } from '../enums/ConsultationOutcomeType';
import { PatientDecision } from '../enums/PatientDecision';
import { ConsultationNotes } from '../value-objects/ConsultationNotes';
import { ConsultationDuration } from '../value-objects/ConsultationDuration';
import { DomainException } from '../exceptions/DomainException';

export class Consultation {
  private constructor(
    private readonly id: number,
    private readonly appointmentId: number,
    private readonly doctorId: string,
    private readonly userId: string | undefined, // User who started consultation
    private readonly state: ConsultationState,
    private readonly startedAt: Date | undefined,
    private readonly completedAt: Date | undefined,
    private readonly duration: ConsultationDuration | undefined,
    private readonly notes: ConsultationNotes | undefined,
    private readonly outcomeType: ConsultationOutcomeType | undefined,
    private readonly patientDecision: PatientDecision | undefined,
    private readonly followUpDate: Date | undefined,
    private readonly followUpType: string | undefined,
    private readonly followUpNotes: string | undefined,
    private readonly createdAt: Date,
    private readonly updatedAt: Date,
  ) {
    // Invariants enforced in factory methods
  }

  /**
   * Creates a new Consultation entity in NOT_STARTED state
   * 
   * Invariants:
   * - Appointment must exist (validated by repository)
   * - Doctor ID must match appointment's doctor
   */
  static create(params: {
    id: number;
    appointmentId: number;
    doctorId: string;
    userId?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }): Consultation {
    // Validation
    if (params.id < 0) {
      throw new DomainException('Consultation ID must be non-negative');
    }
    if (!params.appointmentId || params.appointmentId <= 0) {
      throw new DomainException('Appointment ID is required');
    }
    if (!params.doctorId || params.doctorId.trim().length === 0) {
      throw new DomainException('Doctor ID is required');
    }

    return new Consultation(
      params.id,
      params.appointmentId,
      params.doctorId.trim(),
      params.userId?.trim(),
      ConsultationState.NOT_STARTED,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      params.createdAt ?? new Date(),
      params.updatedAt ?? new Date(),
    );
  }

  /**
   * Starts the consultation session
   * 
   * Invariants:
   * - Must be in NOT_STARTED state
   * - startedAt must be set
   * - State must transition to IN_PROGRESS
   */
  start(userId: string, startedAt: Date = new Date()): Consultation {
    if (this.state !== ConsultationState.NOT_STARTED) {
      throw new DomainException(
        `Cannot start consultation in ${this.state} state. Only NOT_STARTED consultations can be started.`,
        { currentState: this.state }
      );
    }

    return new Consultation(
      this.id,
      this.appointmentId,
      this.doctorId,
      userId,
      ConsultationState.IN_PROGRESS,
      startedAt,
      undefined,
      undefined,
      this.notes,
      this.outcomeType,
      this.patientDecision,
      this.followUpDate,
      this.followUpType,
      this.followUpNotes,
      this.createdAt,
      new Date(),
    );
  }

  /**
   * Updates consultation notes (draft)
   * 
   * Invariants:
   * - Must be in IN_PROGRESS state
   */
  updateNotes(notes: ConsultationNotes): Consultation {
    if (this.state !== ConsultationState.IN_PROGRESS) {
      throw new DomainException(
        `Cannot update notes in ${this.state} state. Only IN_PROGRESS consultations can be updated.`,
        { currentState: this.state }
      );
    }

    return new Consultation(
      this.id,
      this.appointmentId,
      this.doctorId,
      this.userId,
      this.state,
      this.startedAt,
      this.completedAt,
      this.duration,
      notes,
      this.outcomeType,
      this.patientDecision,
      this.followUpDate,
      this.followUpType,
      this.followUpNotes,
      this.createdAt,
      new Date(),
    );
  }

  /**
   * Completes the consultation
   * 
   * Invariants:
   * - Must be in IN_PROGRESS state
   * - Must have outcome type
   * - If PROCEDURE_RECOMMENDED, must have patient decision
   * - completedAt must be set
   * - Duration must be calculated
   */
  complete(params: {
    outcomeType: ConsultationOutcomeType;
    notes: ConsultationNotes;
    patientDecision?: PatientDecision;
    followUpDate?: Date;
    followUpType?: string;
    followUpNotes?: string;
    completedAt?: Date;
  }): Consultation {
    if (this.state !== ConsultationState.IN_PROGRESS) {
      throw new DomainException(
        `Cannot complete consultation in ${this.state} state. Only IN_PROGRESS consultations can be completed.`,
        { currentState: this.state }
      );
    }

    if (!this.startedAt) {
      throw new DomainException('Cannot complete consultation that was never started');
    }

    // Validate patient decision if procedure recommended
    if (
      params.outcomeType === ConsultationOutcomeType.PROCEDURE_RECOMMENDED &&
      !params.patientDecision
    ) {
      throw new DomainException(
        'Patient decision is required when outcome is PROCEDURE_RECOMMENDED',
        { outcomeType: params.outcomeType }
      );
    }

    const completedAt = params.completedAt ?? new Date();
    const duration = ConsultationDuration.calculate(this.startedAt, completedAt);

    return new Consultation(
      this.id,
      this.appointmentId,
      this.doctorId,
      this.userId,
      ConsultationState.COMPLETED,
      this.startedAt,
      completedAt,
      duration,
      params.notes,
      params.outcomeType,
      params.patientDecision,
      params.followUpDate,
      params.followUpType,
      params.followUpNotes,
      this.createdAt,
      new Date(),
    );
  }

  // Getters
  getId(): number { return this.id; }
  getAppointmentId(): number { return this.appointmentId; }
  getDoctorId(): string { return this.doctorId; }
  getUserId(): string | undefined { return this.userId; }
  getState(): ConsultationState { return this.state; }
  getStartedAt(): Date | undefined { return this.startedAt ? new Date(this.startedAt) : undefined; }
  getCompletedAt(): Date | undefined { return this.completedAt ? new Date(this.completedAt) : undefined; }
  getDuration(): ConsultationDuration | undefined { return this.duration; }
  getNotes(): ConsultationNotes | undefined { return this.notes; }
  getOutcomeType(): ConsultationOutcomeType | undefined { return this.outcomeType; }
  getPatientDecision(): PatientDecision | undefined { return this.patientDecision; }
  getFollowUpDate(): Date | undefined { return this.followUpDate ? new Date(this.followUpDate) : undefined; }
  getFollowUpType(): string | undefined { return this.followUpType; }
  getFollowUpNotes(): string | undefined { return this.followUpNotes; }
  getCreatedAt(): Date { return new Date(this.createdAt); }
  getUpdatedAt(): Date { return new Date(this.updatedAt); }

  // Business logic
  isStarted(): boolean {
    return this.state !== ConsultationState.NOT_STARTED;
  }

  isInProgress(): boolean {
    return this.state === ConsultationState.IN_PROGRESS;
  }

  isCompleted(): boolean {
    return this.state === ConsultationState.COMPLETED;
  }

  requiresCasePlanning(): boolean {
    if (!this.outcomeType) return false;
    return this.outcomeType === ConsultationOutcomeType.PROCEDURE_RECOMMENDED ||
           this.outcomeType === ConsultationOutcomeType.PATIENT_DECIDING;
  }
}
```

---

### 2. Enhanced Appointment Entity

**Purpose:** Represents an appointment with check-in and no-show tracking.

**Enhancements:**
- Check-in information (checkedInAt, checkedInBy, lateArrival)
- No-show tracking (noShow, noShowAt, noShowReason)
- State machine for appointment lifecycle

```typescript
// domain/entities/Appointment.ts (Enhanced)

import { AppointmentStatus } from '../enums/AppointmentStatus';
import { CheckInInfo } from '../value-objects/CheckInInfo';
import { NoShowInfo } from '../value-objects/NoShowInfo';
import { DomainException } from '../exceptions/DomainException';

export class Appointment {
  private constructor(
    private readonly id: number,
    private readonly patientId: string,
    private readonly doctorId: string,
    private readonly appointmentDate: Date,
    private readonly time: string,
    private readonly status: AppointmentStatus,
    private readonly type: string,
    private readonly note: string | undefined,
    private readonly reason: string | undefined,
    private readonly checkInInfo: CheckInInfo | undefined,
    private readonly noShowInfo: NoShowInfo | undefined,
    private readonly rescheduledToAppointmentId: number | undefined,
    private readonly createdAt: Date | undefined,
    private readonly updatedAt: Date | undefined,
  ) {}

  /**
   * Checks in the patient
   * 
   * Invariants:
   * - Appointment must be in PENDING or SCHEDULED state
   * - Cannot check in if already checked in
   * - Cannot check in if marked as no-show
   */
  checkIn(checkInInfo: CheckInInfo): Appointment {
    if (this.status === AppointmentStatus.CANCELLED) {
      throw new DomainException('Cannot check in a cancelled appointment');
    }
    if (this.status === AppointmentStatus.COMPLETED) {
      throw new DomainException('Cannot check in a completed appointment');
    }
    if (this.checkInInfo) {
      throw new DomainException('Patient is already checked in');
    }
    if (this.noShowInfo) {
      throw new DomainException('Cannot check in a no-show appointment');
    }

    // Update status to SCHEDULED if it was PENDING
    const newStatus = this.status === AppointmentStatus.PENDING
      ? AppointmentStatus.SCHEDULED
      : this.status;

    return new Appointment(
      this.id,
      this.patientId,
      this.doctorId,
      this.appointmentDate,
      this.time,
      newStatus,
      this.type,
      this.note,
      this.reason,
      checkInInfo,
      this.noShowInfo,
      this.rescheduledToAppointmentId,
      this.createdAt,
      new Date(),
    );
  }

  /**
   * Marks appointment as no-show
   * 
   * Invariants:
   * - Cannot mark as no-show if already checked in
   * - Cannot mark as no-show if already completed
   */
  markAsNoShow(noShowInfo: NoShowInfo): Appointment {
    if (this.checkInInfo) {
      throw new DomainException('Cannot mark checked-in appointment as no-show');
    }
    if (this.status === AppointmentStatus.COMPLETED) {
      throw new DomainException('Cannot mark completed appointment as no-show');
    }
    if (this.noShowInfo) {
      throw new DomainException('Appointment is already marked as no-show');
    }

    return new Appointment(
      this.id,
      this.patientId,
      this.doctorId,
      this.appointmentDate,
      this.time,
      AppointmentStatus.NO_SHOW,
      this.type,
      this.note,
      this.reason,
      this.checkInInfo,
      noShowInfo,
      this.rescheduledToAppointmentId,
      this.createdAt,
      new Date(),
    );
  }

  /**
   * Completes the appointment
   * 
   * Invariants:
   * - Must be SCHEDULED
   * - Must be checked in
   */
  complete(): Appointment {
    if (this.status !== AppointmentStatus.SCHEDULED) {
      throw new DomainException(
        `Cannot complete appointment in ${this.status} state. Must be SCHEDULED.`
      );
    }
    if (!this.checkInInfo) {
      throw new DomainException('Cannot complete appointment without check-in');
    }

    return new Appointment(
      this.id,
      this.patientId,
      this.doctorId,
      this.appointmentDate,
      this.time,
      AppointmentStatus.COMPLETED,
      this.type,
      this.note,
      this.reason,
      this.checkInInfo,
      this.noShowInfo,
      this.rescheduledToAppointmentId,
      this.createdAt,
      new Date(),
    );
  }

  // Getters
  getCheckInInfo(): CheckInInfo | undefined { return this.checkInInfo; }
  getNoShowInfo(): NoShowInfo | undefined { return this.noShowInfo; }
  isCheckedIn(): boolean { return this.checkInInfo !== undefined; }
  isNoShow(): boolean { return this.noShowInfo !== undefined; }
  isLateArrival(): boolean { return this.checkInInfo?.isLate() ?? false; }
  
  // ... existing getters ...
}
```

---

## Value Objects

### 1. CheckInInfo

**Purpose:** Immutable value object representing patient check-in information.

```typescript
// domain/value-objects/CheckInInfo.ts

import { DomainException } from '../exceptions/DomainException';

export class CheckInInfo {
  private constructor(
    private readonly checkedInAt: Date,
    private readonly checkedInBy: string, // User ID
    private readonly lateArrival: boolean,
    private readonly lateByMinutes: number | undefined,
  ) {
    // Invariants
    if (!checkedInBy || checkedInBy.trim().length === 0) {
      throw new DomainException('Checked in by user ID is required');
    }
    if (lateArrival && (!lateByMinutes || lateByMinutes <= 0)) {
      throw new DomainException('Late by minutes must be positive if late arrival is true');
    }
    if (!lateArrival && lateByMinutes !== undefined) {
      throw new DomainException('Late by minutes should not be set if not late arrival');
    }
  }

  static create(params: {
    checkedInAt: Date;
    checkedInBy: string;
    lateArrival?: boolean;
    lateByMinutes?: number;
  }): CheckInInfo {
    return new CheckInInfo(
      params.checkedInAt,
      params.checkedInBy.trim(),
      params.lateArrival ?? false,
      params.lateArrival ? params.lateByMinutes : undefined,
    );
  }

  static createOnTime(params: {
    checkedInAt: Date;
    checkedInBy: string;
  }): CheckInInfo {
    return new CheckInInfo(params.checkedInAt, params.checkedInBy.trim(), false, undefined);
  }

  static createLate(params: {
    checkedInAt: Date;
    checkedInBy: string;
    lateByMinutes: number;
  }): CheckInInfo {
    if (params.lateByMinutes <= 0) {
      throw new DomainException('Late by minutes must be positive');
    }
    return new CheckInInfo(
      params.checkedInAt,
      params.checkedInBy.trim(),
      true,
      params.lateByMinutes,
    );
  }

  getCheckedInAt(): Date { return new Date(this.checkedInAt); }
  getCheckedInBy(): string { return this.checkedInBy; }
  isLate(): boolean { return this.lateArrival; }
  getLateByMinutes(): number | undefined { return this.lateByMinutes; }

  equals(other: CheckInInfo): boolean {
    return this.checkedInAt.getTime() === other.checkedInAt.getTime() &&
           this.checkedInBy === other.checkedInBy &&
           this.lateArrival === other.lateArrival &&
           this.lateByMinutes === other.lateByMinutes;
  }
}
```

### 2. NoShowInfo

**Purpose:** Immutable value object representing no-show information.

```typescript
// domain/value-objects/NoShowInfo.ts

export enum NoShowReason {
  AUTO = 'AUTO', // Automatically detected
  MANUAL = 'MANUAL', // Manually marked by staff
  PATIENT_CALLED = 'PATIENT_CALLED', // Patient called to reschedule
}

export class NoShowInfo {
  private constructor(
    private readonly noShowAt: Date,
    private readonly reason: NoShowReason,
    private readonly notes: string | undefined,
  ) {}

  static create(params: {
    noShowAt: Date;
    reason: NoShowReason;
    notes?: string;
  }): NoShowInfo {
    return new NoShowInfo(
      params.noShowAt,
      params.reason,
      params.notes?.trim(),
    );
  }

  getNoShowAt(): Date { return new Date(this.noShowAt); }
  getReason(): NoShowReason { return this.reason; }
  getNotes(): string | undefined { return this.notes; }

  equals(other: NoShowInfo): boolean {
    return this.noShowAt.getTime() === other.noShowAt.getTime() &&
           this.reason === other.reason &&
           this.notes === other.notes;
  }
}
```

### 3. ConsultationDuration

**Purpose:** Immutable value object representing consultation duration.

```typescript
// domain/value-objects/ConsultationDuration.ts

import { DomainException } from '../exceptions/DomainException';

export class ConsultationDuration {
  private constructor(
    private readonly minutes: number,
    private readonly seconds: number,
  ) {
    if (minutes < 0) {
      throw new DomainException('Duration minutes cannot be negative');
    }
    if (seconds < 0 || seconds >= 60) {
      throw new DomainException('Duration seconds must be between 0 and 59');
    }
  }

  static calculate(startedAt: Date, completedAt: Date): ConsultationDuration {
    const diffMs = completedAt.getTime() - startedAt.getTime();
    if (diffMs < 0) {
      throw new DomainException('Completed time must be after started time');
    }
    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return new ConsultationDuration(minutes, seconds);
  }

  static fromMinutes(minutes: number): ConsultationDuration {
    if (minutes < 0) {
      throw new DomainException('Minutes cannot be negative');
    }
    return new ConsultationDuration(Math.floor(minutes), 0);
  }

  getMinutes(): number { return this.minutes; }
  getSeconds(): number { return this.seconds; }
  getTotalMinutes(): number { return this.minutes + this.seconds / 60; }
  getTotalSeconds(): number { return this.minutes * 60 + this.seconds; }

  toString(): string {
    return `${this.minutes}m ${this.seconds}s`;
  }

  equals(other: ConsultationDuration): boolean {
    return this.minutes === other.minutes && this.seconds === other.seconds;
  }
}
```

### 4. ConsultationNotes

**Purpose:** Immutable value object representing consultation notes with structured sections.

```typescript
// domain/value-objects/ConsultationNotes.ts

export class ConsultationNotes {
  private constructor(
    private readonly chiefComplaint: string | undefined,
    private readonly examination: string | undefined,
    private readonly assessment: string | undefined,
    private readonly plan: string | undefined,
    private readonly rawText: string | undefined, // Full text if not structured
  ) {}

  static createStructured(params: {
    chiefComplaint?: string;
    examination?: string;
    assessment?: string;
    plan?: string;
  }): ConsultationNotes {
    return new ConsultationNotes(
      params.chiefComplaint?.trim(),
      params.examination?.trim(),
      params.assessment?.trim(),
      params.plan?.trim(),
      undefined,
    );
  }

  static createRaw(text: string): ConsultationNotes {
    return new ConsultationNotes(
      undefined,
      undefined,
      undefined,
      undefined,
      text.trim(),
    );
  }

  getChiefComplaint(): string | undefined { return this.chiefComplaint; }
  getExamination(): string | undefined { return this.examination; }
  getAssessment(): string | undefined { return this.assessment; }
  getPlan(): string | undefined { return this.plan; }
  getRawText(): string | undefined { return this.rawText; }

  isEmpty(): boolean {
    return !this.chiefComplaint && !this.examination && !this.assessment && 
           !this.plan && !this.rawText;
  }

  toFullText(): string {
    if (this.rawText) return this.rawText;
    const parts: string[] = [];
    if (this.chiefComplaint) parts.push(`Chief Complaint: ${this.chiefComplaint}`);
    if (this.examination) parts.push(`Examination: ${this.examination}`);
    if (this.assessment) parts.push(`Assessment: ${this.assessment}`);
    if (this.plan) parts.push(`Plan: ${this.plan}`);
    return parts.join('\n\n');
  }
}
```

---

## Enums

### ConsultationState

```typescript
// domain/enums/ConsultationState.ts

export enum ConsultationState {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export function isConsultationState(value: string): value is ConsultationState {
  return Object.values(ConsultationState).includes(value as ConsultationState);
}

export function canStartConsultation(state: ConsultationState): boolean {
  return state === ConsultationState.NOT_STARTED;
}

export function canUpdateConsultation(state: ConsultationState): boolean {
  return state === ConsultationState.IN_PROGRESS;
}

export function canCompleteConsultation(state: ConsultationState): boolean {
  return state === ConsultationState.IN_PROGRESS;
}
```

### Enhanced AppointmentStatus

```typescript
// domain/enums/AppointmentStatus.ts (Enhanced)

export enum AppointmentStatus {
  PENDING = 'PENDING',
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW', // NEW
  CONFIRMED = 'CONFIRMED', // NEW - Patient confirmed appointment
}

export function canCheckIn(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.PENDING || 
         status === AppointmentStatus.SCHEDULED ||
         status === AppointmentStatus.CONFIRMED;
}

export function canStartConsultation(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.SCHEDULED || 
         status === AppointmentStatus.PENDING;
}

export function canMarkNoShow(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.PENDING || 
         status === AppointmentStatus.SCHEDULED ||
         status === AppointmentStatus.CONFIRMED;
}
```

---

## Aggregates

### 1. AppointmentAggregate

**Purpose:** Root aggregate for appointment lifecycle management.

**Consistency Boundary:**
- Appointment entity
- Check-in information
- No-show information
- Consultation reference (1:1)

**Invariants:**
- Appointment cannot be checked in if already no-show
- Appointment cannot be marked no-show if already checked in
- Appointment status must be consistent with check-in/no-show state
- Consultation can only exist if appointment is checked in

```typescript
// domain/aggregates/AppointmentAggregate.ts

import { Appointment } from '../entities/Appointment';
import { Consultation } from '../entities/Consultation';
import { CheckInInfo } from '../value-objects/CheckInInfo';
import { NoShowInfo } from '../value-objects/NoShowInfo';
import { DomainException } from '../exceptions/DomainException';

export class AppointmentAggregate {
  private constructor(
    private readonly appointment: Appointment,
    private readonly consultation: Consultation | undefined,
  ) {
    // Aggregate invariants
    if (this.consultation && !this.appointment.isCheckedIn()) {
      throw new DomainException(
        'Consultation cannot exist without check-in',
        { appointmentId: this.appointment.getId() }
      );
    }
  }

  static create(appointment: Appointment, consultation?: Consultation): AppointmentAggregate {
    return new AppointmentAggregate(appointment, consultation);
  }

  /**
   * Checks in the patient
   * 
   * Emits: AppointmentCheckedIn event
   */
  checkIn(checkInInfo: CheckInInfo): AppointmentAggregate {
    const updatedAppointment = this.appointment.checkIn(checkInInfo);
    return new AppointmentAggregate(updatedAppointment, this.consultation);
  }

  /**
   * Marks appointment as no-show
   * 
   * Emits: NoShowDetected event
   */
  markAsNoShow(noShowInfo: NoShowInfo): AppointmentAggregate {
    const updatedAppointment = this.appointment.markAsNoShow(noShowInfo);
    // If consultation exists, it should be invalidated (business rule)
    return new AppointmentAggregate(updatedAppointment, undefined);
  }

  /**
   * Starts consultation
   * 
   * Invariants:
   * - Appointment must be checked in
   * - Consultation must not exist or be in NOT_STARTED state
   */
  startConsultation(userId: string, startedAt?: Date): AppointmentAggregate {
    if (!this.appointment.isCheckedIn()) {
      throw new DomainException('Cannot start consultation without check-in');
    }

    let consultation: Consultation;
    if (this.consultation) {
      consultation = this.consultation.start(userId, startedAt);
    } else {
      consultation = Consultation.create({
        id: 0, // Temporary, will be assigned by repository
        appointmentId: this.appointment.getId(),
        doctorId: this.appointment.getDoctorId(),
        userId,
      }).start(userId, startedAt);
    }

    return new AppointmentAggregate(this.appointment, consultation);
  }

  /**
   * Updates consultation notes (draft)
   */
  updateConsultationNotes(notes: ConsultationNotes): AppointmentAggregate {
    if (!this.consultation) {
      throw new DomainException('Cannot update notes for non-existent consultation');
    }
    const updatedConsultation = this.consultation.updateNotes(notes);
    return new AppointmentAggregate(this.appointment, updatedConsultation);
  }

  /**
   * Completes consultation and appointment
   */
  completeConsultation(params: {
    outcomeType: ConsultationOutcomeType;
    notes: ConsultationNotes;
    patientDecision?: PatientDecision;
    followUpDate?: Date;
    followUpType?: string;
    followUpNotes?: string;
  }): AppointmentAggregate {
    if (!this.consultation) {
      throw new DomainException('Cannot complete non-existent consultation');
    }

    const completedConsultation = this.consultation.complete({
      ...params,
      completedAt: new Date(),
    });

    const completedAppointment = this.appointment.complete();

    return new AppointmentAggregate(completedAppointment, completedConsultation);
  }

  // Getters
  getAppointment(): Appointment { return this.appointment; }
  getConsultation(): Consultation | undefined { return this.consultation; }
  hasConsultation(): boolean { return this.consultation !== undefined; }
}
```

---

## State Machines

### 1. AppointmentStateMachine

**Purpose:** Explicit state machine for appointment lifecycle.

```typescript
// domain/services/AppointmentStateMachine.ts

import { AppointmentStatus } from '../enums/AppointmentStatus';
import { DomainException } from '../exceptions/DomainException';

export class AppointmentStateMachine {
  /**
   * Validates state transition
   */
  static canTransition(
    from: AppointmentStatus,
    to: AppointmentStatus,
  ): boolean {
    const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
      [AppointmentStatus.PENDING]: [
        AppointmentStatus.SCHEDULED,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ],
      [AppointmentStatus.CONFIRMED]: [
        AppointmentStatus.SCHEDULED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ],
      [AppointmentStatus.SCHEDULED]: [
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ],
      [AppointmentStatus.CANCELLED]: [], // Terminal state
      [AppointmentStatus.COMPLETED]: [], // Terminal state
      [AppointmentStatus.NO_SHOW]: [
        AppointmentStatus.CANCELLED,
        // Can reschedule (creates new appointment)
      ],
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  /**
   * Transitions appointment status
   */
  static transition(
    from: AppointmentStatus,
    to: AppointmentStatus,
  ): AppointmentStatus {
    if (!this.canTransition(from, to)) {
      throw new DomainException(
        `Invalid state transition from ${from} to ${to}`,
        { from, to }
      );
    }
    return to;
  }
}
```

### 2. ConsultationStateMachine

**Purpose:** Explicit state machine for consultation lifecycle.

```typescript
// domain/services/ConsultationStateMachine.ts

import { ConsultationState } from '../enums/ConsultationState';
import { DomainException } from '../exceptions/DomainException';

export class ConsultationStateMachine {
  static canTransition(
    from: ConsultationState,
    to: ConsultationState,
  ): boolean {
    const validTransitions: Record<ConsultationState, ConsultationState[]> = {
      [ConsultationState.NOT_STARTED]: [ConsultationState.IN_PROGRESS],
      [ConsultationState.IN_PROGRESS]: [ConsultationState.COMPLETED],
      [ConsultationState.COMPLETED]: [], // Terminal state
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  static transition(
    from: ConsultationState,
    to: ConsultationState,
  ): ConsultationState {
    if (!this.canTransition(from, to)) {
      throw new DomainException(
        `Invalid consultation state transition from ${from} to ${to}`,
        { from, to }
      );
    }
    return to;
  }
}
```

---

## Domain Events

**Purpose:** Represent important state changes for side effects (notifications, audit, etc.).

```typescript
// domain/events/ConsultationEvents.ts

export interface DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly aggregateId: string | number;
}

export class AppointmentCheckedInEvent implements DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly aggregateId: number;

  constructor(
    public readonly appointmentId: number,
    public readonly patientId: string,
    public readonly doctorId: string,
    public readonly checkedInAt: Date,
    public readonly checkedInBy: string,
    public readonly isLateArrival: boolean,
    public readonly lateByMinutes: number | undefined,
  ) {
    this.eventId = `appointment-checked-in-${appointmentId}-${Date.now()}`;
    this.occurredAt = new Date();
    this.aggregateId = appointmentId;
  }
}

export class ConsultationStartedEvent implements DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly aggregateId: number;

  constructor(
    public readonly consultationId: number,
    public readonly appointmentId: number,
    public readonly doctorId: string,
    public readonly startedAt: Date,
  ) {
    this.eventId = `consultation-started-${consultationId}-${Date.now()}`;
    this.occurredAt = new Date();
    this.aggregateId = consultationId;
  }
}

export class ConsultationDraftSavedEvent implements DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly aggregateId: number;

  constructor(
    public readonly consultationId: number,
    public readonly appointmentId: number,
    public readonly savedAt: Date,
  ) {
    this.eventId = `consultation-draft-saved-${consultationId}-${Date.now()}`;
    this.occurredAt = new Date();
    this.aggregateId = consultationId;
  }
}

export class ConsultationCompletedEvent implements DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly aggregateId: number;

  constructor(
    public readonly consultationId: number,
    public readonly appointmentId: number,
    public readonly patientId: string,
    public readonly doctorId: string,
    public readonly outcomeType: ConsultationOutcomeType,
    public readonly patientDecision: PatientDecision | undefined,
    public readonly completedAt: Date,
    public readonly durationMinutes: number,
  ) {
    this.eventId = `consultation-completed-${consultationId}-${Date.now()}`;
    this.occurredAt = new Date();
    this.aggregateId = consultationId;
  }
}

export class NoShowDetectedEvent implements DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly aggregateId: number;

  constructor(
    public readonly appointmentId: number,
    public readonly patientId: string,
    public readonly doctorId: string,
    public readonly noShowAt: Date,
    public readonly reason: NoShowReason,
    public readonly detectedBy: string | undefined, // User ID if manual, undefined if auto
  ) {
    this.eventId = `no-show-detected-${appointmentId}-${Date.now()}`;
    this.occurredAt = new Date();
    this.aggregateId = appointmentId;
  }
}

export class LateArrivalDetectedEvent implements DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly aggregateId: number;

  constructor(
    public readonly appointmentId: number,
    public readonly patientId: string,
    public readonly doctorId: string,
    public readonly checkedInAt: Date,
    public readonly lateByMinutes: number,
  ) {
    this.eventId = `late-arrival-detected-${appointmentId}-${Date.now()}`;
    this.occurredAt = new Date();
    this.aggregateId = appointmentId;
  }
}
```

---

## Domain Services

### 1. NoShowDetectionService

**Purpose:** Detects potential no-shows based on business rules.

```typescript
// domain/services/NoShowDetectionService.ts

import { Appointment } from '../entities/Appointment';
import { NoShowInfo, NoShowReason } from '../value-objects/NoShowInfo';
import { ITimeService } from '../interfaces/services/ITimeService';

export class NoShowDetectionService {
  constructor(
    private readonly timeService: ITimeService,
    private readonly noShowDetectionWindowMinutes: number = 30, // Configurable
  ) {}

  /**
   * Checks if appointment should be flagged as potential no-show
   * 
   * Business Rules:
   * - Appointment time must have passed
   * - Must be at least N minutes after appointment time
   * - Patient must not be checked in
   * - Appointment must not already be marked as no-show
   */
  shouldFlagAsNoShow(appointment: Appointment): boolean {
    if (appointment.isCheckedIn()) {
      return false; // Already checked in
    }
    if (appointment.isNoShow()) {
      return false; // Already marked
    }

    const now = this.timeService.now();
    const appointmentDateTime = this.getAppointmentDateTime(appointment);
    const minutesSinceAppointment = (now.getTime() - appointmentDateTime.getTime()) / (1000 * 60);

    return minutesSinceAppointment >= this.noShowDetectionWindowMinutes;
  }

  /**
   * Creates NoShowInfo for automatic detection
   */
  createAutoNoShowInfo(): NoShowInfo {
    return NoShowInfo.create({
      noShowAt: this.timeService.now(),
      reason: NoShowReason.AUTO,
      notes: 'Automatically detected by system',
    });
  }

  private getAppointmentDateTime(appointment: Appointment): Date {
    const date = appointment.getAppointmentDate();
    const time = appointment.getTime();
    const [hours, minutes] = time.split(':').map(Number);
    const dateTime = new Date(date);
    dateTime.setHours(hours, minutes, 0, 0);
    return dateTime;
  }
}
```

### 2. ConsultationDraftService

**Purpose:** Manages consultation draft autosave logic.

```typescript
// domain/services/ConsultationDraftService.ts

import { Consultation } from '../entities/Consultation';
import { ConsultationNotes } from '../value-objects/ConsultationNotes';
import { ITimeService } from '../interfaces/services/ITimeService';

export class ConsultationDraftService {
  constructor(
    private readonly timeService: ITimeService,
    private readonly autosaveIntervalSeconds: number = 30,
  ) {}

  /**
   * Determines if draft should be auto-saved
   * 
   * Business Rules:
   * - Consultation must be in progress
   * - Must be at least N seconds since last save
   */
  shouldAutoSave(
    consultation: Consultation,
    lastSavedAt: Date | undefined,
  ): boolean {
    if (!consultation.isInProgress()) {
      return false;
    }

    if (!lastSavedAt) {
      return true; // Never saved, should save
    }

    const now = this.timeService.now();
    const secondsSinceLastSave = (now.getTime() - lastSavedAt.getTime()) / 1000;
    return secondsSinceLastSave >= this.autosaveIntervalSeconds;
  }

  /**
   * Validates draft notes before saving
   */
  validateDraft(notes: ConsultationNotes): void {
    // Basic validation - can be extended
    if (notes.isEmpty()) {
      // Empty drafts are allowed (user might be clearing)
      return;
    }
  }
}
```

### 3. ConsultationSessionService

**Purpose:** Orchestrates consultation session workflow.

```typescript
// domain/services/ConsultationSessionService.ts

import { AppointmentAggregate } from '../aggregates/AppointmentAggregate';
import { ConsultationOutcomeType } from '../enums/ConsultationOutcomeType';
import { PatientDecision } from '../enums/PatientDecision';
import { ConsultationNotes } from '../value-objects/ConsultationNotes';
import { DomainException } from '../exceptions/DomainException';

export class ConsultationSessionService {
  /**
   * Validates consultation can be started
   */
  canStartConsultation(aggregate: AppointmentAggregate): boolean {
    return aggregate.getAppointment().isCheckedIn() &&
           (!aggregate.hasConsultation() || 
            aggregate.getConsultation()?.getState() === ConsultationState.NOT_STARTED);
  }

  /**
   * Validates consultation can be completed
   */
  canCompleteConsultation(
    aggregate: AppointmentAggregate,
    outcomeType: ConsultationOutcomeType,
    patientDecision?: PatientDecision,
  ): boolean {
    if (!aggregate.hasConsultation()) {
      return false;
    }

    const consultation = aggregate.getConsultation()!;
    if (!consultation.isInProgress()) {
      return false;
    }

    // Validate patient decision if required
    if (outcomeType === ConsultationOutcomeType.PROCEDURE_RECOMMENDED) {
      if (!patientDecision) {
        return false;
      }
    }

    return true;
  }

  /**
   * Determines if case plan should be created
   */
  shouldCreateCasePlan(
    outcomeType: ConsultationOutcomeType,
    patientDecision?: PatientDecision,
  ): boolean {
    if (outcomeType !== ConsultationOutcomeType.PROCEDURE_RECOMMENDED) {
      return false;
    }
    // Create case plan if patient decided or is deciding
    return patientDecision === PatientDecision.YES || 
           patientDecision === PatientDecision.PENDING;
  }

  /**
   * Determines if follow-up appointment should be scheduled
   */
  shouldScheduleFollowUp(outcomeType: ConsultationOutcomeType): boolean {
    return outcomeType === ConsultationOutcomeType.FOLLOW_UP_CONSULTATION_NEEDED;
  }
}
```

---

## Repository Interfaces

### IConsultationRepository

```typescript
// domain/interfaces/repositories/IConsultationRepository.ts

import { Consultation } from '../../entities/Consultation';

export interface IConsultationRepository {
  findById(id: number): Promise<Consultation | null>;
  findByAppointmentId(appointmentId: number): Promise<Consultation | null>;
  findByDoctorId(doctorId: string, filters?: {
    state?: ConsultationState;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Consultation[]>;
  save(consultation: Consultation): Promise<Consultation>;
  delete(id: number): Promise<void>;
}
```

### Enhanced IAppointmentRepository

```typescript
// domain/interfaces/repositories/IAppointmentRepository.ts (Enhanced)

import { Appointment } from '../../entities/Appointment';
import { AppointmentStatus } from '../../enums/AppointmentStatus';

export interface IAppointmentRepository {
  findById(id: number): Promise<Appointment | null>;
  findByPatientId(patientId: string): Promise<Appointment[]>;
  findByDoctorId(doctorId: string, filters?: {
    status?: AppointmentStatus;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Appointment[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Appointment[]>;
  findPotentialNoShows(now: Date, windowMinutes: number): Promise<Appointment[]>;
  save(appointment: Appointment): Promise<Appointment>;
  delete(id: number): Promise<void>;
}
```

---

## Prisma Schema Extensions

### Enhanced Consultation Model

```prisma
model Consultation {
  id              Int       @id @default(autoincrement())
  appointment_id  Int       @unique
  doctor_id       String
  user_id         String? // User who started consultation
  
  // State tracking
  state           String   @default("NOT_STARTED") // ConsultationState enum
  
  // Session tracking
  started_at      DateTime?
  completed_at    DateTime?
  duration_minutes Int?
  duration_seconds Int?
  
  // Consultation content
  doctor_notes    String? @db.Text
  chief_complaint String? @db.Text
  examination     String? @db.Text
  assessment      String? @db.Text
  plan            String? @db.Text
  
  // Outcome
  outcome_type    String? // ConsultationOutcomeType
  patient_decision String? // PatientDecision
  
  // Follow-up
  follow_up_date  DateTime?
  follow_up_type  String?
  follow_up_notes String?
  
  // Draft tracking
  last_draft_saved_at DateTime?
  draft_version       Int @default(0)
  
  // Relations
  appointment Appointment @relation(fields: [appointment_id], references: [id], onDelete: Cascade)
  doctor      Doctor      @relation(fields: [doctor_id], references: [id], onDelete: Cascade)
  user        User?       @relation(fields: [user_id], references: [id], onDelete: SetNull)
  
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  
  @@index([appointment_id])
  @@index([doctor_id])
  @@index([state])
  @@index([started_at])
  @@index([completed_at])
}
```

### Enhanced Appointment Model

```prisma
model Appointment {
  // ... existing fields ...
  
  // Check-in tracking
  checked_in_at    DateTime?
  checked_in_by    String? // User ID
  late_arrival     Boolean @default(false)
  late_by_minutes  Int?
  
  // No-show tracking
  no_show          Boolean @default(false)
  no_show_at       DateTime?
  no_show_reason   String? // NoShowReason enum
  no_show_notes    String?
  rescheduled_to_appointment_id Int?
  
  // ... rest of fields ...
  
  @@index([checked_in_at])
  @@index([no_show])
  @@index([no_show_at])
}
```

---

## Invariants Summary

### Appointment Invariants

1. **Check-In Invariant:** Appointment cannot be checked in if already marked as no-show
2. **No-Show Invariant:** Appointment cannot be marked no-show if already checked in
3. **Status Consistency:** Appointment status must reflect check-in/no-show state
4. **Completion Invariant:** Appointment can only be completed if checked in

### Consultation Invariants

1. **Existence Invariant:** Consultation can only exist if appointment is checked in
2. **State Transition Invariant:** Consultation can only transition through valid states
3. **Start Invariant:** Consultation can only be started if appointment is checked in
4. **Completion Invariant:** Consultation must have outcome when completed
5. **Patient Decision Invariant:** If outcome is PROCEDURE_RECOMMENDED, patient decision is required

### Aggregate Invariants

1. **AppointmentAggregate:** Consultation and appointment states must be consistent
2. **Consistency Boundary:** All changes to appointment/consultation must go through aggregate root

---

## Service Boundaries

### Domain Layer (Pure Business Logic)

- **Entities:** Consultation, Appointment (enhanced)
- **Value Objects:** CheckInInfo, NoShowInfo, ConsultationDuration, ConsultationNotes
- **Aggregates:** AppointmentAggregate
- **State Machines:** AppointmentStateMachine, ConsultationStateMachine
- **Domain Services:** NoShowDetectionService, ConsultationDraftService, ConsultationSessionService
- **Domain Events:** All consultation-related events

### Application Layer (Use Cases)

- **StartConsultationUseCase:** Orchestrates consultation start
- **UpdateConsultationDraftUseCase:** Handles draft autosave
- **CompleteConsultationUseCase:** Orchestrates consultation completion
- **CheckInPatientUseCase:** Handles patient check-in
- **MarkNoShowUseCase:** Handles no-show marking
- **DetectNoShowsUseCase:** Background job for auto-detection

### Infrastructure Layer (Implementations)

- **ConsultationRepository:** Prisma implementation
- **AppointmentRepository:** Prisma implementation (enhanced)
- **EventPublisher:** Publishes domain events
- **DraftStorageService:** Manages draft persistence

---

## Implementation Priority

### Phase 1: Core Domain (Must Have)

1. ✅ Consultation entity with state machine
2. ✅ Enhanced Appointment entity with check-in/no-show
3. ✅ Value objects (CheckInInfo, NoShowInfo, ConsultationDuration, ConsultationNotes)
4. ✅ AppointmentAggregate
5. ✅ State machines
6. ✅ Domain events

### Phase 2: Domain Services (Should Have)

7. ⭐ NoShowDetectionService
8. ⭐ ConsultationDraftService
9. ⭐ ConsultationSessionService

### Phase 3: Infrastructure (Must Have)

10. ✅ Repository implementations
11. ✅ Prisma schema updates
12. ✅ Event publisher

---

## Testing Strategy

### Unit Tests

- Entity state transitions
- Value object validation
- State machine transitions
- Domain service logic
- Aggregate invariants

### Integration Tests

- Repository persistence
- Aggregate consistency
- Event publishing

### Domain Tests

- Business rule validation
- Invariant enforcement
- State transition validation

---

## Summary

This architecture provides:

1. **Explicit State Modeling:** All states and transitions are explicit and validated
2. **Clear Aggregates:** AppointmentAggregate enforces consistency boundaries
3. **Immutable Value Objects:** All value objects are immutable and validated
4. **Domain Events:** Important changes emit events for side effects
5. **Service Boundaries:** Domain services encapsulate complex business logic
6. **Invariant Enforcement:** Business rules enforced at aggregate root

The design prioritizes correctness, maintainability, and extensibility while supporting all workflow requirements from the consultation session specification.
