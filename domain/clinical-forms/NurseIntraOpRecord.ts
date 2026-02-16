/**
 * Domain: Nurse Intra-Operative Record
 *
 * Strict TypeScript types and zod validation for the digitized NSAC
 * Perioperative Record intra-operative nurse documentation.
 *
 * Sections:
 *   A) Theatre Setup — positioning, prep, cautery, drains, tourniquet
 *   B) Counts (CRITICAL SAFETY) — swab/instrument/sharps initial + final
 *   C) Specimens — type, site, destination, time sent
 *   D) Implants Used — confirmation of planned implants actually used
 *   E) Sign-Out — WHO-style completion, post-op instructions, specimens labeled
 *
 * Source of truth: ClinicalFormTemplate key = "NURSE_INTRAOP_RECORD"
 */

import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────

export const INTRAOP_TEMPLATE_KEY = 'NURSE_INTRAOP_RECORD' as const;
export const INTRAOP_TEMPLATE_VERSION = 1;

// ──────────────────────────────────────────────────────────────────────
// Shared patterns
// ──────────────────────────────────────────────────────────────────────

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
const optionalTime = z
    .string()
    .regex(timePattern, 'Must be in HH:MM format (24h)')
    .optional()
    .or(z.literal(''));

const woundClassEnum = z.enum([
    'CLEAN',
    'CLEAN_CONTAMINATED',
    'CONTAMINATED',
    'DIRTY_INFECTED',
]);

// ──────────────────────────────────────────────────────────────────────
// A) Theatre Setup Section
// ──────────────────────────────────────────────────────────────────────

export const theatreSetupSchema = z.object({
    positioning: z.string().min(2, 'Positioning is required'),
    skinPrepAgent: z.string().min(2, 'Skin prep agent is required'),
    drapeType: z.string().min(2, 'Drape type is required'),

    // Tourniquet
    tourniquetUsed: z.boolean(),
    tourniquetPressure: z.number().int().min(0).max(500).optional(),
    tourniquetTimeOn: optionalTime.default(''),
    tourniquetTimeOff: optionalTime.default(''),

    // Cautery / Diathermy
    cauteryUsed: z.boolean(),
    cauterySettingsCut: z.string().optional().default(''),
    cauterySettingsCoag: z.string().optional().default(''),

    // Drains
    drainsUsed: z.boolean(),
    drainType: z.string().optional().default(''),
    drainLocation: z.string().optional().default(''),

    // Irrigation
    irrigationType: z.string().optional().default(''),
    irrigationVolumeMl: z.number().int().min(0).optional(),

    // Wound classification
    woundClass: woundClassEnum,
});

// ──────────────────────────────────────────────────────────────────────
// B) Counts Section (CRITICAL SAFETY)
// ──────────────────────────────────────────────────────────────────────

export const countsSchema = z.object({
    // Initial counts
    initialCountsCompleted: z.boolean(),
    initialCountsRecordedBy: z.string().min(2, 'Recorder name required'),
    initialCountsTime: optionalTime.default(''),

    // Breakdown (optional granularity)
    swabsInitial: z.number().int().min(0).optional(),
    sharpsInitial: z.number().int().min(0).optional(),
    instrumentsInitial: z.number().int().min(0).optional(),

    // Final counts
    finalCountsCompleted: z.boolean(),
    finalCountsRecordedBy: z.string().min(2, 'Recorder name required'),
    finalCountsTime: optionalTime.default(''),

    // Breakdown
    swabsFinal: z.number().int().min(0).optional(),
    sharpsFinal: z.number().int().min(0).optional(),
    instrumentsFinal: z.number().int().min(0).optional(),

    // Discrepancy
    countDiscrepancy: z.boolean(),
    discrepancyNotes: z.string().optional().default(''),
});

// Refinement: if discrepancy=true, notes must be non-empty
export const countsSchemaFinal = countsSchema.refine(
    (d) => !d.countDiscrepancy || (d.discrepancyNotes && d.discrepancyNotes.trim().length >= 5),
    {
        message: 'Discrepancy notes are required when a count discrepancy is flagged (min 5 chars)',
        path: ['discrepancyNotes'],
    },
);

// ──────────────────────────────────────────────────────────────────────
// C) Specimens Section
// ──────────────────────────────────────────────────────────────────────

export const specimenItemSchema = z.object({
    specimenType: z.string().min(2, 'Specimen type is required'),
    site: z.string().min(2, 'Specimen site is required'),
    destinationLab: z.string().min(2, 'Destination lab is required'),
    timeSent: optionalTime.default(''),
    notes: z.string().optional().default(''),
});

export const specimensSchema = z.object({
    specimens: z.array(specimenItemSchema).default([]),
});

// ──────────────────────────────────────────────────────────────────────
// D) Implants Used Section (confirmation of what was used)
// ──────────────────────────────────────────────────────────────────────

export const implantUsedItemSchema = z.object({
    name: z.string().min(2, 'Implant name is required'),
    manufacturer: z.string().optional().default(''),
    lotNumber: z.string().optional().default(''),
    serialNumber: z.string().optional().default(''),
    expiryDate: z.string().optional().default(''), // YYYY-MM-DD
    used: z.boolean(),
    notes: z.string().optional().default(''),
});

export const implantsUsedSchema = z.object({
    implantsConfirmed: z.boolean(),
    items: z.array(implantUsedItemSchema).default([]),
});

// ──────────────────────────────────────────────────────────────────────
// E) Sign-Out Section (WHO Sign-Out style)
// ──────────────────────────────────────────────────────────────────────

export const signOutSchema = z.object({
    signOutCompleted: z.boolean(),
    signOutTime: optionalTime.default(''),
    signOutNurseName: z.string().min(2, 'Nurse name is required for sign-out'),
    postopInstructionsConfirmed: z.boolean(),
    specimensLabeledConfirmed: z.boolean(),
    additionalNotes: z.string().optional().default(''),
});

// ──────────────────────────────────────────────────────────────────────
// Full Form Schema — Draft (lenient, all sections partial)
// ──────────────────────────────────────────────────────────────────────

export const nurseIntraOpRecordDraftSchema = z.object({
    theatreSetup: theatreSetupSchema.partial().optional().default({}),
    counts: countsSchema.partial().optional().default({}),
    specimens: specimensSchema.partial().optional().default({}),
    implantsUsed: implantsUsedSchema.partial().optional().default({}),
    signOut: signOutSchema.partial().optional().default({}),
});

// ──────────────────────────────────────────────────────────────────────
// Full Form Schema — Final (strict, all required enforced)
// ──────────────────────────────────────────────────────────────────────

export const nurseIntraOpRecordFinalSchema = z.object({
    theatreSetup: theatreSetupSchema,
    counts: countsSchemaFinal,
    specimens: specimensSchema,
    implantsUsed: implantsUsedSchema,
    signOut: signOutSchema,
});

// ──────────────────────────────────────────────────────────────────────
// TypeScript Types (inferred from zod)
// ──────────────────────────────────────────────────────────────────────

export type NurseIntraOpRecordData = z.infer<typeof nurseIntraOpRecordFinalSchema>;
export type NurseIntraOpRecordDraft = z.infer<typeof nurseIntraOpRecordDraftSchema>;
export type SpecimenItem = z.infer<typeof specimenItemSchema>;
export type ImplantUsedItem = z.infer<typeof implantUsedItemSchema>;

// ──────────────────────────────────────────────────────────────────────
// Section metadata (for UI rendering)
// ──────────────────────────────────────────────────────────────────────

export interface IntraOpSectionMeta {
    key: string;
    title: string;
    icon: string;
    requiredFieldCount: number;
    isCritical?: boolean; // Highlight safety-critical sections
}

export const INTRAOP_SECTIONS: IntraOpSectionMeta[] = [
    { key: 'theatreSetup', title: 'Theatre Setup', icon: 'Settings', requiredFieldCount: 5 },
    { key: 'counts', title: 'Swab / Instrument / Sharps Counts', icon: 'Hash', requiredFieldCount: 6, isCritical: true },
    { key: 'specimens', title: 'Specimens', icon: 'FlaskConical', requiredFieldCount: 0 },
    { key: 'implantsUsed', title: 'Implants / Prostheses Used', icon: 'Package', requiredFieldCount: 1 },
    { key: 'signOut', title: 'Sign-Out & Completion', icon: 'ClipboardCheck', requiredFieldCount: 4, isCritical: true },
];

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

/**
 * Returns missing required fields for finalization.
 * Runs the final schema and collects ZodError issues.
 */
export function getMissingIntraOpItems(
    data: Partial<NurseIntraOpRecordDraft> | Record<string, unknown>,
): string[] {
    const result = nurseIntraOpRecordFinalSchema.safeParse(data);
    if (result.success) return [];

    return result.error.issues.map((issue) => {
        const path = issue.path.join('.');
        return `${path}: ${issue.message}`;
    });
}

/**
 * Computes section-level completion for progress display.
 */
export function getIntraOpSectionCompletion(
    data: Partial<NurseIntraOpRecordDraft> | Record<string, unknown>,
): Record<string, { complete: boolean; errors: string[] }> {
    const schemas: Record<string, z.ZodTypeAny> = {
        theatreSetup: theatreSetupSchema,
        counts: countsSchemaFinal,
        specimens: specimensSchema,
        implantsUsed: implantsUsedSchema,
        signOut: signOutSchema,
    };

    const result: Record<string, { complete: boolean; errors: string[] }> = {};

    for (const [key, schema] of Object.entries(schemas)) {
        const sectionData = (data as Record<string, unknown>)[key] ?? {};
        const parsed = schema.safeParse(sectionData);
        result[key] = {
            complete: parsed.success,
            errors: parsed.success
                ? []
                : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        };
    }

    return result;
}

/**
 * Checks the critical safety items needed before RECOVERY transition:
 * - signOutCompleted = true
 * - finalCountsCompleted = true
 * - if countDiscrepancy = true → blocks (unless explicit override)
 *
 * Returns array of missing item labels. Empty = safe to transition.
 */
export function getRecoveryGateItems(
    data: Partial<NurseIntraOpRecordDraft> | Record<string, unknown>,
): string[] {
    const missing: string[] = [];
    const d = data as any;

    const counts = d?.counts ?? {};
    const signOut = d?.signOut ?? {};

    if (!counts.finalCountsCompleted) {
        missing.push('Final counts not completed');
    }
    if (counts.countDiscrepancy === true) {
        missing.push('Count discrepancy flagged — resolve before RECOVERY');
    }
    if (!signOut.signOutCompleted) {
        missing.push('Nurse sign-out not completed');
    }
    if (!signOut.postopInstructionsConfirmed) {
        missing.push('Post-op instructions not confirmed');
    }
    if (!signOut.specimensLabeledConfirmed) {
        missing.push('Specimens labeled confirmation missing');
    }

    return missing;
}
