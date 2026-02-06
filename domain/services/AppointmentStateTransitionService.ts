import { AppointmentStatus } from '../enums/AppointmentStatus';
import { DoctorConfirmation } from '../value-objects/DoctorConfirmation';
import { AppointmentRejection } from '../value-objects/AppointmentRejection';
import { DomainException } from '../exceptions/DomainException';

/**
 * Domain Service: AppointmentStateTransitionService
 * 
 * Responsible for managing valid state transitions in the appointment lifecycle.
 * Implements the state machine logic for appointments.
 * 
 * This service is stateless and focuses on validation and transition logic.
 * It does not access the database or modify any entities.
 * 
 * Appointment Status Flow:
 * 
 * Initial States:
 *   PENDING → (doctor confirmation) → SCHEDULED or PENDING_DOCTOR_CONFIRMATION
 *   PENDING → (patient confirms) → CONFIRMED
 *   
 * Active States:
 *   SCHEDULED → (appointment happens) → COMPLETED
 *   SCHEDULED → (patient no-shows) → NO_SHOW
 *   SCHEDULED → (cancelled) → CANCELLED
 *   
 * Terminal States:
 *   COMPLETED (patient attended)
 *   NO_SHOW (patient didn't attend)
 *   CANCELLED (appointment cancelled)
 */
export interface StateTransitionResult {
  isValid: boolean;
  newStatus: AppointmentStatus;
  reason?: string;
}

export class AppointmentStateTransitionService {
  /**
   * Gets the valid next states for a given appointment status
   * 
   * Complete Appointment Lifecycle:
   * 
   * PENDING → (frontdesk schedules) → PENDING_DOCTOR_CONFIRMATION
   * PENDING → (patient confirms) → CONFIRMED
   * PENDING_DOCTOR_CONFIRMATION → (doctor confirms) → SCHEDULED
   * CONFIRMED → (doctor confirms) → SCHEDULED
   * SCHEDULED → (frontdesk checks in patient) → CHECKED_IN
   * CHECKED_IN → (nurse preps patient) → READY_FOR_CONSULTATION
   * CHECKED_IN → (doctor starts consult) → IN_CONSULTATION
   * READY_FOR_CONSULTATION → (doctor starts consult) → IN_CONSULTATION
   * IN_CONSULTATION → (doctor completes) → COMPLETED
   * 
   * @param currentStatus - Current appointment status
   * @returns Array of valid next statuses
   */
  static getValidNextStates(currentStatus: AppointmentStatus): AppointmentStatus[] {
    const transitions: Record<AppointmentStatus, AppointmentStatus[]> = {
      [AppointmentStatus.PENDING]: [
        AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CHECKED_IN, // Allow direct check-in for walk-ins
        AppointmentStatus.CANCELLED,
      ],
      [AppointmentStatus.PENDING_DOCTOR_CONFIRMATION]: [
        AppointmentStatus.SCHEDULED,
        AppointmentStatus.CANCELLED,
      ],
      [AppointmentStatus.CONFIRMED]: [
        AppointmentStatus.SCHEDULED,
        AppointmentStatus.CHECKED_IN, // Allow check-in from confirmed
        AppointmentStatus.CANCELLED,
      ],
      [AppointmentStatus.SCHEDULED]: [
        AppointmentStatus.CHECKED_IN, // Primary path: frontdesk checks in patient
        AppointmentStatus.NO_SHOW,
        AppointmentStatus.CANCELLED,
      ],
      [AppointmentStatus.CHECKED_IN]: [
        AppointmentStatus.READY_FOR_CONSULTATION, // Nurse completes prep
        AppointmentStatus.IN_CONSULTATION, // Doctor starts directly (skip nurse prep)
        AppointmentStatus.NO_SHOW, // Patient left before being seen
        AppointmentStatus.CANCELLED,
      ],
      [AppointmentStatus.READY_FOR_CONSULTATION]: [
        AppointmentStatus.IN_CONSULTATION, // Doctor starts consultation
        AppointmentStatus.NO_SHOW,
        AppointmentStatus.CANCELLED,
      ],
      [AppointmentStatus.IN_CONSULTATION]: [
        AppointmentStatus.COMPLETED, // Doctor completes consultation
      ],
      [AppointmentStatus.COMPLETED]: [],
      [AppointmentStatus.NO_SHOW]: [],
      [AppointmentStatus.CANCELLED]: [],
    };

    return transitions[currentStatus] || [];
  }

  /**
   * Validates if a transition from one status to another is valid
   * 
   * @param currentStatus - Current appointment status
   * @param targetStatus - Desired next appointment status
   * @returns true if transition is valid
   */
  static isValidTransition(
    currentStatus: AppointmentStatus,
    targetStatus: AppointmentStatus,
  ): boolean {
    if (currentStatus === targetStatus) {
      return false; // No transition needed
    }

    const validNextStates = AppointmentStateTransitionService.getValidNextStates(currentStatus);
    return validNextStates.includes(targetStatus);
  }

  /**
   * Validates if an appointment can be cancelled in its current state
   * 
   * @param currentStatus - Current appointment status
   * @returns true if appointment can be cancelled
   */
  static canBeCancelled(currentStatus: AppointmentStatus): boolean {
    return currentStatus === AppointmentStatus.PENDING ||
           currentStatus === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION ||
           currentStatus === AppointmentStatus.CONFIRMED ||
           currentStatus === AppointmentStatus.SCHEDULED;
  }

  /**
   * Validates if an appointment can be marked as no-show in its current state
   * 
   * @param currentStatus - Current appointment status
   * @returns true if appointment can be marked as no-show
   */
  static canBeMarkedNoShow(currentStatus: AppointmentStatus): boolean {
    return currentStatus === AppointmentStatus.SCHEDULED ||
           currentStatus === AppointmentStatus.CHECKED_IN ||
           currentStatus === AppointmentStatus.READY_FOR_CONSULTATION;
  }

  /**
   * Validates if an appointment can be completed in its current state
   * Only appointments currently IN_CONSULTATION can be completed.
   * 
   * @param currentStatus - Current appointment status
   * @returns true if appointment can be marked as completed
   */
  static canBeCompleted(currentStatus: AppointmentStatus): boolean {
    return currentStatus === AppointmentStatus.IN_CONSULTATION;
  }

  /**
   * Validates if a consultation can be started for an appointment
   * Patient must have been checked in before consultation can begin.
   * 
   * @param currentStatus - Current appointment status
   * @returns true if consultation can be started
   */
  static canStartConsultation(currentStatus: AppointmentStatus): boolean {
    return currentStatus === AppointmentStatus.CHECKED_IN ||
           currentStatus === AppointmentStatus.READY_FOR_CONSULTATION;
  }

  /**
   * Validates and returns the transition result when starting a consultation
   * 
   * @param currentStatus - Current appointment status
   * @returns StateTransitionResult with new status and validity
   */
  static onConsultationStart(currentStatus: AppointmentStatus): StateTransitionResult {
    if (!AppointmentStateTransitionService.canStartConsultation(currentStatus)) {
      return {
        isValid: false,
        newStatus: currentStatus,
        reason: 'Patient hasn\'t arrived yet',
      };
    }

    return {
      isValid: true,
      newStatus: AppointmentStatus.IN_CONSULTATION,
      reason: 'Consultation started',
    };
  }

  /**
   * Validates if an appointment can be checked in
   * 
   * @param currentStatus - Current appointment status
   * @returns true if patient can be checked in
   */
  static canBeCheckedIn(currentStatus: AppointmentStatus): boolean {
    return currentStatus === AppointmentStatus.PENDING ||
           currentStatus === AppointmentStatus.SCHEDULED ||
           currentStatus === AppointmentStatus.CONFIRMED;
  }

  /**
   * Validates and returns the transition result when checking in a patient
   * 
   * @param currentStatus - Current appointment status
   * @returns StateTransitionResult with new status and validity
   */
  static onCheckIn(currentStatus: AppointmentStatus): StateTransitionResult {
    if (!AppointmentStateTransitionService.canBeCheckedIn(currentStatus)) {
      return {
        isValid: false,
        newStatus: currentStatus,
        reason: `Cannot check in patient for appointment in ${currentStatus} status`,
      };
    }

    return {
      isValid: true,
      newStatus: AppointmentStatus.CHECKED_IN,
      reason: 'Patient checked in',
    };
  }

  /**
   * Validates if a doctor can confirm an appointment
   * 
   * @param currentStatus - Current appointment status
   * @returns true if doctor confirmation is valid
   */
  static canBeDoctorConfirmed(currentStatus: AppointmentStatus): boolean {
    return currentStatus === AppointmentStatus.PENDING ||
           currentStatus === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION;
  }

  /**
   * Validates if a doctor can reject an appointment
   * 
   * @param currentStatus - Current appointment status
   * @returns true if doctor rejection is valid
   */
  static canBeRejected(currentStatus: AppointmentStatus): boolean {
    return currentStatus === AppointmentStatus.PENDING ||
           currentStatus === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION;
  }

  /**
   * Validates if an appointment can transition on doctor confirmation
   * 
   * @param currentStatus - Current appointment status
   * @returns StateTransitionResult with new status and validity
   */
  static onDoctorConfirmation(currentStatus: AppointmentStatus): StateTransitionResult {
    if (!AppointmentStateTransitionService.canBeDoctorConfirmed(currentStatus)) {
      return {
        isValid: false,
        newStatus: currentStatus,
        reason: `Cannot confirm appointment in ${currentStatus} status`,
      };
    }

    return {
      isValid: true,
      newStatus: AppointmentStatus.SCHEDULED,
      reason: 'Doctor confirmed appointment',
    };
  }

  /**
   * Validates if an appointment can transition on doctor rejection
   * 
   * @param currentStatus - Current appointment status
   * @returns StateTransitionResult with new status and validity
   */
  static onDoctorRejection(currentStatus: AppointmentStatus): StateTransitionResult {
    if (!AppointmentStateTransitionService.canBeRejected(currentStatus)) {
      return {
        isValid: false,
        newStatus: currentStatus,
        reason: `Cannot reject appointment in ${currentStatus} status`,
      };
    }

    return {
      isValid: true,
      newStatus: AppointmentStatus.CANCELLED,
      reason: 'Doctor rejected appointment',
    };
  }

  /**
   * Validates if an appointment can transition to completed
   * 
   * @param currentStatus - Current appointment status
   * @returns StateTransitionResult with new status and validity
   */
  static onAppointmentCompleted(currentStatus: AppointmentStatus): StateTransitionResult {
    if (!AppointmentStateTransitionService.canBeCompleted(currentStatus)) {
      return {
        isValid: false,
        newStatus: currentStatus,
        reason: `Cannot complete appointment in ${currentStatus} status`,
      };
    }

    return {
      isValid: true,
      newStatus: AppointmentStatus.COMPLETED,
      reason: 'Appointment completed',
    };
  }

  /**
   * Validates if an appointment can be marked as no-show
   * 
   * @param currentStatus - Current appointment status
   * @returns StateTransitionResult with new status and validity
   */
  static onNoShow(currentStatus: AppointmentStatus): StateTransitionResult {
    if (!AppointmentStateTransitionService.canBeMarkedNoShow(currentStatus)) {
      return {
        isValid: false,
        newStatus: currentStatus,
        reason: `Cannot mark appointment as no-show in ${currentStatus} status`,
      };
    }

    return {
      isValid: true,
      newStatus: AppointmentStatus.NO_SHOW,
      reason: 'Appointment marked as no-show',
    };
  }

  /**
   * Validates if an appointment can be cancelled
   * 
   * @param currentStatus - Current appointment status
   * @returns StateTransitionResult with new status and validity
   */
  static onCancellation(currentStatus: AppointmentStatus): StateTransitionResult {
    if (!AppointmentStateTransitionService.canBeCancelled(currentStatus)) {
      return {
        isValid: false,
        newStatus: currentStatus,
        reason: `Cannot cancel appointment in ${currentStatus} status`,
      };
    }

    return {
      isValid: true,
      newStatus: AppointmentStatus.CANCELLED,
      reason: 'Appointment cancelled',
    };
  }

  /**
   * Validates if an appointment is in a terminal state (no further transitions possible)
   * 
   * @param status - Appointment status to check
   * @returns true if status is terminal
   */
  static isTerminalStatus(status: AppointmentStatus): boolean {
    return status === AppointmentStatus.COMPLETED ||
           status === AppointmentStatus.NO_SHOW ||
           status === AppointmentStatus.CANCELLED;
  }

  /**
   * Validates if an appointment is active (not yet completed, cancelled, or no-show)
   * 
   * @param status - Appointment status to check
   * @returns true if appointment is active
   */
  static isActiveStatus(status: AppointmentStatus): boolean {
    return !AppointmentStateTransitionService.isTerminalStatus(status);
  }

  /**
   * Validates if an appointment requires doctor confirmation
   * 
   * @param status - Appointment status to check
   * @returns true if doctor confirmation is pending
   */
  static isPendingDoctorConfirmation(status: AppointmentStatus): boolean {
    return status === AppointmentStatus.PENDING ||
           status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION;
  }

  /**
   * Gets a human-readable description of a status
   * 
   * @param status - Appointment status
   * @returns Description string
   */
  static getStatusDescription(status: AppointmentStatus): string {
    const descriptions: Record<AppointmentStatus, string> = {
      [AppointmentStatus.PENDING]: 'Waiting for confirmation',
      [AppointmentStatus.PENDING_DOCTOR_CONFIRMATION]: 'Pending doctor confirmation',
      [AppointmentStatus.CONFIRMED]: 'Confirmed by patient',
      [AppointmentStatus.SCHEDULED]: 'Scheduled and confirmed',
      [AppointmentStatus.CHECKED_IN]: 'Patient arrived and checked in',
      [AppointmentStatus.READY_FOR_CONSULTATION]: 'Nurse prep complete, ready for doctor',
      [AppointmentStatus.IN_CONSULTATION]: 'Doctor currently seeing patient',
      [AppointmentStatus.COMPLETED]: 'Consultation completed',
      [AppointmentStatus.NO_SHOW]: 'Patient did not show',
      [AppointmentStatus.CANCELLED]: 'Cancelled',
    };

    return descriptions[status] || 'Unknown status';
  }
}
