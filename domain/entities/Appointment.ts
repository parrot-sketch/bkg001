import { AppointmentStatus } from '../enums/AppointmentStatus';
import { DomainException } from '../exceptions/DomainException';

/**
 * Entity: Appointment
 * 
 * Represents an appointment between a patient and a doctor.
 * This is a rich domain entity with business logic encapsulated.
 * 
 * Business Rules:
 * - Appointment must have a valid ID (immutable once set)
 * - Appointment must have a patient ID and doctor ID
 * - Appointment must have a valid date and time
 * - Appointment status must be valid
 * - Appointment date cannot be in the past for new appointments
 * 
 * Note: This is a minimal domain entity for Phase 2.
 * It will be expanded in later phases with more business logic.
 * This entity does not depend on Prisma or any framework.
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
    private readonly note?: string,
    private readonly reason?: string,
    private readonly createdAt?: Date,
    private readonly updatedAt?: Date,
  ) {
    // Validation happens in factory method
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
    note?: string;
    reason?: string;
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

    return new Appointment(
      params.id,
      params.patientId.trim(),
      params.doctorId.trim(),
      params.appointmentDate,
      params.time.trim(),
      params.status,
      params.type.trim(),
      params.note?.trim(),
      params.reason?.trim(),
      params.createdAt,
      params.updatedAt,
    );
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
