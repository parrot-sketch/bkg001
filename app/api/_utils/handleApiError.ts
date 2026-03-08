/**
 * Canonical API Error Handler
 *
 * Maps application errors to standardized ApiResponse<never> with correct HTTP status codes.
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
  const err = error as any;
  const name = err?.name;
  const code = err?.code;

  // 1. Handle specialized application-layer errors FIRST (Robust check)
  
  if (error instanceof ForbiddenError || name === 'ForbiddenError' || code === ApiErrorCode.FORBIDDEN) {
    // CRITICAL FIX: The frontend apiClient explicitly requires a 401 status to trigger its automatic token 
    // refresh logic. Since ~150 routes currently throw a ForbiddenError for invalid tokens, we intercept the
    // exact message here to map it correctly.
    if (err.message === 'Authentication required' || err.message === 'Unauthorized') {
        return NextResponse.json(
          fail(ApiErrorCode.UNAUTHORIZED, err.message),
          { status: 401 }
        );
    }

    return NextResponse.json(
      fail(ApiErrorCode.FORBIDDEN, err.message || 'Forbidden'),
      { status: 403 }
    );
  }

  if (error instanceof NotFoundError || name === 'NotFoundError' || code === ApiErrorCode.NOT_FOUND) {
    return NextResponse.json(
      fail(ApiErrorCode.NOT_FOUND, err.message || 'Not Found'),
      { status: 404 }
    );
  }

  if (error instanceof ConflictError || name === 'ConflictError' || code === ApiErrorCode.CONFLICT) {
    return NextResponse.json(
      fail(ApiErrorCode.CONFLICT, err.message || 'Conflict'),
      { status: 409 }
    );
  }

  if (error instanceof GateBlockedError || name === 'GateBlockedError' || code === ApiErrorCode.GATE_BLOCKED) {
    return NextResponse.json(
      fail(ApiErrorCode.GATE_BLOCKED, err.message, {
        ...err.metadata,
        blockingCategory: err.blockingCategory || err.metadata?.blockingCategory,
        missingItems: err.missingItems || err.metadata?.missingItems || [],
      }),
      { status: 422 }
    );
  }

  // 2. Handle ValidationError
  if (error instanceof ValidationError || name === 'ValidationError' || code === ApiErrorCode.VALIDATION_ERROR) {
    const status = err.status || 400;
    
    return NextResponse.json(
      fail(ApiErrorCode.VALIDATION_ERROR, err.message, {
        ...err.metadata,
        errors: err.errors,
      }),
      { status }
    );
  }

  // 3. Domain exceptions (Robust name + instance check)
  if (error instanceof DomainException || name === 'DomainException') {
    const metadata = err.metadata as Record<string, unknown> | undefined;

    // Explicit Gate Blocks -> 422
    if (metadata?.gate || metadata?.blockingCategory || code === ApiErrorCode.GATE_BLOCKED) {
      return NextResponse.json(
        fail(ApiErrorCode.GATE_BLOCKED, err.message, {
          blockingCategory: (metadata?.blockingCategory as string) || (metadata?.gate as string) || 'UNKNOWN',
          missingItems: (metadata?.missingItems as string[]) || [],
        }),
        { status: 422 }
      );
    }

    // Explicit status hint in DomainException
    if (metadata?.status && typeof metadata.status === 'number') {
      return NextResponse.json(
        fail(ApiErrorCode.VALIDATION_ERROR, err.message, metadata),
        { status: metadata.status }
      );
    }
    
    // Check for specialized codes even within DomainException
    if (code === ApiErrorCode.UNAUTHORIZED) return NextResponse.json(fail(ApiErrorCode.UNAUTHORIZED, err.message), { status: 401 });
    if (code === ApiErrorCode.FORBIDDEN) return NextResponse.json(fail(ApiErrorCode.FORBIDDEN, err.message), { status: 403 });
    if (code === ApiErrorCode.NOT_FOUND) return NextResponse.json(fail(ApiErrorCode.NOT_FOUND, err.message), { status: 404 });
    if (code === ApiErrorCode.CONFLICT) return NextResponse.json(fail(ApiErrorCode.CONFLICT, err.message), { status: 409 });

    // Default DomainException mapping (favoring 422 for unprocessable entity)
    return NextResponse.json(
      fail(ApiErrorCode.VALIDATION_ERROR, err.message, metadata),
      { status: 422 }
    );
  }

  // 4. Zod validation errors -> 400
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      fail(ApiErrorCode.VALIDATION_ERROR, 'Validation failed', fromZodError(error)),
      { status: 400 }
    );
  }

  // 5. Generic errors -> 500
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
export function handleApiSuccess<T>(data: T, status: number = 200, message?: string): NextResponse<ApiResponse<T>> {
  // Ensure data is included even if null (to satisfy test expectations for property existence)
  const payload: any = { success: true, data: data ?? null };
  if (message) payload.message = message;
  
  return NextResponse.json(payload, { status });
}
