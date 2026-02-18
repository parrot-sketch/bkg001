import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ProcedureTimelineService } from '../../../../application/services/ProcedureTimelineService';
import { DomainException } from '../../../../domain/exceptions/DomainException';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('@/lib/db', () => ({ default: {} }));

// Build a Prisma mock that uses $transaction to just execute the callback
function createMockPrisma() {
  const mockPrisma = {
    theater: { findMany: vi.fn() },
    surgicalCase: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
    surgicalProcedureRecord: { create: vi.fn(), update: vi.fn() },
    clinicalFormResponse: { findUnique: vi.fn() },
    theaterBooking: { findMany: vi.fn() },
    $transaction: vi.fn(),
  } as any;

  // Make $transaction pass the mock itself as the transactional client
  mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
    return fn(mockPrisma);
  });

  return mockPrisma;
}

function createMockAuditRepo() {
  return {
    record: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    findByEntity: vi.fn(),
    findByActor: vi.fn(),
  };
}

// ============================================================================
// HELPERS — timeline timestamps
// ============================================================================

function minutesFromNow(mins: number): Date {
  return new Date(Date.now() + mins * 60_000);
}

function toISO(d: Date): string {
  return d.toISOString();
}

/** Builds a mock procedure_record with all-null timeline fields. */
function emptyProcedureRecord(id = 1) {
  return {
    id,
    wheels_in: null,
    anesthesia_start: null,
    anesthesia_end: null,
    incision_time: null,
    closure_time: null,
    wheels_out: null,
  };
}

/** Builds a mock procedure_record with a valid set of timeline timestamps. */
function completeProcedureRecord(baseMinutesAgo = 120, id = 1) {
  return {
    id,
    wheels_in: minutesFromNow(-baseMinutesAgo),
    anesthesia_start: minutesFromNow(-baseMinutesAgo + 10),
    incision_time: minutesFromNow(-baseMinutesAgo + 25),
    closure_time: minutesFromNow(-baseMinutesAgo + 85),
    anesthesia_end: minutesFromNow(-baseMinutesAgo + 90),
    wheels_out: minutesFromNow(-baseMinutesAgo + 100),
  };
}

// ============================================================================
// TESTS: updateTimeline — PATCH validation
// ============================================================================

describe('ProcedureTimelineService.updateTimeline — PATCH validation', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockAuditRepo: ReturnType<typeof createMockAuditRepo>;
  let service: ProcedureTimelineService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockAuditRepo = createMockAuditRepo();
    service = new ProcedureTimelineService(
      mockPrisma,
      mockAuditRepo as any
    );
  });

  // ──────────────────────────────────────────────────────────────────────
  // Happy path
  // ──────────────────────────────────────────────────────────────────────

  it('should set wheelsIn on an empty timeline', async () => {
    const wheelsIn = minutesFromNow(-60);
    mockPrisma.surgicalCase.findUnique.mockResolvedValue({
      id: 'case-1',
      status: 'IN_THEATER',
      procedure_record: emptyProcedureRecord(),
    });
    mockPrisma.surgicalProcedureRecord.update.mockResolvedValue({
      ...emptyProcedureRecord(),
      wheels_in: wheelsIn,
    });

    const result = await service.updateTimeline(
      'case-1',
      { wheelsIn: toISO(wheelsIn) },
      'user-1',
      'THEATER_TECHNICIAN',
    );

    expect(result.caseId).toBe('case-1');
    expect(result.timeline.wheelsIn).toBe(toISO(wheelsIn));
    expect(mockPrisma.surgicalProcedureRecord.update).toHaveBeenCalledOnce();
    expect(mockAuditRepo.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'TIMELINE_UPDATED',
        metadata: expect.objectContaining({
          field: 'wheelsIn',
          oldValue: null,
          newValue: expect.any(String),
        }),
      }),
    );
  });

  it('should set multiple timestamps at once', async () => {
    const wheelsIn = minutesFromNow(-60);
    const anesthesiaStart = minutesFromNow(-50);
    mockPrisma.surgicalCase.findUnique.mockResolvedValue({
      id: 'case-2',
      status: 'IN_THEATER',
      procedure_record: emptyProcedureRecord(),
    });
    mockPrisma.surgicalProcedureRecord.update.mockResolvedValue({
      ...emptyProcedureRecord(),
      wheels_in: wheelsIn,
      anesthesia_start: anesthesiaStart,
    });

    const result = await service.updateTimeline(
      'case-2',
      { wheelsIn: toISO(wheelsIn), anesthesiaStart: toISO(anesthesiaStart) },
      'user-1',
      'THEATER_TECHNICIAN',
    );

    expect(result.timeline.wheelsIn).toBe(toISO(wheelsIn));
    expect(result.timeline.anesthesiaStart).toBe(toISO(anesthesiaStart));
    // Should audit each field individually
    expect(mockAuditRepo.record).toHaveBeenCalledTimes(2);
  });

  // ──────────────────────────────────────────────────────────────────────
  // Chronological violations
  // ──────────────────────────────────────────────────────────────────────

  it('should reject when closureTime is set before existing incisionTime', async () => {
    const incisionTime = minutesFromNow(-30);
    const closureBefore = minutesFromNow(-45); // before incision

    mockPrisma.surgicalCase.findUnique.mockResolvedValue({
      id: 'case-3',
      status: 'IN_THEATER',
      procedure_record: {
        ...emptyProcedureRecord(),
        incision_time: incisionTime,
      },
    });

    await expect(
      service.updateTimeline(
        'case-3',
        { closureTime: toISO(closureBefore) },
        'user-1',
        'THEATER_TECHNICIAN',
      ),
    ).rejects.toThrow('Timeline validation failed');

    // Should audit the invalid attempt
    expect(mockAuditRepo.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'TIMELINE_INVALID_ATTEMPT',
        metadata: expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'closureTime',
              message: expect.stringContaining('must be after'),
            }),
          ]),
        }),
      }),
    );

    // Should NOT have updated the DB
    expect(mockPrisma.surgicalProcedureRecord.update).not.toHaveBeenCalled();
  });

  it('should reject when wheelsOut is set before existing anesthesiaEnd', async () => {
    const anesthesiaEnd = minutesFromNow(-20);
    const wheelsOutBefore = minutesFromNow(-30); // before anesthesiaEnd

    mockPrisma.surgicalCase.findUnique.mockResolvedValue({
      id: 'case-4',
      status: 'RECOVERY',
      procedure_record: {
        ...emptyProcedureRecord(),
        anesthesia_end: anesthesiaEnd,
      },
    });

    await expect(
      service.updateTimeline(
        'case-4',
        { wheelsOut: toISO(wheelsOutBefore) },
        'user-1',
        'THEATER_TECHNICIAN',
      ),
    ).rejects.toThrow('Timeline validation failed');
  });

  it('should reject when incisionTime equals closureTime (not strictly increasing)', async () => {
    const same = minutesFromNow(-30);

    mockPrisma.surgicalCase.findUnique.mockResolvedValue({
      id: 'case-5',
      status: 'IN_THEATER',
      procedure_record: emptyProcedureRecord(),
    });

    await expect(
      service.updateTimeline(
        'case-5',
        { incisionTime: toISO(same), closureTime: toISO(same) },
        'user-1',
        'THEATER_TECHNICIAN',
      ),
    ).rejects.toThrow('Timeline validation failed');
  });

  it('should reject future timestamps (> 5 min buffer)', async () => {
    const future = minutesFromNow(15); // 15 min in the future

    mockPrisma.surgicalCase.findUnique.mockResolvedValue({
      id: 'case-6',
      status: 'IN_THEATER',
      procedure_record: emptyProcedureRecord(),
    });

    await expect(
      service.updateTimeline(
        'case-6',
        { wheelsIn: toISO(future) },
        'user-1',
        'THEATER_TECHNICIAN',
      ),
    ).rejects.toThrow('Timeline validation failed');
  });

  // ──────────────────────────────────────────────────────────────────────
  // Auto-create procedure record
  // ──────────────────────────────────────────────────────────────────────

  it('should auto-create procedure record if missing', async () => {
    const wheelsIn = minutesFromNow(-60);
    mockPrisma.surgicalCase.findUnique.mockResolvedValue({
      id: 'case-7',
      status: 'IN_THEATER',
      procedure_record: null, // No record
    });
    mockPrisma.surgicalCase.findUniqueOrThrow.mockResolvedValue({
      diagnosis: 'Test diagnosis',
      urgency: 'ELECTIVE',
    });
    const createdRecord = { ...emptyProcedureRecord(42) };
    mockPrisma.surgicalProcedureRecord.create.mockResolvedValue(createdRecord);
    mockPrisma.surgicalProcedureRecord.update.mockResolvedValue({
      ...createdRecord,
      wheels_in: wheelsIn,
    });

    const result = await service.updateTimeline(
      'case-7',
      { wheelsIn: toISO(wheelsIn) },
      'user-1',
      'THEATER_TECHNICIAN',
    );

    expect(mockPrisma.surgicalProcedureRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          surgical_case_id: 'case-7',
          pre_op_diagnosis: 'Test diagnosis',
          urgency: 'ELECTIVE',
        }),
      }),
    );
    expect(result.timeline.wheelsIn).toBeTruthy();
  });

  // ──────────────────────────────────────────────────────────────────────
  // Error handling
  // ──────────────────────────────────────────────────────────────────────

  it('should throw if surgical case not found', async () => {
    mockPrisma.surgicalCase.findUnique.mockResolvedValue(null);

    await expect(
      service.updateTimeline(
        'non-existent',
        { wheelsIn: toISO(minutesFromNow(-10)) },
        'user-1',
        'THEATER_TECHNICIAN',
      ),
    ).rejects.toThrow('Surgical case not found');
  });

  // ──────────────────────────────────────────────────────────────────────
  // Old/new value audit trail
  // ──────────────────────────────────────────────────────────────────────

  it('should include old and new values in audit when overwriting existing timestamp', async () => {
    const oldWheelsIn = minutesFromNow(-120);
    const newWheelsIn = minutesFromNow(-115);

    mockPrisma.surgicalCase.findUnique.mockResolvedValue({
      id: 'case-8',
      status: 'IN_THEATER',
      procedure_record: {
        ...emptyProcedureRecord(),
        wheels_in: oldWheelsIn,
      },
    });
    mockPrisma.surgicalProcedureRecord.update.mockResolvedValue({
      ...emptyProcedureRecord(),
      wheels_in: newWheelsIn,
    });

    await service.updateTimeline(
      'case-8',
      { wheelsIn: toISO(newWheelsIn) },
      'user-1',
      'THEATER_TECHNICIAN',
    );

    expect(mockAuditRepo.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'TIMELINE_UPDATED',
        metadata: expect.objectContaining({
          field: 'wheelsIn',
          oldValue: oldWheelsIn.toISOString(),
          newValue: expect.any(String),
        }),
      }),
    );
  });

  // ──────────────────────────────────────────────────────────────────────
  // Derived durations in response
  // ──────────────────────────────────────────────────────────────────────

  it('should return derived durations when both endpoints exist', async () => {
    const record = completeProcedureRecord(120);
    mockPrisma.surgicalCase.findUnique.mockResolvedValue({
      id: 'case-9',
      status: 'COMPLETED',
      procedure_record: record,
    });
    // The update call returns the same record
    const wheelsInUpdate = minutesFromNow(-120);
    mockPrisma.surgicalProcedureRecord.update.mockResolvedValue({
      ...record,
      wheels_in: wheelsInUpdate,
    });

    const result = await service.updateTimeline(
      'case-9',
      { wheelsIn: toISO(wheelsInUpdate) },
      'user-1',
      'THEATER_TECHNICIAN',
    );

    expect(result.durations).toBeDefined();
    expect(result.durations.orTimeMinutes).toBeTypeOf('number');
  });

  // ──────────────────────────────────────────────────────────────────────
  // Missing items for status
  // ──────────────────────────────────────────────────────────────────────

  it('should return missing items for IN_THEATER when incision not set', async () => {
    const wheelsIn = minutesFromNow(-30);
    mockPrisma.surgicalCase.findUnique.mockResolvedValue({
      id: 'case-10',
      status: 'IN_THEATER',
      procedure_record: emptyProcedureRecord(),
    });
    mockPrisma.surgicalProcedureRecord.update.mockResolvedValue({
      ...emptyProcedureRecord(),
      wheels_in: wheelsIn,
    });

    const result = await service.updateTimeline(
      'case-10',
      { wheelsIn: toISO(wheelsIn) },
      'user-1',
      'THEATER_TECHNICIAN',
    );

    expect(result.missingItems).toBeDefined();
    expect(result.missingItems.length).toBeGreaterThan(0);
    const missingFields = result.missingItems.map((m: any) => m.field);
    expect(missingFields).toContain('incisionTime');
  });
});

// ============================================================================
// TESTS: getTimeline — GET endpoint
// ============================================================================

describe('ProcedureTimelineService.getTimeline', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockAuditRepo: ReturnType<typeof createMockAuditRepo>;
  let service: ProcedureTimelineService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockAuditRepo = createMockAuditRepo();
    service = new ProcedureTimelineService(
      mockPrisma,
      mockAuditRepo as any
    );
  });

  it('should return timeline data for a case with procedure record', async () => {
    const record = completeProcedureRecord(120);
    mockPrisma.surgicalCase.findUnique.mockResolvedValue({
      id: 'case-gt-1',
      status: 'IN_THEATER',
      procedure_record: record,
    });

    const result = await service.getTimeline('case-gt-1');

    expect(result.caseId).toBe('case-gt-1');
    expect(result.caseStatus).toBe('IN_THEATER');
    expect(result.timeline.wheelsIn).toBeTruthy();
    expect(result.timeline.wheelsOut).toBeTruthy();
    expect(result.durations.orTimeMinutes).toBeTypeOf('number');
    expect(result.durations.surgeryTimeMinutes).toBeTypeOf('number');
  });

  it('should return all-null timeline when no procedure record exists', async () => {
    mockPrisma.surgicalCase.findUnique.mockResolvedValue({
      id: 'case-gt-2',
      status: 'IN_PREP',
      procedure_record: null,
    });

    const result = await service.getTimeline('case-gt-2');

    expect(result.timeline.wheelsIn).toBeNull();
    expect(result.timeline.wheelsOut).toBeNull();
    expect(result.durations.orTimeMinutes).toBeNull();
    expect(result.missingItems).toHaveLength(0);
  });

  it('should throw if case not found', async () => {
    mockPrisma.surgicalCase.findUnique.mockResolvedValue(null);

    await expect(service.getTimeline('bad-id')).rejects.toThrow('Surgical case not found');
  });
});
