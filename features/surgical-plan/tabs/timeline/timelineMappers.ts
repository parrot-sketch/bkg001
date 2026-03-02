/**
 * Timeline Tab Mappers
 * 
 * Business logic for timeline tab (event grouping, formatting).
 * Pure functions only - no side effects, no React.
 */

import type { TimelineResponseDto } from './timelineParsers';

export interface TimelineEventViewModel {
  key: string;
  label: string;
  timestamp: string | null;
  isComplete: boolean;
}

export interface TimelineTabViewModel {
  caseId: string;
  caseStatus: string;
  events: TimelineEventViewModel[];
  durations: {
    orTimeMinutes: number | null;
    surgeryTimeMinutes: number | null;
    prepTimeMinutes: number | null;
    closeOutTimeMinutes: number | null;
    anesthesiaTimeMinutes: number | null;
  };
  missingItems: Array<{ field: string; label: string }>;
}

/**
 * Map DTO to view model
 */
export function mapTimelineDtoToViewModel(dto: TimelineResponseDto): TimelineTabViewModel {
  const events: TimelineEventViewModel[] = [
    {
      key: 'wheelsIn',
      label: 'Wheels In',
      timestamp: dto.timeline.wheelsIn,
      isComplete: !!dto.timeline.wheelsIn,
    },
    {
      key: 'anesthesiaStart',
      label: 'Anesthesia Start',
      timestamp: dto.timeline.anesthesiaStart,
      isComplete: !!dto.timeline.anesthesiaStart,
    },
    {
      key: 'incisionTime',
      label: 'Incision',
      timestamp: dto.timeline.incisionTime,
      isComplete: !!dto.timeline.incisionTime,
    },
    {
      key: 'closureTime',
      label: 'Closure',
      timestamp: dto.timeline.closureTime,
      isComplete: !!dto.timeline.closureTime,
    },
    {
      key: 'anesthesiaEnd',
      label: 'Anesthesia End',
      timestamp: dto.timeline.anesthesiaEnd,
      isComplete: !!dto.timeline.anesthesiaEnd,
    },
    {
      key: 'wheelsOut',
      label: 'Wheels Out',
      timestamp: dto.timeline.wheelsOut,
      isComplete: !!dto.timeline.wheelsOut,
    },
  ];

  return {
    caseId: dto.caseId,
    caseStatus: dto.caseStatus,
    events,
    durations: dto.durations,
    missingItems: dto.missingItems,
  };
}
