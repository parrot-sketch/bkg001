/**
 * Domain: Nurse Pre-Operative Ward Checklist
 *
 * Strict TypeScript types and zod validation for the digitized NSAC
 * Perioperative Record "PRE-OPERATIVE WARD CHECK-LIST".
 *
 * Source of truth: ClinicalFormTemplate key = "NURSE_PREOP_WARD_CHECKLIST"
 */

import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────

export const TEMPLATE_KEY = 'NURSE_PREOP_WARD_CHECKLIST' as const;
export const TEMPLATE_VERSION = 1;

// ──────────────────────────────────────────────────────────────────────
// HH:MM time pattern
// ──────────────────────────────────────────────────────────────────────

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
const optionalTime = z
    .string()
    .regex(timePattern, 'Must be in HH:MM format (24h)')
    .optional()
    .or(z.literal(''));

// ──────────────────────────────────────────────────────────────────────
// Section Schemas
// ──────────────────────────────────────────────────────────────────────

export const documentationSchema = z.object({
    documentationComplete: z.boolean(),
    correctConsent: z.boolean(),
});

export const bloodResultsSchema = z.object({
    hbPcv: z.string().optional().default(''),
    uecs: z.string().optional().default(''),
    xMatchUnitsAvailable: z.number().int().min(0).optional(),
    otherLabResults: z.string().optional().default(''),
});

export const medicationsSchema = z.object({
    preMedGiven: z.boolean(),
    preMedDetails: z.string().optional().default(''),
    preMedTimeGiven: optionalTime.default(''),
    periOpMedsGiven: z.boolean().optional().default(false),
    periOpMedsDetails: z.string().optional().default(''),
    regularMedsGiven: z.boolean().optional().default(false),
    regularMedsDetails: z.string().optional().default(''),
    regularMedsTimeGiven: optionalTime.default(''),
});

export const allergiesNpoSchema = z.object({
    allergiesDocumented: z.boolean(),
    allergiesDetails: z.string().optional().default(''),
    npoStatus: z.boolean(),
    npoFastedFromTime: optionalTime.default(''),
});

export const preparationSchema = z.object({
    bathGown: z.boolean(),
    shaveSkinPrep: z.boolean().optional().default(false),
    idBandOn: z.boolean(),
    correctPositioning: z.boolean().optional().default(false),
    jewelryRemoved: z.boolean(),
    makeupNailPolishRemoved: z.boolean(),
});

export const prostheticsSchema = z.object({
    contactLensRemoved: z.boolean().optional().default(false),
    denturesRemoved: z.boolean().optional().default(false),
    hearingAidRemoved: z.boolean().optional().default(false),
    crownsBridgeworkNoted: z.boolean().optional().default(false),
    prostheticNotes: z.string().optional().default(''),
});

export const vitalsSchema = z.object({
    bpSystolic: z.number().int().min(60, 'BP systolic must be ≥ 60').max(260, 'BP systolic must be ≤ 260'),
    bpDiastolic: z.number().int().min(30, 'BP diastolic must be ≥ 30').max(160, 'BP diastolic must be ≤ 160'),
    pulse: z.number().int().min(30, 'Pulse must be ≥ 30').max(220, 'Pulse must be ≤ 220'),
    respiratoryRate: z.number().int().min(6, 'RR must be ≥ 6').max(60, 'RR must be ≤ 60'),
    temperature: z.number().min(34.0, 'Temp must be ≥ 34°C').max(42.0, 'Temp must be ≤ 42°C'),
    cvp: z.string().optional().default(''),
    bladderEmptied: z.boolean(),
    height: z.number().min(50).max(250).optional(),
    weight: z.number().min(2, 'Weight must be ≥ 2 kg').max(350, 'Weight must be ≤ 350 kg'),
    urinalysis: z.string().optional().default(''),
    xRaysScansPresent: z.boolean().optional().default(false),
    otherFormsRequired: z.string().optional().default(''),
});

export const handoverSchema = z.object({
    preparedByName: z.string().min(2, 'Prepared by name is required'),
    timeArrivedInTheatre: optionalTime.default(''),
    receivedByName: z.string().optional().default(''),
    handedOverByName: z.string().optional().default(''),
});

// ──────────────────────────────────────────────────────────────────────
// Full Form Schema
// ──────────────────────────────────────────────────────────────────────

/**
 * Draft schema — all sections optional (allows partial saves).
 */
export const nursePreopWardChecklistDraftSchema = z.object({
    documentation: documentationSchema.partial().optional().default({}),
    bloodResults: bloodResultsSchema.partial().optional().default({}),
    medications: medicationsSchema.partial().optional().default({}),
    allergiesNpo: allergiesNpoSchema.partial().optional().default({}),
    preparation: preparationSchema.partial().optional().default({}),
    prosthetics: prostheticsSchema.partial().optional().default({}),
    vitals: vitalsSchema.partial().optional().default({}),
    handover: handoverSchema.partial().optional().default({}),
});

/**
 * Final schema — all required fields enforced.
 * Used at finalization to ensure the checklist is complete.
 */
export const nursePreopWardChecklistFinalSchema = z.object({
    documentation: documentationSchema,
    bloodResults: bloodResultsSchema,
    medications: medicationsSchema,
    allergiesNpo: allergiesNpoSchema,
    preparation: preparationSchema,
    prosthetics: prostheticsSchema,
    vitals: vitalsSchema,
    handover: handoverSchema,
});

// ──────────────────────────────────────────────────────────────────────
// TypeScript Types (inferred from zod)
// ──────────────────────────────────────────────────────────────────────

export type NursePreopWardChecklistData = z.infer<typeof nursePreopWardChecklistFinalSchema>;
export type NursePreopWardChecklistDraft = z.infer<typeof nursePreopWardChecklistDraftSchema>;

// ──────────────────────────────────────────────────────────────────────
// Section metadata (for UI rendering)
// ──────────────────────────────────────────────────────────────────────

export interface ChecklistSectionMeta {
    key: keyof NursePreopWardChecklistData;
    title: string;
    icon: string;
    requiredFieldCount: number;
}

export const CHECKLIST_SECTIONS: ChecklistSectionMeta[] = [
    { key: 'documentation', title: 'Documentation', icon: 'FileCheck', requiredFieldCount: 2 },
    { key: 'bloodResults', title: 'Blood & Lab Results', icon: 'TestTube', requiredFieldCount: 0 },
    { key: 'medications', title: 'Medications', icon: 'Pill', requiredFieldCount: 1 },
    { key: 'allergiesNpo', title: 'Allergies & NPO Status', icon: 'AlertTriangle', requiredFieldCount: 2 },
    { key: 'preparation', title: 'Peri-Operative Preparation', icon: 'Scissors', requiredFieldCount: 4 },
    { key: 'prosthetics', title: 'Prosthetics Checks', icon: 'Eye', requiredFieldCount: 0 },
    { key: 'vitals', title: 'Immediate Pre-Op Observations', icon: 'Activity', requiredFieldCount: 7 },
    { key: 'handover', title: 'Handover', icon: 'ArrowRightLeft', requiredFieldCount: 1 },
];

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

/**
 * Returns the list of missing required fields for finalization.
 * Runs the final schema and collects ZodError issues.
 * Accepts partial/empty data safely.
 */
export function getMissingChecklistItems(data: Partial<NursePreopWardChecklistDraft> | Record<string, unknown>): string[] {
    const result = nursePreopWardChecklistFinalSchema.safeParse(data);
    if (result.success) return [];

    return result.error.issues.map((issue) => {
        const path = issue.path.join('.');
        return `${path}: ${issue.message}`;
    });
}

/**
 * Computes section-level completion for progress display.
 * Accepts partial/empty data safely.
 */
export function getSectionCompletion(data: Partial<NursePreopWardChecklistDraft> | Record<string, unknown>): Record<string, { complete: boolean; errors: string[] }> {
    const schemas: Record<string, z.ZodTypeAny> = {
        documentation: documentationSchema,
        bloodResults: bloodResultsSchema,
        medications: medicationsSchema,
        allergiesNpo: allergiesNpoSchema,
        preparation: preparationSchema,
        prosthetics: prostheticsSchema,
        vitals: vitalsSchema,
        handover: handoverSchema,
    };

    const result: Record<string, { complete: boolean; errors: string[] }> = {};

    for (const [key, schema] of Object.entries(schemas)) {
        const sectionData = (data as Record<string, unknown>)[key] ?? {};
        const parsed = schema.safeParse(sectionData);
        result[key] = {
            complete: parsed.success,
            errors: parsed.success ? [] : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        };
    }

    return result;
}
