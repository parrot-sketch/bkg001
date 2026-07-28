import { describe, it, expect } from 'vitest';
import {
  ClinicalErrorCode,
  ClinicalErrorCategory,
  ClinicalErrorSeverity,
} from '@/shared-kernel/errors/codes';
import type { ClinicalError } from '@/shared-kernel/errors/types';
import { isClinicalError } from '@/shared-kernel/errors/types';

describe('ClinicalErrorCode', () => {
  it('has Consultation category values', () => {
    expect(ClinicalErrorCode.APPOINTMENT_NOT_FOUND).toBe('APPOINTMENT_NOT_FOUND');
    expect(ClinicalErrorCode.SESSION_NOT_FOUND).toBe('SESSION_NOT_FOUND');
    expect(ClinicalErrorCode.CONSULTATION_COMPLETED).toBe('CONSULTATION_COMPLETED');
    expect(ClinicalErrorCode.ALREADY_COMPLETED).toBe('ALREADY_COMPLETED');
    expect(ClinicalErrorCode.INVALID_WORKFLOW_TRANSITION).toBe('INVALID_WORKFLOW_TRANSITION');
    expect(ClinicalErrorCode.FAILED_TO_LOAD_APPOINTMENT).toBe('FAILED_TO_LOAD_APPOINTMENT');
    expect(ClinicalErrorCode.FAILED_TO_START_CONSULTATION).toBe('FAILED_TO_START_CONSULTATION');
    expect(ClinicalErrorCode.FAILED_TO_FINALIZE_SESSION).toBe('FAILED_TO_FINALIZE_SESSION');
  });

  it('has Patient category values', () => {
    expect(ClinicalErrorCode.PATIENT_NOT_FOUND).toBe('PATIENT_NOT_FOUND');
    expect(ClinicalErrorCode.PATIENT_NOT_ARRIVED).toBe('PATIENT_NOT_ARRIVED');
    expect(ClinicalErrorCode.PATIENT_INACTIVE).toBe('PATIENT_INACTIVE');
    expect(ClinicalErrorCode.PATIENT_NO_SHOW).toBe('PATIENT_NO_SHOW');
    expect(ClinicalErrorCode.DUPLICATE_PATIENT).toBe('DUPLICATE_PATIENT');
  });

  it('has Queue category values', () => {
    expect(ClinicalErrorCode.QUEUE_ITEM_MISSING).toBe('QUEUE_ITEM_MISSING');
    expect(ClinicalErrorCode.QUEUE_CONFLICT).toBe('QUEUE_CONFLICT');
  });

  it('has Documentation category values', () => {
    expect(ClinicalErrorCode.DRAFT_NOT_FOUND).toBe('DRAFT_NOT_FOUND');
    expect(ClinicalErrorCode.DRAFT_CORRUPTED).toBe('DRAFT_CORRUPTED');
    expect(ClinicalErrorCode.DRAFT_CONFLICT).toBe('DRAFT_CONFLICT');
    expect(ClinicalErrorCode.DRAFT_SAVE_FAILED).toBe('DRAFT_SAVE_FAILED');
    expect(ClinicalErrorCode.CORRUPTED_DATA).toBe('CORRUPTED_DATA');
  });

  it('has Validation category values', () => {
    expect(ClinicalErrorCode.INVALID_INPUT).toBe('INVALID_INPUT');
    expect(ClinicalErrorCode.MISSING_REQUIRED_FIELD).toBe('MISSING_REQUIRED_FIELD');
    expect(ClinicalErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ClinicalErrorCode.INCOMPLETE_SUBMISSION).toBe('INCOMPLETE_SUBMISSION');
  });

  it('has Authorization category values', () => {
    expect(ClinicalErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ClinicalErrorCode.PERMISSION_DENIED).toBe('PERMISSION_DENIED');
    expect(ClinicalErrorCode.FORBIDDEN).toBe('FORBIDDEN');
  });

  it('has Infrastructure category values', () => {
    expect(ClinicalErrorCode.NETWORK_UNAVAILABLE).toBe('NETWORK_UNAVAILABLE');
    expect(ClinicalErrorCode.STORAGE_UNAVAILABLE).toBe('STORAGE_UNAVAILABLE');
  });
});

describe('ClinicalErrorCategory', () => {
  it('defines all expected categories', () => {
    expect(ClinicalErrorCategory.CONSULTATION).toBe('CONSULTATION');
    expect(ClinicalErrorCategory.PATIENT).toBe('PATIENT');
    expect(ClinicalErrorCategory.QUEUE).toBe('QUEUE');
    expect(ClinicalErrorCategory.DOCUMENTATION).toBe('DOCUMENTATION');
    expect(ClinicalErrorCategory.VALIDATION).toBe('VALIDATION');
    expect(ClinicalErrorCategory.AUTHORIZATION).toBe('AUTHORIZATION');
    expect(ClinicalErrorCategory.INFRASTRUCTURE).toBe('INFRASTRUCTURE');
  });
});

describe('ClinicalErrorSeverity', () => {
  it('defines severity levels', () => {
    expect(ClinicalErrorSeverity.INFO).toBe('INFO');
    expect(ClinicalErrorSeverity.WARNING).toBe('WARNING');
    expect(ClinicalErrorSeverity.ERROR).toBe('ERROR');
    expect(ClinicalErrorSeverity.CRITICAL).toBe('CRITICAL');
  });
});

describe('ClinicalError', () => {
  it('can be constructed with all required fields', () => {
    const error: ClinicalError = {
      code: ClinicalErrorCode.APPOINTMENT_NOT_FOUND,
      category: ClinicalErrorCategory.CONSULTATION,
      message: 'Appointment not found',
      recoverable: false,
      retryable: false,
      severity: ClinicalErrorSeverity.ERROR,
    };

    expect(error.code).toBe(ClinicalErrorCode.APPOINTMENT_NOT_FOUND);
    expect(error.message).toBe('Appointment not found');
    expect(error.recoverable).toBe(false);
    expect(error.retryable).toBe(false);
  });

  it('supports optional cause and details', () => {
    const original = new Error('network timeout');
    const error: ClinicalError = {
      code: ClinicalErrorCode.NETWORK_UNAVAILABLE,
      category: ClinicalErrorCategory.INFRASTRUCTURE,
      message: 'Network unavailable',
      recoverable: true,
      retryable: true,
      severity: ClinicalErrorSeverity.WARNING,
      cause: original,
      details: { url: '/api/consultation' },
    };

    expect(error.cause).toBe(original);
    expect(error.details).toEqual({ url: '/api/consultation' });
    expect(error.recoverable).toBe(true);
    expect(error.retryable).toBe(true);
  });

  it('is constructed with readonly shape', () => {
    const error: ClinicalError = {
      code: ClinicalErrorCode.PATIENT_NOT_FOUND,
      category: ClinicalErrorCategory.PATIENT,
      message: 'Patient not found',
      recoverable: false,
      retryable: false,
      severity: ClinicalErrorSeverity.ERROR,
    };

    expect(error.code).toBe(ClinicalErrorCode.PATIENT_NOT_FOUND);
    expect(error.message).toBe('Patient not found');
    expect(error.category).toBe(ClinicalErrorCategory.PATIENT);
    expect(error.severity).toBe(ClinicalErrorSeverity.ERROR);
  });

  it('maps ConsultationContext error strings to codes', () => {
    const mappings: [string, ClinicalErrorCode][] = [
      ['Appointment not found', ClinicalErrorCode.APPOINTMENT_NOT_FOUND],
      ['Patient not found', ClinicalErrorCode.PATIENT_NOT_FOUND],
      ['Failed to load appointment', ClinicalErrorCode.FAILED_TO_LOAD_APPOINTMENT],
      ['Failed to start consultation', ClinicalErrorCode.FAILED_TO_START_CONSULTATION],
      ['Failed to finalize session', ClinicalErrorCode.FAILED_TO_FINALIZE_SESSION],
    ];

    for (const [message, code] of mappings) {
      const error: ClinicalError = {
        code,
        category: ClinicalErrorCategory.CONSULTATION,
        message,
        recoverable: false,
        retryable: false,
        severity: ClinicalErrorSeverity.ERROR,
      };
      expect(error.code).toBe(code);
    }
  });
});

describe('isClinicalError', () => {
  it('returns true for valid ClinicalError objects', () => {
    const error: ClinicalError = {
      code: ClinicalErrorCode.UNAUTHORIZED,
      category: ClinicalErrorCategory.AUTHORIZATION,
      message: 'Unauthorized',
      recoverable: false,
      retryable: false,
      severity: ClinicalErrorSeverity.ERROR,
    };

    expect(isClinicalError(error)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isClinicalError(null)).toBe(false);
  });

  it('returns false for plain objects', () => {
    expect(isClinicalError({ message: 'oops' })).toBe(false);
  });
});
