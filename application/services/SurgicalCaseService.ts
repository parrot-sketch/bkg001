import { SurgicalCase, SurgicalCaseStatus, CasePlan, PrismaClient } from '@prisma/client';
import { ISurgicalCaseRepository } from '@/domain/interfaces/repositories/ISurgicalCaseRepository';
import { ICasePlanRepository } from '@/domain/interfaces/repositories/ICasePlanRepository';
import { getMissingPlanningItems, PlanningReadinessInput, PlanningReadinessItem } from '@/domain/helpers/planningReadiness';

/**
 * Error thrown when readiness validation fails.
 * Contains structured missing items for the API to return.
 */
export class ReadinessValidationError extends Error {
    constructor(
        message: string,
        public readonly missingItems: PlanningReadinessItem[],
        public readonly completedCount: number,
        public readonly totalRequired: number,
    ) {
        super(message);
        this.name = 'ReadinessValidationError';
    }
}

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
        private db?: PrismaClient,
    ) { }

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
     * Uses the domain helper `getMissingPlanningItems` as the single source of truth.
     *
     * Required:
     * - Procedure plan documented
     * - Risk factors assessed
     * - Anesthesia plan selected
     * - At least 1 signed consent
     * - At least 1 pre-op photo
     */
    private async validateReadyForScheduling(surgicalCase: SurgicalCase): Promise<void> {
        if (!this.casePlanRepository) {
            // No case plan repo available — skip validation (lenient mode)
            return;
        }

        // findBySurgicalCaseId includes consents + images relations
        const casePlan = await this.casePlanRepository.findBySurgicalCaseId(surgicalCase.id);

        if (!casePlan) {
            throw new Error(
                'Cannot mark as ready: No operative plan found. ' +
                'Please complete the operative plan before marking ready for scheduling.',
            );
        }

        // Cast to access included relations (Prisma include returns them but TS type is plain CasePlan)
        const planWithRelations = casePlan as CasePlan & {
            consents?: Array<{ status: string }>;
            images?: Array<{ timepoint: string }>;
        };

        const input: PlanningReadinessInput = {
            procedurePlan: casePlan.procedure_plan,
            riskFactors: casePlan.risk_factors,
            plannedAnesthesia: casePlan.planned_anesthesia,
            signedConsentCount: planWithRelations.consents?.filter(c => c.status === 'SIGNED').length ?? 0,
            preOpPhotoCount: planWithRelations.images?.filter(i => i.timepoint === 'PRE_OP').length ?? 0,
        };

        const readiness = getMissingPlanningItems(input);

        // Nurse Pre-Op Ward Checklist is checking day-of-surgery readiness
        // It should NOT block "Ready for Scheduling" state (which is done days/weeks before).
        // Removing this check to fix logical deadlock for elective cases.

        const allItems = [...readiness.items];
        const allMissing = allItems.filter(i => i.required && !i.done);

        if (allMissing.length > 0) {
            const labels = allMissing.map(i => i.label);
            throw new ReadinessValidationError(
                `Cannot mark as ready for scheduling:\n• ${labels.join('\n• ')}`,
                allItems,
                allItems.filter(i => i.required && i.done).length,
                allItems.filter(i => i.required).length,
            );
        }
    }
}
