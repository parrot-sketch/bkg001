/**
 * API Error Response Utility
 *
 * Provides structured error handling for API routes with correlation IDs for tracing.
 * - Generates unique correlation IDs for each error occurrence
 * - Maps domain errors to appropriate HTTP status codes
 * - Logs full error details server-side (never exposed to client)
 * - Returns safe, consistent error responses to client
 *
 * Usage:
 * ```typescript
 * import { createServerError, createValidationError } from '@/lib/api/error-response';
 *
 * // Server error with automatic correlation ID
 * return createServerError(error, NextResponse);
 *
 * // Validation error
 * return createValidationError({ field: 'name', message: 'Required' }, NextResponse);
 * ```
 */

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { DomainException } from '@/domain/exceptions/DomainException';
import {
  ValidationError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
  InsufficientBatchQuantityError,
  GateBlockedError,
} from '@/application/errors';

/**
 * Error response structure sent to client
 */
export interface ErrorResponse {
  success: false;
  error: string;
  correlationId: string;
  timestamp: string;
  details?: Array<{ field: string; message: string }>;
}

/**
 * Maps domain error types to HTTP status codes
 * Enables consistent error handling across all API routes
 */
const ERROR_STATUS_MAP: Record<string, number> = {
  ValidationError: 400,
  NotFoundError: 404,
  ForbiddenError: 403,
  ConflictError: 409,
  InsufficientBatchQuantityError: 409, // Conflict: insufficient resource
  GateBlockedError: 423, // Locked: resource/gate is blocked
  DomainException: 500, // Generic domain error fallback
};

/**
 * Safe error messages sent to client
 * Maps error types to client-friendly messages that don't leak internal details
 */
const ERROR_MESSAGE_MAP: Record<string, string> = {
  ValidationError: 'Validation failed',
  NotFoundError: 'Resource not found',
  ForbiddenError: 'Access denied',
  ConflictError: 'Operation conflicts with current resource state',
  InsufficientBatchQuantityError: 'Insufficient quantity available for this operation',
  GateBlockedError: 'Resource is temporarily unavailable',
  DomainException: 'An error occurred processing your request',
};

/**
 * Generates a short, URL-safe correlation ID
 * Format: 8 hex chars from UUID (sufficient for practical tracing)
 *
 * @returns Short correlation ID (e.g., "a1b2c3d4")
 */
export function generateCorrelationId(): string {
  return randomUUID().split('-')[0]; // First segment of UUID (8 hex chars)
}

/**
 * Gets the HTTP status code for a given error
 *
 * @param error - The error instance
 * @returns HTTP status code (defaults to 500 for unknown errors)
 */
function getErrorStatusCode(error: unknown): number {
  if (error instanceof ValidationError) return ERROR_STATUS_MAP.ValidationError;
  if (error instanceof NotFoundError) return ERROR_STATUS_MAP.NotFoundError;
  if (error instanceof ForbiddenError) return ERROR_STATUS_MAP.ForbiddenError;
  if (error instanceof ConflictError) return ERROR_STATUS_MAP.ConflictError;
  if (error instanceof InsufficientBatchQuantityError) return ERROR_STATUS_MAP.InsufficientBatchQuantityError;
  if (error instanceof GateBlockedError) return ERROR_STATUS_MAP.GateBlockedError;
  if (error instanceof DomainException) return ERROR_STATUS_MAP.DomainException;
  return 500; // Unknown error
}

/**
 * Gets the safe error message for a given error type
 * Never includes stack traces or internal implementation details
 *
 * @param error - The error instance
 * @returns Safe message to send to client
 */
function getSafeErrorMessage(error: unknown): string {
  if (error instanceof ValidationError) return ERROR_MESSAGE_MAP.ValidationError;
  if (error instanceof NotFoundError) return ERROR_MESSAGE_MAP.NotFoundError;
  if (error instanceof ForbiddenError) return ERROR_MESSAGE_MAP.ForbiddenError;
  if (error instanceof ConflictError) return ERROR_MESSAGE_MAP.ConflictError;
  if (error instanceof InsufficientBatchQuantityError) return ERROR_MESSAGE_MAP.InsufficientBatchQuantityError;
  if (error instanceof GateBlockedError) return ERROR_MESSAGE_MAP.GateBlockedError;
  if (error instanceof DomainException) return ERROR_MESSAGE_MAP.DomainException;
  return 'An error occurred processing your request';
}

/**
 * Logs error details server-side with correlation ID for tracing
 * Includes full stack trace and error context (never exposed to client)
 *
 * @param error - The error to log
 * @param correlationId - Unique identifier for this error occurrence
 * @param context - Optional additional context (route, user ID, etc.)
 */
function logErrorDetails(
  error: unknown,
  correlationId: string,
  context?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();

  const logEntry = {
    timestamp,
    correlationId,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    metadata: error instanceof DomainException ? error.metadata : undefined,
    context,
  };

  // Use structured logging format for production log aggregation
  console.error('[ERROR]', JSON.stringify(logEntry, null, 2));
}

/**
 * Creates a server error response with correlation ID
 * Used for caught exceptions and unexpected errors
 *
 * @param error - The caught error
 * @param context - Optional context (route name, user ID, etc.) for logging
 * @returns NextResponse with error details and correlation ID
 *
 * @example
 * try {
 *   // ... code that might throw
 * } catch (error) {
 *   return createServerError(error, { route: 'POST /api/inventory/items' });
 * }
 */
export function createServerError(
  error: unknown,
  context?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  const correlationId = generateCorrelationId();
  const timestamp = new Date().toISOString();

  // Log full error server-side with correlation ID
  logErrorDetails(error, correlationId, context);

  // Get appropriate HTTP status and safe message
  const statusCode = getErrorStatusCode(error);
  const message = getSafeErrorMessage(error);

  // Build response with validation details if applicable
  const response: ErrorResponse = {
    success: false,
    error: message,
    correlationId,
    timestamp,
  };

  if (error instanceof ValidationError && error.errors?.length > 0) {
    response.details = error.errors;
  }

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Creates a validation error response
 * Structured helper for validation-specific errors
 *
 * @param validationDetails - Array of field validation errors or single error object
 * @param context - Optional context for logging
 * @returns NextResponse with validation error details and correlation ID
 *
 * @example
 * const details = [
 *   { field: 'name', message: 'Required' },
 *   { field: 'email', message: 'Invalid email format' }
 * ];
 * return createValidationError(details, { route: 'POST /api/users' });
 */
export function createValidationError(
  validationDetails: Array<{ field: string; message: string }> | { field: string; message: string },
  context?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  const correlationId = generateCorrelationId();
  const timestamp = new Date().toISOString();

  // Normalize to array
  const details = Array.isArray(validationDetails) ? validationDetails : [validationDetails];

  // Log validation error with correlation ID
  logErrorDetails(
    new ValidationError('Validation failed', details),
    correlationId,
    context
  );

  const response: ErrorResponse = {
    success: false,
    error: 'Validation failed',
    correlationId,
    timestamp,
    details,
  };

  return NextResponse.json(response, { status: 400 });
}

/**
 * Creates an authentication error response
 * Used when user is not authenticated
 *
 * @param context - Optional context for logging
 * @returns NextResponse with 401 Unauthorized
 */
export function createAuthenticationError(
  context?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  const correlationId = generateCorrelationId();
  const timestamp = new Date().toISOString();

  const logPayload = JSON.stringify({
    timestamp,
    correlationId,
    errorType: 'AuthenticationError',
    message: 'Authentication required',
    context,
  });
  console.error('[AUTH_ERROR]', logPayload);

  const response: ErrorResponse = {
    success: false,
    error: 'Authentication required',
    correlationId,
    timestamp,
  };

  return NextResponse.json(response, { status: 401 });
}

/**
 * Creates an authorization error response
 * Used when user is authenticated but lacks required permissions
 *
 * @param context - Optional context for logging
 * @returns NextResponse with 403 Forbidden
 */
export function createAuthorizationError(
  context?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  const correlationId = generateCorrelationId();
  const timestamp = new Date().toISOString();

  const logPayload = JSON.stringify({
    timestamp,
    correlationId,
    errorType: 'AuthorizationError',
    message: 'Access denied',
    context,
  });
  console.error('[AUTHZ_ERROR]', logPayload);

  const response: ErrorResponse = {
    success: false,
    error: 'Access denied',
    correlationId,
    timestamp,
  };

  return NextResponse.json(response, { status: 403 });
}

/**
 * Extracts correlation ID from error response (for testing/debugging)
 *
 * @param response - The error response object
 * @returns The correlation ID or null if not found
 */
export function getCorrelationId(response: ErrorResponse): string {
  return response.correlationId;
}
