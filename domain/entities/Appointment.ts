import { AppointmentStatus } from '../enums/AppointmentStatus';
import { CheckInInfo } from '../value-objects/CheckInInfo';
import { NoShowInfo } from '../value-objects/NoShowInfo';
import { SlotWindow } from '../value-objects/SlotWindow';
import { DoctorConfirmation } from '../value-objects/DoctorConfirmation';
import { AppointmentRejection } from '../value-objects/AppointmentRejection';
import { DomainException } from '../exceptions/DomainException';

/**
 * Entity: Appointment
 * 
 * Represents an appointment between a patient and a doctor.
 * This is a rich domain entity with business logic encapsulated.
 * 
 * Phase 1 Enhancements (Database Foundation):
 * - Added temporal tracking: scheduled_at, status_changed_at, status_changed_by
 * - Added confirmation tracking: doctor_confirmed_at, doctor_confirmed_by, doctor_rejection_reason
 * - Added no-show tracking: marked_no_show_at
 * - Added duration_minutes for time conflict detection
 * 
 * Phase 2 Enhancements (Domain Layer):
 * - Integrated SlotWindow value object for time slot management
 * - Integrated DoctorConfirmation and AppointmentRejection value objects
 * - Implemented state machine methods for appointment lifecycle
 * - Added advanced business logic methods
 * 
 * Business Rules:
 * - Appointment must have a valid ID (immutable once set)
 * - Appointment must have a patient ID and doctor ID
 * - Appointment must have a valid date and time (scheduled_at from Phase 1)
 * - Appointment status must be valid
 * - Cannot transition through invalid states (enforced by state machine)
 * - Cannot be both checked in and marked as no-show
 * 
 * This entity does not depend on Prisma or any framework.
 * It is pure domain logic with full testability.
 */
export class Appointment {
  private constructor(
    private readonly id: number,
    private readonly patientId: string,
    private readonly doctorId: string,
    private readonly appointmentDate: Date,
    private readonly time: string,
    private readonly status: AppointmentStatus,
    private readonly type: string,
    // Phase 1: Temporal Tracking Fields
    private readonly scheduledAt?: Date,
    private readonly statusChangedAt?: Date,
    private readonly statusChangedBy?: string,
    private readonly doctorConfirmedAt?: Date,
    private readonly doctorConfirmedBy?: string,
    private readonly doctorRejectionReason?: string,
    private readonly markedNoShowAt?: Date,
    private readonly durationMinutes?: number,
    // Other fields
    private readonly note?: string,
    private readonly reason?: string,
    private readonly checkInInfo?: CheckInInfo,
    private readonly noShowInfo?: NoShowInfo,
    private readonly doctorConfirmation?: DoctorConfirmation,
    private readonly doctorRejection?: AppointmentRejection,
    private readonly rescheduledToAppointmentId?: number,
    private readonly createdAt?: Date,
    private readonly updatedAt?: Date,
  ) {
    // Invariant: Cannot be both checked in and no-show
    if (this.checkInInfo && this.noShowInfo) {
      throw new DomainException(
        'Appointment cannot be both checked in and marked as no-show',
        { appointmentId: this.id }
      );
    }

    // Invariant: Cannot have both confirmation and rejection
    if (this.doctorConfirmation && this.doctorRejection) {
      throw new DomainException(
        'Appointment cannot have both confirmation and rejection',
        { appointmentId: this.id }
      );
    }
  }

  /**
   * Creates a new Appointment entity
   * 
   * @param params - Appointment creation parameters
   * @returns Appointment entity
   * @throws DomainException if validation fails
   */
  static create(params: {
    id: number;
    patientId: string;
    doctorId: string;
    appointmentDate: Date;
    time: string;
    status: AppointmentStatus;
    type: string;
    // Phase 1 Temporal Fields
    scheduledAt?: Date;
    statusChangedAt?: Date;
    statusChangedBy?: string;
    doctorConfirmedAt?: Date;
    doctorConfirmedBy?: string;
    doctorRejectionReason?: string;
    markedNoShowAt?: Date;
    durationMinutes?: number;
    // Other fields
    note?: string;
    reason?: string;
    checkInInfo?: CheckInInfo;
    noShowInfo?: NoShowInfo;
    doctorConfirmation?: DoctorConfirmation;
    doctorRejection?: AppointmentRejection;
    rescheduledToAppointmentId?: number;
    createdAt?: Date;
    updatedAt?: Date;
  }): Appointment {
    // Validate required fields
    // Note: id = 0 is allowed as a temporary ID for unsaved appointments (database will assign actual ID)
    if (typeof params.id !== 'number' || params.id < 0) {
      throw new DomainException('Appointment ID must be a non-negative number (0 for temporary, positive for saved)', {
        providedValue: params.id,
      });
    }

    if (!params.patientId || typeof params.patientId !== 'string' || params.patientId.trim().length === 0) {
      throw new DomainException('Patient ID cannot be empty', {
        providedValue: params.patientId,
      });
    }

    if (!params.doctorId || typeof params.doctorId !== 'string' || params.doctorId.trim().length === 0) {
      throw new DomainException('Doctor ID cannot be empty', {
        providedValue: params.doctorId,
      });
    }

    if (!params.appointmentDate || !(params.appointmentDate instanceof Date)) {
      throw new DomainException('Appointment date must be a valid Date', {
        providedValue: params.appointmentDate,
      });
    }

    if (!params.time || typeof params.time !== 'string' || params.time.trim().length === 0) {
      throw new DomainException('Appointment time cannot be empty', {
        providedValue: params.time,
      });
    }

    if (!params.type || typeof params.type !== 'string' || params.type.trim().length === 0) {
      throw new DomainException('Appointment type cannot be empty', {
        providedValue: params.type,
      });
    }

    // Validate Phase 1 temporal fields if provided
    if (params.durationMinutes !== undefined) {
      if (!Number.isInteger(params.durationMinutes) || params.durationMinutes <= 0) {
        throw new DomainException('Duration minutes must be a positive integer', {
          providedValue: params.durationMinutes,
        });
      }
    }

    return new Appointment(
      params.id,
      params.patientId.trim(),
      params.doctorId.trim(),
      params.appointmentDate,
      params.time.trim(),
      params.status,
      params.type.trim(),
      params.scheduledAt,
      params.statusChangedAt,
      params.statusChangedBy?.trim(),
      params.doctorConfirmedAt,
      params.doctorConfirmedBy?.trim(),
      params.doctorRejectionReason?.trim(),
      params.markedNoShowAt,
      params.durationMinutes,
      params.note?.trim(),
      params.reason?.trim(),
      params.checkInInfo,
      params.noShowInfo,
      params.doctorConfirmation,
      params.doctorRejection,
      params.rescheduledToAppointmentId,
      params.createdAt,
      params.updatedAt,
    );
  }

  /**
   * Checks in the patient
   * 
   * Invariants:
   * - Cannot check in if already checked in
   * - Cannot check in if marked as no-show
   * - Cannot check in if cancelled or completed
   * - Updates status to SCHEDULED if was PENDING
   * 
   * @param checkInInfo - Check-in information
   * @returns New Appointment entity with check-in applied
   * @throws DomainException if check-in is not allowed
   */
  checkIn(checkInInfo: CheckInInfo): Appointment {
    // Invariant: Cannot check in if already checked in
    if (this.checkInInfo) {
      throw new DomainException('Patient is already checked in', {
        appointmentId: this.id,
        existingCheckIn: this.checkInInfo.getCheckedInAt().toISOString(),
      });
    }

    // Invariant: Cannot check in if marked as no-show
    if (this.noShowInfo) {
      throw new DomainException('Cannot check in a no-show appointment', {
        appointmentId: this.id,
        noShowReason: this.noShowInfo.getReason(),
      });
    }

    // Invariant: Cannot check in if cancelled or completed
    if (this.status === AppointmentStatus.CANCELLED) {
      throw new DomainException('Cannot check in a cancelled appointment', {
        appointmentId: this.id,
        status: this.status,
      });
    }

    if (this.status === AppointmentStatus.COMPLETED) {
      throw new DomainException('Cannot check in a completed appointment', {
        appointmentId: this.id,
        status: this.status,
      });
    }

    // Update status to SCHEDULED if was PENDING
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
      this.scheduledAt,
      new Date(), // Update status_changed_at
      this.statusChangedBy,
      this.doctorConfirmedAt,
      this.doctorConfirmedBy,
      this.doctorRejectionReason,
      this.markedNoShowAt,
      this.durationMinutes,
      this.note,
      this.reason,
      checkInInfo,
      undefined, // Clear no-show if it exists (shouldn't, but defensive)
      this.doctorConfirmation,
      this.doctorRejection,
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
   * - Cannot mark as no-show if already marked
   * - Cannot mark as no-show if cancelled or completed
   * - Sets status to NO_SHOW
   * 
   * @param noShowInfo - No-show information
   * @returns New Appointment entity with no-show applied
   * @throws DomainException if marking no-show is not allowed
   */
  markAsNoShow(noShowInfo: NoShowInfo): Appointment {
    // Invariant: Cannot mark as no-show if already checked in
    if (this.checkInInfo) {
      throw new DomainException('Cannot mark checked-in appointment as no-show', {
        appointmentId: this.id,
        checkedInAt: this.checkInInfo.getCheckedInAt().toISOString(),
      });
    }

    // Invariant: Cannot mark as no-show if already marked (idempotency)
    if (this.noShowInfo) {
      throw new DomainException('Appointment is already marked as no-show', {
        appointmentId: this.id,
        existingNoShow: this.noShowInfo.getNoShowAt().toISOString(),
      });
    }

    // Invariant: Cannot mark as no-show if cancelled or completed
    if (this.status === AppointmentStatus.CANCELLED) {
      throw new DomainException('Cannot mark cancelled appointment as no-show', {
        appointmentId: this.id,
        status: this.status,
      });
    }

    if (this.status === AppointmentStatus.COMPLETED) {
      throw new DomainException('Cannot mark completed appointment as no-show', {
        appointmentId: this.id,
        status: this.status,
      });
    }

    return new Appointment(
      this.id,
      this.patientId,
      this.doctorId,
      this.appointmentDate,
      this.time,
      AppointmentStatus.NO_SHOW,
      this.type,
      this.scheduledAt,
      new Date(), // Update status_changed_at
      this.statusChangedBy,
      this.doctorConfirmedAt,
      this.doctorConfirmedBy,
      this.doctorRejectionReason,
      new Date(), // Set marked_no_show_at
      this.durationMinutes,
      this.note,
      this.reason,
      undefined, // Clear check-in if it exists (shouldn't, but defensive)
      noShowInfo,
      this.doctorConfirmation,
      this.doctorRejection,
      this.rescheduledToAppointmentId,
      this.createdAt,
      new Date(),
    );
  }

  /**
   * Confirms appointment (doctor confirmation)
   * 
   * @param confirmation - DoctorConfirmation details
   * @returns New Appointment entity with confirmation applied
   * @throws DomainException if confirmation is not allowed
   */
  confirmWithDoctor(confirmation: DoctorConfirmation): Appointment {
    // Can only confirm if pending confirmation
    if (this.status !== AppointmentStatus.PENDING &&
        this.status !== AppointmentStatus.PENDING_DOCTOR_CONFIRMATION) {
      throw new DomainException(
        `Cannot confirm appointment in ${this.status} status`,
        { appointmentId: this.id, currentStatus: this.status }
      );
    }

    // Cannot confirm if already rejected
    if (this.doctorRejection) {
      throw new DomainException('Cannot confirm a rejected appointment', {
        appointmentId: this.id,
        rejectedAt: this.doctorRejection.getRejectedAt().toISOString(),
      });
    }

    return new Appointment(
      this.id,
      this.patientId,
      this.doctorId,
      this.appointmentDate,
      this.time,
      AppointmentStatus.SCHEDULED,
      this.type,
      this.scheduledAt,
      new Date(), // Update status_changed_at
      this.statusChangedBy,
      confirmation.getConfirmedAt(),
      confirmation.getConfirmedBy(),
      this.doctorRejectionReason,
      this.markedNoShowAt,
      this.durationMinutes,
      this.note,
      this.reason,
      this.checkInInfo,
      this.noShowInfo,
      this.doctorConfirmation,
      this.doctorRejection,
      this.rescheduledToAppointmentId,
      this.createdAt,
      new Date(),
    );
  }

  /**
   * Rejects appointment (doctor rejection)
   * 
   * @param rejection - AppointmentRejection details
   * @returns New Appointment entity with rejection applied
   * @throws DomainException if rejection is not allowed
   */
  rejectByDoctor(rejection: AppointmentRejection): Appointment {
    // Can only reject if pending confirmation
    if (this.status !== AppointmentStatus.PENDING &&
        this.status !== AppointmentStatus.PENDING_DOCTOR_CONFIRMATION) {
      throw new DomainException(
        `Cannot reject appointment in ${this.status} status`,
        { appointmentId: this.id, currentStatus: this.status }
      );
    }

    // Cannot reject if already confirmed
    if (this.doctorConfirmation) {
      throw new DomainException('Cannot reject a confirmed appointment', {
        appointmentId: this.id,
        confirmedAt: this.doctorConfirmation.getConfirmedAt().toISOString(),
      });
    }

    return new Appointment(
      this.id,
      this.patientId,
      this.doctorId,
      this.appointmentDate,
      this.time,
      AppointmentStatus.CANCELLED,
      this.type,
      this.scheduledAt,
      new Date(), // Update status_changed_at
      this.statusChangedBy,
      this.doctorConfirmedAt,
      this.doctorConfirmedBy,
      rejection.getReasonDetails(),
      this.markedNoShowAt,
      this.durationMinutes,
      this.note,
      this.reason,
      this.checkInInfo,
      this.noShowInfo,
      this.doctorConfirmation,
      this.doctorRejection,
      this.rescheduledToAppointmentId,
      this.createdAt,
      new Date(),
    );
  }

  /**
   * Gets the appointment as a SlotWindow for conflict detection
   * Uses Phase 1 scheduled_at and duration_minutes fields
   * 
   * @returns SlotWindow representing this appointment's time slot
   */
  getSlotWindow(): SlotWindow {
    const startTime = this.scheduledAt || this.appointmentDate;
    const duration = this.durationMinutes || 30; // Default to 30 minutes if not set

    return SlotWindow.fromStartAndDuration({
      startTime,
      durationMinutes: duration,
    });
  }

  /**
   * Checks if appointment overlaps with a given time slot
   * Uses the new SlotWindow value object
   * 
   * @param otherSlot - Another SlotWindow to check against
   * @returns true if appointments conflict
   */
  conflictsWith(otherSlot: SlotWindow): boolean {
    return this.getSlotWindow().overlapsWithSlot(otherSlot);
  }

  // Getters

  getId(): number {
    return this.id;
  }

  getPatientId(): string {
    return this.patientId;
  }

  getDoctorId(): string {
    return this.doctorId;
  }

  getAppointmentDate(): Date {
    return new Date(this.appointmentDate); // Return a copy to maintain immutability
  }

  getTime(): string {
    return this.time;
  }

  getStatus(): AppointmentStatus {
    return this.status;
  }

  getType(): string {
    return this.type;
  }

  getNote(): string | undefined {
    return this.note;
  }

  getReason(): string | undefined {
    return this.reason;
  }

  getCreatedAt(): Date | undefined {
    return this.createdAt ? new Date(this.createdAt) : undefined;
  }

  getUpdatedAt(): Date | undefined {
    return this.updatedAt ? new Date(this.updatedAt) : undefined;
  }

  getCheckInInfo(): CheckInInfo | undefined {
    return this.checkInInfo;
  }

  getNoShowInfo(): NoShowInfo | undefined {
    return this.noShowInfo;
  }

  // Phase 1 Temporal Field Getters
  getScheduledAt(): Date | undefined {
    return this.scheduledAt ? new Date(this.scheduledAt) : undefined;
  }

  getStatusChangedAt(): Date | undefined {
    return this.statusChangedAt ? new Date(this.statusChangedAt) : undefined;
  }

  getStatusChangedBy(): string | undefined {
    return this.statusChangedBy;
  }

  getDoctorConfirmedAt(): Date | undefined {
    return this.doctorConfirmedAt ? new Date(this.doctorConfirmedAt) : undefined;
  }

  getDoctorConfirmedBy(): string | undefined {
    return this.doctorConfirmedBy;
  }

  getDoctorRejectionReason(): string | undefined {
    return this.doctorRejectionReason;
  }

  getMarkedNoShowAt(): Date | undefined {
    return this.markedNoShowAt ? new Date(this.markedNoShowAt) : undefined;
  }

  getDurationMinutes(): number | undefined {
    return this.durationMinutes;
  }

  // Phase 2 Value Object Getters
  getDoctorConfirmation(): DoctorConfirmation | undefined {
    return this.doctorConfirmation;
  }

  getDoctorRejection(): AppointmentRejection | undefined {
    return this.doctorRejection;
  }

  getRescheduledToAppointmentId(): number | undefined {
    return this.rescheduledToAppointmentId;
  }

  isCheckedIn(): boolean {
    return this.checkInInfo !== undefined;
  }

  isNoShow(): boolean {
    return this.noShowInfo !== undefined;
  }

  isLateArrival(): boolean {
    return this.checkInInfo?.isLate() ?? false;
  }

  // Business logic methods

  /**
   * Checks if the appointment is in the past
   * 
   * @param now - Current date/time (for testability)
   * @returns true if appointment date is in the past
   */
  isPast(now: Date = new Date()): boolean {
    return this.appointmentDate < now;
  }

  /**
   * Checks if the appointment can be cancelled
   * 
   * @returns true if appointment status allows cancellation
   */
  canBeCancelled(): boolean {
    return this.status === AppointmentStatus.PENDING || this.status === AppointmentStatus.SCHEDULED;
  }

  /**
   * Checks if the appointment is completed
   * 
   * @returns true if appointment status is COMPLETED
   */
  isCompleted(): boolean {
    return this.status === AppointmentStatus.COMPLETED;
  }

  /**
   * Checks equality with another Appointment entity
   * 
   * @param other - Another Appointment entity
   * @returns true if appointments have the same ID
   */
  equals(other: Appointment | null | undefined): boolean {
    if (!other) {
      return false;
    }
    // Entities are equal if they have the same ID
    return this.id === other.id;
  }

  /**
   * String representation for logging/debugging
   */
  toString(): string {
    return `Appointment(id=${this.id}, patientId=${this.patientId}, doctorId=${this.doctorId}, date=${this.appointmentDate.toISOString()})`;
  }
}
