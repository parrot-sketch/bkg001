import { DomainException } from '../exceptions/DomainException';

/**
 * Value Object: AppointmentRejection
 * 
 * Immutable value object representing a doctor's rejection of an appointment.
 * Stores rejection details including reason and any additional notes.
 * 
 * Invariants:
 * - rejectedAt must be a valid date
 * - rejectedBy must not be empty (doctor ID)
 * - reason must not be empty
 * - reasonCategory must be a valid category
 */
export enum RejectionReason {
  DOCTOR_UNAVAILABLE = 'DOCTOR_UNAVAILABLE',
  SCHEDULING_CONFLICT = 'SCHEDULING_CONFLICT',
  PATIENT_UNSUITABLE = 'PATIENT_UNSUITABLE',
  MEDICAL_REASON = 'MEDICAL_REASON',
  ADMINISTRATIVE_REASON = 'ADMINISTRATIVE_REASON',
  OTHER = 'OTHER',
}

export class AppointmentRejection {
  private constructor(
    private readonly rejectedAt: Date,
    private readonly rejectedBy: string, // Doctor ID
    private readonly reasonCategory: RejectionReason,
    private readonly reasonDetails: string,
    private readonly notes?: string,
  ) {
    // All invariants enforced in factory methods
  }

  /**
   * Creates an AppointmentRejection with validation
   * 
   * @param params - Rejection parameters
   * @returns AppointmentRejection instance
   * @throws DomainException if validation fails
   */
  static create(params: {
    rejectedAt: Date;
    rejectedBy: string;
    reasonCategory: RejectionReason;
    reasonDetails: string;
    notes?: string;
  }): AppointmentRejection {
    if (!params.rejectedAt || !(params.rejectedAt instanceof Date)) {
      throw new DomainException('Rejected at must be a valid Date', {
        providedValue: params.rejectedAt,
      });
    }

    if (!params.rejectedBy || typeof params.rejectedBy !== 'string' || params.rejectedBy.trim().length === 0) {
      throw new DomainException('Rejected by (doctor ID) cannot be empty', {
        providedValue: params.rejectedBy,
      });
    }

    if (!Object.values(RejectionReason).includes(params.reasonCategory)) {
      throw new DomainException('Invalid rejection reason category', {
        providedValue: params.reasonCategory,
      });
    }

    if (!params.reasonDetails || typeof params.reasonDetails !== 'string' || params.reasonDetails.trim().length === 0) {
      throw new DomainException('Reason details cannot be empty', {
        providedValue: params.reasonDetails,
      });
    }

    if (params.reasonDetails.length > 1000) {
      throw new DomainException('Reason details cannot exceed 1000 characters', {
        providedLength: params.reasonDetails.length,
      });
    }

    return new AppointmentRejection(
      params.rejectedAt,
      params.rejectedBy.trim(),
      params.reasonCategory,
      params.reasonDetails.trim(),
      params.notes?.trim(),
    );
  }

  /**
   * Creates a rejection for doctor unavailability
   */
  static createUnavailable(params: {
    rejectedAt: Date;
    rejectedBy: string;
    reasonDetails: string;
    notes?: string;
  }): AppointmentRejection {
    return AppointmentRejection.create({
      rejectedAt: params.rejectedAt,
      rejectedBy: params.rejectedBy,
      reasonCategory: RejectionReason.DOCTOR_UNAVAILABLE,
      reasonDetails: params.reasonDetails,
      notes: params.notes,
    });
  }

  /**
   * Creates a rejection for scheduling conflict
   */
  static createConflict(params: {
    rejectedAt: Date;
    rejectedBy: string;
    reasonDetails: string;
    notes?: string;
  }): AppointmentRejection {
    return AppointmentRejection.create({
      rejectedAt: params.rejectedAt,
      rejectedBy: params.rejectedBy,
      reasonCategory: RejectionReason.SCHEDULING_CONFLICT,
      reasonDetails: params.reasonDetails,
      notes: params.notes,
    });
  }

  /**
   * Creates a rejection for medical reason
   */
  static createMedicalReason(params: {
    rejectedAt: Date;
    rejectedBy: string;
    reasonDetails: string;
    notes?: string;
  }): AppointmentRejection {
    return AppointmentRejection.create({
      rejectedAt: params.rejectedAt,
      rejectedBy: params.rejectedBy,
      reasonCategory: RejectionReason.MEDICAL_REASON,
      reasonDetails: params.reasonDetails,
      notes: params.notes,
    });
  }

  // Getters
  getRejectedAt(): Date {
    return new Date(this.rejectedAt);
  }

  getRejectedBy(): string {
    return this.rejectedBy;
  }

  getReasonCategory(): RejectionReason {
    return this.reasonCategory;
  }

  getReasonDetails(): string {
    return this.reasonDetails;
  }

  getNotes(): string | undefined {
    return this.notes;
  }

  /**
   * Get full rejection reason (category + details)
   */
  getFullReason(): string {
    return `${this.reasonCategory}: ${this.reasonDetails}`;
  }

  /**
   * Checks if this is a final rejection (doctor will not reconsider)
   */
  isFinal(): boolean {
    return this.reasonCategory === RejectionReason.MEDICAL_REASON ||
           this.reasonCategory === RejectionReason.PATIENT_UNSUITABLE;
  }

  /**
   * Checks if this could be rescheduled (reason is temporary)
   */
  isReschedulable(): boolean {
    return this.reasonCategory === RejectionReason.DOCTOR_UNAVAILABLE ||
           this.reasonCategory === RejectionReason.SCHEDULING_CONFLICT;
  }

  /**
   * Equality check
   */
  equals(other: AppointmentRejection | null | undefined): boolean {
    if (!other) {
      return false;
    }
    return (
      this.rejectedAt.getTime() === other.rejectedAt.getTime() &&
      this.rejectedBy === other.rejectedBy &&
      this.reasonCategory === other.reasonCategory &&
      this.reasonDetails === other.reasonDetails &&
      this.notes === other.notes
    );
  }

  /**
   * String representation for logging/debugging
   */
  toString(): string {
    return `AppointmentRejection(rejectedAt=${this.rejectedAt.toISOString()}, rejectedBy=${this.rejectedBy}, reason=${this.reasonCategory})`;
  }
}
