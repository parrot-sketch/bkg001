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

import { PrismaClient, SurgicalCaseStatus } from '@prisma/client';
import { ISurgicalChecklistRepository } from '@/domain/interfaces/repositories/ISurgicalChecklistRepository';
import { IClinicalAuditRepository } from '@/domain/interfaces/repositories/IClinicalAuditRepository';
import { SurgicalCaseService } from '@/application/services/SurgicalCaseService';
import { DomainException } from '@/domain/exceptions/DomainException';
import {
  TheaterBoardDto,
  TheaterWithCasesDto,
  TheaterCaseDto,
  BoardSummaryDto,
  CaseTransitionResultDto,
  ProcedureTimestampResultDto,
  ChecklistStatusDto,
} from '@/application/dtos/TheaterTechDtos';
import { ChecklistItemConfirmation } from '@/domain/interfaces/repositories/ISurgicalChecklistRepository';

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
    private readonly auditRepo: IClinicalAuditRepository
  ) {}

  // ==========================================================================
  // TODAY BOARD
  // ==========================================================================

  /**
   * Build the day-of-operations board for a given date.
   * Returns cases grouped by theater, with full context for the UI.
   *
   * Performance: single query with includes (no N+1).
   */
  async getTodayBoard(date: Date): Promise<TheaterBoardDto> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch all active theaters with today's bookings and their surgical cases
    const theaters = await this.prisma.theater.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      include: {
        bookings: {
          where: {
            start_time: { gte: startOfDay, lt: endOfDay },
            status: { not: 'CANCELLED' },
          },
          orderBy: { start_time: 'asc' },
          include: {
            surgical_case: {
              include: {
                patient: {
                  select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    file_number: true,
                    date_of_birth: true,
                  },
                },
                primary_surgeon: {
                  select: {
                    id: true,
                    name: true,
                    specialization: true,
                  },
                },
                case_plan: {
                  select: {
                    readiness_status: true,
                    ready_for_surgery: true,
                    images: { select: { id: true } },
                    consents: { select: { id: true, signed_at: true, status: true } },
                    pre_op_notes: true,
                    risk_factors: true,
                    procedure_plan: true,
                    implant_details: true,
                  },
                },
                checklist: {
                  select: {
                    sign_in_completed_at: true,
                    time_out_completed_at: true,
                    sign_out_completed_at: true,
                  },
                },
                procedure_record: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    // Map to DTOs
    const theaterDtos: TheaterWithCasesDto[] = theaters.map((theater) => ({
      id: theater.id,
      name: theater.name,
      type: theater.type,
      colorCode: theater.color_code,
      cases: theater.bookings
        .filter((b) => b.surgical_case) // defensive
        .map((booking): TheaterCaseDto => {
          const sc = booking.surgical_case;
          const cp = sc.case_plan;

          // Calculate readiness percentage
          const readinessChecks = [
            !!cp?.pre_op_notes,
            !!cp?.risk_factors,
            (cp?.images?.length ?? 0) > 0,
            cp?.consents?.some((c) => c.signed_at !== null) ?? false,
            !!cp?.procedure_plan,
          ];
          const readinessPercentage = Math.round(
            (readinessChecks.filter(Boolean).length / readinessChecks.length) * 100
          );

          return {
            id: sc.id,
            status: sc.status,
            urgency: sc.urgency,
            procedureName: sc.procedure_name,
            diagnosis: sc.diagnosis,
            side: sc.side,
            patient: {
              id: sc.patient.id,
              fullName: `${sc.patient.first_name} ${sc.patient.last_name}`,
              fileNumber: sc.patient.file_number,
              dateOfBirth: sc.patient.date_of_birth,
            },
            primarySurgeon: {
              id: sc.primary_surgeon.id,
              name: sc.primary_surgeon.name,
              specialization: sc.primary_surgeon.specialization,
            },
            booking: {
              id: booking.id,
              startTime: booking.start_time,
              endTime: booking.end_time,
              status: booking.status,
            },
            readinessPercentage,
            readyForSurgery: cp?.ready_for_surgery ?? false,
            checklist: {
              signInCompleted: sc.checklist?.sign_in_completed_at !== null && sc.checklist?.sign_in_completed_at !== undefined,
              timeOutCompleted: sc.checklist?.time_out_completed_at !== null && sc.checklist?.time_out_completed_at !== undefined,
              signOutCompleted: sc.checklist?.sign_out_completed_at !== null && sc.checklist?.sign_out_completed_at !== undefined,
            },
            hasProcedureRecord: sc.procedure_record !== null,
          };
        }),
    }));

    // Build summary
    const allCases = theaterDtos.flatMap((t) => t.cases);
    const summary: BoardSummaryDto = {
      totalCases: allCases.length,
      scheduled: allCases.filter((c) => c.status === 'SCHEDULED').length,
      inPrep: allCases.filter((c) => c.status === 'IN_PREP').length,
      inTheater: allCases.filter((c) => c.status === 'IN_THEATER').length,
      inRecovery: allCases.filter((c) => c.status === 'RECOVERY').length,
      completed: allCases.filter((c) => c.status === 'COMPLETED').length,
    };

    return { theaters: theaterDtos, summary };
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
    await this.enforceChecklistGates(caseId, previousStatus, targetStatus);

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
   * IN_THEATER → RECOVERY: Sign-Out must be completed
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
        throw new DomainException(
          'Cannot transition to IN_THEATER: Sign-In checklist must be completed first',
          { caseId, gate: 'SIGN_IN' }
        );
      }
    }

    // Gate 2: Cannot enter RECOVERY without Sign-Out
    if (
      currentStatus === SurgicalCaseStatus.IN_THEATER &&
      targetStatus === SurgicalCaseStatus.RECOVERY
    ) {
      const signOutDone = await this.checklistRepo.isPhaseCompleted(caseId, 'SIGN_OUT');
      if (!signOutDone) {
        throw new DomainException(
          'Cannot transition to RECOVERY: Sign-Out checklist must be completed first',
          { caseId, gate: 'SIGN_OUT' }
        );
      }
    }
  }

  // ==========================================================================
  // PROCEDURE RECORD TIMESTAMPS
  // ==========================================================================

  /**
   * Set intra-operative timestamps on the procedure record.
   *
   * Rules:
   * - If a field is already set, it is NOT overwritten (idempotent).
   * - Each field update is individually audited.
   * - A procedure record is auto-created if it doesn't exist.
   */
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
    return this.prisma.$transaction(async (tx) => {
      // Ensure surgical case exists
      const surgicalCase = await tx.surgicalCase.findUnique({
        where: { id: caseId },
        select: { id: true, procedure_record: true },
      });
      if (!surgicalCase) {
        throw new DomainException('Surgical case not found', { caseId });
      }

      // Auto-create procedure record if missing
      let record = surgicalCase.procedure_record;
      if (!record) {
        // Need more data from the case for the required pre_op_diagnosis field
        const caseData = await tx.surgicalCase.findUniqueOrThrow({
          where: { id: caseId },
          select: { diagnosis: true, urgency: true },
        });

        record = await tx.surgicalProcedureRecord.create({
          data: {
            surgical_case_id: caseId,
            pre_op_diagnosis: caseData.diagnosis || 'See case plan',
            urgency: caseData.urgency,
          },
        });
      }

      // Build update payload — only set fields that are currently null (idempotent)
      const updateData: Record<string, Date> = {};
      const updatedFields: string[] = [];
      const skippedFields: string[] = [];

      const fieldMap: Record<string, { dbColumn: string; value?: string }> = {
        anesthesiaStart: { dbColumn: 'anesthesia_start', value: timestamps.anesthesiaStart },
        incisionTime: { dbColumn: 'incision_time', value: timestamps.incisionTime },
        closureTime: { dbColumn: 'closure_time', value: timestamps.closureTime },
        wheelsOut: { dbColumn: 'wheels_out', value: timestamps.wheelsOut },
      };

      for (const [key, { dbColumn, value }] of Object.entries(fieldMap)) {
        if (value === undefined) continue;

        const currentValue = record[dbColumn as keyof typeof record];
        if (currentValue !== null && currentValue !== undefined) {
          // Already set — idempotent skip
          skippedFields.push(key);
          continue;
        }

        updateData[dbColumn] = new Date(value);
        updatedFields.push(key);
      }

      // Perform update if there are fields to set
      if (Object.keys(updateData).length > 0) {
        record = await tx.surgicalProcedureRecord.update({
          where: { id: record.id },
          data: updateData,
        });
      }

      // Audit each updated field individually
      for (const field of updatedFields) {
        await this.auditRepo.record({
          actorUserId: userId,
          actionType: 'TIMESTAMP_SET',
          entityType: 'SurgicalProcedureRecord',
          entityId: String(record.id),
          metadata: {
            caseId,
            field,
            value: updateData[fieldMap[field].dbColumn]?.toISOString(),
            userRole,
          },
        });
      }

      // Audit skipped fields (already set, idempotent)
      if (skippedFields.length > 0) {
        await this.auditRepo.record({
          actorUserId: userId,
          actionType: 'TIMESTAMP_SKIP_IDEMPOTENT',
          entityType: 'SurgicalProcedureRecord',
          entityId: String(record.id),
          metadata: {
            caseId,
            skippedFields,
            reason: 'Fields already set — idempotent skip',
            userRole,
          },
        });
      }

      return {
        recordId: record.id,
        caseId,
        anesthesiaStart: record.anesthesia_start,
        incisionTime: record.incision_time,
        closureTime: record.closure_time,
        wheelsOut: record.wheels_out,
        updatedFields,
      };
    });
  }

  // ==========================================================================
  // CHECKLIST OPERATIONS
  // ==========================================================================

  /**
   * Complete a checklist phase with item confirmations.
   *
   * Idempotent: if phase is already completed, returns current status without mutation.
   * Audit trail is always written (even for idempotent no-ops).
   */
  async completeChecklistPhase(
    caseId: string,
    phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT',
    items: ChecklistItemConfirmation[],
    userId: string,
    userRole: string
  ): Promise<ChecklistStatusDto> {
    // Validate all items are confirmed
    const unconfirmed = items.filter((i) => !i.confirmed);
    if (unconfirmed.length > 0) {
      throw new DomainException(
        `Cannot complete ${phase}: ${unconfirmed.length} item(s) not confirmed`,
        { unconfirmedKeys: unconfirmed.map((i) => i.key) }
      );
    }

    // Ensure case exists
    const surgicalCase = await this.prisma.surgicalCase.findUnique({
      where: { id: caseId },
      select: { id: true },
    });
    if (!surgicalCase) {
      throw new DomainException('Surgical case not found', { caseId });
    }

    // Complete phase (idempotent)
    await this.checklistRepo.completePhase(caseId, phase, {
      userId,
      userRole,
      items,
    });

    // Audit
    await this.auditRepo.record({
      actorUserId: userId,
      actionType: `CHECKLIST_${phase}`,
      entityType: 'SurgicalChecklist',
      entityId: caseId,
      metadata: {
        phase,
        itemCount: items.length,
        userRole,
      },
    });

    return this.getChecklistStatus(caseId);
  }

  /**
   * Get full checklist status for a case.
   */
  async getChecklistStatus(caseId: string): Promise<ChecklistStatusDto> {
    const checklist = await this.checklistRepo.findByCaseId(caseId);

    const emptyPhase = {
      completed: false,
      completedAt: null,
      completedByUserId: null,
      completedByRole: null,
      items: null,
    };

    if (!checklist) {
      return {
        caseId,
        signIn: emptyPhase,
        timeOut: emptyPhase,
        signOut: emptyPhase,
      };
    }

    const parseItems = (raw: string | null): ChecklistItemConfirmation[] | null => {
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };

    return {
      caseId,
      signIn: {
        completed: checklist.sign_in_completed_at !== null,
        completedAt: checklist.sign_in_completed_at,
        completedByUserId: checklist.sign_in_by_user_id,
        completedByRole: checklist.sign_in_by_role,
        items: parseItems(checklist.sign_in_items),
      },
      timeOut: {
        completed: checklist.time_out_completed_at !== null,
        completedAt: checklist.time_out_completed_at,
        completedByUserId: checklist.time_out_by_user_id,
        completedByRole: checklist.time_out_by_role,
        items: parseItems(checklist.time_out_items),
      },
      signOut: {
        completed: checklist.sign_out_completed_at !== null,
        completedAt: checklist.sign_out_completed_at,
        completedByUserId: checklist.sign_out_by_user_id,
        completedByRole: checklist.sign_out_by_role,
        items: parseItems(checklist.sign_out_items),
      },
    };
  }
}
