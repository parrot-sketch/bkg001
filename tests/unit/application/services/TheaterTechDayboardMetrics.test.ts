import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { TheaterTechService } from '../../../../application/services/TheaterTechService';
import { SurgicalCaseService } from '../../../../application/services/SurgicalCaseService';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('@/lib/db', () => ({ default: {} }));

const mockSurgicalCaseService = {
  transitionTo: vi.fn(),
} as unknown as SurgicalCaseService;

const mockChecklistRepo = {
  findByCaseId: vi.fn(),
  findById: vi.fn(),
  ensureExists: vi.fn(),
  completePhase: vi.fn(),
  saveDraftItems: vi.fn(),
  isPhaseCompleted: vi.fn(),
};

const mockAuditRepo = {
  record: vi.fn().mockResolvedValue({ id: 'audit-1' }),
  findByEntity: vi.fn(),
  findByActor: vi.fn(),
};

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
// TESTS — Dayboard Timeline Metrics
// ============================================================================

describe('TheaterTechService.getDayboard — timeline metrics', () => {
  let mockPrisma: any;
  let service: TheaterTechService;

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
    service = new TheaterTechService(
      mockPrisma,
      mockSurgicalCaseService,
      mockChecklistRepo,
      mockAuditRepo,
    );
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
        // No wheelsOut — still in theater
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
      // Case 1: On time (wheelsIn = booking start)
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
      // Case 2: Late by 15 min (wheelsIn = booking start + 15 min)
      buildBooking({
        id: 'b2',
        theaterId: 'theater-a',
        theaterName: 'Theater A',
        caseId: 'case-2',
        caseStatus: 'COMPLETED',
        startTime: '2026-02-11T10:00:00Z',
        endTime: '2026-02-11T12:00:00Z',
        wheelsIn: '2026-02-11T10:15:00Z', // 15 min late > 10 min threshold
        wheelsOut: '2026-02-11T11:30:00Z',
      }),
      // Case 3: Late by exactly 10 min (boundary — NOT delayed, must be > 10 min)
      buildBooking({
        id: 'b3',
        theaterId: 'theater-a',
        theaterName: 'Theater A',
        caseId: 'case-3',
        caseStatus: 'COMPLETED',
        startTime: '2026-02-11T12:00:00Z',
        endTime: '2026-02-11T14:00:00Z',
        wheelsIn: '2026-02-11T12:10:00Z', // exactly 10 min — boundary
        wheelsOut: '2026-02-11T13:30:00Z',
      }),
    ]);

    const result = await service.getDayboard(new Date('2026-02-11T15:00:00Z'));

    // Only case-2 is delayed (15 min > 10 min threshold)
    // Case-3 at exactly 10 min is NOT delayed (threshold is >, not >=)
    expect(result.summary.delayedStartCount).toBe(1);
  });

  it('should not count cases without wheelsIn as delayed', async () => {
    mockPrisma.theaterBooking.findMany.mockResolvedValue([
      buildBooking({
        id: 'b1',
        theaterId: 'theater-a',
        theaterName: 'Theater A',
        caseId: 'case-1',
        caseStatus: 'SCHEDULED',
        startTime: '2026-02-11T08:00:00Z',
        endTime: '2026-02-11T10:00:00Z',
        // No timeline at all
      }),
    ]);

    const result = await service.getDayboard(new Date('2026-02-11T12:00:00Z'));

    expect(result.summary.delayedStartCount).toBe(0);
  });

  // ──────────────────────────────────────────────────────────────────────
  // Utilization by theater
  // ──────────────────────────────────────────────────────────────────────

  it('should compute total utilization per theater (sum of OR times)', async () => {
    mockPrisma.theaterBooking.findMany.mockResolvedValue([
      // Theater A: Case 1 — 100 min
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
      // Theater A: Case 2 — 60 min
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
      // Theater B: Case 3 — 45 min
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
      'theater-a': 160, // 100 + 60
      'theater-b': 45,
    });
  });

  it('should not include theaters with no complete OR times in utilization', async () => {
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
        // No wheelsOut — still in theater
      }),
    ]);

    const result = await service.getDayboard(new Date('2026-02-11T12:00:00Z'));

    expect(result.summary.utilizationByTheater).toEqual({});
  });

  // ──────────────────────────────────────────────────────────────────────
  // Empty dayboard
  // ──────────────────────────────────────────────────────────────────────

  it('should return zero metrics when no bookings exist', async () => {
    mockPrisma.theaterBooking.findMany.mockResolvedValue([]);

    const result = await service.getDayboard(new Date('2026-02-11T12:00:00Z'));

    expect(result.summary.totalCases).toBe(0);
    expect(result.summary.avgOrTimeMinutes).toBeNull();
    expect(result.summary.delayedStartCount).toBe(0);
    expect(result.summary.utilizationByTheater).toEqual({});
  });

  // ──────────────────────────────────────────────────────────────────────
  // Mixed statuses
  // ──────────────────────────────────────────────────────────────────────

  it('should correctly report status counts in summary', async () => {
    mockPrisma.theaterBooking.findMany.mockResolvedValue([
      buildBooking({
        id: 'b1',
        theaterId: 'theater-a',
        theaterName: 'Theater A',
        caseId: 'case-1',
        caseStatus: 'SCHEDULED',
        startTime: '2026-02-11T08:00:00Z',
        endTime: '2026-02-11T10:00:00Z',
      }),
      buildBooking({
        id: 'b2',
        theaterId: 'theater-a',
        theaterName: 'Theater A',
        caseId: 'case-2',
        caseStatus: 'IN_PREP',
        startTime: '2026-02-11T10:00:00Z',
        endTime: '2026-02-11T12:00:00Z',
      }),
      buildBooking({
        id: 'b3',
        theaterId: 'theater-a',
        theaterName: 'Theater A',
        caseId: 'case-3',
        caseStatus: 'IN_THEATER',
        startTime: '2026-02-11T12:00:00Z',
        endTime: '2026-02-11T14:00:00Z',
        wheelsIn: '2026-02-11T12:05:00Z',
      }),
      buildBooking({
        id: 'b4',
        theaterId: 'theater-a',
        theaterName: 'Theater A',
        caseId: 'case-4',
        caseStatus: 'COMPLETED',
        startTime: '2026-02-11T14:00:00Z',
        endTime: '2026-02-11T16:00:00Z',
        wheelsIn: '2026-02-11T14:00:00Z',
        wheelsOut: '2026-02-11T15:30:00Z',
      }),
    ]);

    const result = await service.getDayboard(new Date('2026-02-11T17:00:00Z'));

    expect(result.summary.totalCases).toBe(4);
    expect(result.summary.scheduled).toBe(1);
    expect(result.summary.inPrep).toBe(1);
    expect(result.summary.inTheater).toBe(1);
    expect(result.summary.completed).toBe(1);
  });
});
