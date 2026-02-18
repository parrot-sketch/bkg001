import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TheaterDashboardService } from '../../../../application/services/TheaterDashboardService';

// ============================================================================
// HELPERS — build mock theater bookings
// ============================================================================

function buildBooking(opts: {
  id: string;
  theaterId: string;
  theaterName: string;
  caseId: string;
  caseStatus: string;
  startTime: string;
  endTime: string;
  wheelsIn?: string | null;
  wheelsOut?: string | null;
  incisionTime?: string | null;
  closureTime?: string | null;
  anesthesiaStart?: string | null;
  anesthesiaEnd?: string | null;
  patientName?: string;
  procedureName?: string;
}) {
  const hasTimeline =
    opts.wheelsIn != null ||
    opts.wheelsOut != null ||
    opts.incisionTime != null ||
    opts.closureTime != null;

  return {
    id: opts.id,
    start_time: new Date(opts.startTime),
    end_time: new Date(opts.endTime),
    status: 'CONFIRMED',
    theater: {
      id: opts.theaterId,
      name: opts.theaterName,
      type: 'MAJOR',
      color_code: '#3b82f6',
    },
    surgical_case: {
      id: opts.caseId,
      status: opts.caseStatus,
      urgency: 'ELECTIVE',
      procedure_name: opts.procedureName ?? 'Test Procedure',
      side: null,
      patient: {
        id: `patient-${opts.caseId}`,
        first_name: opts.patientName?.split(' ')[0] ?? 'John',
        last_name: opts.patientName?.split(' ')[1] ?? 'Doe',
        file_number: `FN-${opts.caseId}`,
        allergies: null,
      },
      primary_surgeon: { id: 'doc-1', name: 'Dr. Smith' },
      case_plan: {
        ready_for_surgery: true,
        readiness_status: 'COMPLETE',
        estimated_duration_minutes: 90,
        procedure_plan: 'Plan',
        risk_factors: null,
        planned_anesthesia: 'GENERAL',
        images: [],
        consents: [{ id: 'c1', status: 'SIGNED', signed_at: new Date() }],
      },
      checklist: {
        sign_in_completed_at: null,
        time_out_completed_at: null,
        sign_out_completed_at: null,
      },
      procedure_record: hasTimeline
        ? {
          id: 1,
          wheels_in: opts.wheelsIn ? new Date(opts.wheelsIn) : null,
          anesthesia_start: opts.anesthesiaStart ? new Date(opts.anesthesiaStart) : null,
          anesthesia_end: opts.anesthesiaEnd ? new Date(opts.anesthesiaEnd) : null,
          incision_time: opts.incisionTime ? new Date(opts.incisionTime) : null,
          closure_time: opts.closureTime ? new Date(opts.closureTime) : null,
          wheels_out: opts.wheelsOut ? new Date(opts.wheelsOut) : null,
        }
        : null,
      clinical_forms: [],
    },
  };
}

// ============================================================================
// TESTS — TheaterDashboardService
// ============================================================================

describe('TheaterDashboardService.getDayboard — timeline metrics', () => {
  let mockPrisma: any;
  let service: TheaterDashboardService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = {
      theater: { findMany: vi.fn() },
      surgicalCase: { findUnique: vi.fn() },
      surgicalProcedureRecord: { create: vi.fn(), update: vi.fn() },
      clinicalFormResponse: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
      theaterBooking: { findMany: vi.fn() },
      $transaction: vi.fn(),
    };
    service = new TheaterDashboardService(mockPrisma);
  });

  // ──────────────────────────────────────────────────────────────────────
  // Average OR time
  // ──────────────────────────────────────────────────────────────────────

  it('should compute avgOrTimeMinutes for cases with complete wheels-in + wheels-out', async () => {
    mockPrisma.theaterBooking.findMany.mockResolvedValue([
      buildBooking({
        id: 'b1',
        theaterId: 'theater-a',
        theaterName: 'Theater A',
        caseId: 'case-1',
        caseStatus: 'COMPLETED',
        startTime: '2026-02-11T08:00:00Z',
        endTime: '2026-02-11T10:00:00Z',
        wheelsIn: '2026-02-11T08:00:00Z',
        wheelsOut: '2026-02-11T09:40:00Z', // 100 min
      }),
      buildBooking({
        id: 'b2',
        theaterId: 'theater-a',
        theaterName: 'Theater A',
        caseId: 'case-2',
        caseStatus: 'COMPLETED',
        startTime: '2026-02-11T10:00:00Z',
        endTime: '2026-02-11T12:00:00Z',
        wheelsIn: '2026-02-11T10:00:00Z',
        wheelsOut: '2026-02-11T11:00:00Z', // 60 min
      }),
    ]);

    const result = await service.getDayboard(new Date('2026-02-11T12:00:00Z'));

    // Average: (100 + 60) / 2 = 80
    expect(result.summary.avgOrTimeMinutes).toBe(80);
  });

  it('should return null avgOrTimeMinutes when no cases have complete timeline', async () => {
    mockPrisma.theaterBooking.findMany.mockResolvedValue([
      buildBooking({
        id: 'b1',
        theaterId: 'theater-a',
        theaterName: 'Theater A',
        caseId: 'case-1',
        caseStatus: 'IN_THEATER',
        startTime: '2026-02-11T08:00:00Z',
        endTime: '2026-02-11T10:00:00Z',
        wheelsIn: '2026-02-11T08:05:00Z',
      }),
    ]);

    const result = await service.getDayboard(new Date('2026-02-11T12:00:00Z'));

    expect(result.summary.avgOrTimeMinutes).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────
  // Delayed starts
  // ──────────────────────────────────────────────────────────────────────

  it('should count delayed starts when wheelsIn > booking start + 10 min', async () => {
    mockPrisma.theaterBooking.findMany.mockResolvedValue([
      // Case 1: On time
      buildBooking({
        id: 'b1',
        theaterId: 'theater-a',
        theaterName: 'Theater A',
        caseId: 'case-1',
        caseStatus: 'COMPLETED',
        startTime: '2026-02-11T08:00:00Z',
        endTime: '2026-02-11T10:00:00Z',
        wheelsIn: '2026-02-11T08:00:00Z',
        wheelsOut: '2026-02-11T09:40:00Z',
      }),
      // Case 2: Late by 15 min
      buildBooking({
        id: 'b2',
        theaterId: 'theater-a',
        theaterName: 'Theater A',
        caseId: 'case-2',
        caseStatus: 'COMPLETED',
        startTime: '2026-02-11T10:00:00Z',
        endTime: '2026-02-11T12:00:00Z',
        wheelsIn: '2026-02-11T10:15:00Z',
        wheelsOut: '2026-02-11T11:30:00Z',
      }),
      // Case 3: Late by exactly 10 min
      buildBooking({
        id: 'b3',
        theaterId: 'theater-a',
        theaterName: 'Theater A',
        caseId: 'case-3',
        caseStatus: 'COMPLETED',
        startTime: '2026-02-11T12:00:00Z',
        endTime: '2026-02-11T14:00:00Z',
        wheelsIn: '2026-02-11T12:10:00Z',
        wheelsOut: '2026-02-11T13:30:00Z',
      }),
    ]);

    const result = await service.getDayboard(new Date('2026-02-11T15:00:00Z'));

    expect(result.summary.delayedStartCount).toBe(1);
  });

  // ──────────────────────────────────────────────────────────────────────
  // Utilization by theater
  // ──────────────────────────────────────────────────────────────────────

  it('should compute total utilization per theater (sum of OR times)', async () => {
    mockPrisma.theaterBooking.findMany.mockResolvedValue([
      buildBooking({
        id: 'b1',
        theaterId: 'theater-a',
        theaterName: 'Theater A',
        caseId: 'case-1',
        caseStatus: 'COMPLETED',
        startTime: '2026-02-11T08:00:00Z',
        endTime: '2026-02-11T10:00:00Z',
        wheelsIn: '2026-02-11T08:00:00Z',
        wheelsOut: '2026-02-11T09:40:00Z', // 100 min
      }),
      buildBooking({
        id: 'b2',
        theaterId: 'theater-a',
        theaterName: 'Theater A',
        caseId: 'case-2',
        caseStatus: 'COMPLETED',
        startTime: '2026-02-11T10:00:00Z',
        endTime: '2026-02-11T12:00:00Z',
        wheelsIn: '2026-02-11T10:00:00Z',
        wheelsOut: '2026-02-11T11:00:00Z', // 60 min
      }),
      buildBooking({
        id: 'b3',
        theaterId: 'theater-b',
        theaterName: 'Theater B',
        caseId: 'case-3',
        caseStatus: 'COMPLETED',
        startTime: '2026-02-11T08:00:00Z',
        endTime: '2026-02-11T10:00:00Z',
        wheelsIn: '2026-02-11T08:00:00Z',
        wheelsOut: '2026-02-11T08:45:00Z', // 45 min
      }),
    ]);

    const result = await service.getDayboard(new Date('2026-02-11T15:00:00Z'));

    expect(result.summary.utilizationByTheater).toEqual({
      'theater-a': 160,
      'theater-b': 45,
    });
  });
});
