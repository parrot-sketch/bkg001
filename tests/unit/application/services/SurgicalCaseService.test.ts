import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { SurgicalCaseService } from '../../../../application/services/SurgicalCaseService';
import { SurgicalCaseStatus } from '@prisma/client';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('@/lib/db', () => ({ default: {} }));

const mockRepository = {
  findById: vi.fn() as Mock,
  findByPatientId: vi.fn() as Mock,
  findByConsultationId: vi.fn() as Mock,
  findByStatus: vi.fn() as Mock,
  findPendingPreOp: vi.fn() as Mock,
  create: vi.fn() as Mock,
  updateStatus: vi.fn() as Mock,
  update: vi.fn() as Mock,
};

describe('SurgicalCaseService — State Machine', () => {
  let service: SurgicalCaseService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SurgicalCaseService(mockRepository as any);
  });

  // ==========================================================================
  // VALID TRANSITIONS
  // ==========================================================================

  describe('valid transitions', () => {
    const validTransitions: [SurgicalCaseStatus, SurgicalCaseStatus][] = [
      [SurgicalCaseStatus.DRAFT, SurgicalCaseStatus.PLANNING],
      [SurgicalCaseStatus.DRAFT, SurgicalCaseStatus.CANCELLED],
      [SurgicalCaseStatus.PLANNING, SurgicalCaseStatus.READY_FOR_SCHEDULING],
      [SurgicalCaseStatus.PLANNING, SurgicalCaseStatus.DRAFT],
      [SurgicalCaseStatus.PLANNING, SurgicalCaseStatus.CANCELLED],
      [SurgicalCaseStatus.READY_FOR_SCHEDULING, SurgicalCaseStatus.SCHEDULED],
      [SurgicalCaseStatus.READY_FOR_SCHEDULING, SurgicalCaseStatus.PLANNING],
      [SurgicalCaseStatus.READY_FOR_SCHEDULING, SurgicalCaseStatus.CANCELLED],
      [SurgicalCaseStatus.SCHEDULED, SurgicalCaseStatus.IN_PREP],
      [SurgicalCaseStatus.SCHEDULED, SurgicalCaseStatus.READY_FOR_SCHEDULING],
      [SurgicalCaseStatus.SCHEDULED, SurgicalCaseStatus.CANCELLED],
      [SurgicalCaseStatus.IN_PREP, SurgicalCaseStatus.IN_THEATER],
      [SurgicalCaseStatus.IN_THEATER, SurgicalCaseStatus.RECOVERY],
      [SurgicalCaseStatus.RECOVERY, SurgicalCaseStatus.COMPLETED],
    ];

    validTransitions.forEach(([from, to]) => {
      it(`should allow ${from} → ${to}`, async () => {
        mockRepository.findById.mockResolvedValue({ id: 'case-1', status: from });
        mockRepository.updateStatus.mockResolvedValue({ id: 'case-1', status: to });

        const result = await service.transitionTo('case-1', to, 'user-1');
        expect(result.status).toBe(to);
      });
    });
  });

  // ==========================================================================
  // INVALID TRANSITIONS
  // ==========================================================================

  describe('invalid transitions', () => {
    const invalidTransitions: [SurgicalCaseStatus, SurgicalCaseStatus][] = [
      [SurgicalCaseStatus.DRAFT, SurgicalCaseStatus.SCHEDULED],
      [SurgicalCaseStatus.DRAFT, SurgicalCaseStatus.IN_THEATER],
      [SurgicalCaseStatus.SCHEDULED, SurgicalCaseStatus.COMPLETED],
      [SurgicalCaseStatus.SCHEDULED, SurgicalCaseStatus.IN_THEATER], // must go through IN_PREP
      [SurgicalCaseStatus.IN_PREP, SurgicalCaseStatus.COMPLETED],
      [SurgicalCaseStatus.IN_THEATER, SurgicalCaseStatus.SCHEDULED],
      [SurgicalCaseStatus.RECOVERY, SurgicalCaseStatus.IN_THEATER],
      [SurgicalCaseStatus.COMPLETED, SurgicalCaseStatus.RECOVERY],
    ];

    invalidTransitions.forEach(([from, to]) => {
      it(`should REJECT ${from} → ${to}`, async () => {
        mockRepository.findById.mockResolvedValue({ id: 'case-1', status: from });

        await expect(service.transitionTo('case-1', to, 'user-1')).rejects.toThrow();
      });
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('edge cases', () => {
    it('should reject if case not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.transitionTo('non-existent', SurgicalCaseStatus.IN_PREP, 'user-1')
      ).rejects.toThrow('Surgical case not found');
    });
  });
});
