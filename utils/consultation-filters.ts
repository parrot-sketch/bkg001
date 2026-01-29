/**
 * Consultation Filter Utilities
 * 
 * Reusable filters for consultation request statuses.
 * Centralizes filter logic to avoid duplication across pages.
 */

import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';

/**
 * Predicate functions for filtering appointments by consultation request status
 */
export const ConsultationStatusFilters = {
  /**
   * New inquiries that need initial review
   * Status: SUBMITTED or PENDING_REVIEW
   */
  isNewInquiry: (apt: AppointmentResponseDto): boolean =>
    apt.consultationRequestStatus === ConsultationRequestStatus.SUBMITTED ||
    apt.consultationRequestStatus === ConsultationRequestStatus.PENDING_REVIEW,

  /**
   * Inquiries awaiting patient clarification
   * Status: NEEDS_MORE_INFO
   */
  isAwaitingClarification: (apt: AppointmentResponseDto): boolean =>
    apt.consultationRequestStatus === ConsultationRequestStatus.NEEDS_MORE_INFO,

  /**
   * Approved inquiries ready to be scheduled
   * Status: APPROVED
   */
  isAwaitingScheduling: (apt: AppointmentResponseDto): boolean =>
    apt.consultationRequestStatus === ConsultationRequestStatus.APPROVED,

  /**
   * All reviewable statuses (can be reviewed by frontdesk)
   */
  isReviewable: (apt: AppointmentResponseDto): boolean =>
    apt.consultationRequestStatus === ConsultationRequestStatus.SUBMITTED ||
    apt.consultationRequestStatus === ConsultationRequestStatus.PENDING_REVIEW ||
    apt.consultationRequestStatus === ConsultationRequestStatus.NEEDS_MORE_INFO,

  /**
   * Completed consultations (confirmed)
   */
  isCompleted: (apt: AppointmentResponseDto): boolean =>
    apt.consultationRequestStatus === ConsultationRequestStatus.CONFIRMED,
};

/**
 * Statistics helpers for consultation requests
 */
export const ConsultationStats = {
  /**
   * Count new inquiries needing review
   */
  countNewInquiries: (appointments: AppointmentResponseDto[]): number =>
    appointments.filter(ConsultationStatusFilters.isNewInquiry).length,

  /**
   * Count inquiries awaiting patient clarification
   */
  countAwaitingClarification: (appointments: AppointmentResponseDto[]): number =>
    appointments.filter(ConsultationStatusFilters.isAwaitingClarification).length,

  /**
   * Count approved inquiries ready for scheduling
   */
  countAwaitingScheduling: (appointments: AppointmentResponseDto[]): number =>
    appointments.filter(ConsultationStatusFilters.isAwaitingScheduling).length,
};
