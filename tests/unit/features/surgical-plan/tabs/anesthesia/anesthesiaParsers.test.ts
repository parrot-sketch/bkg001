/**
 * Unit Tests: Anesthesia Tab Parsers
 */

import { describe, it, expect } from 'vitest';
import {
  parseUpdateAnesthesiaRequest,
  normalizeSpecialInstructions,
} from '@/features/surgical-plan/tabs/anesthesia/anesthesiaParsers';
import { ValidationError } from '@/application/errors/ValidationError';
import { AnesthesiaType } from '@prisma/client';

describe('anesthesiaParsers', () => {
  describe('parseUpdateAnesthesiaRequest', () => {
    it('should parse valid request', () => {
      const body = {
        anesthesiaPlan: AnesthesiaType.GENERAL,
        specialInstructions: '<p>Test instructions</p>',
        estimatedDurationMinutes: 120,
      };
      const result = parseUpdateAnesthesiaRequest(body);
      expect(result.anesthesiaPlan).toBe(AnesthesiaType.GENERAL);
      expect(result.specialInstructions).toBe('<p>Test instructions</p>');
      expect(result.estimatedDurationMinutes).toBe(120);
    });

    it('should parse request with null anesthesiaPlan', () => {
      const body = {
        anesthesiaPlan: null,
        estimatedDurationMinutes: null,
      };
      const result = parseUpdateAnesthesiaRequest(body);
      expect(result.anesthesiaPlan).toBeNull();
      expect(result.estimatedDurationMinutes).toBeNull();
    });

    it('should throw ValidationError for invalid duration (too low)', () => {
      const body = {
        estimatedDurationMinutes: 10, // Below minimum
      };
      expect(() => parseUpdateAnesthesiaRequest(body)).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid duration (too high)', () => {
      const body = {
        estimatedDurationMinutes: 700, // Above maximum
      };
      expect(() => parseUpdateAnesthesiaRequest(body)).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid anesthesia type', () => {
      const body = {
        anesthesiaPlan: 'INVALID_TYPE',
      };
      expect(() => parseUpdateAnesthesiaRequest(body)).toThrow(ValidationError);
    });
  });

  describe('normalizeSpecialInstructions', () => {
    it('should return null for empty string', () => {
      expect(normalizeSpecialInstructions('')).toBeNull();
    });

    it('should return null for empty HTML tags', () => {
      expect(normalizeSpecialInstructions('<p></p>')).toBeNull();
    });

    it('should return trimmed string for valid content', () => {
      expect(normalizeSpecialInstructions('  <p>Test</p>  ')).toBe('<p>Test</p>');
    });
  });
});
