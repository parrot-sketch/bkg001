/**
 * Unit Tests: dayboardHelpers
 *
 * Tests for pure helper functions used in Theater Tech dayboard.
 */

import { describe, it, expect } from 'vitest';
import {
  filterTheatersByStatus,
  getTheaterOptions,
  computePrimaryCta,
  computeBlockerLevel,
  formatTimeRange,
  mapApiErrorToUiMessage,
  extractMissingItems,
  isGateBlockedError,
} from '@/lib/theater-tech/dayboardHelpers';
import type { DayboardCaseDto, DayboardBlockersDto, DayboardTheaterDto } from '@/application/dtos/TheaterTechDtos';
import { ApiErrorCode } from '@/lib/http/apiResponse';

// ============================================================================
// Test Data Helpers
// ============================================================================

function createMockCase(status: string, blockers: Partial<DayboardBlockersDto> = {}): DayboardCaseDto {
  return {
    id: 'case-1',
    status,
    urgency: 'ELECTIVE',
    estimatedDurationMinutes: 60,
    patient: { fullName: 'Test Patient', fileNumber: '123', hasAllergies: false },
    procedureName: 'Test Procedure',
    side: null,
    primarySurgeon: { name: 'Dr. Test' },
    booking: { startTime: '2026-02-11T10:00:00Z', endTime: '2026-02-11T11:00:00Z' },
    checklist: { signInCompleted: false, timeOutCompleted: false, signOutCompleted: false },
    blockers: {
      level: 'clear',
      doctorPlanReady: true,
      doctorPlanningMissingCount: 0,
      nursePreopStatus: 'FINAL',
      nurseIntraOpStatus: null,
      nurseRecoveryStatus: null,
      consentsTotalCount: 0,
      consentsSignedCount: 0,
      preOpPhotosCount: 0,
      intraOpDiscrepancy: false,
      dischargeReady: true,
      operativeNoteStatus: null,
      ...blockers,
    },
    timeline: null,
  } as DayboardCaseDto;
}

function createMockTheater(id: string, name: string, cases: DayboardCaseDto[]): DayboardTheaterDto {
  return {
    id,
    name,
    type: 'MAIN',
    colorCode: '#000000',
    cases,
  };
}

// ============================================================================
// Tests: filterTheatersByStatus
// ============================================================================

describe('filterTheatersByStatus', () => {
  it('should return all theaters when status is ALL', () => {
    const theaters = [
      createMockTheater('t1', 'Theater 1', [createMockCase('SCHEDULED')]),
      createMockTheater('t2', 'Theater 2', [createMockCase('IN_PREP')]),
    ];
    const result = filterTheatersByStatus(theaters, 'ALL');
    expect(result).toEqual(theaters);
  });

  it('should filter theaters by status', () => {
    const theaters = [
      createMockTheater('t1', 'Theater 1', [
        createMockCase('SCHEDULED'),
        createMockCase('IN_PREP'),
      ]),
      createMockTheater('t2', 'Theater 2', [createMockCase('IN_PREP')]),
    ];
    const result = filterTheatersByStatus(theaters, 'IN_PREP');
    expect(result).toHaveLength(2);
    expect(result[0].cases).toHaveLength(1);
    expect(result[0].cases[0].status).toBe('IN_PREP');
    expect(result[1].cases).toHaveLength(1);
    expect(result[1].cases[0].status).toBe('IN_PREP');
  });

  it('should exclude theaters with no matching cases', () => {
    const theaters = [
      createMockTheater('t1', 'Theater 1', [createMockCase('SCHEDULED')]),
      createMockTheater('t2', 'Theater 2', [createMockCase('IN_PREP')]),
    ];
    const result = filterTheatersByStatus(theaters, 'COMPLETED');
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// Tests: getTheaterOptions
// ============================================================================

describe('getTheaterOptions', () => {
  it('should map theaters to options', () => {
    const theaters = [
      createMockTheater('t1', 'Theater 1', []),
      createMockTheater('t2', 'Theater 2', []),
    ];
    const result = getTheaterOptions(theaters);
    expect(result).toEqual([
      { value: 't1', label: 'Theater 1' },
      { value: 't2', label: 'Theater 2' },
    ]);
  });

  it('should return empty array for empty theaters', () => {
    const result = getTheaterOptions([]);
    expect(result).toEqual([]);
  });
});

// ============================================================================
// Tests: computePrimaryCta
// ============================================================================

describe('computePrimaryCta', () => {
  it('should return correct CTA for SCHEDULED', () => {
    const caseData = createMockCase('SCHEDULED');
    const result = computePrimaryCta(caseData);
    expect(result).toEqual({
      action: 'IN_PREP',
      label: 'Start Prep',
      icon: 'Wrench',
      variant: 'default',
    });
  });

  it('should return correct CTA for IN_PREP', () => {
    const caseData = createMockCase('IN_PREP');
    const result = computePrimaryCta(caseData);
    expect(result).toEqual({
      action: 'IN_THEATER',
      label: 'Start Case',
      icon: 'Play',
      variant: 'default',
    });
  });

  it('should return correct CTA for IN_THEATER', () => {
    const caseData = createMockCase('IN_THEATER');
    const result = computePrimaryCta(caseData);
    expect(result).toEqual({
      action: 'RECOVERY',
      label: 'Move to Recovery',
      icon: 'Heart',
      variant: 'default',
    });
  });

  it('should return correct CTA for RECOVERY', () => {
    const caseData = createMockCase('RECOVERY');
    const result = computePrimaryCta(caseData);
    expect(result).toEqual({
      action: 'COMPLETED',
      label: 'Complete',
      icon: 'CheckCircle2',
      variant: 'default',
    });
  });

  it('should return null for COMPLETED', () => {
    const caseData = createMockCase('COMPLETED');
    const result = computePrimaryCta(caseData);
    expect(result).toBeNull();
  });

  it('should return null for unknown status', () => {
    const caseData = createMockCase('UNKNOWN_STATUS' as any);
    const result = computePrimaryCta(caseData);
    expect(result).toBeNull();
  });
});

// ============================================================================
// Tests: computeBlockerLevel
// ============================================================================

describe('computeBlockerLevel', () => {
  it('should return blocked when doctor plan not ready', () => {
    const blockers: DayboardBlockersDto = {
      level: 'blocked',
      doctorPlanReady: false,
      doctorPlanningMissingCount: 3,
      nursePreopStatus: 'FINAL',
      nurseIntraOpStatus: null,
      nurseRecoveryStatus: null,
      consentsTotalCount: 0,
      consentsSignedCount: 0,
      preOpPhotosCount: 0,
      intraOpDiscrepancy: false,
      dischargeReady: true,
      operativeNoteStatus: null,
    };
    expect(computeBlockerLevel(blockers)).toBe('blocked');
  });

  it('should return blocked when pre-op not finalized', () => {
    const blockers: DayboardBlockersDto = {
      level: 'blocked',
      doctorPlanReady: true,
      doctorPlanningMissingCount: 0,
      nursePreopStatus: 'DRAFT',
      nurseIntraOpStatus: null,
      nurseRecoveryStatus: null,
      consentsTotalCount: 0,
      consentsSignedCount: 0,
      preOpPhotosCount: 0,
      intraOpDiscrepancy: false,
      dischargeReady: true,
      operativeNoteStatus: null,
    };
    expect(computeBlockerLevel(blockers)).toBe('blocked');
  });

  it('should return blocked when consents not all signed', () => {
    const blockers: DayboardBlockersDto = {
      level: 'blocked',
      doctorPlanReady: true,
      doctorPlanningMissingCount: 0,
      nursePreopStatus: 'FINAL',
      nurseIntraOpStatus: null,
      nurseRecoveryStatus: null,
      consentsTotalCount: 3,
      consentsSignedCount: 2,
      preOpPhotosCount: 0,
      intraOpDiscrepancy: false,
      dischargeReady: true,
      operativeNoteStatus: null,
    };
    expect(computeBlockerLevel(blockers)).toBe('blocked');
  });

  it('should return blocked when intra-op discrepancy exists', () => {
    const blockers: DayboardBlockersDto = {
      level: 'blocked',
      doctorPlanReady: true,
      doctorPlanningMissingCount: 0,
      nursePreopStatus: 'FINAL',
      nurseIntraOpStatus: 'FINAL',
      nurseRecoveryStatus: null,
      consentsTotalCount: 0,
      consentsSignedCount: 0,
      preOpPhotosCount: 0,
      intraOpDiscrepancy: true,
      dischargeReady: true,
      operativeNoteStatus: null,
    };
    expect(computeBlockerLevel(blockers)).toBe('blocked');
  });

  it('should return warning when some items incomplete but not critical', () => {
    const blockers: DayboardBlockersDto = {
      level: 'warning',
      doctorPlanReady: true,
      doctorPlanningMissingCount: 1,
      nursePreopStatus: 'FINAL',
      nurseIntraOpStatus: null,
      nurseRecoveryStatus: null,
      consentsTotalCount: 0,
      consentsSignedCount: 0,
      preOpPhotosCount: 0,
      intraOpDiscrepancy: false,
      dischargeReady: true,
      operativeNoteStatus: null,
    };
    expect(computeBlockerLevel(blockers)).toBe('warning');
  });

  it('should return warning when recovery finalized but discharge not ready', () => {
    const blockers: DayboardBlockersDto = {
      level: 'warning',
      doctorPlanReady: true,
      doctorPlanningMissingCount: 0,
      nursePreopStatus: 'FINAL',
      nurseIntraOpStatus: null,
      nurseRecoveryStatus: 'FINAL',
      consentsTotalCount: 0,
      consentsSignedCount: 0,
      preOpPhotosCount: 0,
      intraOpDiscrepancy: false,
      dischargeReady: false,
      operativeNoteStatus: null,
    };
    expect(computeBlockerLevel(blockers)).toBe('warning');
  });

  it('should return clear when all critical items ready', () => {
    const blockers: DayboardBlockersDto = {
      level: 'clear',
      doctorPlanReady: true,
      doctorPlanningMissingCount: 0,
      nursePreopStatus: 'FINAL',
      nurseIntraOpStatus: null,
      nurseRecoveryStatus: null,
      consentsTotalCount: 0,
      consentsSignedCount: 0,
      preOpPhotosCount: 0,
      intraOpDiscrepancy: false,
      dischargeReady: true,
      operativeNoteStatus: null,
    };
    expect(computeBlockerLevel(blockers)).toBe('clear');
  });
});

// ============================================================================
// Tests: formatTimeRange
// ============================================================================

describe('formatTimeRange', () => {
  it('should format time range correctly', () => {
    const result = formatTimeRange('2026-02-11T10:00:00Z', '2026-02-11T11:30:00Z');
    // Note: Timezone conversion may vary, so we check it contains expected format
    expect(result).toMatch(/\d{2}:\d{2} – \d{2}:\d{2}/);
  });

  it('should handle invalid dates gracefully', () => {
    const result = formatTimeRange('invalid', 'invalid');
    // Invalid dates result in NaN when getting hours/minutes
    expect(result).toBe('NaN:NaN – NaN:NaN');
  });
});

// ============================================================================
// Tests: mapApiErrorToUiMessage
// ============================================================================

describe('mapApiErrorToUiMessage', () => {
  it('should extract message from ApiResponse error', () => {
    const error = {
      success: false,
      error: 'Test error',
      code: ApiErrorCode.GATE_BLOCKED,
      metadata: { missingItems: ['item1', 'item2'] },
    };
    const result = mapApiErrorToUiMessage(error);
    expect(result.message).toBe('Test error');
    expect(result.missingItems).toEqual(['item1', 'item2']);
  });

  it('should handle Error objects', () => {
    const error = new Error('Test error');
    const result = mapApiErrorToUiMessage(error);
    expect(result.message).toBe('Test error');
  });

  it('should handle unknown error types', () => {
    const result = mapApiErrorToUiMessage(null);
    expect(result.message).toBe('An unexpected error occurred');
  });
});

// ============================================================================
// Tests: extractMissingItems
// ============================================================================

describe('extractMissingItems', () => {
  it('should extract missing items from ApiResponse error', () => {
    const error = {
      success: false,
      metadata: { missingItems: ['item1', 'item2'] },
    };
    const result = extractMissingItems(error);
    expect(result).toEqual(['item1', 'item2']);
  });

  it('should extract missing items from Error with missingItems property', () => {
    const error = new Error('Test') as any;
    error.missingItems = ['item1'];
    const result = extractMissingItems(error);
    expect(result).toEqual(['item1']);
  });

  it('should return empty array when no missing items', () => {
    const result = extractMissingItems(new Error('Test'));
    expect(result).toEqual([]);
  });
});

// ============================================================================
// Tests: isGateBlockedError
// ============================================================================

describe('isGateBlockedError', () => {
  it('should return true for GATE_BLOCKED error', () => {
    const error = {
      success: false,
      code: ApiErrorCode.GATE_BLOCKED,
    };
    expect(isGateBlockedError(error)).toBe(true);
  });

  it('should return false for other error codes', () => {
    const error = {
      success: false,
      code: ApiErrorCode.VALIDATION_ERROR,
    };
    expect(isGateBlockedError(error)).toBe(false);
  });

  it('should return false for Error objects', () => {
    expect(isGateBlockedError(new Error('Test'))).toBe(false);
  });
});
