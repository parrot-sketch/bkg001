import { ConsultationState } from '../enums/ConsultationState';
import { ConsultationOutcomeType } from '../enums/ConsultationOutcomeType';
import { PatientDecision } from '../enums/PatientDecision';
import { ConsultationNotes } from '../value-objects/ConsultationNotes';
import { ConsultationDuration } from '../value-objects/ConsultationDuration';
import { DomainException } from '../exceptions/DomainException';

/**
 * Entity: Consultation
 * 
 * Represents a consultation session between a doctor and patient.
 * This is a rich domain entity with business logic encapsulated.
 * 
 * Business Rules:
 * - Consultation must have an appointment (1:1 relationship)
 * - Consultation can only be started if appointment is SCHEDULED or PENDING
 * - Consultation can only be completed if it has been started
 * - Consultation must have an outcome when completed
 * - If outcome is PROCEDURE_RECOMMENDED, patient decision must be captured
 * 
 * State Machine:
 * - NOT_STARTED → IN_PROGRESS (when consultation starts)
 * - IN_PROGRESS → COMPLETED (when consultation completes)
 * - COMPLETED is terminal
 * 
 * Note: This entity does not depend on Prisma or any framework.
 * It represents the pure domain concept of a Consultation.
 */
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
    // Invariants enforced in factory methods and state transitions
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
      throw new DomainException('Consultation ID must be non-negative', {
        id: params.id,
      });
    }
    if (!params.appointmentId || params.appointmentId <= 0) {
      throw new DomainException('Appointment ID is required and must be positive', {
        appointmentId: params.appointmentId,
      });
    }
    if (!params.doctorId || params.doctorId.trim().length === 0) {
      throw new DomainException('Doctor ID is required', {
        doctorId: params.doctorId,
      });
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
        {
          currentState: this.state,
          consultationId: this.id,
        }
      );
    }

    if (!userId || userId.trim().length === 0) {
      throw new DomainException('User ID is required to start consultation', {
        userId,
      });
    }

    return new Consultation(
      this.id,
      this.appointmentId,
      this.doctorId,
      userId.trim(),
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
        {
          currentState: this.state,
          consultationId: this.id,
        }
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
   * Updates draft: notes + optional outcome/decision during active consultation.
   * Used by auto-save to persist everything the doctor has entered so far.
   * 
   * Invariants:
   * - Must be in IN_PROGRESS state
   */
  updateDraft(params: {
    notes: ConsultationNotes;
    outcomeType?: ConsultationOutcomeType;
    patientDecision?: PatientDecision;
  }): Consultation {
    if (this.state !== ConsultationState.IN_PROGRESS) {
      throw new DomainException(
        `Cannot update draft in ${this.state} state. Only IN_PROGRESS consultations can be updated.`,
        {
          currentState: this.state,
          consultationId: this.id,
        }
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
      params.notes,
      params.outcomeType ?? this.outcomeType,
      params.patientDecision ?? this.patientDecision,
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
        {
          currentState: this.state,
          consultationId: this.id,
        }
      );
    }

    if (!this.startedAt) {
      throw new DomainException('Cannot complete consultation that was never started', {
        consultationId: this.id,
      });
    }

    // Validate patient decision if procedure recommended
    if (
      params.outcomeType === ConsultationOutcomeType.PROCEDURE_RECOMMENDED &&
      !params.patientDecision
    ) {
      throw new DomainException(
        'Patient decision is required when outcome is PROCEDURE_RECOMMENDED',
        {
          outcomeType: params.outcomeType,
          consultationId: this.id,
        }
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
  getId(): number {
    return this.id;
  }

  getAppointmentId(): number {
    return this.appointmentId;
  }

  getDoctorId(): string {
    return this.doctorId;
  }

  getUserId(): string | undefined {
    return this.userId;
  }

  getState(): ConsultationState {
    return this.state;
  }

  getStartedAt(): Date | undefined {
    return this.startedAt ? new Date(this.startedAt) : undefined;
  }

  getCompletedAt(): Date | undefined {
    return this.completedAt ? new Date(this.completedAt) : undefined;
  }

  getDuration(): ConsultationDuration | undefined {
    return this.duration;
  }

  getNotes(): ConsultationNotes | undefined {
    return this.notes;
  }

  getOutcomeType(): ConsultationOutcomeType | undefined {
    return this.outcomeType;
  }

  getPatientDecision(): PatientDecision | undefined {
    return this.patientDecision;
  }

  getFollowUpDate(): Date | undefined {
    return this.followUpDate ? new Date(this.followUpDate) : undefined;
  }

  getFollowUpType(): string | undefined {
    return this.followUpType;
  }

  getFollowUpNotes(): string | undefined {
    return this.followUpNotes;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  getUpdatedAt(): Date {
    return new Date(this.updatedAt);
  }

  // Business logic methods
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
    if (!this.outcomeType) {
      return false;
    }
    return (
      this.outcomeType === ConsultationOutcomeType.PROCEDURE_RECOMMENDED ||
      this.outcomeType === ConsultationOutcomeType.PATIENT_DECIDING
    );
  }

  /**
   * Checks equality with another Consultation entity
   */
  equals(other: Consultation | null | undefined): boolean {
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
    return `Consultation(id=${this.id}, appointmentId=${this.appointmentId}, doctorId=${this.doctorId}, state=${this.state})`;
  }
}
