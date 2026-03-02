/**
 * Test Helpers: ApiResponse Assertions
 *
 * Utilities for asserting ApiResponse<T> contract in integration tests.
 */

import { expect } from 'vitest';
import { ApiResponse, ApiErrorCode, ApiSuccess, ApiError } from '@/lib/http/apiResponse';

type ApiFailure = ApiError;

/**
 * Assert that a response is a successful ApiResponse.
 */
export function assertSuccess<T>(resJson: unknown): asserts resJson is ApiSuccess<T> {
  expect(resJson).toHaveProperty('success', true);
  expect(resJson).toHaveProperty('data');
  expect((resJson as { success: boolean }).success).toBe(true);
}

/**
 * Unwrap the data from a successful ApiResponse.
 * Use after assertSuccess to get typed data.
 */
export function unwrapApiData<T>(resJson: ApiSuccess<T>): T {
  return resJson.data;
}

/**
 * Assert that a response is a failed ApiResponse (base check).
 */
export function assertErrorBase(resJson: unknown): asserts resJson is ApiFailure {
  expect(resJson).toHaveProperty('success', false);
  expect((resJson as { success: boolean }).success).toBe(false);
  expect(resJson).toHaveProperty('code');
  expect(resJson).toHaveProperty('error');
}

/**
 * Assert that a response is a failed ApiResponse with a specific error code.
 */
export function assertErrorCode(
  resJson: unknown,
  expectedCode: ApiErrorCode
): asserts resJson is ApiFailure {
  assertErrorBase(resJson);
  expect((resJson as ApiFailure).code).toBe(expectedCode);
}

/**
 * Assert that a response is a failed ApiResponse with a specific error code and message.
 */
export function assertError(
  resJson: unknown,
  expectedCode: ApiErrorCode,
  expectedMessagePart?: string
): asserts resJson is ApiFailure {
  assertErrorCode(resJson, expectedCode);
  if (expectedMessagePart) {
    expect((resJson as ApiFailure).error).toContain(expectedMessagePart);
  }
}

/**
 * Assert that a response is a GateBlockedError with missing items.
 */
export function assertGateBlocked(
  resJson: unknown,
  expectedBlockingCategory?: string
): asserts resJson is ApiFailure {
  assertErrorCode(resJson, ApiErrorCode.GATE_BLOCKED);
  expect(resJson).toHaveProperty('metadata');
  const metadata = (resJson as ApiFailure).metadata;
  expect(metadata).toHaveProperty('missingItems');
  expect(Array.isArray(metadata?.missingItems)).toBe(true);
  expect((metadata?.missingItems as string[]).length).toBeGreaterThan(0);
  if (expectedBlockingCategory) {
    expect(metadata).toHaveProperty('blockingCategory', expectedBlockingCategory);
  }
}

/**
 * Assert that a response is a ValidationError with field errors.
 */
export function assertValidationError(resJson: unknown): asserts resJson is ApiFailure {
  assertErrorCode(resJson, ApiErrorCode.VALIDATION_ERROR);
  expect(resJson).toHaveProperty('metadata');
  const metadata = (resJson as ApiFailure).metadata;
  expect(metadata).toHaveProperty('errors');
  expect(Array.isArray(metadata?.errors)).toBe(true);
}

/**
 * Assert HTTP status code matches expected.
 */
export function assertStatusCode(response: { status: number }, expectedStatus: number): void {
  expect(response.status).toBe(expectedStatus);
}

/**
 * Assert success response with status 200.
 */
export function assertSuccess200<T>(response: { status: number }, resJson: unknown): asserts resJson is ApiSuccess<T> {
  assertStatusCode(response, 200);
  assertSuccess<T>(resJson);
}

/**
 * Assert error response with status 422 (Unprocessable Entity).
 */
export function assertError422(resJson: unknown): asserts resJson is ApiFailure {
  assertErrorBase(resJson);
  // 422 is used for GateBlockedError and some domain exceptions
  expect([ApiErrorCode.GATE_BLOCKED, ApiErrorCode.VALIDATION_ERROR]).toContain(
    (resJson as ApiFailure).code
  );
}

/**
 * Assert error response with status 400 (Bad Request).
 */
export function assertError400(resJson: unknown): asserts resJson is ApiFailure {
  assertErrorBase(resJson);
  // 400 can be VALIDATION_ERROR or other client errors
  expect([ApiErrorCode.VALIDATION_ERROR, ApiErrorCode.INTERNAL_ERROR]).toContain(
    (resJson as ApiFailure).code
  );
}

/**
 * Assert error response with status 403 (Forbidden).
 */
export function assertError403(resJson: unknown): asserts resJson is ApiFailure {
  assertErrorCode(resJson, ApiErrorCode.FORBIDDEN);
}

/**
 * Assert error response with status 404 (Not Found).
 */
export function assertError404(resJson: unknown): asserts resJson is ApiFailure {
  assertErrorCode(resJson, ApiErrorCode.NOT_FOUND);
}
