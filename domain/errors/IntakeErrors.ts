import { DomainException } from '@/domain/exceptions/DomainException';

/**
 * Typed Domain Error Hierarchy for Intake System
 *
 * Every error carries a machine-readable `code` and an HTTP `statusCode`
 * so route handlers can map errors to HTTP responses without string matching.
 */

export class IntakeError extends DomainException {
  constructor(
    message: string,
    readonly code: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'IntakeError';
  }
}

export class SessionNotFoundError extends IntakeError {
  constructor(sessionId: string) {
    super(`Session ${sessionId} not found`, 'SESSION_NOT_FOUND', 404);
    this.name = 'SessionNotFoundError';
  }
}

export class SessionExpiredError extends IntakeError {
  constructor(sessionId: string) {
    super(`Session ${sessionId} has expired`, 'SESSION_EXPIRED', 409);
    this.name = 'SessionExpiredError';
  }
}

export class SessionAlreadySubmittedError extends IntakeError {
  constructor(sessionId: string) {
    super(`Session ${sessionId} already has a submission`, 'SESSION_ALREADY_SUBMITTED', 409);
    this.name = 'SessionAlreadySubmittedError';
  }
}

export class InvalidSessionStateError extends IntakeError {
  constructor(sessionId: string, currentStatus: string, expectedStatus: string) {
    super(
      `Session ${sessionId} is ${currentStatus}, expected ${expectedStatus}`,
      'INVALID_SESSION_STATE',
      409,
    );
    this.name = 'InvalidSessionStateError';
  }
}

export class DuplicatePatientError extends IntakeError {
  constructor(email: string, fileNumber: string, existingPatientId: string) {
    super(
      `Patient with email ${email} already exists (File: ${fileNumber})`,
      'DUPLICATE_PATIENT',
      409,
    );
    this.name = 'DuplicatePatientError';
    this.existingPatientId = existingPatientId;
    this.existingFileNumber = fileNumber;
  }

  readonly existingPatientId: string;
  readonly existingFileNumber: string;
}

export class IncompleteSubmissionError extends IntakeError {
  constructor(readonly missingFields: string[]) {
    super(
      `Missing required fields: ${missingFields.join(', ')}`,
      'INCOMPLETE_SUBMISSION',
      400,
    );
    this.name = 'IncompleteSubmissionError';
  }
}

export class CorruptedDataError extends IntakeError {
  constructor(recordId: string, cause?: Error) {
    super(
      `Corrupted data for record ${recordId}${cause ? `: ${cause.message}` : ''}`,
      'CORRUPTED_DATA',
      500,
    );
    this.name = 'CorruptedDataError';
  }
}

export class UnauthorizedError extends IntakeError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends IntakeError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends IntakeError {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class PatientNotFoundError extends IntakeError {
  constructor(patientId: string) {
    super(`Patient ${patientId} not found`, 'PATIENT_NOT_FOUND', 404);
    this.name = 'PatientNotFoundError';
  }
}
