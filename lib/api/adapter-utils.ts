/**
 * Shared Adapter Utilities
 *
 * Common error-mapping logic for HTTP adapters in the Consultation Module.
 *
 * Centralizes:
 * - `mapApiError` — maps transport `ApiError` to `ClinicalError`
 * - `mapNetworkError` — maps thrown exceptions to `ClinicalError`
 *
 * Adapters provide a small configuration to customize 404 semantics
 * for their bounded context while sharing the rest of the mapping.
 */

import { ApiError } from './client';
import {
  ClinicalErrorCode,
  ClinicalErrorCategory,
  ClinicalErrorSeverity,
} from '@/shared-kernel/errors/codes';
import type { ClinicalError } from '@/shared-kernel/errors/types';

export interface AdapterErrorConfig {
  readonly notFoundCode: ClinicalErrorCode;
  readonly notFoundCategory: ClinicalErrorCategory;
}

const DEFAULT_MESSAGE = 'An unexpected error occurred';

function unauthorized(cause: unknown): ClinicalError {
  return {
    code: ClinicalErrorCode.UNAUTHORIZED,
    category: ClinicalErrorCategory.AUTHORIZATION,
    message: 'Authentication required',
    recoverable: true,
    retryable: false,
    severity: ClinicalErrorSeverity.ERROR,
    cause,
  };
}

function permissionDenied(cause: unknown): ClinicalError {
  return {
    code: ClinicalErrorCode.PERMISSION_DENIED,
    category: ClinicalErrorCategory.AUTHORIZATION,
    message: 'You do not have permission to perform this action',
    recoverable: false,
    retryable: false,
    severity: ClinicalErrorSeverity.ERROR,
    cause,
  };
}

function notFound(config: AdapterErrorConfig, message: string, cause: unknown): ClinicalError {
  return {
    code: config.notFoundCode,
    category: config.notFoundCategory,
    message,
    recoverable: false,
    retryable: false,
    severity: ClinicalErrorSeverity.ERROR,
    cause,
  };
}

function rateLimited(apiError: ApiError): ClinicalError {
  return {
    code: ClinicalErrorCode.NETWORK_UNAVAILABLE,
    category: ClinicalErrorCategory.INFRASTRUCTURE,
    message: apiError.retryAfterSeconds
      ? `Too many requests. Please retry after ${apiError.retryAfterSeconds} seconds.`
      : 'Too many requests. Please try again later.',
    recoverable: true,
    retryable: true,
    severity: ClinicalErrorSeverity.WARNING,
    cause: apiError,
  };
}

function serverError(cause: unknown): ClinicalError {
  return {
    code: ClinicalErrorCode.STORAGE_UNAVAILABLE,
    category: ClinicalErrorCategory.INFRASTRUCTURE,
    message: 'Service temporarily unavailable',
    recoverable: true,
    retryable: true,
    severity: ClinicalErrorSeverity.ERROR,
    cause,
  };
}

function fallback(message: string, cause: unknown): ClinicalError {
  return {
    code: ClinicalErrorCode.STORAGE_UNAVAILABLE,
    category: ClinicalErrorCategory.INFRASTRUCTURE,
    message,
    recoverable: true,
    retryable: true,
    severity: ClinicalErrorSeverity.ERROR,
    cause,
  };
}

export function mapApiError(apiError: ApiError, config: AdapterErrorConfig): ClinicalError {
  const status = apiError.status;
  const message = apiError.error || DEFAULT_MESSAGE;

  if (status === 401) return unauthorized(apiError);
  if (status === 403) return permissionDenied(apiError);
  if (status === 404) return notFound(config, message, apiError);
  if (status === 429) return rateLimited(apiError);
  if (status && status >= 500) return serverError(apiError);

  return fallback(message, apiError);
}

export function mapNetworkError(error: unknown): ClinicalError {
  const message = error instanceof Error ? error.message : 'Network error occurred';

  return {
    code: ClinicalErrorCode.NETWORK_UNAVAILABLE,
    category: ClinicalErrorCategory.INFRASTRUCTURE,
    message: 'Network error: Please check your connection and try again',
    recoverable: true,
    retryable: true,
    severity: ClinicalErrorSeverity.WARNING,
    cause: error,
  };
}
