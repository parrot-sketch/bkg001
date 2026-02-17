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
    private readonly auditRepo: IClinicalAuditRepository
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
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const dateStr = startOfDay.toISOString().split('T')[0];

    // Single optimized query: bookings → cases → all related data
    const bookings = await this.prisma.theaterBooking.findMany({
      where: {
        start_time: { gte: startOfDay, lt: endOfDay },
        status: { not: 'CANCELLED' },
        ...(theaterId ? { theater_id: theaterId } : {}),
      },
      orderBy: { start_time: 'asc' },
      select: {
        id: true,
        start_time: true,
        end_time: true,
        status: true,
        theater: {
          select: {
            id: true,
            name: true,
            type: true,
            color_code: true,
          },
        },
        surgical_case: {
          select: {
            id: true,
            status: true,
            urgency: true,
            procedure_name: true,
            side: true,
            patient: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                file_number: true,
                allergies: true,
              },
            },
            primary_surgeon: {
              select: {
                id: true,
                name: true,
              },
            },
            case_plan: {
              select: {
                ready_for_surgery: true,
                readiness_status: true,
                estimated_duration_minutes: true,
                procedure_plan: true,
                risk_factors: true,
                planned_anesthesia: true,
                images: { select: { id: true, timepoint: true } },
                consents: { select: { id: true, status: true, signed_at: true } },
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
              select: {
                id: true,
                wheels_in: true,
                anesthesia_start: true,
                anesthesia_end: true,
                incision_time: true,
                closure_time: true,
                wheels_out: true,
              },
            },
            clinical_forms: {
              where: {
                template_key: { in: [PREOP_TEMPLATE_KEY, INTRAOP_TEMPLATE_KEY, RECOVERY_TEMPLATE_KEY, OPERATIVE_NOTE_TEMPLATE_KEY] },
              },
              select: {
                template_key: true,
                status: true,
                // data_json intentionally NOT fetched here — see blocker summary query below
              },
            },
          },
        },
      },
    });

    // ── Blocker summary query ────────────────────────────────────────
    // Fetch data_json ONLY for the forms that need JSON parsing:
    //   - Intra-op (FINAL) → counts.countDiscrepancy
    //   - Recovery (FINAL) → dischargeReadiness
    // This avoids fetching large preop/draft JSONs that the dayboard never parses.
    const caseIds = bookings
      .map((b) => b.surgical_case?.id)
      .filter((id): id is string => !!id);

    const blockerForms = caseIds.length > 0
      ? await this.prisma.clinicalFormResponse.findMany({
        where: {
          surgical_case_id: { in: caseIds },
          template_key: { in: [INTRAOP_TEMPLATE_KEY, RECOVERY_TEMPLATE_KEY] },
          status: 'FINAL',
        },
        select: {
          surgical_case_id: true,
          template_key: true,
          data_json: true,
        },
      })
      : [];

    // Build lookup: caseId → { intraOpDiscrepancy, dischargeReady }
    const blockerSummary = new Map<string, { intraOpDiscrepancy: boolean; dischargeReady: boolean }>();
    for (const form of blockerForms) {
      const entry = blockerSummary.get(form.surgical_case_id) ?? { intraOpDiscrepancy: false, dischargeReady: false };

      if (form.template_key === INTRAOP_TEMPLATE_KEY) {
        try {
          const d = JSON.parse(form.data_json);
          entry.intraOpDiscrepancy = d?.counts?.countCorrect === false;
        } catch { /* corrupted data */ }
      } else if (form.template_key === RECOVERY_TEMPLATE_KEY) {
        try {
          const d = JSON.parse(form.data_json);
          const dr = d?.dischargeReadiness;
          const decision = dr?.dischargeDecision;
          const c = dr?.dischargeCriteria ?? {};
          entry.dischargeReady =
            decision !== 'HOLD' &&
            !!decision &&
            !!c.vitalsStable &&
            !!c.painControlled &&
            !!c.nauseaControlled &&
            !!c.bleedingControlled &&
            !!c.airwayStable;
        } catch { /* corrupted data */ }
      }

      blockerSummary.set(form.surgical_case_id, entry);
    }

    // Group bookings by theater
    const theaterMap = new Map<string, {
      theater: { id: string; name: string; type: string; color_code: string | null };
      cases: DayboardCaseDto[];
    }>();

    for (const booking of bookings) {
      const sc = booking.surgical_case;
      if (!sc) continue; // defensive

      const cp = sc.case_plan;

      // Compute doctor planning missing count
      let doctorPlanningMissingCount = 0;
      if (!cp?.procedure_plan || cp.procedure_plan.trim().length === 0) doctorPlanningMissingCount++;
      if (!cp?.risk_factors || cp.risk_factors.trim().length === 0) doctorPlanningMissingCount++;
      if (!cp?.planned_anesthesia || cp.planned_anesthesia.trim().length === 0) doctorPlanningMissingCount++;
      const preOpPhotos = cp?.images?.filter(
        (img: { timepoint: string }) => img.timepoint === 'PRE_OP'
      ) ?? [];
      if (preOpPhotos.length === 0) doctorPlanningMissingCount++;
      const signedConsents = cp?.consents?.filter(
        (c: { signed_at: Date | null }) => c.signed_at !== null
      ) ?? [];
      if (signedConsents.length === 0) doctorPlanningMissingCount++;

      // Clinical forms (status only — no data_json in main query)
      const preopForm = sc.clinical_forms?.find(
        (f: { template_key: string }) => f.template_key === PREOP_TEMPLATE_KEY
      );
      const intraopForm = sc.clinical_forms?.find(
        (f: { template_key: string }) => f.template_key === INTRAOP_TEMPLATE_KEY
      );
      const recoveryForm = sc.clinical_forms?.find(
        (f: { template_key: string }) => f.template_key === RECOVERY_TEMPLATE_KEY
      );
      const operativeNoteForm = sc.clinical_forms?.find(
        (f: { template_key: string }) => f.template_key === OPERATIVE_NOTE_TEMPLATE_KEY
      );

      // Blocker flags from the lean second query
      const bs = blockerSummary.get(sc.id);
      const intraOpDiscrepancy = bs?.intraOpDiscrepancy ?? false;
      const dischargeReady = bs?.dischargeReady ?? false;

      // Compute blocker level
      const isPreDay = ['DRAFT', 'PLANNING', 'READY_FOR_SCHEDULING', 'SCHEDULED'].includes(sc.status);
      const isIntraDay = ['IN_PREP', 'IN_THEATER'].includes(sc.status);
      const isRecovery = sc.status === 'RECOVERY';
      let blockerLevel: 'clear' | 'warning' | 'blocked' = 'clear';

      if (isPreDay) {
        if (doctorPlanningMissingCount > 0 || !cp?.ready_for_surgery || preopForm?.status !== 'FINAL') {
          blockerLevel = doctorPlanningMissingCount > 2 ? 'blocked' : 'warning';
        }
      } else if (isIntraDay) {
        if (intraOpDiscrepancy) {
          blockerLevel = 'blocked';
        } else if (intraopForm?.status !== 'FINAL') {
          blockerLevel = 'warning';
        }
      } else if (isRecovery) {
        if (recoveryForm?.status !== 'FINAL') {
          blockerLevel = recoveryForm?.status === 'DRAFT' ? 'warning' : 'blocked';
        } else if (!dischargeReady) {
          blockerLevel = 'blocked';
        }
      }

      const caseDto: DayboardCaseDto = {
        id: sc.id,
        status: sc.status,
        urgency: sc.urgency,
        procedureName: sc.procedure_name,
        side: sc.side,
        estimatedDurationMinutes: cp?.estimated_duration_minutes ?? null,
        patient: {
          id: sc.patient.id,
          fullName: `${sc.patient.first_name} ${sc.patient.last_name}`,
          fileNumber: sc.patient.file_number,
          hasAllergies: !!sc.patient.allergies && sc.patient.allergies.trim().length > 0,
        },
        primarySurgeon: {
          id: sc.primary_surgeon.id,
          name: sc.primary_surgeon.name,
        },
        booking: {
          id: booking.id,
          theaterName: booking.theater.name,
          startTime: booking.start_time.toISOString(),
          endTime: booking.end_time.toISOString(),
          status: booking.status,
        },
        blockers: {
          doctorPlanningMissingCount,
          doctorPlanReady: cp?.ready_for_surgery ?? false,
          nursePreopStatus: preopForm?.status ?? null,
          consentsSignedCount: signedConsents.length,
          consentsTotalCount: cp?.consents?.length ?? 0,
          preOpPhotosCount: preOpPhotos.length,
          nurseIntraOpStatus: intraopForm?.status ?? null,
          intraOpDiscrepancy,
          nurseRecoveryStatus: recoveryForm?.status ?? null,
          dischargeReady,
          operativeNoteStatus: operativeNoteForm?.status ?? null,
          level: blockerLevel,
        },
        checklist: {
          signInCompleted: sc.checklist?.sign_in_completed_at != null,
          timeOutCompleted: sc.checklist?.time_out_completed_at != null,
          signOutCompleted: sc.checklist?.sign_out_completed_at != null,
        },
        hasProcedureRecord: sc.procedure_record != null,
        timeline: sc.procedure_record
          ? {
            wheelsIn: sc.procedure_record.wheels_in?.toISOString() ?? null,
            anesthesiaStart: sc.procedure_record.anesthesia_start?.toISOString() ?? null,
            anesthesiaEnd: sc.procedure_record.anesthesia_end?.toISOString() ?? null,
            incisionTime: sc.procedure_record.incision_time?.toISOString() ?? null,
            closureTime: sc.procedure_record.closure_time?.toISOString() ?? null,
            wheelsOut: sc.procedure_record.wheels_out?.toISOString() ?? null,
          }
          : null,
      };

      const tid = booking.theater.id;
      if (!theaterMap.has(tid)) {
        theaterMap.set(tid, {
          theater: booking.theater,
          cases: [],
        });
      }
      theaterMap.get(tid)!.cases.push(caseDto);
    }

    // Build theater array sorted by name
    const theaters: DayboardTheaterDto[] = Array.from(theaterMap.values())
      .sort((a, b) => a.theater.name.localeCompare(b.theater.name))
      .map(({ theater, cases }) => ({
        id: theater.id,
        name: theater.name,
        type: theater.type,
        colorCode: theater.color_code,
        cases, // already sorted by start_time from query
      }));

    // Build summary with timeline metrics
    const allCases = theaters.flatMap((t) => t.cases);

    // Compute OR time metrics
    const DELAY_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
    const orTimes: number[] = [];
    let delayedStartCount = 0;
    const utilizationByTheater: Record<string, number> = {};

    for (const theater of theaters) {
      let theaterOrMinutes = 0;
      for (const c of theater.cases) {
        if (c.timeline?.wheelsIn && c.timeline?.wheelsOut) {
          const wi = new Date(c.timeline.wheelsIn).getTime();
          const wo = new Date(c.timeline.wheelsOut).getTime();
          const orMins = Math.round((wo - wi) / 60_000);
          if (orMins > 0) {
            orTimes.push(orMins);
            theaterOrMinutes += orMins;
          }
        }
        // Delayed start: wheelsIn > booking start + threshold
        if (c.timeline?.wheelsIn) {
          const bookingStart = new Date(c.booking.startTime).getTime();
          const wheelsIn = new Date(c.timeline.wheelsIn).getTime();
          if (wheelsIn > bookingStart + DELAY_THRESHOLD_MS) {
            delayedStartCount++;
          }
        }
      }
      if (theaterOrMinutes > 0) {
        utilizationByTheater[theater.id] = theaterOrMinutes;
      }
    }

    const avgOrTimeMinutes =
      orTimes.length > 0
        ? Math.round(orTimes.reduce((s, v) => s + v, 0) / orTimes.length)
        : null;

    const summary: DayboardSummaryDto = {
      totalCases: allCases.length,
      scheduled: allCases.filter((c) => c.status === 'SCHEDULED').length,
      inPrep: allCases.filter((c) => c.status === 'IN_PREP').length,
      inTheater: allCases.filter((c) => c.status === 'IN_THEATER').length,
      inRecovery: allCases.filter((c) => c.status === 'RECOVERY').length,
      completed: allCases.filter((c) => c.status === 'COMPLETED').length,
      avgOrTimeMinutes,
      delayedStartCount,
      utilizationByTheater,
    };

    return { theaters, summary, date: dateStr };
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

  /**
   * Get the operative timeline for a surgical case.
   * Returns timestamps, derived durations, and missing-items warnings.
   */
  async getTimeline(caseId: string): Promise<TimelineResultDto> {
    const surgicalCase = await this.prisma.surgicalCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        status: true,
        procedure_record: {
          select: {
            id: true,
            wheels_in: true,
            anesthesia_start: true,
            anesthesia_end: true,
            incision_time: true,
            closure_time: true,
            wheels_out: true,
          },
        },
      },
    });

    if (!surgicalCase) {
      throw new DomainException('Surgical case not found', { caseId });
    }

    if (!surgicalCase.procedure_record) {
      // No procedure record yet — return empty timeline
      const emptyTimeline: OperativeTimeline = {
        wheelsIn: null, anesthesiaStart: null, anesthesiaEnd: null,
        incisionTime: null, closureTime: null, wheelsOut: null,
      };
      return {
        caseId,
        caseStatus: surgicalCase.status,
        timeline: timelineToDto(emptyTimeline),
        durations: computeDerivedDurations(emptyTimeline),
        missingItems: getMissingTimelineItemsForStatus(surgicalCase.status, emptyTimeline),
      };
    }

    const timeline = dbRecordToTimeline(surgicalCase.procedure_record);
    return {
      caseId,
      caseStatus: surgicalCase.status,
      timeline: timelineToDto(timeline),
      durations: computeDerivedDurations(timeline),
      missingItems: getMissingTimelineItemsForStatus(surgicalCase.status, timeline),
    };
  }

  /**
   * Update operative timeline timestamps on the procedure record.
   *
   * Rules:
   * - Partial updates: one or more timestamps at a time.
   * - Existing non-null values ARE overwritten (allows corrections).
   * - Chronological validation is enforced on the result.
   * - Each field update is individually audited.
   * - A procedure record is auto-created if it doesn't exist.
   */
  async updateTimeline(
    caseId: string,
    timestamps: TimelinePatchInput,
    userId: string,
    userRole: string
  ): Promise<TimelineResultDto> {
    return this.prisma.$transaction(async (tx) => {
      // Ensure surgical case exists
      const surgicalCase = await tx.surgicalCase.findUnique({
        where: { id: caseId },
        select: {
          id: true,
          status: true,
          procedure_record: {
            select: {
              id: true,
              wheels_in: true,
              anesthesia_start: true,
              anesthesia_end: true,
              incision_time: true,
              closure_time: true,
              wheels_out: true,
            },
          },
        },
      });
      if (!surgicalCase) {
        throw new DomainException('Surgical case not found', { caseId });
      }

      // Auto-create procedure record if missing
      let record = surgicalCase.procedure_record;
      if (!record) {
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
          select: {
            id: true,
            wheels_in: true,
            anesthesia_start: true,
            anesthesia_end: true,
            incision_time: true,
            closure_time: true,
            wheels_out: true,
          },
        });
      }

      // Snapshot the "before" timeline for old/new audit trail
      const previousTimeline: OperativeTimeline = dbRecordToTimeline(record!);

      // Build the "proposed" timeline: merge current + incoming
      const proposedTimeline: OperativeTimeline = { ...previousTimeline };
      const updatedFields: string[] = [];

      for (const field of TIMELINE_FIELD_ORDER) {
        const incoming = timestamps[field];
        if (incoming !== undefined) {
          proposedTimeline[field] = new Date(incoming);
          updatedFields.push(field);
        }
      }

      // Validate chronological order on the merged result
      const validation = validateTimeline(proposedTimeline);
      if (!validation.valid) {
        // Audit the invalid attempt
        await this.auditRepo.record({
          actorUserId: userId,
          actionType: 'TIMELINE_INVALID_ATTEMPT',
          entityType: 'SurgicalProcedureRecord',
          entityId: String(record!.id),
          metadata: {
            caseId,
            errors: validation.errors,
            attempted: timestamps,
            userRole,
          },
        });

        throw new DomainException('Timeline validation failed', {
          caseId,
          errors: validation.errors,
        });
      }

      // Build DB update payload
      const updateData: Record<string, Date> = {};
      for (const field of updatedFields) {
        const dbCol = FIELD_TO_DB_COLUMN[field as TimelineFieldName];
        updateData[dbCol] = proposedTimeline[field as TimelineFieldName]!;
      }

      // Perform update
      if (Object.keys(updateData).length > 0) {
        record = await tx.surgicalProcedureRecord.update({
          where: { id: record!.id },
          data: updateData,
        }) as typeof record;
      }

      // Audit each updated field with old/new values
      for (const field of updatedFields) {
        const dbCol = FIELD_TO_DB_COLUMN[field as TimelineFieldName];
        const oldValue = previousTimeline[field as TimelineFieldName];
        const newValue = updateData[dbCol];
        await this.auditRepo.record({
          actorUserId: userId,
          actionType: 'TIMELINE_UPDATED',
          entityType: 'SurgicalProcedureRecord',
          entityId: String(record!.id),
          metadata: {
            caseId,
            field,
            oldValue: oldValue?.toISOString() ?? null,
            newValue: newValue?.toISOString() ?? null,
            userRole,
          },
        });
      }

      const finalTimeline = dbRecordToTimeline(record!);
      return {
        caseId,
        caseStatus: surgicalCase.status,
        timeline: timelineToDto(finalTimeline),
        durations: computeDerivedDurations(finalTimeline),
        missingItems: getMissingTimelineItemsForStatus(surgicalCase.status, finalTimeline),
      };
    });
  }

  /**
   * Legacy method — kept for backward compatibility with existing PATCH endpoint.
   * Delegates to updateTimeline internally.
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
    const result = await this.updateTimeline(caseId, timestamps, userId, userRole);
    return {
      recordId: 0, // Legacy field — not meaningful for new callers
      caseId,
      anesthesiaStart: result.timeline.anesthesiaStart ? new Date(result.timeline.anesthesiaStart) : null,
      incisionTime: result.timeline.incisionTime ? new Date(result.timeline.incisionTime) : null,
      closureTime: result.timeline.closureTime ? new Date(result.timeline.closureTime) : null,
      wheelsOut: result.timeline.wheelsOut ? new Date(result.timeline.wheelsOut) : null,
      updatedFields: [],
    };
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
   * Save checklist draft items for a specific phase.
   *
   * Saves partial confirmations without finalizing. Cannot save if phase
   * is already finalized.
   */
  async saveChecklistDraft(
    caseId: string,
    phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT',
    items: ChecklistItem[],
    userId: string,
    userRole: string
  ): Promise<ChecklistStatusDto> {
    // Ensure case exists
    const surgicalCase = await this.prisma.surgicalCase.findUnique({
      where: { id: caseId },
      select: { id: true },
    });
    if (!surgicalCase) {
      throw new DomainException('Surgical case not found', { caseId });
    }

    // Check if phase already finalized
    const isCompleted = await this.checklistRepo.isPhaseCompleted(caseId, phase);
    if (isCompleted) {
      throw new DomainException(
        `${phase} is already finalized and cannot be edited`,
        { caseId, phase }
      );
    }

    // Save draft items (repo handles ensureExists)
    await this.checklistRepo.saveDraftItems(caseId, phase, items);

    // Audit draft save
    await this.auditRepo.record({
      actorUserId: userId,
      actionType: `CHECKLIST_${phase}_DRAFT`,
      entityType: 'SurgicalChecklist',
      entityId: caseId,
      metadata: {
        phase,
        itemCount: items.length,
        confirmedCount: items.filter((i) => i.confirmed).length,
        userRole,
      },
    });

    return this.getChecklistStatus(caseId);
  }

  /**
   * Finalize a checklist phase with WHO validation.
   *
   * Validates all required WHO items are present and confirmed.
   * On success: marks phase as completed with timestamp and signature.
   * On failure: returns structured missingItems.
   *
   * Idempotent: if already finalized, returns current status.
   */
  async finalizeChecklistPhase(
    caseId: string,
    phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT',
    items: ChecklistItem[],
    userId: string,
    userRole: string
  ): Promise<ChecklistStatusDto> {
    // Validate against WHO final schema
    const schema = getFinalSchemaForPhase(phase);
    const validation = schema.safeParse({ items });

    if (!validation.success) {
      const missingItems = getMissingItemsForPhase(phase, items);
      throw new DomainException(
        `Cannot finalize ${phase}: ${missingItems.length} required item(s) not confirmed`,
        {
          caseId,
          gate: `WHO_CHECKLIST_${phase}`,
          blockingCategory: 'WHO_CHECKLIST',
          missingItems,
        }
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

    // Complete phase (idempotent via repo)
    await this.checklistRepo.completePhase(caseId, phase, {
      userId,
      userRole,
      items,
    });

    // Audit finalization
    const eventMap = {
      SIGN_IN: 'CHECKLIST_SIGNIN_FINALIZED',
      TIME_OUT: 'CHECKLIST_TIMEOUT_FINALIZED',
      SIGN_OUT: 'CHECKLIST_SIGNOUT_FINALIZED',
    } as const;

    await this.auditRepo.record({
      actorUserId: userId,
      actionType: eventMap[phase],
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
