/**
 * Canonical API Response Contracts
 *
 * Standardized response shapes for all Theater Tech API endpoints.
 * Provides type-safe success/error responses with structured error codes and metadata.
 */

import { z } from 'zod';

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Standardized error codes for API responses.
 * Maps to HTTP status codes and provides structured error handling.
 */
export enum ApiErrorCode {
  /** Validation failed (400) */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** Resource not found (404) */
  NOT_FOUND = 'NOT_FOUND',
  /** Access denied (403) */
  FORBIDDEN = 'FORBIDDEN',
  /** Authentication required (401) */
  UNAUTHORIZED = 'UNAUTHORIZED',
  /** Business rule violation - gate blocked (422) */
  GATE_BLOCKED = 'GATE_BLOCKED',
  /** Conflict - resource state conflict (409) */
  CONFLICT = 'CONFLICT',
  /** Internal server error (500) */
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// ============================================================================
// Error Metadata
// ============================================================================

/**
 * Structured error metadata for different error types.
 */
export interface ApiErrorMetadata {
  /** Field-level validation errors (for VALIDATION_ERROR) */
  errors?: Array<{ field: string; message: string }>;
  /** Missing items that block a transition (for GATE_BLOCKED) */
  missingItems?: string[];
  /** Category of blocker (e.g., 'WHO_CHECKLIST', 'NURSE_INTRAOP_RECORD') */
  blockingCategory?: string;
  /** Additional context */
  [key: string]: unknown;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Success response with data.
 */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Error response with code and metadata.
 */
export interface ApiError {
  success: false;
  error: string;
  code: ApiErrorCode;
  metadata?: ApiErrorMetadata;
}

/**
 * Canonical API response type.
 * All Theater Tech endpoints must return this shape.
 */
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a success response.
 */
export function ok<T>(data: T, message?: string): ApiSuccess<T> {
  return { success: true, data, message };
}

/**
 * Create an error response.
 */
export function fail(
  code: ApiErrorCode,
  error: string,
  metadata?: ApiErrorMetadata
): ApiError {
  return {
    success: false,
    error,
    code,
    ...(metadata && { metadata }),
  };
}

/**
 * Convert a Zod validation error to ApiErrorMetadata.
 */
export function fromZodError(zodError: z.ZodError): ApiErrorMetadata {
  return {
    errors: zodError.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    })),
  };
}

/**
 * Type guard to check if response is success.
 */
export function isSuccess<T>(
  response: ApiResponse<T>
): response is ApiSuccess<T> {
  return response.success === true;
}

/**
 * Type guard to check if response is error.
 */
export function isError<T>(response: ApiResponse<T>): response is ApiError {
  return response.success === false;
}
