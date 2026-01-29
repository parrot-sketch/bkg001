/**
 * Consultation Request Workflow
 * 
 * Encapsulates the state machine and business rules for consultation requests.
 * Provides clear, testable logic for workflow transitions and validation.
 * 
 * Workflow Diagram:
 * 
 *     Patient submits inquiry
 *            ↓
 *      SUBMITTED
 *            ↓
 *      PENDING_REVIEW (Frontdesk reviews)
 *            ↓
 *     ┌──────┴──────┐
 *     ↓             ↓
 *  APPROVED    NEEDS_MORE_INFO
 *     ↓             ↓
 *  SCHEDULED   Patient provides info
 *     ↓             ↓
 *  CONFIRMED   Back to PENDING_REVIEW
 *     ↓
 *  COMPLETED
 *
 * Failure paths:
 * Any status → CANCELLED (rejected)
 */

import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

type ReviewAction = 'approve' | 'needs_more_info' | 'reject';

/**
 * Consultation Request Workflow
 * 
 * Manages state transitions and validates business rules for consultation requests.
 */
export class ConsultationRequestWorkflow {
  /**
   * Determine if a consultation request can be reviewed by frontdesk
   */
  static canReview(status: ConsultationRequestStatus): boolean {
    return [
      ConsultationRequestStatus.SUBMITTED,
      ConsultationRequestStatus.PENDING_REVIEW,
      ConsultationRequestStatus.NEEDS_MORE_INFO,
    ].includes(status);
  }

  /**
   * Determine if a consultation request can be scheduled
   */
  static canSchedule(status: ConsultationRequestStatus): boolean {
    return status === ConsultationRequestStatus.APPROVED;
  }

  /**
   * Determine if a consultation request is in progress
   */
  static isInProgress(status: ConsultationRequestStatus): boolean {
    return [
      ConsultationRequestStatus.SUBMITTED,
      ConsultationRequestStatus.PENDING_REVIEW,
      ConsultationRequestStatus.NEEDS_MORE_INFO,
      ConsultationRequestStatus.APPROVED,
      ConsultationRequestStatus.SCHEDULED,
    ].includes(status);
  }

  /**
   * Determine if a consultation request is completed
   */
  static isCompleted(status: ConsultationRequestStatus): boolean {
    return [
      ConsultationRequestStatus.CONFIRMED,
      ConsultationRequestStatus.COMPLETED,
      ConsultationRequestStatus.CANCELLED,
    ].includes(status);
  }

  /**
   * Get the next status based on frontdesk review action
   * 
   * @param currentStatus - Current consultation request status
   * @param action - Review action (approve, needs_more_info, reject)
   * @returns Next status after the action
   * @throws Error if transition is invalid
   */
  static getNextStatus(
    currentStatus: ConsultationRequestStatus,
    action: ReviewAction
  ): ConsultationRequestStatus {
    const transitions: Record<
      ConsultationRequestStatus,
      Partial<Record<ReviewAction, ConsultationRequestStatus>>
    > = {
      [ConsultationRequestStatus.SUBMITTED]: {
        approve: ConsultationRequestStatus.APPROVED,
        needs_more_info: ConsultationRequestStatus.NEEDS_MORE_INFO,
        reject: ConsultationRequestStatus.CANCELLED,
      },
      [ConsultationRequestStatus.PENDING_REVIEW]: {
        approve: ConsultationRequestStatus.APPROVED,
        needs_more_info: ConsultationRequestStatus.NEEDS_MORE_INFO,
        reject: ConsultationRequestStatus.CANCELLED,
      },
      [ConsultationRequestStatus.NEEDS_MORE_INFO]: {
        approve: ConsultationRequestStatus.APPROVED,
        needs_more_info: ConsultationRequestStatus.NEEDS_MORE_INFO,
        reject: ConsultationRequestStatus.CANCELLED,
      },
      // Other statuses can't be transitioned from
      [ConsultationRequestStatus.APPROVED]: {},
      [ConsultationRequestStatus.SCHEDULED]: {},
      [ConsultationRequestStatus.CONFIRMED]: {},
      [ConsultationRequestStatus.COMPLETED]: {},
      [ConsultationRequestStatus.CANCELLED]: {},
    };

    const nextStatus = transitions[currentStatus]?.[action];
    if (!nextStatus) {
      throw new Error(
        `Cannot transition from ${currentStatus} with action ${action}`
      );
    }

    return nextStatus;
  }

  /**
   * Get human-readable label for a review action
   */
  static getActionLabel(action: ReviewAction): string {
    const labels: Record<ReviewAction, string> = {
      approve: 'Accept for Scheduling',
      needs_more_info: 'Request Clarification',
      reject: 'Mark as Not Suitable',
    };
    return labels[action];
  }

  /**
   * Get human-readable description for a review action
   */
  static getActionDescription(action: ReviewAction): string {
    const descriptions: Record<ReviewAction, string> = {
      approve:
        'Accept this consultation request and propose a session date and time. The patient will be notified to confirm.',
      needs_more_info:
        'Request additional information from the patient before proceeding. They will receive a notification with your questions.',
      reject:
        'Mark this consultation request as not suitable. The patient will be notified that they are not a suitable candidate for this procedure.',
    };
    return descriptions[action];
  }

  /**
   * Validate that an approval has required information
   */
  static validateApproval(proposedDate?: string, proposedTime?: string): {
    valid: boolean;
    error?: string;
  } {
    if (!proposedDate || !proposedTime) {
      return {
        valid: false,
        error: 'Proposed date and time are required when accepting for scheduling',
      };
    }

    try {
      const dateObj = new Date(proposedDate);
      if (isNaN(dateObj.getTime())) {
        return {
          valid: false,
          error: 'Invalid date format',
        };
      }

      if (dateObj < new Date()) {
        return {
          valid: false,
          error: 'Proposed date must be in the future',
        };
      }

      return { valid: true };
    } catch {
      return {
        valid: false,
        error: 'Invalid date format',
      };
    }
  }

  /**
   * Validate that a clarification request has required information
   */
  static validateClarificationRequest(reviewNotes?: string): {
    valid: boolean;
    error?: string;
  } {
    if (!reviewNotes || !reviewNotes.trim()) {
      return {
        valid: false,
        error: 'Review notes are required when requesting clarification',
      };
    }

    if (reviewNotes.length < 10) {
      return {
        valid: false,
        error: 'Review notes must be at least 10 characters',
      };
    }

    return { valid: true };
  }

  /**
   * Validate that a rejection has required information
   */
  static validateRejection(reviewNotes?: string): {
    valid: boolean;
    error?: string;
  } {
    if (!reviewNotes || !reviewNotes.trim()) {
      return {
        valid: false,
        error: 'Reason is required when marking as not suitable',
      };
    }

    if (reviewNotes.length < 10) {
      return {
        valid: false,
        error: 'Reason must be at least 10 characters',
      };
    }

    return { valid: true };
  }
}
