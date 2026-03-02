/**
 * Unit Tests: Risk Factors Tab Parsers
 */

import { describe, it, expect } from 'vitest';
import {
  parseUpdateRiskFactorsRequest,
  normalizeRichText,
} from '@/features/surgical-plan/tabs/risk-factors/riskFactorsParsers';
import { ValidationError } from '@/application/errors/ValidationError';

describe('riskFactorsParsers', () => {
  describe('parseUpdateRiskFactorsRequest', () => {
    it('should parse valid request', () => {
      const body = {
        riskFactors: '<p>Test risk factors</p>',
        preOpNotes: '<p>Test notes</p>',
      };
      const result = parseUpdateRiskFactorsRequest(body);
      expect(result.riskFactors).toBe('<p>Test risk factors</p>');
      expect(result.preOpNotes).toBe('<p>Test notes</p>');
    });

    it('should parse request with only one field', () => {
      const body = {
        riskFactors: '<p>Test</p>',
      };
      const result = parseUpdateRiskFactorsRequest(body);
      expect(result.riskFactors).toBe('<p>Test</p>');
      expect(result.preOpNotes).toBeUndefined();
    });

    it('should throw ValidationError for invalid request', () => {
      const body = { riskFactors: 123 };
      expect(() => parseUpdateRiskFactorsRequest(body)).toThrow(ValidationError);
    });
  });

  describe('normalizeRichText', () => {
    it('should return null for empty string', () => {
      expect(normalizeRichText('')).toBeNull();
    });

    it('should return null for empty HTML tags', () => {
      expect(normalizeRichText('<p></p>')).toBeNull();
    });

    it('should return trimmed string for valid content', () => {
      expect(normalizeRichText('  <p>Test</p>  ')).toBe('<p>Test</p>');
    });
  });
});
