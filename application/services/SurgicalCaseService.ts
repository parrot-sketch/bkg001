import { SurgicalCase, SurgicalCaseStatus, CasePlan } from '@prisma/client';
import { ISurgicalCaseRepository } from '@/domain/interfaces/repositories/ISurgicalCaseRepository';
import { ICasePlanRepository } from '@/domain/interfaces/repositories/ICasePlanRepository';

/**
 * Service: SurgicalCaseService
 *
 * Domain service that encapsulates surgical case state machine logic.
 * Validates transitions and enforces business rules for the surgery workflow.
 *
 * Transition map:
 *   DRAFT → PLANNING | CANCELLED
 *   PLANNING → READY_FOR_SCHEDULING | DRAFT | CANCELLED
 *   READY_FOR_SCHEDULING → SCHEDULED | PLANNING | CANCELLED
 *   SCHEDULED → IN_PREP | READY_FOR_SCHEDULING | CANCELLED
 *   IN_PREP → IN_THEATER
 *   IN_THEATER → RECOVERY
 *   RECOVERY → COMPLETED
 */
export class SurgicalCaseService {
    constructor(
        private repository: ISurgicalCaseRepository,
        private casePlanRepository?: ICasePlanRepository,
    ) {}

    /**
     * Validates and executes a state transition
     */
    async transitionTo(caseId: string, targetStatus: SurgicalCaseStatus, userId: string): Promise<SurgicalCase> {
        const surgicalCase = await this.repository.findById(caseId);
        if (!surgicalCase) {
            throw new Error('Surgical case not found');
        }

        await this.validateTransition(surgicalCase, targetStatus);

        return this.repository.updateStatus(caseId, targetStatus);
    }

    /**
     * Fetch all surgical cases for a specific surgeon
     */
    async getSurgeonCases(surgeonId: string): Promise<SurgicalCase[]> {
        return this.repository.findBySurgeonId(surgeonId);
    }

    /**
     * Fetch cases ready for scheduling (admin view)
     */
    async getCasesReadyForScheduling(): Promise<SurgicalCase[]> {
        return this.repository.findReadyForScheduling();
    }

    /**
     * Strict state machine validation
     */
    private async validateTransition(currentCase: SurgicalCase, target: SurgicalCaseStatus) {
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
                    await this.validateReadyForScheduling(currentCase);
                }
                return;
            }
            throw new Error(`Cannot transition from PLANNING to ${target}`);
        }

        // 3. READY_FOR_SCHEDULING transitions
        if (current === 'READY_FOR_SCHEDULING') {
            if (['SCHEDULED', 'PLANNING', 'CANCELLED'].includes(target)) return;
            throw new Error(`Cannot transition from READY_FOR_SCHEDULING to ${target}`);
        }

        // 4. SCHEDULED transitions
        if (current === 'SCHEDULED') {
            if (['IN_PREP', 'READY_FOR_SCHEDULING', 'CANCELLED'].includes(target)) return;
            throw new Error(`Cannot transition from SCHEDULED to ${target}`);
        }

        // Linear progression for day-of-surgery states
        if (current === 'IN_PREP' && target === 'IN_THEATER') return;
        if (current === 'IN_THEATER' && target === 'RECOVERY') return;
        if (current === 'RECOVERY' && target === 'COMPLETED') return;

        // Default reject
        throw new Error(`Invalid state transition: ${current} -> ${target}`);
    }

    /**
     * Validates that a surgical case has met minimum readiness criteria
     * before it can be marked as READY_FOR_SCHEDULING.
     *
     * Minimum requirements for an aesthetic surgery center:
     * - CasePlan must exist and be linked
     * - Procedure plan must be documented
     * - Risk factors must be assessed
     * - Pre-operative notes must be present
     */
    private async validateReadyForScheduling(surgicalCase: SurgicalCase): Promise<void> {
        if (!this.casePlanRepository) {
            // No case plan repo available — skip validation (lenient mode)
            return;
        }

        let casePlan: CasePlan | null = null;

        // Try to find by surgical case link first, then by appointment
        casePlan = await this.casePlanRepository.findBySurgicalCaseId(surgicalCase.id);

        if (!casePlan) {
            throw new Error(
                'Cannot mark as ready: No operative plan found. ' +
                'Please complete the operative plan before marking ready for scheduling.',
            );
        }

        // Validate minimum required fields
        const errors: string[] = [];

        if (!casePlan.procedure_plan || casePlan.procedure_plan.trim().length < 10) {
            errors.push('Procedure plan must be documented');
        }

        if (!casePlan.risk_factors || casePlan.risk_factors.trim().length < 5) {
            errors.push('Risk factors must be assessed');
        }

        if (!casePlan.pre_op_notes || casePlan.pre_op_notes.trim().length < 5) {
            errors.push('Pre-operative notes are required');
        }

        if (errors.length > 0) {
            throw new Error(
                `Cannot mark as ready for scheduling:\n• ${errors.join('\n• ')}`,
            );
        }
    }
}
