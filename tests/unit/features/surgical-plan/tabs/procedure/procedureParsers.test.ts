/**
 * Unit Tests: Procedure Tab Parsers
 */

import { describe, it, expect } from 'vitest';
import {
  parseUpdateProcedureRequest,
  normalizeProcedurePlan,
} from '@/features/surgical-plan/tabs/procedure/procedureParsers';
import { ValidationError } from '@/application/errors/ValidationError';

describe('procedureParsers', () => {
  describe('parseUpdateProcedureRequest', () => {
    it('should parse valid request', () => {
      const body = {
        procedureName: 'Total Knee Replacement',
        procedurePlan: '<p>Test plan</p>',
      };
      const result = parseUpdateProcedureRequest(body);
      expect(result.procedureName).toBe('Total Knee Replacement');
      expect(result.procedurePlan).toBe('<p>Test plan</p>');
    });

    it('should parse request with only procedureName', () => {
      const body = {
        procedureName: 'Test Procedure',
      };
      const result = parseUpdateProcedureRequest(body);
      expect(result.procedureName).toBe('Test Procedure');
      expect(result.procedurePlan).toBeUndefined();
    });

    it('should throw ValidationError for invalid request', () => {
      const body = { procedureName: 123 };
      expect(() => parseUpdateProcedureRequest(body)).toThrow(ValidationError);
    });
  });

  describe('normalizeProcedurePlan', () => {
    it('should return null for empty string', () => {
      expect(normalizeProcedurePlan('')).toBeNull();
    });

    it('should return null for empty HTML tags', () => {
      expect(normalizeProcedurePlan('<p></p>')).toBeNull();
    });

    it('should return trimmed string for valid content', () => {
      expect(normalizeProcedurePlan('  <p>Test</p>  ')).toBe('<p>Test</p>');
    });

    it('should return null for null/undefined', () => {
      expect(normalizeProcedurePlan(null)).toBeNull();
      expect(normalizeProcedurePlan(undefined)).toBeNull();
    });
  });
});
