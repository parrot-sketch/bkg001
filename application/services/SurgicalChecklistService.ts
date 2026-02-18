import { PrismaClient } from '@prisma/client';
import {
    ISurgicalChecklistRepository,
    ChecklistItemConfirmation
} from '@/domain/interfaces/repositories/ISurgicalChecklistRepository';
import { IClinicalAuditRepository } from '@/domain/interfaces/repositories/IClinicalAuditRepository';
import { DomainException } from '@/domain/exceptions/DomainException';
import {
    ChecklistStatusDto
} from '@/application/dtos/TheaterTechDtos';
import {
    type ChecklistItem,
    getFinalSchemaForPhase,
    getMissingItemsForPhase
} from '@/domain/clinical-forms/WhoSurgicalChecklist'; // I need to verify this path if it's correct or if I should copy it from TheaterTechService

export class SurgicalChecklistService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly checklistRepo: ISurgicalChecklistRepository,
        private readonly auditRepo: IClinicalAuditRepository
    ) { }

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
