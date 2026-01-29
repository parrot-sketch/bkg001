/**
 * Frontdesk Module Configuration
 * 
 * Centralized constants for frontdesk module to avoid magic numbers/strings
 * and improve maintainability.
 */

/**
 * Appointment-related configuration
 */
export const APPOINTMENT_CONFIG = {
  // UI display limits
  MAX_APPOINTMENTS_ON_DASHBOARD: 10,
  MAX_APPOINTMENTS_PER_PAGE: 50,
  
  // Cache and timing
  CACHE_STALE_TIME_MS: 1000 * 30, // 30 seconds - moderate freshness for clinical workflows
  CACHE_GARBAGE_COLLECTION_MS: 1000 * 60 * 5, // 5 minutes
} as const;

/**
 * Consultation request-related configuration
 */
export const CONSULTATION_CONFIG = {
  // Filter separators and values
  STATUS_FILTER_SEPARATOR: ',',
  ALL_STATUSES_FILTER: 'ALL',
  
  // Default status filters
  DEFAULT_STATUS_FILTER: 'SUBMITTED,PENDING_REVIEW',
  
  // All possible statuses (used when "ALL" filter is selected)
  ALL_STATUSES_ARRAY: ['SUBMITTED', 'PENDING_REVIEW', 'NEEDS_MORE_INFO', 'APPROVED', 'SCHEDULED', 'CONFIRMED'] as const,
  
  // Cache and timing
  CACHE_STALE_TIME_MS: 1000 * 30, // 30 seconds
  CACHE_GARBAGE_COLLECTION_MS: 1000 * 60 * 5, // 5 minutes
} as const;

/**
 * Patient-related configuration
 */
export const PATIENT_CONFIG = {
  // Pagination
  PATIENTS_PER_PAGE: 25,
  MAX_SEARCH_RESULTS: 100,
  
  // Cache and timing
  CACHE_STALE_TIME_MS: 1000 * 60, // 1 minute - less frequent changes
  CACHE_GARBAGE_COLLECTION_MS: 1000 * 60 * 10, // 10 minutes
} as const;

/**
 * Doctor availability configuration
 */
export const DOCTOR_AVAILABILITY_CONFIG = {
  // View range
  DAYS_OF_WEEK_TO_DISPLAY: 7, // Show full week
  
  // Cache and timing
  CACHE_STALE_TIME_MS: 1000 * 60 * 2, // 2 minutes - availability changes frequently
  CACHE_GARBAGE_COLLECTION_MS: 1000 * 60 * 10, // 10 minutes
} as const;

/**
 * UI/UX configuration
 */
export const UI_CONFIG = {
  // Dialog sizes
  DIALOG_MAX_WIDTH_SM: '500px',
  DIALOG_MAX_WIDTH_MD: '700px',
  DIALOG_MAX_HEIGHT: '90vh',
  
  // Debounce and timing
  SEARCH_DEBOUNCE_MS: 300,
  TOAST_AUTO_DISMISS_MS: 5000,
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  APPOINTMENT: {
    NOT_FOUND: 'Appointment not found',
    ALREADY_CHECKED_IN: 'Patient already checked in',
    CANNOT_CHECK_IN_CANCELLED: 'Cannot check in to a cancelled appointment',
    CANNOT_CHECK_IN_COMPLETED: 'Cannot check in to a completed appointment',
  },
  CONSULTATION: {
    FAILED_TO_LOAD: 'Failed to load consultations',
    FAILED_TO_REVIEW: 'Failed to review consultation request',
    INVALID_STATUS: 'Invalid consultation status',
    MISSING_PROPOSED_DATE: 'Proposed date and time are required when accepting for scheduling',
    MISSING_REVIEW_NOTES: 'Review notes are required for this action',
  },
  PATIENT: {
    FAILED_TO_LOAD: 'Failed to load patient',
    FAILED_TO_CREATE: 'Failed to register patient',
    FAILED_TO_SEARCH: 'Failed to search patients',
  },
  DOCTOR: {
    FAILED_TO_LOAD_AVAILABILITY: 'Failed to load doctor availability',
  },
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  APPOINTMENT: {
    CHECKED_IN: 'Patient checked in successfully',
  },
  CONSULTATION: {
    REVIEWED: 'Consultation request reviewed successfully',
    ACCEPTED: 'Consultation request accepted for scheduling',
    CLARIFICATION_REQUESTED: 'Clarification requested from patient',
    MARKED_NOT_SUITABLE: 'Consultation request marked as not suitable',
  },
  PATIENT: {
    CREATED: (firstName: string, lastName: string) =>
      `Patient ${firstName} ${lastName} registered successfully`,
  },
} as const;
