/**
 * Unit Tests: Risk Factors Tab Mappers
 */

import { describe, it, expect } from 'vitest';
import {
  insertPreOpTemplate,
  buildUpdateRiskFactorsPayload,
} from '@/features/surgical-plan/tabs/risk-factors/riskFactorsMappers';

describe('riskFactorsMappers', () => {
  describe('insertPreOpTemplate', () => {
    it('should replace empty notes with template', () => {
      const result = insertPreOpTemplate(null);
      expect(result.changed).toBe(true);
      expect(result.nextHtml).toContain('Chief Complaint');
      expect(result.nextHtml).toContain('Examination');
    });

    it('should append template to existing substantial notes', () => {
      const existing = '<p>Existing notes with substantial content</p>';
      const result = insertPreOpTemplate(existing);
      expect(result.changed).toBe(true);
      expect(result.nextHtml).toContain('Existing notes');
      expect(result.nextHtml).toContain('Chief Complaint');
    });

    it('should replace short notes with template', () => {
      const result = insertPreOpTemplate('<p>Short</p>');
      expect(result.changed).toBe(true);
      expect(result.nextHtml).toContain('Chief Complaint');
      expect(result.nextHtml).not.toContain('Short');
    });
  });

  describe('buildUpdateRiskFactorsPayload', () => {
    it('should build payload with both fields', () => {
      const result = buildUpdateRiskFactorsPayload('<p>Risk</p>', '<p>Notes</p>');
      expect(result.riskFactors).toBe('<p>Risk</p>');
      expect(result.preOpNotes).toBe('<p>Notes</p>');
    });

    it('should normalize empty fields to undefined', () => {
      const result = buildUpdateRiskFactorsPayload('', '');
      expect(result.riskFactors).toBeUndefined();
      expect(result.preOpNotes).toBeUndefined();
    });
  });
});
