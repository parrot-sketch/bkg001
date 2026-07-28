/**
 * Shared Kernel — Clinical Error Type
 *
 * Framework-agnostic error payload for the Consultation Module.
 *
 * **Design rules:**
 * - Does NOT extend the native `Error` class.
 * - Contains no React, HTTP, or infrastructure concerns.
 * - Immutable after construction (readonly fields).
 * - `cause` preserves the original error chain without coupling to `Error`.
 *
 * Application services and providers construct `ClinicalError` values
 * and pass them upstream to Presentation for rendering.
 */

import {
  ClinicalErrorCode,
  ClinicalErrorCategory,
  ClinicalErrorSeverity,
} from './codes';

export interface ClinicalError {
  readonly code: ClinicalErrorCode;
  readonly category: ClinicalErrorCategory;
  readonly message: string;
  readonly recoverable: boolean;
  readonly retryable: boolean;
  readonly severity: ClinicalErrorSeverity;
  readonly cause?: unknown;
  readonly details?: Record<string, unknown>;
}

/**
 * Type guard — narrows unknown values to `ClinicalError`.
 */
export function isClinicalError(value: unknown): value is ClinicalError {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.code === 'string' &&
    typeof obj.category === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.recoverable === 'boolean' &&
    typeof obj.retryable === 'boolean' &&
    typeof obj.severity === 'string'
  );
}
