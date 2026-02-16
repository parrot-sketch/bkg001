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
      mockChecklistRepo.findByCaseId.mockResolvedValue(null);
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-blocked' });

      await expect(
        service.transitionCase('case-1', 'IN_THEATER', 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow('WHO Sign-In checklist must be finalized');

      // State machine should NOT have been called
      expect(mockSurgicalCaseService.transitionTo).not.toHaveBeenCalled();

      // Should audit the blocked attempt
      expect(mockAuditRepo.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'CHECKLIST_GATE_BLOCKED',
          entityType: 'SurgicalChecklist',
          metadata: expect.objectContaining({
            gate: 'WHO_CHECKLIST_SIGN_IN',
          }),
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
      mockChecklistRepo.findByCaseId.mockResolvedValue(null);
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-blocked' });

      await expect(
        service.transitionCase('case-2', 'RECOVERY', 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow('WHO Sign-Out checklist must be finalized');

      // Should audit the blocked attempt
      expect(mockAuditRepo.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'CHECKLIST_GATE_BLOCKED',
          metadata: expect.objectContaining({
            gate: 'WHO_CHECKLIST_SIGN_OUT',
          }),
        })
      );
    });

    it('should ALLOW IN_THEATER → RECOVERY if Sign-Out IS completed AND intra-op record is FINAL', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-2',
        status: SurgicalCaseStatus.IN_THEATER,
      });

      mockChecklistRepo.isPhaseCompleted.mockResolvedValue(true);

      // Mock intra-op record as FINAL with all safety items satisfied
      mockPrisma.clinicalFormResponse.findUnique.mockResolvedValue({
        status: 'FINAL',
        data_json: JSON.stringify({
          counts: { finalCountsCompleted: true, countDiscrepancy: false },
          signOut: { signOutCompleted: true, postopInstructionsConfirmed: true, specimensLabeledConfirmed: true },
        }),
      });

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

    it('should BLOCK IN_THEATER → RECOVERY if intra-op record not started', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-2b',
        status: SurgicalCaseStatus.IN_THEATER,
      });

      mockChecklistRepo.isPhaseCompleted.mockResolvedValue(true);
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-blocked' });

      // No intra-op record exists
      mockPrisma.clinicalFormResponse.findUnique.mockResolvedValue(null);

      await expect(
        service.transitionCase('case-2b', 'RECOVERY', 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow('Nurse intra-operative record has not been started');
    });

    it('should BLOCK IN_THEATER → RECOVERY if intra-op record not finalized', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-2c',
        status: SurgicalCaseStatus.IN_THEATER,
      });

      mockChecklistRepo.isPhaseCompleted.mockResolvedValue(true);
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-blocked' });

      // Intra-op record is still DRAFT
      mockPrisma.clinicalFormResponse.findUnique.mockResolvedValue({
        status: 'DRAFT',
        data_json: '{}',
      });

      await expect(
        service.transitionCase('case-2c', 'RECOVERY', 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow('intra-operative record must be finalized');
    });

    it('should BLOCK IN_THEATER → RECOVERY if count discrepancy flagged in finalized record', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-2d',
        status: SurgicalCaseStatus.IN_THEATER,
      });

      mockChecklistRepo.isPhaseCompleted.mockResolvedValue(true);
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-blocked' });

      // Intra-op record FINAL but with count discrepancy
      mockPrisma.clinicalFormResponse.findUnique.mockResolvedValue({
        status: 'FINAL',
        data_json: JSON.stringify({
          counts: { finalCountsCompleted: true, countDiscrepancy: true },
          signOut: { signOutCompleted: true, postopInstructionsConfirmed: true, specimensLabeledConfirmed: true },
        }),
      });

      await expect(
        service.transitionCase('case-2d', 'RECOVERY', 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow('safety item(s) incomplete');
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

  // ==========================================================================
  // RECOVERY → COMPLETED GATE
  // ==========================================================================

  describe('transitionCase — RECOVERY → COMPLETED gate', () => {
    const VALID_RECOVERY_DATA = {
      arrivalBaseline: { timeArrivedRecovery: '14:30' },
      vitalsMonitoring: { observations: [{ time: '14:45' }] },
      dischargeReadiness: {
        dischargeCriteria: {
          vitalsStable: true,
          painControlled: true,
          nauseaControlled: true,
          bleedingControlled: true,
          airwayStable: true,
        },
        dischargeDecision: 'DISCHARGE_TO_WARD',
        finalizedByName: 'Nurse Sarah',
      },
    };

    it('should BLOCK RECOVERY → COMPLETED if recovery record not started', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-r1',
        status: SurgicalCaseStatus.RECOVERY,
      });
      mockPrisma.clinicalFormResponse.findUnique.mockResolvedValue(null);
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-blocked' });

      await expect(
        service.transitionCase('case-r1', 'COMPLETED', 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow('recovery record has not been started');
    });

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

    it('should BLOCK RECOVERY → COMPLETED if discharge decision is HOLD', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-r3',
        status: SurgicalCaseStatus.RECOVERY,
      });
      mockPrisma.clinicalFormResponse.findUnique.mockResolvedValue({
        status: 'FINAL',
        data_json: JSON.stringify({
          ...VALID_RECOVERY_DATA,
          dischargeReadiness: {
            ...VALID_RECOVERY_DATA.dischargeReadiness,
            dischargeDecision: 'HOLD',
          },
        }),
      });
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-blocked' });

      await expect(
        service.transitionCase('case-r3', 'COMPLETED', 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow('recovery item(s) incomplete');
    });

    it('should BLOCK RECOVERY → COMPLETED if discharge criteria not met', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-r4',
        status: SurgicalCaseStatus.RECOVERY,
      });
      mockPrisma.clinicalFormResponse.findUnique.mockResolvedValue({
        status: 'FINAL',
        data_json: JSON.stringify({
          ...VALID_RECOVERY_DATA,
          dischargeReadiness: {
            ...VALID_RECOVERY_DATA.dischargeReadiness,
            dischargeCriteria: {
              vitalsStable: true,
              painControlled: false,
              nauseaControlled: true,
              bleedingControlled: true,
              airwayStable: true,
            },
          },
        }),
      });
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-blocked' });

      await expect(
        service.transitionCase('case-r4', 'COMPLETED', 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow('recovery item(s) incomplete');
    });

    it('should ALLOW RECOVERY → COMPLETED when record is FINAL with all criteria met', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-r5',
        status: SurgicalCaseStatus.RECOVERY,
      });
      mockPrisma.clinicalFormResponse.findUnique.mockResolvedValue({
        status: 'FINAL',
        data_json: JSON.stringify(VALID_RECOVERY_DATA),
      });
      (mockSurgicalCaseService.transitionTo as Mock).mockResolvedValue({
        id: 'case-r5',
        status: SurgicalCaseStatus.COMPLETED,
      });
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-r5' });

      const result = await service.transitionCase(
        'case-r5', 'COMPLETED', 'user-1', 'THEATER_TECHNICIAN'
      );

      expect(result.newStatus).toBe(SurgicalCaseStatus.COMPLETED);
      expect(mockSurgicalCaseService.transitionTo).toHaveBeenCalledWith(
        'case-r5', SurgicalCaseStatus.COMPLETED, 'user-1'
      );
    });
  });

  describe('transitionCase — audit logging', () => {
    it('should write audit event with previousStatus, newStatus, reason, and timestamp', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-4',
        status: SurgicalCaseStatus.RECOVERY,
      });

      // Must satisfy recovery gate
      mockPrisma.clinicalFormResponse.findUnique.mockResolvedValue({
        status: 'FINAL',
        data_json: JSON.stringify({
          arrivalBaseline: { timeArrivedRecovery: '14:30' },
          vitalsMonitoring: { observations: [{ time: '14:45' }] },
          dischargeReadiness: {
            dischargeCriteria: {
              vitalsStable: true,
              painControlled: true,
              nauseaControlled: true,
              bleedingControlled: true,
              airwayStable: true,
            },
            dischargeDecision: 'DISCHARGE_TO_WARD',
            finalizedByName: 'Nurse Sarah',
          },
        }),
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

      expect(mockAuditRepo.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'user-1',
          actionType: 'CASE_TRANSITION',
          entityType: 'SurgicalCase',
          entityId: 'case-4',
          metadata: expect.objectContaining({
            previousStatus: SurgicalCaseStatus.RECOVERY,
            newStatus: SurgicalCaseStatus.COMPLETED,
            action: 'COMPLETED',
            reason: 'Patient discharged',
            userRole: 'ADMIN',
            timestamp: expect.any(String),
          }),
        })
      );
    });

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
      ).rejects.toThrow('WHO Sign-In checklist must be finalized');

      // Verify that a CASE_TRANSITION_BLOCKED event was logged
      expect(mockAuditRepo.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'user-1',
          actionType: 'CASE_TRANSITION_BLOCKED',
          entityType: 'SurgicalCase',
          entityId: 'case-blocked',
          metadata: expect.objectContaining({
            previousStatus: SurgicalCaseStatus.IN_PREP,
            attemptedStatus: SurgicalCaseStatus.IN_THEATER,
            userRole: 'THEATER_TECHNICIAN',
          }),
        })
      );
    });
  });

  // ==========================================================================
  // DAYBOARD
  // ==========================================================================

  describe('getDayboard', () => {
    it('should return lean payload with cases grouped by theater and sorted by start_time', async () => {
      const today = new Date('2026-02-11T12:00:00Z');

      // Mock bookings query
      mockPrisma.theaterBooking = {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'booking-1',
            start_time: new Date('2026-02-11T08:00:00Z'),
            end_time: new Date('2026-02-11T10:00:00Z'),
            status: 'CONFIRMED',
            theater: {
              id: 'theater-a',
              name: 'Theater A (Major)',
              type: 'MAJOR',
              color_code: '#3b82f6',
            },
            surgical_case: {
              id: 'case-1',
              status: 'SCHEDULED',
              urgency: 'ELECTIVE',
              procedure_name: 'Rhinoplasty',
              side: null,
              patient: {
                id: 'patient-1',
                first_name: 'Jane',
                last_name: 'Doe',
                file_number: 'NS001',
                allergies: 'Penicillin',
              },
              primary_surgeon: { id: 'doc-1', name: 'Dr. Smith' },
              case_plan: {
                ready_for_surgery: true,
                readiness_status: 'COMPLETE',
                estimated_duration_minutes: 120,
                procedure_plan: 'Full rhinoplasty with cartilage graft',
                risk_factors: 'Low risk',
                planned_anesthesia: 'GENERAL',
                images: [{ id: 1, timepoint: 'PRE_OP' }],
                consents: [{ id: 'c1', status: 'SIGNED', signed_at: new Date() }],
              },
              checklist: {
                sign_in_completed_at: null,
                time_out_completed_at: null,
                sign_out_completed_at: null,
              },
              procedure_record: null,
              clinical_forms: [
                { template_key: 'NURSE_PREOP_WARD_CHECKLIST', status: 'FINAL', data_json: '{}' },
              ],
            },
          },
          {
            id: 'booking-2',
            start_time: new Date('2026-02-11T11:00:00Z'),
            end_time: new Date('2026-02-11T12:30:00Z'),
            status: 'CONFIRMED',
            theater: {
              id: 'theater-a',
              name: 'Theater A (Major)',
              type: 'MAJOR',
              color_code: '#3b82f6',
            },
            surgical_case: {
              id: 'case-2',
              status: 'IN_PREP',
              urgency: 'URGENT',
              procedure_name: 'Blepharoplasty',
              side: 'BILATERAL',
              patient: {
                id: 'patient-2',
                first_name: 'John',
                last_name: 'Smith',
                file_number: 'NS002',
                allergies: null,
              },
              primary_surgeon: { id: 'doc-1', name: 'Dr. Smith' },
              case_plan: {
                ready_for_surgery: false,
                readiness_status: 'IN_PROGRESS',
                estimated_duration_minutes: 90,
                procedure_plan: null,
                risk_factors: null,
                planned_anesthesia: null,
                images: [],
                consents: [],
              },
              checklist: {
                sign_in_completed_at: new Date(),
                time_out_completed_at: null,
                sign_out_completed_at: null,
              },
              procedure_record: { id: 1 },
              clinical_forms: [],
            },
          },
        ]),
      };

      const result = await service.getDayboard(today);

      // Verify structure — date is based on local timezone; just check it's a valid date string
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.theaters).toHaveLength(1); // both in Theater A
      expect(result.theaters[0].name).toBe('Theater A (Major)');
      expect(result.theaters[0].cases).toHaveLength(2);

      // Verify ordering by start_time
      const cases = result.theaters[0].cases;
      expect(cases[0].id).toBe('case-1');
      expect(cases[1].id).toBe('case-2');

      // Verify lean patient data
      expect(cases[0].patient.fullName).toBe('Jane Doe');
      expect(cases[0].patient.hasAllergies).toBe(true);
      expect(cases[1].patient.hasAllergies).toBe(false);

      // Verify blockers for case-1 (ready)
      expect(cases[0].blockers.doctorPlanReady).toBe(true);
      expect(cases[0].blockers.nursePreopStatus).toBe('FINAL');
      expect(cases[0].blockers.consentsSignedCount).toBe(1);
      expect(cases[0].blockers.preOpPhotosCount).toBe(1);
      expect(cases[0].blockers.level).toBe('clear');

      // Verify blockers for case-2 (missing items)
      expect(cases[1].blockers.doctorPlanReady).toBe(false);
      expect(cases[1].blockers.doctorPlanningMissingCount).toBeGreaterThan(0);
      expect(cases[1].blockers.nursePreopStatus).toBeNull();

      // Verify summary
      expect(result.summary.totalCases).toBe(2);
      expect(result.summary.scheduled).toBe(1);
      expect(result.summary.inPrep).toBe(1);
    });

    it('should return empty theaters when no bookings for the date', async () => {
      mockPrisma.theaterBooking = {
        findMany: vi.fn().mockResolvedValue([]),
      };

      const result = await service.getDayboard(new Date('2026-03-01'));

      expect(result.theaters).toHaveLength(0);
      expect(result.summary.totalCases).toBe(0);
    });

    it('should filter by theaterId when provided', async () => {
      mockPrisma.theaterBooking = {
        findMany: vi.fn().mockResolvedValue([]),
      };

      await service.getDayboard(new Date('2026-02-11'), 'theater-b');

      expect(mockPrisma.theaterBooking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            theater_id: 'theater-b',
          }),
        })
      );
    });
  });

  // ==========================================================================
  // WHO CHECKLIST — FINALIZE PHASE
  // ==========================================================================

  describe('finalizeChecklistPhase', () => {
    const buildSignInItems = () => [
      { key: 'patient_identity', label: 'Patient identity confirmed (name, DOB, wristband)', confirmed: true },
      { key: 'site_marked', label: 'Surgical site marked / not applicable', confirmed: true },
      { key: 'consent_verified', label: 'Consent signed and verified', confirmed: true },
      { key: 'anesthesia_check', label: 'Anesthesia safety check completed', confirmed: true },
      { key: 'pulse_oximeter', label: 'Pulse oximeter on patient and functioning', confirmed: true },
      { key: 'allergy_check', label: 'Known allergies reviewed', confirmed: true },
      { key: 'airway_risk', label: 'Difficult airway / aspiration risk assessed', confirmed: true },
      { key: 'blood_loss_risk', label: 'Risk of >500ml blood loss assessed', confirmed: true },
    ];

    it('should finalize Sign-In with all items confirmed', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({ id: 'case-f1' });
      mockChecklistRepo.completePhase.mockResolvedValue({ id: 'cl-1' });
      mockChecklistRepo.findByCaseId.mockResolvedValue({
        surgical_case_id: 'case-f1',
        sign_in_completed_at: new Date(),
        sign_in_by_user_id: 'user-1',
        sign_in_by_role: 'THEATER_TECHNICIAN',
        sign_in_items: JSON.stringify(buildSignInItems()),
        time_out_completed_at: null,
        time_out_by_user_id: null,
        time_out_by_role: null,
        time_out_items: null,
        sign_out_completed_at: null,
        sign_out_by_user_id: null,
        sign_out_by_role: null,
        sign_out_items: null,
      });
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-fin' });

      const result = await service.finalizeChecklistPhase(
        'case-f1',
        'SIGN_IN',
        buildSignInItems(),
        'user-1',
        'THEATER_TECHNICIAN'
      );

      expect(result.signIn.completed).toBe(true);
      expect(mockAuditRepo.record).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: 'CHECKLIST_SIGNIN_FINALIZED' })
      );
    });

    it('should reject Sign-In finalization with missing required items', async () => {
      const items = buildSignInItems();
      items[0].confirmed = false; // patient_identity not confirmed

      await expect(
        service.finalizeChecklistPhase('case-f2', 'SIGN_IN', items, 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow('Cannot finalize SIGN_IN');
    });

    it('should reject finalization for non-existent case', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue(null);

      await expect(
        service.finalizeChecklistPhase('bad-id', 'SIGN_IN', buildSignInItems(), 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow('Surgical case not found');
    });

    it('should include structured missingItems in error metadata', async () => {
      const items = buildSignInItems();
      items[2].confirmed = false; // consent_verified
      items[3].confirmed = false; // anesthesia_check

      try {
        await service.finalizeChecklistPhase('case-f3', 'SIGN_IN', items, 'user-1', 'THEATER_TECHNICIAN');
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err.metadata.missingItems).toContain('Consent signed and verified');
        expect(err.metadata.missingItems).toContain('Anesthesia safety check completed');
        expect(err.metadata.blockingCategory).toBe('WHO_CHECKLIST');
      }
    });
  });

  // ==========================================================================
  // WHO CHECKLIST — SAVE DRAFT
  // ==========================================================================

  describe('saveChecklistDraft', () => {
    it('should save draft with partial confirmations', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({ id: 'case-d1' });
      mockChecklistRepo.isPhaseCompleted.mockResolvedValue(false);
      mockChecklistRepo.saveDraftItems.mockResolvedValue({ id: 'cl-d1' });
      mockChecklistRepo.findByCaseId.mockResolvedValue({
        surgical_case_id: 'case-d1',
        sign_in_completed_at: null,
        sign_in_by_user_id: null,
        sign_in_by_role: null,
        sign_in_items: JSON.stringify([
          { key: 'patient_identity', label: 'ID', confirmed: true },
          { key: 'site_marked', label: 'Site', confirmed: false },
        ]),
        time_out_completed_at: null,
        time_out_by_user_id: null,
        time_out_by_role: null,
        time_out_items: null,
        sign_out_completed_at: null,
        sign_out_by_user_id: null,
        sign_out_by_role: null,
        sign_out_items: null,
      });
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-d1' });

      const items = [
        { key: 'patient_identity', label: 'ID', confirmed: true },
        { key: 'site_marked', label: 'Site', confirmed: false },
      ];

      const result = await service.saveChecklistDraft(
        'case-d1',
        'SIGN_IN',
        items,
        'user-1',
        'THEATER_TECHNICIAN'
      );

      expect(result.signIn.items).toBeDefined();
      expect(mockChecklistRepo.saveDraftItems).toHaveBeenCalledWith(
        'case-d1',
        'SIGN_IN',
        items
      );
      expect(mockAuditRepo.record).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: 'CHECKLIST_SIGN_IN_DRAFT' })
      );
    });

    it('should reject draft save for non-existent case', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue(null);

      await expect(
        service.saveChecklistDraft('bad-id', 'SIGN_IN', [], 'user-1', 'THEATER_TECHNICIAN')
      ).rejects.toThrow('Surgical case not found');
    });

    it('should reject draft save when phase already finalized', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({ id: 'case-d2' });
      mockChecklistRepo.isPhaseCompleted.mockResolvedValue(true);

      await expect(
        service.saveChecklistDraft(
          'case-d2',
          'SIGN_IN',
          [{ key: 'test', label: 'Test', confirmed: true }],
          'user-1',
          'THEATER_TECHNICIAN'
        )
      ).rejects.toThrow('already finalized');
    });
  });

  // ==========================================================================
  // STRUCTURED GATE ERRORS (missingItems)
  // ==========================================================================

  describe('gate errors include structured missingItems', () => {
    it('Sign-In gate blocked error includes all WHO items when checklist has no data', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-g1',
        status: SurgicalCaseStatus.IN_PREP,
      });
      mockChecklistRepo.isPhaseCompleted.mockResolvedValue(false);
      mockChecklistRepo.findByCaseId.mockResolvedValue(null);
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-g1' });

      try {
        await service.transitionCase('case-g1', 'IN_THEATER', 'user-1', 'THEATER_TECHNICIAN');
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err.metadata.blockingCategory).toBe('WHO_CHECKLIST');
        expect(err.metadata.missingItems.length).toBeGreaterThan(0);
      }
    });

    it('Sign-Out gate blocked error includes missingItems for partial checklist', async () => {
      mockPrisma.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-g2',
        status: SurgicalCaseStatus.IN_THEATER,
      });
      mockChecklistRepo.isPhaseCompleted.mockResolvedValue(false);
      mockChecklistRepo.findByCaseId.mockResolvedValue({
        surgical_case_id: 'case-g2',
        sign_out_items: JSON.stringify([
          { key: 'procedure_recorded', label: 'Procedure name recorded', confirmed: true },
          { key: 'instrument_count', label: 'Instrument counts', confirmed: false },
        ]),
        sign_in_completed_at: null,
        sign_in_items: null,
        time_out_completed_at: null,
        time_out_items: null,
        sign_out_completed_at: null,
      });
      mockAuditRepo.record.mockResolvedValue({ id: 'audit-g2' });

      try {
        await service.transitionCase('case-g2', 'RECOVERY', 'user-1', 'THEATER_TECHNICIAN');
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err.metadata.blockingCategory).toBe('WHO_CHECKLIST');
        // Should include missing items (the ones not confirmed)
        expect(err.metadata.missingItems.length).toBeGreaterThan(0);
        // procedure_recorded was confirmed, so should NOT be in missing
        const missing = err.metadata.missingItems as string[];
        expect(missing.some((m: string) => m.includes('Procedure name'))).toBe(false);
      }
    });
  });
});
