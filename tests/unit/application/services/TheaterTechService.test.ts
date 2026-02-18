import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { TheaterTechService } from '../../../../application/services/TheaterTechService';
import { SurgicalCaseService } from '../../../../application/services/SurgicalCaseService';
import { DomainException } from '../../../../domain/exceptions/DomainException';
import type { ISurgicalChecklistRepository } from '../../../../domain/interfaces/repositories/ISurgicalChecklistRepository';
import type { IClinicalAuditRepository } from '../../../../domain/interfaces/repositories/IClinicalAuditRepository';
import { SurgicalCaseStatus } from '@prisma/client';

// ============================================================================
// MOCKS
// ============================================================================

// Mock Prisma
vi.mock('@/lib/db', () => ({
  default: {},
}));

const mockPrisma = {
  theater: { findMany: vi.fn() },
  surgicalCase: { findUnique: vi.fn() },
  surgicalProcedureRecord: { create: vi.fn(), update: vi.fn() },
  clinicalFormResponse: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
  $transaction: vi.fn(),
} as any;

const mockSurgicalCaseService = {
  transitionTo: vi.fn(),
} as unknown as SurgicalCaseService;

const mockChecklistRepo: {
  findByCaseId: Mock;
  findById: Mock;
  ensureExists: Mock;
  completePhase: Mock;
  saveDraftItems: Mock;
  isPhaseCompleted: Mock;
} = {
  findByCaseId: vi.fn(),
  findById: vi.fn(),
  ensureExists: vi.fn(),
  completePhase: vi.fn(),
  saveDraftItems: vi.fn(),
  isPhaseCompleted: vi.fn(),
};

const mockAuditRepo: {
  record: Mock;
  findByEntity: Mock;
  findByActor: Mock;
} = {
  record: vi.fn(),
  findByEntity: vi.fn(),
  findByActor: vi.fn(),
};

const mockDashboardService = {
  getDayboard: vi.fn(),
  getTodayBoard: vi.fn(),
};

const mockChecklistService = {
  completeChecklistPhase: vi.fn(),
  saveChecklistDraft: vi.fn(),
  finalizeChecklistPhase: vi.fn(),
  getChecklistStatus: vi.fn(),
};

const mockTimelineService = {
  getTimeline: vi.fn(),
  updateTimeline: vi.fn(),
  updateProcedureTimestamps: vi.fn(),
};

describe('TheaterTechService', () => {
  let service: TheaterTechService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TheaterTechService(
      mockPrisma,
      mockSurgicalCaseService,
      mockChecklistRepo,
      mockAuditRepo,
      mockDashboardService as any,
      mockChecklistService as any,
      mockTimelineService as any
    );
  });

  // ==========================================================================
  // DELEGATION TESTS
  // ==========================================================================

  describe('Delegation to Specialized Services', () => {
    it('getDayboard should delegate to dashboardService', async () => {
      const today = new Date('2026-02-11');
      const mockResult = { theaters: [], summary: {}, date: '2026-02-11' } as any;
      mockDashboardService.getDayboard.mockResolvedValue(mockResult);
      const result = await service.getDayboard(today, 'theater-1');
      expect(mockDashboardService.getDayboard).toHaveBeenCalledWith(today, 'theater-1');
      expect(result).toBe(mockResult);
    });

    it('getTodayBoard should delegate to dashboardService', async () => {
      const today = new Date('2026-02-11');
      const mockResult = {} as any;
      mockDashboardService.getTodayBoard.mockResolvedValue(mockResult);
      const result = await service.getTodayBoard(today);
      expect(mockDashboardService.getTodayBoard).toHaveBeenCalledWith(today);
      expect(result).toBe(mockResult);
    });

    it('getTimeline should delegate to timelineService', async () => {
      const mockResult = {} as any;
      mockTimelineService.getTimeline.mockResolvedValue(mockResult);
      const result = await service.getTimeline('case-1');
      expect(mockTimelineService.getTimeline).toHaveBeenCalledWith('case-1');
      expect(result).toBe(mockResult);
    });

    it('updateTimeline should delegate to timelineService', async () => {
      const mockResult = {} as any;
      mockTimelineService.updateTimeline.mockResolvedValue(mockResult);
      const result = await service.updateTimeline('case-1', {}, 'user-1', 'ROLE');
      expect(mockTimelineService.updateTimeline).toHaveBeenCalledWith('case-1', {}, 'user-1', 'ROLE');
      expect(result).toBe(mockResult);
    });

    it('updateProcedureTimestamps should delegate to timelineService', async () => {
      const mockResult = {} as any;
      mockTimelineService.updateProcedureTimestamps.mockResolvedValue(mockResult);
      const result = await service.updateProcedureTimestamps('case-1', {}, 'user-1', 'ROLE');
      expect(mockTimelineService.updateProcedureTimestamps).toHaveBeenCalledWith('case-1', {}, 'user-1', 'ROLE');
      expect(result).toBe(mockResult);
    });

    it('completeChecklistPhase should delegate to checklistService', async () => {
      const mockResult = {} as any;
      mockChecklistService.completeChecklistPhase.mockResolvedValue(mockResult);
      const result = await service.completeChecklistPhase('case-1', 'SIGN_IN', [], 'user-1', 'ROLE');
      expect(mockChecklistService.completeChecklistPhase).toHaveBeenCalledWith('case-1', 'SIGN_IN', [], 'user-1', 'ROLE');
      expect(result).toBe(mockResult);
    });

    it('saveChecklistDraft should delegate to checklistService', async () => {
      const mockResult = {} as any;
      mockChecklistService.saveChecklistDraft.mockResolvedValue(mockResult);
      const result = await service.saveChecklistDraft('case-1', 'SIGN_IN', [], 'user-1', 'ROLE');
      expect(mockChecklistService.saveChecklistDraft).toHaveBeenCalledWith('case-1', 'SIGN_IN', [], 'user-1', 'ROLE');
      expect(result).toBe(mockResult);
    });

    it('finalizeChecklistPhase should delegate to checklistService', async () => {
      const mockResult = {} as any;
      mockChecklistService.finalizeChecklistPhase.mockResolvedValue(mockResult);
      const result = await service.finalizeChecklistPhase('case-1', 'SIGN_IN', [], 'user-1', 'ROLE');
      expect(mockChecklistService.finalizeChecklistPhase).toHaveBeenCalledWith('case-1', 'SIGN_IN', [], 'user-1', 'ROLE');
      expect(result).toBe(mockResult);
    });

    it('getChecklistStatus should delegate to checklistService', async () => {
      const mockResult = {} as any;
      mockChecklistService.getChecklistStatus.mockResolvedValue(mockResult);
      const result = await service.getChecklistStatus('case-1');
      expect(mockChecklistService.getChecklistStatus).toHaveBeenCalledWith('case-1');
      expect(result).toBe(mockResult);
    });
  });

  // ==========================================================================
  // CASE TRANSITION — CHECKLIST GATES (Logic remains in TheaterTechService)
  // ==========================================================================

  describe('transitionCase — checklist gates', () => {
    it('should BLOCK IN_PREP → IN_THEATER if Sign-In not completed', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-1',
        status: SurgicalCaseStatus.IN_PREP,
      });

      mockChecklistRepo.isPhaseCompleted.mockResolvedValue(false);
      mockChecklistRepo.findByCaseId.mockResolvedValue(null);
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-blocked' });

      await expect(
        service.transitionCase('case-1', 'IN_THEATER', 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow('WHO Sign-In checklist must be finalized');

      expect(mockSurgicalCaseService.transitionTo).not.toHaveBeenCalled();
      expect(mockAuditRepo.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'CHECKLIST_GATE_BLOCKED',
          metadata: expect.objectContaining({ gate: 'WHO_CHECKLIST_SIGN_IN' }),
        })
      );
    });

    it('should ALLOW IN_PREP → IN_THEATER if Sign-In IS completed', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-1',
        status: SurgicalCaseStatus.IN_PREP,
      });

      mockChecklistRepo.isPhaseCompleted.mockResolvedValue(true);
      (mockSurgicalCaseService.transitionTo as Mock).mockResolvedValue({
        id: 'case-1',
        status: SurgicalCaseStatus.IN_THEATER,
      });
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-1' });

      const result = await service.transitionCase(
        'case-1',
        'IN_THEATER',
        'user-1',
        'THEATER_TECHNICIAN'
      );

      expect(result.newStatus).toBe(SurgicalCaseStatus.IN_THEATER);
      expect(mockSurgicalCaseService.transitionTo).toHaveBeenCalled();
    });

    it('should BLOCK IN_THEATER → RECOVERY if Sign-Out not completed', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-2',
        status: SurgicalCaseStatus.IN_THEATER,
      });

      mockChecklistRepo.isPhaseCompleted.mockResolvedValue(false);
      mockChecklistRepo.findByCaseId.mockResolvedValue(null);
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-blocked' });

      await expect(
        service.transitionCase('case-2', 'RECOVERY', 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow('WHO Sign-Out checklist must be finalized');
    });

    // Recovery Gate Tests
    it('should BLOCK RECOVERY → COMPLETED if recovery record not finalized', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-r2',
        status: SurgicalCaseStatus.RECOVERY,
      });
      mockPrisma.clinicalFormResponse.findUnique.mockResolvedValue({
        status: 'DRAFT',
        data_json: '{}',
      });
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-blocked' });

      await expect(
        service.transitionCase('case-r2', 'COMPLETED', 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow('recovery record must be finalized');
    });
  });

  describe('transitionCase — audit logging', () => {
    it('should log CASE_TRANSITION_BLOCKED when gate fails', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-blocked',
        status: SurgicalCaseStatus.IN_PREP,
      });
      mockChecklistRepo.isPhaseCompleted.mockResolvedValue(false);
      mockChecklistRepo.findByCaseId.mockResolvedValue(null);
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-blocked' });

      await expect(
        service.transitionCase('case-blocked', 'IN_THEATER', 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow();

      expect(mockAuditRepo.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'CASE_TRANSITION_BLOCKED',
          entityId: 'case-blocked',
        })
      );
    });
  });
});
