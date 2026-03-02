/**
 * Unit Tests: API Error Handler
 *
 * Tests for canonical error mapping to ApiResponse.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

function fail(message: string): never {
  throw new Error(message);
}
import { handleApiError } from '@/app/api/_utils/handleApiError';
import {
  GateBlockedError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/application/errors';
import { DomainException } from '@/domain/exceptions/DomainException';
import { ApiErrorCode } from '@/lib/http/apiResponse';
import { z } from 'zod';

/**
 * Helper to extract JSON from NextResponse for testing
 */
async function getResponseJson(response: any): Promise<any> {
  // For test environments, we need to clone and read the response
  const cloned = response.clone();
  return cloned.json();
}

describe('handleApiError', () => {
  describe('GateBlockedError', () => {
    it('should map to 422 with blockingCategory and missingItems', async () => {
      const error = new GateBlockedError(
        'Cannot transition',
        'WHO_CHECKLIST',
        ['Sign-In not completed', 'Time-Out not completed']
      );

      const response = handleApiError(error);
      const json = await getResponseJson(response);

      expect(response.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.code).toBe(ApiErrorCode.GATE_BLOCKED);
      expect(json.metadata?.blockingCategory).toBe('WHO_CHECKLIST');
      expect(json.metadata?.missingItems).toEqual([
        'Sign-In not completed',
        'Time-Out not completed',
      ]);
    });
  });

  describe('ValidationError', () => {
    it('should map to 400 with field errors', async () => {
      const error = new ValidationError('Validation failed', [
        { field: 'email', message: 'Invalid email' },
      ]);

      const response = handleApiError(error);
      const json = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.code).toBe(ApiErrorCode.VALIDATION_ERROR);
      expect(json.metadata?.errors).toEqual([{ field: 'email', message: 'Invalid email' }]);
    });
  });

  describe('NotFoundError', () => {
    it('should map to 404', async () => {
      const error = new NotFoundError('Surgical case not found', 'SurgicalCase', 'case-123');

      const response = handleApiError(error);
      const json = await getResponseJson(response);

      expect(response.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.code).toBe(ApiErrorCode.NOT_FOUND);
    });
  });

  describe('ForbiddenError', () => {
    it('should map to 403', async () => {
      const error = new ForbiddenError('Access denied', 'THEATER_TECHNICIAN');

      const response = handleApiError(error);
      const json = await getResponseJson(response);

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.code).toBe(ApiErrorCode.FORBIDDEN);
    });
  });

  describe('ConflictError', () => {
    it('should map to 409', async () => {
      const error = new ConflictError('State conflict', 'Already in progress');

      const response = handleApiError(error);
      const json = await getResponseJson(response);

      expect(response.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.code).toBe(ApiErrorCode.CONFLICT);
    });
  });

  describe('DomainException (legacy)', () => {
    it('should map gate-blocked DomainException to 422', async () => {
      const error = new DomainException('Cannot transition', {
        gate: 'WHO_CHECKLIST',
        blockingCategory: 'WHO_CHECKLIST',
        missingItems: ['Sign-In not completed'],
      });

      const response = handleApiError(error);
      const json = await getResponseJson(response);

      expect(response.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.code).toBe(ApiErrorCode.GATE_BLOCKED);
      expect(json.metadata?.blockingCategory).toBe('WHO_CHECKLIST');
    });

    it('should map generic DomainException to 422', async () => {
      const error = new DomainException('Invalid operation');

      const response = handleApiError(error);
      const json = await getResponseJson(response);

      expect(response.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.code).toBe(ApiErrorCode.VALIDATION_ERROR);
    });
  });

  describe('ZodError', () => {
    it('should map to 400 with field errors', async () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const result = schema.safeParse({ email: 'invalid' });

      if (!result.success) {
        const response = handleApiError(result.error);
        const json = await getResponseJson(response);

        expect(response.status).toBe(400);
        expect(json.success).toBe(false);
        expect(json.code).toBe(ApiErrorCode.VALIDATION_ERROR);
        expect(json.metadata?.errors).toBeDefined();
      } else {
        fail('Expected validation to fail');
      }
    });
  });

  describe('Unknown errors', () => {
    it('should map to 500 with internal error code', async () => {
      const error = new Error('Unexpected error');

      const response = handleApiError(error);
      const json = await getResponseJson(response);

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.code).toBe(ApiErrorCode.INTERNAL_ERROR);
    });

    it('should mask error message in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const error = new Error('Sensitive error message');

      const response = handleApiError(error);
      const json = await getResponseJson(response);

      expect(json.error).toBe('Internal server error');
      expect(json.error).not.toContain('Sensitive error message');

      vi.unstubAllEnvs();
    });
  });
});
