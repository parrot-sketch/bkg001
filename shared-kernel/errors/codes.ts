/**
 * Shared Kernel — Clinical Error Codes
 *
 * Typed enumeration of all business and application errors in the Consultation Module.
 *
 * Organized by bounded-context category to prevent accidental mixing of concerns
 * and to guide future provider design.
 *
 * **Naming convention:** UPPER_SNAKE_CASE
 * **Prefixing:** No prefix required — enum namespace itself is the namespace.
 * **Adding new codes:**
 *   1. Add to the appropriate category.
 *   2. Add a unit test verifying the code value.
 *   3. Document the trigger condition in a code comment.
 */

export enum ClinicalErrorCode {
  /** Consultation lifecycle errors */
  APPOINTMENT_NOT_FOUND = 'APPOINTMENT_NOT_FOUND',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  CONSULTATION_COMPLETED = 'CONSULTATION_COMPLETED',
  ALREADY_COMPLETED = 'ALREADY_COMPLETED',
  INVALID_WORKFLOW_TRANSITION = 'INVALID_WORKFLOW_TRANSITION',
  FAILED_TO_LOAD_APPOINTMENT = 'FAILED_TO_LOAD_APPOINTMENT',
  FAILED_TO_START_CONSULTATION = 'FAILED_TO_START_CONSULTATION',
  FAILED_TO_FINALIZE_SESSION = 'FAILED_TO_FINALIZE_SESSION',

  /** Patient data errors */
  PATIENT_NOT_FOUND = 'PATIENT_NOT_FOUND',
  PATIENT_NOT_ARRIVED = 'PATIENT_NOT_ARRIVED',
  PATIENT_INACTIVE = 'PATIENT_INACTIVE',
  PATIENT_NO_SHOW = 'PATIENT_NO_SHOW',
  DUPLICATE_PATIENT = 'DUPLICATE_PATIENT',

  /** Queue state errors */
  QUEUE_ITEM_MISSING = 'QUEUE_ITEM_MISSING',
  QUEUE_CONFLICT = 'QUEUE_CONFLICT',

  /** Notes/draft errors */
  DRAFT_NOT_FOUND = 'DRAFT_NOT_FOUND',
  DRAFT_CORRUPTED = 'DRAFT_CORRUPTED',
  DRAFT_CONFLICT = 'DRAFT_CONFLICT',
  DRAFT_SAVE_FAILED = 'DRAFT_SAVE_FAILED',
  CORRUPTED_DATA = 'CORRUPTED_DATA',

  /** Validation errors */
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INCOMPLETE_SUBMISSION = 'INCOMPLETE_SUBMISSION',

  /** Authorization errors */
  UNAUTHORIZED = 'UNAUTHORIZED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  FORBIDDEN = 'FORBIDDEN',

  /** Infrastructure errors */
  NETWORK_UNAVAILABLE = 'NETWORK_UNAVAILABLE',
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',

  /** Unknown / system errors */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Bounded-context categories for error classification.
 *
 * Used to route errors to the correct provider notification handler
 * and to enforce category-based import rules in the Shared Kernel.
 */
export enum ClinicalErrorCategory {
  CONSULTATION = 'CONSULTATION',
  PATIENT = 'PATIENT',
  QUEUE = 'QUEUE',
  DOCUMENTATION = 'DOCUMENTATION',
  VALIDATION = 'VALIDATION',
  AUTHORIZATION = 'AUTHORIZATION',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  SYSTEM = 'SYSTEM',
}

/**
 * Severity levels for error triage.
 */
export enum ClinicalErrorSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}
