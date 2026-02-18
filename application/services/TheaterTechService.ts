/**
 * Service: TheaterTechService
 *
 * Orchestrates all day-of-operations logic for the Theater Technician role.
 *
 * Responsibilities:
 * - Build the "Today Board" (cases grouped by theater)
 * - Validate and execute surgical case status transitions with checklist gates
 * - Record intra-operative timestamps idempotently
 * - Complete checklist phases with audit trail
 *
 * Design principles:
 * - Thin controllers call this service; all logic lives here
 * - Transactions where state changes span multiple tables
 * - Immutable audit logging for every clinical action
 * - Idempotent operations (safe to retry)
 */

import { PrismaClient, SurgicalCaseStatus, ClinicalFormStatus } from '@prisma/client';
import { ISurgicalChecklistRepository } from '@/domain/interfaces/repositories/ISurgicalChecklistRepository';
import { IClinicalAuditRepository } from '@/domain/interfaces/repositories/IClinicalAuditRepository';
import { SurgicalCaseService } from '@/application/services/SurgicalCaseService';
import { TheaterDashboardService } from '@/application/services/TheaterDashboardService';
import { SurgicalChecklistService } from '@/application/services/SurgicalChecklistService';
import { ProcedureTimelineService } from '@/application/services/ProcedureTimelineService';
import { DomainException } from '@/domain/exceptions/DomainException';
import {
  INTRAOP_TEMPLATE_KEY,
  INTRAOP_TEMPLATE_VERSION,
  checkNurseRecoveryGateCompliance,
} from '@/domain/clinical-forms/NurseIntraOpRecord';
import {
  RECOVERY_TEMPLATE_KEY,
  RECOVERY_TEMPLATE_VERSION,
  getCompletionGateItems,
} from '@/domain/clinical-forms/NurseRecoveryRecord';
import {
  OPERATIVE_NOTE_TEMPLATE_KEY,
} from '@/domain/clinical-forms/SurgeonOperativeNote';
import {
  TheaterBoardDto,
  TheaterWithCasesDto,
  TheaterCaseDto,
  BoardSummaryDto,
  CaseTransitionResultDto,
  ProcedureTimestampResultDto,
  TimelineResultDto,
  ChecklistStatusDto,
  DayboardDto,
  DayboardTheaterDto,
  DayboardCaseDto,
  DayboardBlockersDto,
  DayboardSummaryDto,
} from '@/application/dtos/TheaterTechDtos';
import {
  TEMPLATE_KEY as PREOP_TEMPLATE_KEY,
  TEMPLATE_VERSION as PREOP_TEMPLATE_VERSION,
} from '@/domain/clinical-forms/NursePreopWardChecklist';
import { ChecklistItemConfirmation } from '@/domain/interfaces/repositories/ISurgicalChecklistRepository';
import {
  type ChecklistItem,
  getFinalSchemaForPhase,
  getMissingItemsForPhase,
} from '@/domain/clinical-forms/WhoSurgicalChecklist';
import {
  type OperativeTimeline,
  type TimelinePatchInput,
  validateTimeline,
  computeDerivedDurations,
  getMissingTimelineItemsForStatus,
  dbRecordToTimeline,
  timelineToDto,
  FIELD_TO_DB_COLUMN,
  TIMELINE_FIELD_ORDER,
  type TimelineFieldName,
} from '@/domain/helpers/operativeTimeline';

// Maps API action strings to SurgicalCaseStatus enum values
const ACTION_TO_STATUS: Record<string, SurgicalCaseStatus> = {
  IN_PREP: SurgicalCaseStatus.IN_PREP,
  IN_THEATER: SurgicalCaseStatus.IN_THEATER,
  RECOVERY: SurgicalCaseStatus.RECOVERY,
  COMPLETED: SurgicalCaseStatus.COMPLETED,
};

export class TheaterTechService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly surgicalCaseService: SurgicalCaseService,
    private readonly checklistRepo: ISurgicalChecklistRepository,
    private readonly auditRepo: IClinicalAuditRepository,
    private readonly dashboardService: TheaterDashboardService,
    private readonly checklistService: SurgicalChecklistService,
    private readonly timelineService: ProcedureTimelineService
  ) { }

  // ==========================================================================
  // DAYBOARD (OPTIMIZED) — single lean query for the day-of dashboard
  // ==========================================================================

  /**
   * Build the optimized day-of-operations board.
   *
   * Returns cases booked for the given date, grouped by theater.
   * Includes lean patient/case/booking data plus readiness blockers summary.
   *
   * Performance:
   * - Single Prisma query with targeted includes (no N+1)
   * - Only fetches theaters that have bookings for the date
   * - Sorts by start_time within each theater
   * - Optional theater filter
   *
   * @param date - The date to query
   * @param theaterId - Optional filter by specific theater
   */
  async getDayboard(date: Date, theaterId?: string): Promise<DayboardDto> {
    return this.dashboardService.getDayboard(date, theaterId);
  }

  // ==========================================================================
  // TODAY BOARD (legacy)
  // ==========================================================================

  /**
   * Build the day-of-operations board for a given date.
   * Returns cases grouped by theater, with full context for the UI.
   *
   * Performance: single query with includes (no N+1).
   */
  async getTodayBoard(date: Date): Promise<TheaterBoardDto> {
    return this.dashboardService.getTodayBoard(date);
  }

  // ==========================================================================
  // CASE TRANSITION
  // ==========================================================================

  /**
   * Transition a surgical case to the next status.
   *
   * Enforces:
   * - State machine validation (via SurgicalCaseService)
   * - Checklist gate: SCHEDULED → IN_THEATER requires Sign-In completed
   * - Checklist gate: IN_THEATER → RECOVERY requires Sign-Out completed
   * - Audit trail for every transition
   */
  async transitionCase(
    caseId: string,
    action: string,
    userId: string,
    userRole: string,
    reason?: string
  ): Promise<CaseTransitionResultDto> {
    const targetStatus = ACTION_TO_STATUS[action];
    if (!targetStatus) {
      throw new DomainException(`Invalid transition action: ${action}`);
    }

    // Load current case
    const surgicalCase = await this.prisma.surgicalCase.findUnique({
      where: { id: caseId },
    });
    if (!surgicalCase) {
      throw new DomainException('Surgical case not found', { caseId });
    }

    const previousStatus = surgicalCase.status;

    // ── Checklist Gates ──────────────────────────────────────────────
    try {
      await this.enforceChecklistGates(caseId, previousStatus, targetStatus);
    } catch (gateError) {
      // Log blocked transitions for observability (repeated failures = signal)
      console.warn(
        `[TheaterTechService] Transition BLOCKED: ${previousStatus} → ${targetStatus} ` +
        `for case=${caseId} by user=${userId}. ` +
        `Reason: ${gateError instanceof Error ? gateError.message : 'Unknown'}`
      );

      // Audit the blocked transition attempt
      await this.auditRepo.record({
        actorUserId: userId,
        actionType: 'CASE_TRANSITION_BLOCKED',
        entityType: 'SurgicalCase',
        entityId: caseId,
        metadata: {
          previousStatus,
          attemptedStatus: targetStatus,
          action,
          reason: reason || null,
          userRole,
          blockReason: gateError instanceof Error ? gateError.message : 'Unknown',
          blockers: gateError instanceof DomainException
            ? (gateError.metadata as Record<string, unknown>)?.missingItems ?? []
            : [],
        },
      });

      throw gateError;
    }

    // ── State Machine Transition ─────────────────────────────────────
    // SurgicalCaseService.transitionTo validates the transition graph
    // and throws if invalid
    await this.surgicalCaseService.transitionTo(caseId, targetStatus, userId);

    // ── Audit ────────────────────────────────────────────────────────
    await this.auditRepo.record({
      actorUserId: userId,
      actionType: 'CASE_TRANSITION',
      entityType: 'SurgicalCase',
      entityId: caseId,
      metadata: {
        previousStatus,
        newStatus: targetStatus,
        action,
        reason: reason || null,
        userRole,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      caseId,
      previousStatus,
      newStatus: targetStatus,
      transitionedAt: new Date(),
      transitionedBy: userId,
    };
  }

  /**
   * Enforce checklist gates for specific transitions.
   *
   * IN_PREP → IN_THEATER: Sign-In must be completed
   * IN_THEATER → RECOVERY: Sign-Out must be completed + Intra-Op Record FINAL
   * RECOVERY → COMPLETED: Recovery Record FINAL + discharge criteria met
   */
  private async enforceChecklistGates(
    caseId: string,
    currentStatus: SurgicalCaseStatus,
    targetStatus: SurgicalCaseStatus
  ): Promise<void> {
    // Gate 1: Cannot enter IN_THEATER without Sign-In
    if (
      currentStatus === SurgicalCaseStatus.IN_PREP &&
      targetStatus === SurgicalCaseStatus.IN_THEATER
    ) {
      const signInDone = await this.checklistRepo.isPhaseCompleted(caseId, 'SIGN_IN');
      if (!signInDone) {
        // Fetch current items to report structured missing list
        const checklist = await this.checklistRepo.findByCaseId(caseId);
        const items: ChecklistItem[] | null = checklist?.sign_in_items
          ? JSON.parse(checklist.sign_in_items)
          : null;
        const missingItems = getMissingItemsForPhase('SIGN_IN', items);

        await this.auditRepo.record({
          actorUserId: 'SYSTEM',
          actionType: 'CHECKLIST_GATE_BLOCKED',
          entityType: 'SurgicalChecklist',
          entityId: caseId,
          metadata: {
            gate: 'WHO_CHECKLIST_SIGN_IN',
            transition: 'IN_PREP→IN_THEATER',
            missingItems,
          },
        });

        throw new DomainException(
          'Cannot transition to IN_THEATER: WHO Sign-In checklist must be finalized',
          {
            caseId,
            gate: 'WHO_CHECKLIST',
            blockingCategory: 'WHO_CHECKLIST',
            missingItems: missingItems.length > 0
              ? missingItems
              : ['Sign-In checklist not finalized'],
          }
        );
      }
    }

    // Gate 2: Cannot enter RECOVERY without Sign-Out + Intra-Op Record safety items
    if (
      currentStatus === SurgicalCaseStatus.IN_THEATER &&
      targetStatus === SurgicalCaseStatus.RECOVERY
    ) {
      const signOutDone = await this.checklistRepo.isPhaseCompleted(caseId, 'SIGN_OUT');
      if (!signOutDone) {
        const checklist = await this.checklistRepo.findByCaseId(caseId);
        const items: ChecklistItem[] | null = checklist?.sign_out_items
          ? JSON.parse(checklist.sign_out_items)
          : null;
        const missingItems = getMissingItemsForPhase('SIGN_OUT', items);

        await this.auditRepo.record({
          actorUserId: 'SYSTEM',
          actionType: 'CHECKLIST_GATE_BLOCKED',
          entityType: 'SurgicalChecklist',
          entityId: caseId,
          metadata: {
            gate: 'WHO_CHECKLIST_SIGN_OUT',
            transition: 'IN_THEATER→RECOVERY',
            missingItems,
          },
        });

        throw new DomainException(
          'Cannot transition to RECOVERY: WHO Sign-Out checklist must be finalized',
          {
            caseId,
            gate: 'WHO_CHECKLIST',
            blockingCategory: 'WHO_CHECKLIST',
            missingItems: missingItems.length > 0
              ? missingItems
              : ['Sign-Out checklist not finalized'],
          }
        );
      }

      // Gate 2b: Nurse Intra-Op Record must be FINAL with safety items completed
      await this.enforceIntraOpRecoveryGate(caseId);
    }

    // Gate 3: Cannot COMPLETE without Recovery Record FINAL + discharge criteria
    if (
      currentStatus === SurgicalCaseStatus.RECOVERY &&
      targetStatus === SurgicalCaseStatus.COMPLETED
    ) {
      await this.enforceRecoveryCompletedGate(caseId);
    }
  }

  /**
   * Enforce intra-op nurse record safety gate for RECOVERY transition.
   *
   * Requirements:
   * - Intra-op record must exist and be FINAL
   * - Final counts must be completed (signOutCompleted, finalCountsCompleted)
   * - Count discrepancy must not be flagged (blocks transition)
   *
   * Returns structured error with missingItems for the UI.
   */
  private async enforceIntraOpRecoveryGate(caseId: string): Promise<void> {
    const intraOpRecord = await this.prisma.clinicalFormResponse.findUnique({
      where: {
        template_key_template_version_surgical_case_id: {
          template_key: INTRAOP_TEMPLATE_KEY,
          template_version: INTRAOP_TEMPLATE_VERSION,
          surgical_case_id: caseId,
        },
      },
      select: {
        status: true,
        data_json: true,
      },
    });

    // If no intra-op record exists at all
    if (!intraOpRecord) {
      throw new DomainException(
        'Cannot transition to RECOVERY: Nurse intra-operative record has not been started',
        {
          caseId,
          gate: 'NURSE_INTRAOP_RECORD',
          missingItems: ['Nurse intra-operative record not started'],
        }
      );
    }

    // Record must be FINAL
    if (intraOpRecord.status !== ClinicalFormStatus.FINAL) {
      throw new DomainException(
        'Cannot transition to RECOVERY: Nurse intra-operative record must be finalized',
        {
          caseId,
          gate: 'NURSE_INTRAOP_RECORD',
          missingItems: ['Nurse intra-operative record not finalized'],
        }
      );
    }

    // Check safety-critical items in the finalized data
    let data: unknown;
    try {
      data = JSON.parse(intraOpRecord.data_json);
    } catch {
      throw new DomainException(
        'Cannot transition to RECOVERY: Nurse intra-operative record data is corrupted',
        { caseId, gate: 'NURSE_INTRAOP_RECORD' }
      );
    }

    const missingItems = checkNurseRecoveryGateCompliance(data as any);
    if (missingItems.length > 0) {
      throw new DomainException(
        `Cannot transition to RECOVERY: ${missingItems.length} safety item(s) incomplete in intra-op record`,
        {
          caseId,
          gate: 'NURSE_INTRAOP_RECORD',
          missingItems,
        }
      );
    }
  }

  /**
   * Enforce recovery nurse record gate for COMPLETED transition.
   *
   * Requirements:
   * - Recovery record must exist and be FINAL
   * - Discharge decision must not be HOLD
   * - All discharge criteria must be met (if not HOLD)
   *
   * Returns structured error with missingItems for the UI.
   */
  private async enforceRecoveryCompletedGate(caseId: string): Promise<void> {
    const recoveryRecord = await this.prisma.clinicalFormResponse.findUnique({
      where: {
        template_key_template_version_surgical_case_id: {
          template_key: RECOVERY_TEMPLATE_KEY,
          template_version: RECOVERY_TEMPLATE_VERSION,
          surgical_case_id: caseId,
        },
      },
      select: {
        status: true,
        data_json: true,
      },
    });

    // If no recovery record exists at all
    if (!recoveryRecord) {
      throw new DomainException(
        'Cannot transition to COMPLETED: Nurse recovery record has not been started',
        {
          caseId,
          gate: 'RECOVERY_DOCUMENTATION',
          missingItems: ['Nurse recovery record not started'],
        }
      );
    }

    // Record must be FINAL
    if (recoveryRecord.status !== ClinicalFormStatus.FINAL) {
      throw new DomainException(
        'Cannot transition to COMPLETED: Nurse recovery record must be finalized',
        {
          caseId,
          gate: 'RECOVERY_DOCUMENTATION',
          missingItems: ['Nurse recovery record not finalized'],
        }
      );
    }

    // Check gate items in the finalized data
    let data: unknown;
    try {
      data = JSON.parse(recoveryRecord.data_json);
    } catch {
      throw new DomainException(
        'Cannot transition to COMPLETED: Nurse recovery record data is corrupted',
        { caseId, gate: 'RECOVERY_DOCUMENTATION' }
      );
    }

    const missingGateItems = getCompletionGateItems(data as any);
    if (missingGateItems.length > 0) {
      throw new DomainException(
        `Cannot transition to COMPLETED: ${missingGateItems.length} recovery item(s) incomplete`,
        {
          caseId,
          gate: 'RECOVERY_DOCUMENTATION',
          missingItems: missingGateItems,
        }
      );
    }
  }

  // ==========================================================================
  // OPERATIVE TIMELINE (PROCEDURE RECORD TIMESTAMPS)
  // ==========================================================================

  async getTimeline(caseId: string): Promise<TimelineResultDto> {
    return this.timelineService.getTimeline(caseId);
  }

  async updateTimeline(
    caseId: string,
    timestamps: TimelinePatchInput,
    userId: string,
    userRole: string
  ): Promise<TimelineResultDto> {
    return this.timelineService.updateTimeline(caseId, timestamps, userId, userRole);
  }

  async updateProcedureTimestamps(
    caseId: string,
    timestamps: {
      anesthesiaStart?: string;
      incisionTime?: string;
      closureTime?: string;
      wheelsOut?: string;
    },
    userId: string,
    userRole: string
  ): Promise<ProcedureTimestampResultDto> {
    return this.timelineService.updateProcedureTimestamps(caseId, timestamps, userId, userRole);
  }

  async completeChecklistPhase(
    caseId: string,
    phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT',
    items: ChecklistItemConfirmation[],
    userId: string,
    userRole: string
  ): Promise<ChecklistStatusDto> {
    return this.checklistService.completeChecklistPhase(caseId, phase, items, userId, userRole);
  }

  async saveChecklistDraft(
    caseId: string,
    phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT',
    items: ChecklistItem[],
    userId: string,
    userRole: string
  ): Promise<ChecklistStatusDto> {
    return this.checklistService.saveChecklistDraft(caseId, phase, items, userId, userRole);
  }

  async finalizeChecklistPhase(
    caseId: string,
    phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT',
    items: ChecklistItem[],
    userId: string,
    userRole: string
  ): Promise<ChecklistStatusDto> {
    return this.checklistService.finalizeChecklistPhase(caseId, phase, items, userId, userRole);
  }

  async getChecklistStatus(caseId: string): Promise<ChecklistStatusDto> {
    return this.checklistService.getChecklistStatus(caseId);
  }
}
