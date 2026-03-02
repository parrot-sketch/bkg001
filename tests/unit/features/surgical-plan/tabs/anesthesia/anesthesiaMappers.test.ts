/**
 * Unit Tests: Anesthesia Tab Mappers
 */

import { describe, it, expect } from 'vitest';
import { buildUpdateAnesthesiaPayload } from '@/features/surgical-plan/tabs/anesthesia/anesthesiaMappers';
import { AnesthesiaType } from '@prisma/client';

describe('anesthesiaMappers', () => {
  describe('buildUpdateAnesthesiaPayload', () => {
    it('should build payload with all fields', () => {
      const result = buildUpdateAnesthesiaPayload(
        AnesthesiaType.GENERAL,
        '<p>Instructions</p>',
        120
      );
      expect(result.anesthesiaPlan).toBe(AnesthesiaType.GENERAL);
      expect(result.specialInstructions).toBe('<p>Instructions</p>');
      expect(result.estimatedDurationMinutes).toBe(120);
    });

    it('should handle null values', () => {
      const result = buildUpdateAnesthesiaPayload(null, null, null);
      expect(result.anesthesiaPlan).toBeNull();
      expect(result.specialInstructions).toBeUndefined();
      expect(result.estimatedDurationMinutes).toBeNull();
    });

    it('should normalize empty specialInstructions to undefined', () => {
      const result = buildUpdateAnesthesiaPayload(AnesthesiaType.REGIONAL, '', 60);
      expect(result.specialInstructions).toBeUndefined();
    });
  });
});
