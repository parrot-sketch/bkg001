/**
 * Unit Tests: Timeline Tab Parsers
 */

import { describe, it, expect } from 'vitest';
import { parseTimelineResponse } from '@/features/surgical-plan/tabs/timeline/timelineParsers';
import { ValidationError } from '@/application/errors/ValidationError';

describe('timelineParsers', () => {
  describe('parseTimelineResponse', () => {
    it('should parse valid timeline response', () => {
      const data = {
        caseId: 'case-1',
        caseStatus: 'IN_THEATER',
        timeline: {
          wheelsIn: '2024-01-01T08:00:00Z',
          anesthesiaStart: '2024-01-01T08:15:00Z',
          anesthesiaEnd: null,
          incisionTime: '2024-01-01T08:30:00Z',
          closureTime: null,
          wheelsOut: null,
        },
        durations: {
          orTimeMinutes: 120,
          surgeryTimeMinutes: 90,
          prepTimeMinutes: 30,
          closeOutTimeMinutes: null,
          anesthesiaTimeMinutes: null,
        },
        missingItems: [
          { field: 'anesthesiaEnd', label: 'Anesthesia End' },
        ],
      };
      const result = parseTimelineResponse(data);
      expect(result.caseId).toBe('case-1');
      expect(result.timeline.wheelsIn).toBe('2024-01-01T08:00:00Z');
      expect(result.missingItems).toHaveLength(1);
    });

    it('should parse timeline with all null timestamps', () => {
      const data = {
        caseId: 'case-1',
        caseStatus: 'PLANNING',
        timeline: {
          wheelsIn: null,
          anesthesiaStart: null,
          anesthesiaEnd: null,
          incisionTime: null,
          closureTime: null,
          wheelsOut: null,
        },
        durations: {
          orTimeMinutes: null,
          surgeryTimeMinutes: null,
          prepTimeMinutes: null,
          closeOutTimeMinutes: null,
          anesthesiaTimeMinutes: null,
        },
        missingItems: [],
      };
      const result = parseTimelineResponse(data);
      expect(result.timeline.wheelsIn).toBeNull();
    });

    it('should throw ValidationError for invalid response', () => {
      const data = { caseId: 'invalid' };
      expect(() => parseTimelineResponse(data)).toThrow(ValidationError);
    });
  });
});
