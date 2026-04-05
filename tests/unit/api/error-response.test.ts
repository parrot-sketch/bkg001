/**
 * Unit Tests: API Error Response Utility
 *
 * Tests the centralized error response handler with correlation ID tracking.
 * Covers:
 * - Correlation ID generation and uniqueness
 * - Error type mapping to HTTP status codes
 * - Safe error messages (no stack trace leakage)
 * - Error response shape consistency
 * - Validation error handling with details
 * - Authentication/Authorization error helpers
 * - Server-side logging (correlation ID present in logs)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  generateCorrelationId,
  createServerError,
  createValidationError,
  createAuthenticationError,
  createAuthorizationError,
  getCorrelationId,
} from '@/lib/api/error-response';
import {
  ValidationError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
  InsufficientBatchQuantityError,
  GateBlockedError,
} from '@/application/errors';
import { DomainException } from '@/domain/exceptions/DomainException';

describe('Error Response Utility', () => {
  // Mock console.error to capture logs
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('generateCorrelationId()', () => {
    it('should generate a correlation ID', () => {
      const id = generateCorrelationId();
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should generate 8-character hex IDs', () => {
      const id = generateCorrelationId();
      expect(id).toMatch(/^[a-f0-9]{8}$/i);
    });

    it('should generate unique IDs on each call', () => {
      const ids = new Set(
        Array.from({ length: 100 }, () => generateCorrelationId())
      );
      expect(ids.size).toBe(100); // All unique
    });
  });

  describe('createServerError()', () => {
    it('should return 500 for unknown errors', async () => {
      const error = new Error('Unknown error');
      const response = createServerError(error);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
    });

    it('should return 400 for ValidationError', async () => {
      const error = new ValidationError('Validation failed', []);
      const response = createServerError(error);

      expect(response.status).toBe(400);
    });

    it('should return 404 for NotFoundError', async () => {
      const error = new NotFoundError('Item not found');
      const response = createServerError(error);

      expect(response.status).toBe(404);
    });

    it('should return 403 for ForbiddenError', async () => {
      const error = new ForbiddenError('Access denied');
      const response = createServerError(error);

      expect(response.status).toBe(403);
    });

    it('should return 409 for ConflictError', async () => {
      const error = new ConflictError('Resource conflict');
      const response = createServerError(error);

      expect(response.status).toBe(409);
    });

    it('should return 409 for InsufficientBatchQuantityError', async () => {
      const error = new InsufficientBatchQuantityError('batch-1', 10, 5);
      const response = createServerError(error);

      expect(response.status).toBe(409);
    });

    it('should return 423 for GateBlockedError', async () => {
      const error = new GateBlockedError('Gate is blocked');
      const response = createServerError(error);

      expect(response.status).toBe(423);
    });

    it('should include correlation ID in response', async () => {
      const error = new Error('Test error');
      const response = createServerError(error);
      const json = await response.json();

      expect(json.correlationId).toBeDefined();
      expect(json.correlationId).toMatch(/^[a-f0-9]{8}$/i);
    });

    it('should include timestamp in response', async () => {
      const error = new Error('Test error');
      const response = createServerError(error);
      const json = await response.json();

      expect(json.timestamp).toBeDefined();
      expect(new Date(json.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should not leak stack trace in response', async () => {
      const error = new Error('Test error\nat Function.someLine:123:456');
      error.stack = 'Error: Test error\n  at Function.test (file.ts:123:456)';
      const response = createServerError(error);
      const json = await response.json();

      expect(json.error).not.toContain('at Function');
      expect(json.error).not.toContain('file.ts');
      expect(JSON.stringify(json)).not.toContain('stack');
    });

    it('should log error with correlation ID', async () => {
      const error = new Error('Test error');
      const response = createServerError(error);
      const json = await response.json();

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0][1];
      const logJson = JSON.parse(logCall as string);

      expect(logJson.correlationId).toBe(json.correlationId);
      expect(logJson.message).toBe('Test error');
    });

    it('should log full stack trace server-side', async () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at Function.test (file.ts:123:456)';
      createServerError(error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0][1];
      const logJson = JSON.parse(logCall as string);

      expect(logJson.stack).toContain('at Function.test');
    });

    it('should include context in log', async () => {
      const error = new Error('Test error');
      const context = { route: 'GET /api/test', userId: '123' };
      createServerError(error, context);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0][1];
      const logJson = JSON.parse(logCall as string);

      expect(logJson.context).toEqual(context);
    });

    it('should include validation details in response for ValidationError', async () => {
      const details = [
        { field: 'name', message: 'Required' },
        { field: 'email', message: 'Invalid format' },
      ];
      const error = new ValidationError('Validation failed', details);
      const response = createServerError(error);
      const json = await response.json();

      expect(json.details).toEqual(details);
    });

    it('should map DomainException to safe message', async () => {
      const error = new DomainException('Internal error details should not leak');
      const response = createServerError(error);
      const json = await response.json();

      expect(json.error).toBe('An error occurred processing your request');
      expect(json.error).not.toContain('Internal error details');
    });

    it('should have consistent response shape', async () => {
      const error = new Error('Test error');
      const response = createServerError(error);
      const json = await response.json();

      expect(json).toHaveProperty('success', false);
      expect(json).toHaveProperty('error');
      expect(json).toHaveProperty('correlationId');
      expect(json).toHaveProperty('timestamp');
    });
  });

  describe('createValidationError()', () => {
    it('should return 400 status', async () => {
      const response = createValidationError({ field: 'name', message: 'Required' });

      expect(response.status).toBe(400);
    });

    it('should accept single error object', async () => {
      const response = createValidationError({ field: 'name', message: 'Required' });
      const json = await response.json();

      expect(json.details).toEqual([{ field: 'name', message: 'Required' }]);
    });

    it('should accept array of errors', async () => {
      const errors = [
        { field: 'name', message: 'Required' },
        { field: 'email', message: 'Invalid format' },
      ];
      const response = createValidationError(errors);
      const json = await response.json();

      expect(json.details).toEqual(errors);
    });

    it('should include validation details in response', async () => {
      const errors = [{ field: 'name', message: 'Required' }];
      const response = createValidationError(errors);
      const json = await response.json();

      expect(json.error).toBe('Validation failed');
      expect(json.details).toEqual(errors);
    });

    it('should include correlation ID', async () => {
      const response = createValidationError({ field: 'name', message: 'Required' });
      const json = await response.json();

      expect(json.correlationId).toMatch(/^[a-f0-9]{8}$/i);
    });

    it('should log with correlation ID', async () => {
      const response = createValidationError({ field: 'name', message: 'Required' });
      const json = await response.json();

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0][1];
      const logJson = JSON.parse(logCall as string);

      expect(logJson.correlationId).toBe(json.correlationId);
    });

    it('should include context in log', async () => {
      const context = { route: 'POST /api/test' };
      createValidationError({ field: 'name', message: 'Required' }, context);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0][1];
      const logJson = JSON.parse(logCall as string);

      expect(logJson.context).toEqual(context);
    });
  });

  describe('createAuthenticationError()', () => {
    it('should return 401 status', async () => {
      const response = createAuthenticationError();

      expect(response.status).toBe(401);
    });

    it('should include safe error message', async () => {
      const response = createAuthenticationError();
      const json = await response.json();

      expect(json.error).toBe('Authentication required');
    });

    it('should include correlation ID', async () => {
      const response = createAuthenticationError();
      const json = await response.json();

      expect(json.correlationId).toMatch(/^[a-f0-9]{8}$/i);
    });

    it('should log with context', async () => {
      const context = { route: 'GET /api/test' };
      createAuthenticationError(context);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0][1];
      const logJson = JSON.parse(logCall as string);

      expect(logJson.context).toEqual(context);
    });
  });

  describe('createAuthorizationError()', () => {
    it('should return 403 status', async () => {
      const response = createAuthorizationError();

      expect(response.status).toBe(403);
    });

    it('should include safe error message', async () => {
      const response = createAuthorizationError();
      const json = await response.json();

      expect(json.error).toBe('Access denied');
    });

    it('should include correlation ID', async () => {
      const response = createAuthorizationError();
      const json = await response.json();

      expect(json.correlationId).toMatch(/^[a-f0-9]{8}$/i);
    });

    it('should log with context', async () => {
      const context = { route: 'POST /api/test', userId: '123' };
      createAuthorizationError(context);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0][1];
      const logJson = JSON.parse(logCall as string);

      expect(logJson.context).toEqual(context);
    });
  });

  describe('getCorrelationId()', () => {
    it('should extract correlation ID from response', async () => {
      const response = createServerError(new Error('Test'));
      const json = await response.json();
      const correlationId = getCorrelationId(json);

      expect(correlationId).toBe(json.correlationId);
    });

    it('should return 8-char hex string', async () => {
      const response = createServerError(new Error('Test'));
      const json = await response.json();
      const correlationId = getCorrelationId(json);

      expect(correlationId).toMatch(/^[a-f0-9]{8}$/i);
    });
  });

  describe('Correlation ID tracking', () => {
    it('should have same correlation ID in response and log', async () => {
      const error = new Error('Test error');
      const response = createServerError(error);
      const json = await response.json();

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0][1];
      const logJson = JSON.parse(logCall as string);

      expect(json.correlationId).toBe(logJson.correlationId);
    });

    it('should generate different correlation IDs for different errors', async () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      const response1 = createServerError(error1);
      const json1 = await response1.json();

      const response2 = createServerError(error2);
      const json2 = await response2.json();

      expect(json1.correlationId).not.toBe(json2.correlationId);
    });
  });

  describe('Security: No Stack Trace Leakage', () => {
    it('should not expose internal paths in error message', async () => {
      const error = new Error('Error at /home/user/project/src/file.ts:123');
      const response = createServerError(error);
      const json = await response.json();

      expect(JSON.stringify(json)).not.toContain('/home/user');
      expect(JSON.stringify(json)).not.toContain('.ts:');
    });

    it('should not expose function names from stack trace', async () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at privateFunction (file.ts:1:1)\n  at internalMethod (file.ts:2:2)';
      const response = createServerError(error);
      const json = await response.json();

      expect(JSON.stringify(json)).not.toContain('privateFunction');
      expect(JSON.stringify(json)).not.toContain('internalMethod');
    });

    it('should not expose database details', async () => {
      const error = new Error('Connection to postgres://user:pass@localhost:5432/db failed');
      const response = createServerError(error);
      const json = await response.json();

      expect(JSON.stringify(json)).not.toContain('postgres://');
      expect(JSON.stringify(json)).not.toContain(':pass@');
    });
  });
});
