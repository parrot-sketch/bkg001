/**
 * Unit Tests: Timeline Tab Mappers
 */

import { describe, it, expect } from 'vitest';
import { mapTimelineDtoToViewModel } from '@/features/surgical-plan/tabs/timeline/timelineMappers';

describe('timelineMappers', () => {
  describe('mapTimelineDtoToViewModel', () => {
    it('should map DTO to view model with correct event states', () => {
      const dto = {
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
      const result = mapTimelineDtoToViewModel(dto);
      expect(result.events).toHaveLength(6);
      expect(result.events[0].isComplete).toBe(true); // wheelsIn
      expect(result.events[2].isComplete).toBe(true); // incisionTime
      expect(result.events[1].isComplete).toBe(true); // anesthesiaStart
      expect(result.events[3].isComplete).toBe(false); // closureTime
      expect(result.missingItems).toHaveLength(1);
    });

    it('should handle all null timestamps', () => {
      const dto = {
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
      const result = mapTimelineDtoToViewModel(dto);
      expect(result.events.every((e) => !e.isComplete)).toBe(true);
    });
  });
});
