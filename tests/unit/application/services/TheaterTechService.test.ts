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
  isPhaseCompleted: Mock;
} = {
  findByCaseId: vi.fn(),
  findById: vi.fn(),
  ensureExists: vi.fn(),
  completePhase: vi.fn(),
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

describe('TheaterTechService', () => {
  let service: TheaterTechService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TheaterTechService(
      mockPrisma,
      mockSurgicalCaseService,
      mockChecklistRepo,
      mockAuditRepo
    );
  });

  // ==========================================================================
  // CASE TRANSITION — CHECKLIST GATES
  // ==========================================================================

  describe('transitionCase — checklist gates', () => {
    it('should BLOCK IN_PREP → IN_THEATER if Sign-In not completed', async () => {
      // Case is currently IN_PREP
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-1',
        status: SurgicalCaseStatus.IN_PREP,
      });

      // Sign-In NOT completed
      mockChecklistRepo.isPhaseCompleted.mockResolvedValue(false);

      await expect(
        service.transitionCase('case-1', 'IN_THEATER', 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow(DomainException);

      await expect(
        service.transitionCase('case-1', 'IN_THEATER', 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow('Sign-In checklist must be completed first');

      // State machine should NOT have been called
      expect(mockSurgicalCaseService.transitionTo).not.toHaveBeenCalled();
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
      expect(mockSurgicalCaseService.transitionTo).toHaveBeenCalledWith(
        'case-1',
        SurgicalCaseStatus.IN_THEATER,
        'user-1'
      );
      expect(mockAuditRepo.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'CASE_TRANSITION',
          entityType: 'SurgicalCase',
          entityId: 'case-1',
        })
      );
    });

    it('should BLOCK IN_THEATER → RECOVERY if Sign-Out not completed', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-2',
        status: SurgicalCaseStatus.IN_THEATER,
      });

      mockChecklistRepo.isPhaseCompleted.mockResolvedValue(false);

      await expect(
        service.transitionCase('case-2', 'RECOVERY', 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow('Sign-Out checklist must be completed first');
    });

    it('should ALLOW IN_THEATER → RECOVERY if Sign-Out IS completed', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-2',
        status: SurgicalCaseStatus.IN_THEATER,
      });

      mockChecklistRepo.isPhaseCompleted.mockResolvedValue(true);
      (mockSurgicalCaseService.transitionTo as Mock).mockResolvedValue({
        id: 'case-2',
        status: SurgicalCaseStatus.RECOVERY,
      });
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-2' });

      const result = await service.transitionCase(
        'case-2',
        'RECOVERY',
        'user-1',
        'THEATER_TECHNICIAN'
      );

      expect(result.newStatus).toBe(SurgicalCaseStatus.RECOVERY);
    });

    it('should NOT require checklist for SCHEDULED → IN_PREP', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-3',
        status: SurgicalCaseStatus.SCHEDULED,
      });

      (mockSurgicalCaseService.transitionTo as Mock).mockResolvedValue({
        id: 'case-3',
        status: SurgicalCaseStatus.IN_PREP,
      });
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-3' });

      const result = await service.transitionCase(
        'case-3',
        'IN_PREP',
        'user-1',
        'THEATER_TECHNICIAN'
      );

      expect(result.newStatus).toBe(SurgicalCaseStatus.IN_PREP);
      // Checklist should NOT have been checked for this transition
      expect(mockChecklistRepo.isPhaseCompleted).not.toHaveBeenCalled();
    });

    it('should reject invalid action names', async () => {
      await expect(
        service.transitionCase('case-1', 'INVALID_ACTION', 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow('Invalid transition action');
    });

    it('should reject non-existent cases', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue(null);

      await expect(
        service.transitionCase('non-existent', 'IN_PREP', 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow('Surgical case not found');
    });
  });

  // ==========================================================================
  // CHECKLIST OPERATIONS
  // ==========================================================================

  describe('completeChecklistPhase', () => {
    it('should reject if any items are not confirmed', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({ id: 'case-1' });

      const items = [
        { key: 'item_1', label: 'Check 1', confirmed: true },
        { key: 'item_2', label: 'Check 2', confirmed: false }, // not confirmed
      ];

      await expect(
        service.completeChecklistPhase('case-1', 'SIGN_IN', items, 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow('Cannot complete SIGN_IN: 1 item(s) not confirmed');
    });

    it('should complete phase and write audit when all items confirmed', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({ id: 'case-1' });
      mockChecklistRepo.completePhase.mockResolvedValue({ id: 'cl-1' });
      mockChecklistRepo.findByCaseId.mockResolvedValue({
        surgical_case_id: 'case-1',
        sign_in_completed_at: new Date(),
        sign_in_by_user_id: 'user-1',
        sign_in_by_role: 'THEATER_TECHNICIAN',
        sign_in_items: JSON.stringify([{ key: 'item_1', label: 'Check 1', confirmed: true }]),
        time_out_completed_at: null,
        time_out_by_user_id: null,
        time_out_by_role: null,
        time_out_items: null,
        sign_out_completed_at: null,
        sign_out_by_user_id: null,
        sign_out_by_role: null,
        sign_out_items: null,
      });
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-1' });

      const items = [{ key: 'item_1', label: 'Check 1', confirmed: true }];

      const result = await service.completeChecklistPhase(
        'case-1',
        'SIGN_IN',
        items,
        'user-1',
        'THEATER_TECHNICIAN'
      );

      expect(result.signIn.completed).toBe(true);
      expect(mockChecklistRepo.completePhase).toHaveBeenCalledWith(
        'case-1',
        'SIGN_IN',
        expect.objectContaining({ userId: 'user-1' })
      );
      expect(mockAuditRepo.record).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: 'CHECKLIST_SIGN_IN' })
      );
    });

    it('should reject for non-existent case', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue(null);

      const items = [{ key: 'item_1', label: 'Check 1', confirmed: true }];

      await expect(
        service.completeChecklistPhase('bad-id', 'SIGN_IN', items, 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow('Surgical case not found');
    });
  });

  // ==========================================================================
  // TRANSITION AUDIT
  // ==========================================================================

  describe('transitionCase — audit logging', () => {
    it('should write audit event with previousStatus, newStatus, and reason', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-4',
        status: SurgicalCaseStatus.RECOVERY,
      });

      (mockSurgicalCaseService.transitionTo as Mock).mockResolvedValue({
        id: 'case-4',
        status: SurgicalCaseStatus.COMPLETED,
      });
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-4' });

      await service.transitionCase(
        'case-4',
        'COMPLETED',
        'user-1',
        'ADMIN',
        'Patient discharged'
      );

      expect(mockAuditRepo.record).toHaveBeenCalledWith({
        actorUserId: 'user-1',
        actionType: 'CASE_TRANSITION',
        entityType: 'SurgicalCase',
        entityId: 'case-4',
        metadata: {
          previousStatus: SurgicalCaseStatus.RECOVERY,
          newStatus: SurgicalCaseStatus.COMPLETED,
          action: 'COMPLETED',
          reason: 'Patient discharged',
          userRole: 'ADMIN',
        },
      });
    });
  });
});
