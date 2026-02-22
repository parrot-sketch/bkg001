/**
 * Canonical API Error Handler
 *
 * Maps application errors to standardized ApiResponse<never> with correct HTTP status codes.
 * All Theater Tech routes should use this utility for consistent error handling.
 */

import { NextResponse } from 'next/server';
import {
  ApiResponse,
  ApiErrorCode,
  fail,
  fromZodError,
} from '@/lib/http/apiResponse';
import {
  GateBlockedError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/application/errors';
import { DomainException } from '@/domain/exceptions/DomainException';
import { z } from 'zod';

/**
 * Handle an unknown error and return a standardized ApiResponse.
 * Maps application errors to appropriate HTTP status codes and error codes.
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse<never>> {
  // Application-layer errors
  if (error instanceof GateBlockedError) {
    return NextResponse.json(
      fail(ApiErrorCode.GATE_BLOCKED, error.message, {
        blockingCategory: error.blockingCategory,
        missingItems: error.missingItems,
      }),
      { status: 422 }
    );
  }

  if (error instanceof ValidationError) {
    return NextResponse.json(
      fail(ApiErrorCode.VALIDATION_ERROR, error.message, {
        errors: error.errors,
      }),
      { status: 400 }
    );
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      fail(ApiErrorCode.NOT_FOUND, error.message),
      { status: 404 }
    );
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      fail(ApiErrorCode.FORBIDDEN, error.message),
      { status: 403 }
    );
  }

  if (error instanceof ConflictError) {
    return NextResponse.json(
      fail(ApiErrorCode.CONFLICT, error.message),
      { status: 409 }
    );
  }

  // Domain exceptions (legacy - will be migrated to application errors in Phase 3)
  if (error instanceof DomainException) {
    const metadata = error.metadata as Record<string, unknown> | undefined;

    // Check if it's a gate block (legacy pattern)
    if (metadata?.gate || metadata?.blockingCategory) {
      return NextResponse.json(
        fail(ApiErrorCode.GATE_BLOCKED, error.message, {
          blockingCategory: (metadata.blockingCategory as string) || (metadata.gate as string) || 'UNKNOWN',
          missingItems: (metadata.missingItems as string[]) || [],
        }),
        { status: 422 }
      );
    }

    // Generic domain exception -> 422
    return NextResponse.json(
      fail(ApiErrorCode.VALIDATION_ERROR, error.message, metadata),
      { status: 422 }
    );
  }

  // Zod validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      fail(ApiErrorCode.VALIDATION_ERROR, 'Validation failed', fromZodError(error)),
      { status: 400 }
    );
  }

  // Generic errors
  const message = error instanceof Error ? error.message : 'Unknown error';
  const isDevelopment = process.env.NODE_ENV === 'development';

  console.error('[API] Unhandled error:', message, error);

  return NextResponse.json(
    fail(
      ApiErrorCode.INTERNAL_ERROR,
      isDevelopment ? `Internal server error: ${message}` : 'Internal server error'
    ),
    { status: 500 }
  );
}

/**
 * Helper to create a success response.
 */
export function handleApiSuccess<T>(data: T, status: number = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}
