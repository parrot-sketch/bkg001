/**
 * Domain Helper: Planning Readiness
 *
 * Computes the list of missing planning items that must be completed
 * before a surgical case can transition PLANNING → READY_FOR_SCHEDULING.
 *
 * This is the single source of truth for doctor-side readiness.
 * The same logic is used by:
 * - POST /api/doctor/surgical-cases/[id]/mark-ready (enforcement)
 * - GET  /api/doctor/surgical-cases/[caseId]/plan   (checklist display)
 */

export interface PlanningReadinessItem {
    key: string;
    label: string;
    required: boolean;
    done: boolean;
}

export interface PlanningReadinessResult {
    items: PlanningReadinessItem[];
    missingRequired: string[];
    isComplete: boolean;
    completedCount: number;
    totalRequired: number;
}

/**
 * Input data shape — just the fields we need to check.
 * Can come from Prisma or any DTO mapping.
 */
export interface PlanningReadinessInput {
    procedurePlan: string | null | undefined;
    riskFactors: string | null | undefined;
    plannedAnesthesia: string | null | undefined;
    signedConsentCount: number;
    preOpPhotoCount: number;
}

/**
 * Check whether rich-text content is meaningful (not just empty tags).
 * Strips HTML tags and checks for minimum character threshold.
 */
function hasContent(value: string | null | undefined, minLength: number = 5): boolean {
    if (!value) return false;
    // Strip basic HTML tags to get raw text
    const stripped = value.replace(/<[^>]*>/g, '').trim();
    return stripped.length >= minLength;
}

/**
 * Compute doctor-side planning readiness for a surgical case.
 *
 * Required items:
 * 1. Procedure plan documented (≥10 chars raw text)
 * 2. Risk factors assessed (≥5 chars raw text)
 * 3. Anesthesia type selected (non-empty string)
 * 4. At least 1 consent SIGNED
 * 5. At least 1 PRE_OP photo
 */
export function getMissingPlanningItems(input: PlanningReadinessInput): PlanningReadinessResult {
    const items: PlanningReadinessItem[] = [
        {
            key: 'procedure',
            label: 'Procedure Plan',
            required: true,
            done: hasContent(input.procedurePlan, 10),
        },
        {
            key: 'risk',
            label: 'Risk Assessment',
            required: true,
            done: hasContent(input.riskFactors, 5),
        },
        {
            key: 'anesthesia',
            label: 'Anesthesia Plan',
            required: true,
            done: !!(input.plannedAnesthesia && input.plannedAnesthesia.trim().length > 0),
        },
        {
            key: 'consents',
            label: 'Consent Signed',
            required: true,
            done: input.signedConsentCount > 0,
        },
        {
            key: 'photos',
            label: 'Pre-Op Photos',
            required: true,
            done: input.preOpPhotoCount > 0,
        },
    ];

    const requiredItems = items.filter(i => i.required);
    const missingRequired = requiredItems.filter(i => !i.done).map(i => i.label);

    return {
        items,
        missingRequired,
        isComplete: missingRequired.length === 0,
        completedCount: requiredItems.filter(i => i.done).length,
        totalRequired: requiredItems.length,
    };
}
