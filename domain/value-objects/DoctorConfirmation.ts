import { DomainException } from '../exceptions/DomainException';

/**
 * Value Object: DoctorConfirmation
 * 
 * Immutable value object representing doctor confirmation of an appointment.
 * Used to track when and how a doctor confirmed a scheduled appointment.
 * 
 * Invariants:
 * - confirmedAt must be a valid date
 * - confirmedBy must not be empty (doctor ID)
 * - confirmationMethod must be a valid method
 */
export enum ConfirmationMethod {
  DIRECT_CONFIRMATION = 'DIRECT_CONFIRMATION', // Doctor directly confirmed
  SYSTEM_AUTO_CONFIRMATION = 'SYSTEM_AUTO_CONFIRMATION', // System auto-confirmed after frontdesk scheduling
  PHONE_CONFIRMATION = 'PHONE_CONFIRMATION', // Doctor confirmed via phone
  EMAIL_CONFIRMATION = 'EMAIL_CONFIRMATION', // Doctor confirmed via email
}

export class DoctorConfirmation {
  private constructor(
    private readonly confirmedAt: Date,
    private readonly confirmedBy: string, // Doctor ID
    private readonly confirmationMethod: ConfirmationMethod,
    private readonly notes?: string,
  ) {
    // All invariants enforced in factory methods
  }

  /**
   * Creates a DoctorConfirmation for direct confirmation
   * 
   * @param params - { confirmedAt: Date, confirmedBy: string, notes?: string }
   * @returns DoctorConfirmation instance
   * @throws DomainException if validation fails
   */
  static createDirectConfirmation(params: {
    confirmedAt: Date;
    confirmedBy: string;
    notes?: string;
  }): DoctorConfirmation {
    return DoctorConfirmation.create({
      confirmedAt: params.confirmedAt,
      confirmedBy: params.confirmedBy,
      confirmationMethod: ConfirmationMethod.DIRECT_CONFIRMATION,
      notes: params.notes,
    });
  }

  /**
   * Creates a DoctorConfirmation for system auto-confirmation
   * Used when frontdesk schedules and system auto-confirms for doctor
   * 
   * @param params - { confirmedAt: Date, confirmedBy: string }
   * @returns DoctorConfirmation instance
   * @throws DomainException if validation fails
   */
  static createAutoConfirmation(params: {
    confirmedAt: Date;
    confirmedBy: string;
  }): DoctorConfirmation {
    return DoctorConfirmation.create({
      confirmedAt: params.confirmedAt,
      confirmedBy: params.confirmedBy,
      confirmationMethod: ConfirmationMethod.SYSTEM_AUTO_CONFIRMATION,
      notes: 'System auto-confirmation',
    });
  }

  /**
   * Creates a DoctorConfirmation with explicit parameters
   * 
   * @param params - Confirmation parameters
   * @returns DoctorConfirmation instance
   * @throws DomainException if validation fails
   */
  static create(params: {
    confirmedAt: Date;
    confirmedBy: string;
    confirmationMethod: ConfirmationMethod;
    notes?: string;
  }): DoctorConfirmation {
    if (!params.confirmedAt || !(params.confirmedAt instanceof Date)) {
      throw new DomainException('Confirmed at must be a valid Date', {
        providedValue: params.confirmedAt,
      });
    }

    if (!params.confirmedBy || typeof params.confirmedBy !== 'string' || params.confirmedBy.trim().length === 0) {
      throw new DomainException('Confirmed by (doctor ID) cannot be empty', {
        providedValue: params.confirmedBy,
      });
    }

    if (!Object.values(ConfirmationMethod).includes(params.confirmationMethod)) {
      throw new DomainException('Invalid confirmation method', {
        providedValue: params.confirmationMethod,
      });
    }

    return new DoctorConfirmation(
      params.confirmedAt,
      params.confirmedBy.trim(),
      params.confirmationMethod,
      params.notes?.trim(),
    );
  }

  // Getters
  getConfirmedAt(): Date {
    return new Date(this.confirmedAt);
  }

  getConfirmedBy(): string {
    return this.confirmedBy;
  }

  getConfirmationMethod(): ConfirmationMethod {
    return this.confirmationMethod;
  }

  getNotes(): string | undefined {
    return this.notes;
  }

  /**
   * Checks if this is an auto-confirmation
   */
  isAutoConfirmed(): boolean {
    return this.confirmationMethod === ConfirmationMethod.SYSTEM_AUTO_CONFIRMATION;
  }

  /**
   * Checks if this is a direct confirmation from the doctor
   */
  isDirectConfirmation(): boolean {
    return this.confirmationMethod === ConfirmationMethod.DIRECT_CONFIRMATION;
  }

  /**
   * Equality check
   */
  equals(other: DoctorConfirmation | null | undefined): boolean {
    if (!other) {
      return false;
    }
    return (
      this.confirmedAt.getTime() === other.confirmedAt.getTime() &&
      this.confirmedBy === other.confirmedBy &&
      this.confirmationMethod === other.confirmationMethod &&
      this.notes === other.notes
    );
  }

  /**
   * String representation for logging/debugging
   */
  toString(): string {
    return `DoctorConfirmation(confirmedAt=${this.confirmedAt.toISOString()}, confirmedBy=${this.confirmedBy}, method=${this.confirmationMethod})`;
  }
}
