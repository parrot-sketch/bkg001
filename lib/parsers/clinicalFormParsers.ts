/**
 * Canonical JSON Parsers for Clinical Form Data
 *
 * Replaces unsafe `JSON.parse() as any` patterns with type-safe Zod validation.
 * All parsers throw ValidationError on invalid data.
 */

import { z } from 'zod';
import {
  nurseIntraOpRecordDraftSchema,
  nurseIntraOpRecordFinalSchema,
  type NurseIntraOpRecordDraft,
  type NurseIntraOpRecordData,
} from '@/domain/clinical-forms/NurseIntraOpRecord';
import {
  nurseRecoveryRecordDraftSchema,
  nurseRecoveryRecordFinalSchema,
  type NurseRecoveryRecordDraft,
  type NurseRecoveryRecordData,
} from '@/domain/clinical-forms/NurseRecoveryRecord';
import { ValidationError } from '@/application/errors/ValidationError';

// ============================================================================
// Intra-Op Record Parsers
// ============================================================================

/**
 * Parse intra-op record JSON data (draft or final).
 * Throws ValidationError if data is invalid.
 */
export function parseIntraOpRecordData(
  jsonString: string,
  strict: boolean = false
): NurseIntraOpRecordDraft | NurseIntraOpRecordData {
  try {
    const raw = JSON.parse(jsonString);
    const schema = strict ? nurseIntraOpRecordFinalSchema : nurseIntraOpRecordDraftSchema;
    const result = schema.safeParse(raw);

    if (!result.success) {
      throw new ValidationError(
        `Invalid intra-op record data: ${result.error.errors[0]?.message || 'Validation failed'}`,
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    return result.data;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new ValidationError('Invalid JSON format in intra-op record data');
    }
    throw new ValidationError(
      `Failed to parse intra-op record data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Parse intra-op record JSON data for gate compliance checks.
 * Uses final schema to ensure all required safety items are present.
 */
export function parseIntraOpRecordForGate(jsonString: string): NurseIntraOpRecordData {
  return parseIntraOpRecordData(jsonString, true) as NurseIntraOpRecordData;
}

// ============================================================================
// Recovery Record Parsers
// ============================================================================

/**
 * Parse recovery record JSON data (draft or final).
 * Throws ValidationError if data is invalid.
 */
export function parseRecoveryRecordData(
  jsonString: string,
  strict: boolean = false
): NurseRecoveryRecordDraft | NurseRecoveryRecordData {
  try {
    const raw = JSON.parse(jsonString);
    const schema = strict ? nurseRecoveryRecordFinalSchema : nurseRecoveryRecordDraftSchema;
    const result = schema.safeParse(raw);

    if (!result.success) {
      throw new ValidationError(
        `Invalid recovery record data: ${result.error.errors[0]?.message || 'Validation failed'}`,
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    return result.data;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new ValidationError('Invalid JSON format in recovery record data');
    }
    throw new ValidationError(
      `Failed to parse recovery record data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Parse recovery record JSON data for gate compliance checks.
 * Uses final schema to ensure all required discharge criteria are present.
 */
export function parseRecoveryRecordForGate(jsonString: string): NurseRecoveryRecordData {
  return parseRecoveryRecordData(jsonString, true) as NurseRecoveryRecordData;
}
