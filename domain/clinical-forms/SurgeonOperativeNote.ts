/**
 * Domain: Surgeon Operative Note & Procedure Summary
 *
 * Strict TypeScript types and Zod validation for the doctor-owned
 * intra/post-operative operative note document.
 *
 * Sections:
 *   A) Header — diagnosis, procedure, side, surgeon, assistants, anesthesia (mostly prefilled)
 *   B) Findings & Operative Steps — surgeon's narrative
 *   C) Intra-Op Metrics — EBL, fluids, urine output, tourniquet time
 *   D) Implants Used — prefilled from Nurse IntraOpRecord (used=true)
 *   E) Specimens — prefilled from Nurse IntraOpRecord
 *   F) Complications — occurred flag + details
 *   G) Counts Confirmation — must agree with nurse record, enforced discrepancy
 *   H) Post-Op Plan — dressings, drains, meds, follow-up, discharge destination
 *
 * Source of truth: ClinicalFormTemplate key = "SURGEON_OPERATIVE_NOTE"
 */

import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────

export const OPERATIVE_NOTE_TEMPLATE_KEY = 'SURGEON_OPERATIVE_NOTE' as const;
export const OPERATIVE_NOTE_TEMPLATE_VERSION = 1;

// ──────────────────────────────────────────────────────────────────────
// Shared enums / patterns
// ──────────────────────────────────────────────────────────────────────

export const anesthesiaTypeEnum = z.enum([
    'GENERAL',
    'REGIONAL',
    'LOCAL',
    'SEDATION',
    'TIVA',
    'MAC',
]);

export const dischargeDestinationEnum = z.enum([
    'WARD',
    'HOME',
    'ICU',
    'HDU',
    'OTHER',
]);

const optionalTime = z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be in HH:MM format (24h)')
    .optional()
    .or(z.literal(''));

// ──────────────────────────────────────────────────────────────────────
// A) Header Section (mostly auto-prefilled)
// ──────────────────────────────────────────────────────────────────────

export const assistantSchema = z.object({
    userId: z.string().optional().default(''),
    name: z.string().min(2, 'Assistant name is required'),
    role: z.string().optional().default(''),
});

export const headerSchema = z.object({
    diagnosisPreOp: z.string().min(3, 'Pre-operative diagnosis is required'),
    diagnosisPostOp: z.string().optional().default(''),
    procedurePerformed: z.string().min(3, 'Procedure performed is required'),
    side: z.string().optional().default(''),
    surgeonId: z.string().min(1, 'Surgeon ID is required'),
    surgeonName: z.string().optional().default(''),
    assistants: z.array(assistantSchema).default([]),
    anesthesiologistId: z.string().optional().default(''),
    anesthesiologistName: z.string().optional().default(''),
    anesthesiaType: anesthesiaTypeEnum,
});

// ──────────────────────────────────────────────────────────────────────
// B) Findings & Operative Steps
// ──────────────────────────────────────────────────────────────────────

const MEANINGLESS_CONTENT = /^(n\/?a|none|nil|tbd|test|asdf|xxx+|\.+)$/i;

export const findingsAndStepsSchema = z.object({
    findings: z.string().optional().default(''),
    operativeSteps: z
        .string()
        .min(20, 'Operative steps description must be at least 20 characters')
        .refine(
            (val) => !MEANINGLESS_CONTENT.test(val.trim()),
            'Operative steps must contain meaningful clinical content',
        ),
});

// ──────────────────────────────────────────────────────────────────────
// C) Intra-Op Metrics
// ──────────────────────────────────────────────────────────────────────

export const intraOpMetricsSchema = z.object({
    estimatedBloodLossMl: z.number().int().min(0, 'EBL must be ≥ 0').max(20000, 'EBL exceeds maximum'),
    fluidsGivenMl: z.number().int().min(0).max(50000).optional(),
    urineOutputMl: z.number().int().min(0).max(10000).optional(),
    tourniquetTimeMinutes: z.number().int().min(0).max(300).optional(),
});

// ──────────────────────────────────────────────────────────────────────
// D) Implants Used (prefilled from Nurse IntraOpRecord where used=true)
// ──────────────────────────────────────────────────────────────────────

export const operativeNoteImplantSchema = z.object({
    name: z.string().min(2, 'Implant name is required'),
    manufacturer: z.string().optional().default(''),
    lotNumber: z.string().optional().default(''),
    serialNumber: z.string().optional().default(''),
    expiryDate: z.string().optional().default(''), // YYYY-MM-DD
});

export const implantsUsedSchema = z.object({
    implantsUsed: z.array(operativeNoteImplantSchema).default([]),
});

// ──────────────────────────────────────────────────────────────────────
// E) Specimens (prefilled from Nurse IntraOpRecord)
// ──────────────────────────────────────────────────────────────────────

export const operativeNoteSpecimenSchema = z.object({
    type: z.string().min(2, 'Specimen type is required'),
    site: z.string().min(2, 'Specimen site is required'),
    destinationLab: z.string().min(2, 'Destination lab is required'),
    timeSent: optionalTime.default(''),
});

export const specimensSchema = z.object({
    specimens: z.array(operativeNoteSpecimenSchema).default([]),
});

// ──────────────────────────────────────────────────────────────────────
// F) Complications
// ──────────────────────────────────────────────────────────────────────

export const complicationsSchema = z.object({
    complicationsOccurred: z.boolean(),
    complicationsDetails: z.string().optional().default(''),
});

export const complicationsSchemaFinal = complicationsSchema.refine(
    (d) => !d.complicationsOccurred || (d.complicationsDetails && d.complicationsDetails.trim().length >= 5),
    {
        message: 'Complications details are required when complications occurred (min 5 chars)',
        path: ['complicationsDetails'],
    },
);

// ──────────────────────────────────────────────────────────────────────
// G) Counts Confirmation (cross-referenced with Nurse IntraOpRecord)
// ──────────────────────────────────────────────────────────────────────

export const countsConfirmationSchema = z.object({
    countsCorrect: z.boolean(),
    countsExplanation: z.string().optional().default(''),
});

/**
 * If nurse record indicates discrepancy → countsCorrect MUST be false.
 * If countsCorrect is false → explanation required.
 */
export function buildCountsConfirmationFinalSchema(nurseHasDiscrepancy: boolean) {
    return countsConfirmationSchema
        .refine(
            (d) => {
                if (nurseHasDiscrepancy && d.countsCorrect) return false;
                return true;
            },
            {
                message: 'Nurse intra-op record reports a count discrepancy. Counts cannot be marked correct.',
                path: ['countsCorrect'],
            },
        )
        .refine(
            (d) => d.countsCorrect || (d.countsExplanation && d.countsExplanation.trim().length >= 5),
            {
                message: 'Explanation required when counts are not correct (min 5 chars)',
                path: ['countsExplanation'],
            },
        );
}

// ──────────────────────────────────────────────────────────────────────
// H) Post-Op Plan
// ──────────────────────────────────────────────────────────────────────

export const postOpPlanSchema = z.object({
    dressingInstructions: z.string().optional().default(''),
    drainCare: z.string().optional().default(''),
    meds: z.string().optional().default(''),
    followUpPlan: z.string().optional().default(''),
    dischargeDestination: dischargeDestinationEnum.optional(),
});

// ──────────────────────────────────────────────────────────────────────
// Full Form Schema — Draft (lenient, all sections partial)
// ──────────────────────────────────────────────────────────────────────

export const surgeonOperativeNoteDraftSchema = z.object({
    header: headerSchema.partial().optional().default({}),
    findingsAndSteps: findingsAndStepsSchema.partial().optional().default({}),
    intraOpMetrics: intraOpMetricsSchema.partial().optional().default({}),
    implantsUsed: implantsUsedSchema.partial().optional().default({}),
    specimens: specimensSchema.partial().optional().default({}),
    complications: complicationsSchema.partial().optional().default({}),
    countsConfirmation: countsConfirmationSchema.partial().optional().default({}),
    postOpPlan: postOpPlanSchema.partial().optional().default({}),
});

// ──────────────────────────────────────────────────────────────────────
// Full Form Schema — Final (strict, all required enforced)
// ──────────────────────────────────────────────────────────────────────

/**
 * Build the final schema dynamically because counts confirmation depends
 * on nurse intra-op record discrepancy status.
 */
export function buildSurgeonOperativeNoteFinalSchema(nurseHasDiscrepancy: boolean) {
    return z.object({
        header: headerSchema,
        findingsAndSteps: findingsAndStepsSchema,
        intraOpMetrics: intraOpMetricsSchema,
        implantsUsed: implantsUsedSchema,
        specimens: specimensSchema,
        complications: complicationsSchemaFinal,
        countsConfirmation: buildCountsConfirmationFinalSchema(nurseHasDiscrepancy),
        postOpPlan: postOpPlanSchema,
    });
}

// Static final schema for cases without nurse discrepancy check
export const surgeonOperativeNoteFinalSchema = buildSurgeonOperativeNoteFinalSchema(false);

// ──────────────────────────────────────────────────────────────────────
// TypeScript Types (inferred from zod)
// ──────────────────────────────────────────────────────────────────────

export type SurgeonOperativeNoteData = z.infer<typeof surgeonOperativeNoteFinalSchema>;
export type SurgeonOperativeNoteDraft = z.infer<typeof surgeonOperativeNoteDraftSchema>;
export type OperativeNoteImplant = z.infer<typeof operativeNoteImplantSchema>;
export type OperativeNoteSpecimen = z.infer<typeof operativeNoteSpecimenSchema>;
export type OperativeNoteAssistant = z.infer<typeof assistantSchema>;

// ──────────────────────────────────────────────────────────────────────
// Section metadata (for UI rendering)
// ──────────────────────────────────────────────────────────────────────

export interface OperativeNoteSectionMeta {
    key: string;
    title: string;
    icon: string;
    requiredFieldCount: number;
    isCritical?: boolean;
}

export const OPERATIVE_NOTE_SECTIONS: OperativeNoteSectionMeta[] = [
    { key: 'header', title: 'Case Header', icon: 'FileText', requiredFieldCount: 4 },
    { key: 'findingsAndSteps', title: 'Findings & Operative Steps', icon: 'Stethoscope', requiredFieldCount: 1 },
    { key: 'intraOpMetrics', title: 'Intra-Operative Metrics', icon: 'Activity', requiredFieldCount: 1 },
    { key: 'implantsUsed', title: 'Implants Used', icon: 'Package', requiredFieldCount: 0 },
    { key: 'specimens', title: 'Specimens', icon: 'FlaskConical', requiredFieldCount: 0 },
    { key: 'complications', title: 'Complications', icon: 'AlertTriangle', requiredFieldCount: 1, isCritical: true },
    { key: 'countsConfirmation', title: 'Counts Confirmation', icon: 'Hash', requiredFieldCount: 1, isCritical: true },
    { key: 'postOpPlan', title: 'Post-Operative Plan', icon: 'ClipboardCheck', requiredFieldCount: 0 },
];

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

/**
 * Returns missing required fields for finalization.
 * Uses the final schema with optional nurse discrepancy flag.
 */
export function getMissingOperativeNoteItems(
    data: Partial<SurgeonOperativeNoteDraft> | Record<string, unknown>,
    nurseHasDiscrepancy = false,
): string[] {
    const schema = buildSurgeonOperativeNoteFinalSchema(nurseHasDiscrepancy);
    const result = schema.safeParse(data);
    if (result.success) return [];

    return result.error.issues.map((issue) => {
        const path = issue.path.join('.');
        return `${path}: ${issue.message}`;
    });
}

/**
 * Computes section-level completion for progress display.
 */
export function getOperativeNoteSectionCompletion(
    data: Partial<SurgeonOperativeNoteDraft> | Record<string, unknown>,
    nurseHasDiscrepancy = false,
): Record<string, { complete: boolean; errors: string[] }> {
    const schemas: Record<string, z.ZodTypeAny> = {
        header: headerSchema,
        findingsAndSteps: findingsAndStepsSchema,
        intraOpMetrics: intraOpMetricsSchema,
        implantsUsed: implantsUsedSchema,
        specimens: specimensSchema,
        complications: complicationsSchemaFinal,
        countsConfirmation: buildCountsConfirmationFinalSchema(nurseHasDiscrepancy),
        postOpPlan: postOpPlanSchema,
    };

    const result: Record<string, { complete: boolean; errors: string[] }> = {};

    for (const [key, schema] of Object.entries(schemas)) {
        const sectionData = (data as Record<string, unknown>)[key] ?? {};
        const parsed = schema.safeParse(sectionData);
        result[key] = {
            complete: parsed.success,
            errors: parsed.success
                ? []
                : parsed.error.issues.map((i: z.ZodIssue) => `${i.path.join('.')}: ${i.message}`),
        };
    }

    return result;
}

// ──────────────────────────────────────────────────────────────────────
// Prefill helpers
// ──────────────────────────────────────────────────────────────────────

/**
 * Extract implants from Nurse IntraOpRecord where used=true.
 * Maps from nurse schema shape to operative note schema shape.
 */
export function prefillImplantsFromIntraOp(
    nurseImplantsData: { items?: Array<{ name: string; manufacturer?: string; lotNumber?: string; serialNumber?: string; expiryDate?: string; used: boolean }> } | null | undefined,
): OperativeNoteImplant[] {
    if (!nurseImplantsData?.items) return [];
    return nurseImplantsData.items
        .filter((item) => item.used)
        .map((item) => ({
            name: item.name,
            manufacturer: item.manufacturer ?? '',
            lotNumber: item.lotNumber ?? '',
            serialNumber: item.serialNumber ?? '',
            expiryDate: item.expiryDate ?? '',
        }));
}

/**
 * Extract specimens from Nurse IntraOpRecord.
 * Maps from nurse schema shape to operative note schema shape.
 */
export function prefillSpecimensFromIntraOp(
    nurseSpecimensData: { specimens?: Array<{ specimenType: string; site: string; destinationLab: string; timeSent?: string }> } | null | undefined,
): OperativeNoteSpecimen[] {
    if (!nurseSpecimensData?.specimens) return [];
    return nurseSpecimensData.specimens.map((s) => ({
        type: s.specimenType,
        site: s.site,
        destinationLab: s.destinationLab,
        timeSent: s.timeSent ?? '',
    }));
}

/**
 * Check if nurse intra-op record has a count discrepancy.
 */
export function getNurseCountDiscrepancy(
    nurseCountsData: { countDiscrepancy?: boolean } | null | undefined,
): boolean {
    return nurseCountsData?.countDiscrepancy === true;
}
