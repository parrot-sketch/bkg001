/**
 * Unit Tests: API Response Helpers
 *
 * Tests for canonical API response helpers and error conversion.
 */

import { describe, it, expect } from 'vitest';
import { ok, fail, fromZodError, ApiErrorCode } from '@/lib/http/apiResponse';
import { z } from 'zod';

function failTest(message: string): never {
  throw new Error(message);
}

describe('API Response Helpers', () => {
  describe('ok()', () => {
    it('should create a success response with data', () => {
      const data = { id: '123', name: 'Test' };
      const response = ok(data);

      expect(response).toEqual({
        success: true,
        data: { id: '123', name: 'Test' },
      });
    });
  });

  describe('fail()', () => {
    it('should create an error response with code and message', () => {
      const response = fail(ApiErrorCode.VALIDATION_ERROR, 'Validation failed');

      expect(response).toEqual({
        success: false,
        error: 'Validation failed',
        code: ApiErrorCode.VALIDATION_ERROR,
      });
    });

    it('should include metadata when provided', () => {
      const metadata = { errors: [{ field: 'email', message: 'Invalid email' }] };
      const response = fail(ApiErrorCode.VALIDATION_ERROR, 'Validation failed', metadata);

      expect(response).toEqual({
        success: false,
        error: 'Validation failed',
        code: ApiErrorCode.VALIDATION_ERROR,
        metadata,
      });
    });
  });

  describe('fromZodError()', () => {
    it('should convert Zod validation error to metadata', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      const result = schema.safeParse({ email: 'invalid', age: 15 });

      if (!result.success) {
        const metadata = fromZodError(result.error);

        expect(metadata.errors).toBeDefined();
        expect(metadata.errors?.length).toBeGreaterThan(0);
        expect(metadata.errors?.[0]).toHaveProperty('field');
        expect(metadata.errors?.[0]).toHaveProperty('message');
      } else {
        failTest('Expected validation to fail');
      }
    });

    it('should handle nested path errors', () => {
      const schema = z.object({
        user: z.object({
          email: z.string().email(),
        }),
      });

      const result = schema.safeParse({ user: { email: 'invalid' } });

      if (!result.success) {
        const metadata = fromZodError(result.error);

        expect(metadata.errors).toBeDefined();
        expect(metadata.errors?.[0]?.field).toBe('user.email');
      } else {
        failTest('Expected validation to fail');
      }
    });
  });
});
