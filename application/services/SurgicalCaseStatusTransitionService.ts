/**
 * Service: SurgicalCaseStatusTransitionService
 *
 * Centralized service for surgical case status transitions.
 * Handles automatic transitions based on workflow events (form completion, etc.)
 *
 * This service ensures:
 * - All transitions are validated
 * - Audit trail is maintained
 * - Status changes are atomic
 */

import { PrismaClient, SurgicalCaseStatus } from '@prisma/client';
import { getSurgicalCaseService } from '@/lib/factories/theaterTechFactory';

export class SurgicalCaseStatusTransitionService {
    constructor(private db: PrismaClient) {}

    /**
     * Transition case to IN_WARD_PREP when the pre-op ward checklist is started.
     * This reflects that the nurse has begun ward prep work.
     */
    async transitionToInWardPrep(caseId: string, userId: string): Promise<void> {
        const surgicalCase = await this.db.surgicalCase.findUnique({
            where: { id: caseId },
            select: { id: true, status: true },
        });

        if (!surgicalCase) {
            throw new Error(`Surgical case ${caseId} not found`);
        }

        if (surgicalCase.status === SurgicalCaseStatus.READY_FOR_WARD_PREP) {
            const service = getSurgicalCaseService();
            await service.transitionTo(caseId, SurgicalCaseStatus.IN_WARD_PREP, userId);

            await this.db.auditLog.create({
                data: {
                    user_id: userId,
                    record_id: caseId,
                    action: 'UPDATE',
                    model: 'SurgicalCase',
                    details: `Case status transitioned to IN_WARD_PREP (pre-op ward checklist started)`,
                },
            });
        }
    }

    /**
     * Transition case to IN_PREP when pre-op checklist is started
     * Only transitions if case is currently SCHEDULED
     */
    async transitionToInPrep(caseId: string, userId: string): Promise<void> {
        const surgicalCase = await this.db.surgicalCase.findUnique({
            where: { id: caseId },
            select: { id: true, status: true },
        });

        if (!surgicalCase) {
            throw new Error(`Surgical case ${caseId} not found`);
        }

        // Only transition if currently SCHEDULED
        if (surgicalCase.status === SurgicalCaseStatus.SCHEDULED) {
            const service = getSurgicalCaseService();
            await service.transitionTo(caseId, SurgicalCaseStatus.IN_PREP, userId);

            // Audit log
            await this.db.auditLog.create({
                data: {
                    user_id: userId,
                    record_id: caseId,
                    action: 'UPDATE',
                    model: 'SurgicalCase',
                    details: `Case status transitioned to IN_PREP (pre-op checklist started)`,
                },
            });
        }
    }

    /**
     * Transition case to READY_FOR_THEATER_BOOKING when pre-op checklist is finalized
     * Transitions from:
     *   - IN_PREP → READY_FOR_THEATER_BOOKING (standard workflow)
     *   - READY_FOR_SCHEDULING → READY_FOR_THEATER_BOOKING (direct from doctor plan)
     * This indicates patient is physically ready and frontdesk can now book theater
     */
    async transitionToReadyForTheater(caseId: string, userId: string): Promise<void> {
        const surgicalCase = await this.db.surgicalCase.findUnique({
            where: { id: caseId },
            select: { id: true, status: true },
        });

        if (!surgicalCase) {
            throw new Error(`Surgical case ${caseId} not found`);
        }

        const service = getSurgicalCaseService();

        // If checklist was completed but the case never moved into IN_WARD_PREP (legacy),
        // normalize first so we can reach READY_FOR_THEATER_BOOKING safely.
        if (surgicalCase.status === SurgicalCaseStatus.READY_FOR_WARD_PREP) {
            await service.transitionTo(caseId, SurgicalCaseStatus.IN_WARD_PREP, userId);
        }

        // Handle transition from IN_WARD_PREP, IN_PREP, or SCHEDULED
        const canTransition =
            surgicalCase.status === SurgicalCaseStatus.IN_WARD_PREP ||
            surgicalCase.status === SurgicalCaseStatus.IN_PREP ||
            surgicalCase.status === SurgicalCaseStatus.SCHEDULED ||
            surgicalCase.status === SurgicalCaseStatus.READY_FOR_WARD_PREP;

        if (canTransition) {
            await service.transitionTo(caseId, SurgicalCaseStatus.READY_FOR_THEATER_BOOKING, userId);

            // Audit log
            await this.db.auditLog.create({
                data: {
                    user_id: userId,
                    record_id: caseId,
                    action: 'UPDATE',
                    model: 'SurgicalCase',
                    details: `Pre-op checklist finalized - case ready for theater booking (from ${surgicalCase.status})`,
                },
            });
        }
    }

    /**
     * Transition case to IN_THEATER when patient enters theater
     * Only transitions if case is currently IN_PREP
     */
    async transitionToInTheater(caseId: string, userId: string): Promise<void> {
        const surgicalCase = await this.db.surgicalCase.findUnique({
            where: { id: caseId },
            select: { id: true, status: true },
        });

        if (!surgicalCase) {
            throw new Error(`Surgical case ${caseId} not found`);
        }

        // Only transition if currently IN_PREP
        if (surgicalCase.status === SurgicalCaseStatus.IN_PREP) {
            const service = getSurgicalCaseService();
            await service.transitionTo(caseId, SurgicalCaseStatus.IN_THEATER, userId);

            // Audit log
            await this.db.auditLog.create({
                data: {
                    user_id: userId,
                    record_id: caseId,
                    action: 'UPDATE',
                    model: 'SurgicalCase',
                    details: `Case status transitioned to IN_THEATER (patient entered theater)`,
                },
            });
        }
    }

    /**
     * Transition case to RECOVERY when intra-op record is finalized
     * Only transitions if case is currently IN_THEATER
     */
    async transitionToRecovery(caseId: string, userId: string): Promise<void> {
        const surgicalCase = await this.db.surgicalCase.findUnique({
            where: { id: caseId },
            select: { id: true, status: true },
        });

        if (!surgicalCase) {
            throw new Error(`Surgical case ${caseId} not found`);
        }

        // Allow transition from IN_THEATER or IN_PREP (nurse may still be in prep)
        const canTransition =
            surgicalCase.status === SurgicalCaseStatus.IN_THEATER ||
            surgicalCase.status === SurgicalCaseStatus.IN_PREP;

        if (canTransition) {
            const service = getSurgicalCaseService();
            await service.transitionTo(caseId, SurgicalCaseStatus.RECOVERY, userId);

            // Audit log
            await this.db.auditLog.create({
                data: {
                    user_id: userId,
                    record_id: caseId,
                    action: 'UPDATE',
                    model: 'SurgicalCase',
                    details: `Case status transitioned to RECOVERY (intra-op record finalized)`,
                },
            });
        } else {
            // Log for debugging instead of silently failing
            console.warn(
                `[transitionToRecovery] Case ${caseId} is ${surgicalCase.status}, expected IN_THEATER or IN_PREP. Skipping transition.`
            );
        }
    }

    /**
     * Transition case to COMPLETED when recovery record is finalized
     * Only transitions if case is currently RECOVERY
     */
    async transitionToCompleted(caseId: string, userId: string): Promise<void> {
        const surgicalCase = await this.db.surgicalCase.findUnique({
            where: { id: caseId },
            select: { id: true, status: true },
        });

        if (!surgicalCase) {
            throw new Error(`Surgical case ${caseId} not found`);
        }

        // Only transition if currently RECOVERY
        if (surgicalCase.status === SurgicalCaseStatus.RECOVERY) {
            const service = getSurgicalCaseService();
            await service.transitionTo(caseId, SurgicalCaseStatus.COMPLETED, userId);

            // Audit log
            await this.db.auditLog.create({
                data: {
                    user_id: userId,
                    record_id: caseId,
                    action: 'UPDATE',
                    model: 'SurgicalCase',
                    details: `Case status transitioned to COMPLETED (recovery record finalized)`,
                },
            });
        }
    }
}
