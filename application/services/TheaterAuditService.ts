import { PrismaClient } from '@prisma/client';

export class TheaterAuditService {
    constructor(private prisma: PrismaClient) {}

    /**
     * Log theater slot lock creation
     */
    async logSlotLocked(
        userId: string,
        caseId: string,
        theaterName: string,
        startTime: Date,
        endTime: Date
    ): Promise<void> {
        const { format } = await import('date-fns');
        
        await this.prisma.auditLog.create({
            data: {
                user_id: userId,
                record_id: caseId,
                action: 'THEATER_SLOT_LOCKED',
                model: 'SurgicalCase',
                details: `Provisional lock created for theater: ${theaterName}. Slot: ${format(startTime, 'yyyy-MM-dd HH:mm')} - ${format(endTime, 'HH:mm')}`,
            },
        });
    }

    /**
     * Log booking confirmation
     */
    async logBookingConfirmed(
        userId: string,
        caseId: string,
        theaterName: string,
        feeAmount: number
    ): Promise<void> {
        await this.prisma.auditLog.create({
            data: {
                user_id: userId,
                record_id: caseId,
                action: 'THEATER_BOOKING_CONFIRMED',
                model: 'SurgicalCase',
                details: `Theater booking confirmed. Theater: ${theaterName}. Fee: KES ${feeAmount}. Case status: SCHEDULED`,
            },
        });
    }

    /**
     * Log booking cancellation
     */
    async logBookingCancelled(
        userId: string,
        caseId: string,
        reason: string | undefined,
        reversedAmount: number
    ): Promise<void> {
        await this.prisma.auditLog.create({
            data: {
                user_id: userId,
                record_id: caseId,
                action: 'THEATER_BOOKING_CANCELLED',
                model: 'SurgicalCase',
                details: `Theater booking cancelled. Reason: ${reason || 'Not provided'}. Billing reversed: KES ${reversedAmount}`,
            },
        });
    }

    /**
     * Log surgical case status transition
     */
    async logStatusTransition(
        userId: string,
        caseId: string,
        fromStatus: string,
        toStatus: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        await this.prisma.clinicalAuditEvent.create({
            data: {
                actor_user_id: userId,
                action_type: 'STATUS_TRANSITION',
                entity_type: 'SurgicalCase',
                entity_id: caseId,
                metadata: JSON.stringify({
                    from_status: fromStatus,
                    to_status: toStatus,
                    ...metadata,
                }),
            },
        });
    }
}
