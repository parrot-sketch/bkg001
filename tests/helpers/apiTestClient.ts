/**
 * Type-safe API test helpers
 * 
 * Provides utilities for working with ApiResponse<T> in tests.
 */

import { ApiResponse, ApiSuccess, ApiError } from '@/lib/api/client';

/**
 * Type guard to check if response is successful
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccess<T> {
  return response.success === true;
}

/**
 * Type guard to check if response is an error
 */
export function isApiError<T>(response: ApiResponse<T>): response is ApiError {
  return response.success === false;
}

/**
 * Assert that response is successful, throw if not
 */
export function assertApiSuccess<T>(response: ApiResponse<T>): asserts response is ApiSuccess<T> {
  if (!isApiSuccess(response)) {
    throw new Error(`Expected successful response, got error: ${response.error}`);
  }
}

/**
 * Unwrap successful response data, throw if error
 */
export function unwrapApiSuccess<T>(response: ApiResponse<T>): T {
  assertApiSuccess(response);
  return response.data;
}

/**
 * Unwrap error response, throw if success
 */
export function unwrapApiError<T>(response: ApiResponse<T>): string {
  if (isApiSuccess(response)) {
    throw new Error('Expected error response, got success');
  }
  return response.error;
}
