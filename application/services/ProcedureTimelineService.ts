import { PrismaClient } from '@prisma/client';
import { IClinicalAuditRepository } from '@/domain/interfaces/repositories/IClinicalAuditRepository';
import { DomainException } from '@/domain/exceptions/DomainException';
import {
    TimelineResultDto,
    ProcedureTimestampResultDto
} from '@/application/dtos/TheaterTechDtos';
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

export class ProcedureTimelineService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly auditRepo: IClinicalAuditRepository
    ) { }

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
     */
    async updateTimeline(
        caseId: string,
        timestamps: TimelinePatchInput,
        userId: string,
        userRole: string
    ): Promise<TimelineResultDto> {
        return this.prisma.$transaction(async (tx) => {
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

            const previousTimeline: OperativeTimeline = dbRecordToTimeline(record!);
            const proposedTimeline: OperativeTimeline = { ...previousTimeline };
            const updatedFields: string[] = [];

            for (const field of TIMELINE_FIELD_ORDER) {
                const incoming = timestamps[field];
                if (incoming !== undefined) {
                    proposedTimeline[field] = incoming ? new Date(incoming) : null;
                    updatedFields.push(field);
                }
            }

            const validation = validateTimeline(proposedTimeline);
            if (!validation.valid) {
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

            const updateData: Record<string, Date | null> = {};
            for (const field of updatedFields) {
                const dbCol = FIELD_TO_DB_COLUMN[field as TimelineFieldName];
                updateData[dbCol] = proposedTimeline[field as TimelineFieldName];
            }

            if (Object.keys(updateData).length > 0) {
                record = await tx.surgicalProcedureRecord.update({
                    where: { id: record!.id },
                    data: updateData,
                }) as typeof record;
            }

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
                        newValue: newValue instanceof Date ? newValue.toISOString() : null,
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
     * Backward compatibility method.
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
            recordId: 0,
            caseId,
            anesthesiaStart: result.timeline.anesthesiaStart ? new Date(result.timeline.anesthesiaStart) : null,
            incisionTime: result.timeline.incisionTime ? new Date(result.timeline.incisionTime) : null,
            closureTime: result.timeline.closureTime ? new Date(result.timeline.closureTime) : null,
            wheelsOut: result.timeline.wheelsOut ? new Date(result.timeline.wheelsOut) : null,
            updatedFields: [],
        };
    }
}
