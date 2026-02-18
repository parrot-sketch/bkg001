import { PrismaClient } from '@prisma/client';
import {
    DayboardDto,
    DayboardTheaterDto,
    DayboardCaseDto,
    DayboardSummaryDto,
    TheaterBoardDto,
    TheaterWithCasesDto,
    TheaterCaseDto,
    BoardSummaryDto
} from '@/application/dtos/TheaterTechDtos';
import {
    INTRAOP_TEMPLATE_KEY,
    INTRAOP_TEMPLATE_VERSION,
} from '@/domain/clinical-forms/NurseIntraOpRecord';
import {
    RECOVERY_TEMPLATE_KEY,
    RECOVERY_TEMPLATE_VERSION,
} from '@/domain/clinical-forms/NurseRecoveryRecord';
import {
    OPERATIVE_NOTE_TEMPLATE_KEY,
} from '@/domain/clinical-forms/SurgeonOperativeNote';
import {
    TEMPLATE_KEY as PREOP_TEMPLATE_KEY,
} from '@/domain/clinical-forms/NursePreopWardChecklist';

export class TheaterDashboardService {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Build the optimized day-of-operations board.
     */
    async getDayboard(date: Date, theaterId?: string): Promise<DayboardDto> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const dateStr = startOfDay.toISOString().split('T')[0];

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
                            },
                        },
                    },
                },
            },
        });

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

        const theaterMap = new Map<string, {
            theater: { id: string; name: string; type: string; color_code: string | null };
            cases: DayboardCaseDto[];
        }>();

        for (const booking of bookings) {
            const sc = booking.surgical_case;
            if (!sc) continue;

            const cp = sc.case_plan;

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

            const bs = blockerSummary.get(sc.id);
            const intraOpDiscrepancy = bs?.intraOpDiscrepancy ?? false;
            const dischargeReady = bs?.dischargeReady ?? false;

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

        const theaters: DayboardTheaterDto[] = Array.from(theaterMap.values())
            .sort((a, b) => a.theater.name.localeCompare(b.theater.name))
            .map(({ theater, cases }) => ({
                id: theater.id,
                name: theater.name,
                type: theater.type,
                colorCode: theater.color_code,
                cases,
            }));

        const allCases = theaters.flatMap((t) => t.cases);
        const DELAY_THRESHOLD_MS = 10 * 60 * 1000;
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

    /**
     * Build the day-of-operations board for a given date.
     */
    async getTodayBoard(date: Date): Promise<TheaterBoardDto> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

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

        const theaterDtos: TheaterWithCasesDto[] = theaters.map((theater) => ({
            id: theater.id,
            name: theater.name,
            type: theater.type,
            colorCode: theater.color_code,
            cases: theater.bookings
                .filter((b) => b.surgical_case)
                .map((booking): TheaterCaseDto => {
                    const sc = booking.surgical_case!;
                    const cp = sc.case_plan;

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
}
