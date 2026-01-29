import { SurgicalCase, SurgicalCaseStatus } from '@prisma/client';
import { PrismaSurgicalCaseRepository } from '@/infrastructure/database/repositories/PrismaSurgicalCaseRepository';

export class SurgicalCaseService {
    constructor(private repository: PrismaSurgicalCaseRepository) { }

    /**
     * Validates and executes a state transition
     */
    async transitionTo(caseId: string, targetStatus: SurgicalCaseStatus, userId: string): Promise<SurgicalCase> {
        const surgicalCase = await this.repository.findById(caseId);
        if (!surgicalCase) {
            throw new Error('Surgical case not found');
        }

        this.validateTransition(surgicalCase, targetStatus);

        // Perform transition
        return this.repository.updateStatus(caseId, targetStatus);
    }

    /**
     * strict state machine validation
     */
    private validateTransition(currentCase: SurgicalCase, target: SurgicalCaseStatus) {
        const current = currentCase.status;

        // 1. DRAFT transitions
        if (current === 'DRAFT') {
            if (['PLANNING', 'CANCELLED'].includes(target)) return;
            throw new Error(`Cannot transition from DRAFT to ${target}`);
        }

        // 2. PLANNING transitions
        if (current === 'PLANNING') {
            if (['READY_FOR_SCHEDULING', 'DRAFT', 'CANCELLED'].includes(target)) {
                if (target === 'READY_FOR_SCHEDULING') {
                    this.validateReadyForScheduling(currentCase);
                }
                return;
            }
            throw new Error(`Cannot transition from PLANNING to ${target}`);
        }

        // 3. READY_FOR_SCHEDULING transitions
        if (current === 'READY_FOR_SCHEDULING') {
            if (['SCHEDULED', 'PLANNING', 'CANCELLED'].includes(target)) return;
            // Scheduled is handled by TheaterService usually, but status update allows it
            throw new Error(`Cannot transition from READY_FOR_SCHEDULING to ${target}`);
        }

        // 4. SCHEDULED transitions
        if (current === 'SCHEDULED') {
            if (['IN_PREP', 'READY_FOR_SCHEDULING', 'CANCELLED'].includes(target)) return;
            throw new Error(`Cannot transition from SCHEDULED to ${target}`);
        }

        // ... (Other transitions imply linear progression)
        if (current === 'IN_PREP' && target === 'IN_THEATER') return;
        if (current === 'IN_THEATER' && target === 'RECOVERY') return;
        if (current === 'RECOVERY' && target === 'COMPLETED') return;

        // Default reject
        throw new Error(`Invalid state transition: ${current} -> ${target}`);
    }

    private validateReadyForScheduling(surgicalCase: SurgicalCase) {
        // This is where we will eventually verify Consents, Risk Plan, etc.
        // For Phase 1 migration, we might be lenient or check existing CasePlan
        // if (!surgicalCase.case_plan) throw new Error("Operative Plan missing");
        // TODO: strictly enforce checks
    }
}
