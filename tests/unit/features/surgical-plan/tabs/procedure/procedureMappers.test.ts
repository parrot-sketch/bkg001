/**
 * Unit Tests: Procedure Tab Mappers
 */

import { describe, it, expect } from 'vitest';
import { buildUpdateProcedurePayload } from '@/features/surgical-plan/tabs/procedure/procedureMappers';

describe('procedureMappers', () => {
  describe('buildUpdateProcedurePayload', () => {
    it('should build payload with both fields', () => {
      const result = buildUpdateProcedurePayload('Test Procedure', '<p>Test plan</p>');
      expect(result.procedureName).toBe('Test Procedure');
      expect(result.procedurePlan).toBe('<p>Test plan</p>');
    });

    it('should normalize empty procedurePlan to undefined', () => {
      const result = buildUpdateProcedurePayload('Test Procedure', '');
      expect(result.procedureName).toBe('Test Procedure');
      expect(result.procedurePlan).toBeUndefined();
    });

    it('should handle null values', () => {
      const result = buildUpdateProcedurePayload(null, null);
      expect(result.procedureName).toBeUndefined();
      expect(result.procedurePlan).toBeUndefined();
    });

    it('should trim procedureName', () => {
      const result = buildUpdateProcedurePayload('  Test Procedure  ', null);
      expect(result.procedureName).toBe('Test Procedure');
    });
  });
});
