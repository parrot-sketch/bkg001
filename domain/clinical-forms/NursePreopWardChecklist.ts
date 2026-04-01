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
// Enums
// ──────────────────────────────────────────────────────────────────────

export enum SkinPrepAgent {
    HIBITANE_SPIRIT = 'HIBITANE_SPIRIT',
    HIBITANE_WATER = 'HIBITANE_WATER',
    POVIDONE_IODINE = 'POVIDONE_IODINE',
    ALCOHOL = 'ALCOHOL',
    OTHER = 'OTHER',
}

export enum SkinPrepArea {
    FACE = 'FACE',
    ABDOMEN = 'ABDOMEN',
    BREAST = 'BREAST',
    EXTREMITY = 'EXTREMITY',
    NECK = 'NECK',
    PERINEUM = 'PERINEUM',
    BACK = 'BACK',
    OTHER = 'OTHER',
}

export enum UrinalysisResult {
    CLEAR = 'CLEAR',
    CLOUDY = 'CLOUDY',
    BLOOD_TRACE = 'BLOOD_TRACE',
    GLUCOSE = 'GLUCOSE',
    PROTEIN = 'PROTEIN',
    OTHER = 'OTHER',
}

// Human-readable labels for UI rendering
export const SKIN_PREP_AGENT_LABELS: Record<SkinPrepAgent, string> = {
    [SkinPrepAgent.HIBITANE_SPIRIT]: 'Hibitane in Spirit',
    [SkinPrepAgent.HIBITANE_WATER]: 'Hibitane in Water',
    [SkinPrepAgent.POVIDONE_IODINE]: 'Povidone-Iodine (Betadine)',
    [SkinPrepAgent.ALCOHOL]: 'Alcohol',
    [SkinPrepAgent.OTHER]: 'Other',
};

export const SKIN_PREP_AREA_LABELS: Record<SkinPrepArea, string> = {
    [SkinPrepArea.FACE]: 'Face / Head',
    [SkinPrepArea.ABDOMEN]: 'Abdomen',
    [SkinPrepArea.BREAST]: 'Breast / Chest',
    [SkinPrepArea.EXTREMITY]: 'Extremity (Limb)',
    [SkinPrepArea.NECK]: 'Neck',
    [SkinPrepArea.PERINEUM]: 'Perineum / Groin',
    [SkinPrepArea.BACK]: 'Back / Spine',
    [SkinPrepArea.OTHER]: 'Other',
};

export const URINALYSIS_LABELS: Record<UrinalysisResult, string> = {
    [UrinalysisResult.CLEAR]: 'Clear',
    [UrinalysisResult.CLOUDY]: 'Cloudy',
    [UrinalysisResult.BLOOD_TRACE]: 'Blood / Trace haematuria',
    [UrinalysisResult.GLUCOSE]: 'Glucose positive',
    [UrinalysisResult.PROTEIN]: 'Protein positive',
    [UrinalysisResult.OTHER]: 'Other / custom',
};

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
// Skin Prep Sub-Schema
// ──────────────────────────────────────────────────────────────────────

export const skinPrepSchema = z
    .object({
        agent: z.nativeEnum(SkinPrepAgent),
        area: z.nativeEnum(SkinPrepArea),
        /** Required when agent === OTHER */
        agentOther: z.string().optional().default(''),
        /** Required when area === OTHER */
        areaOther: z.string().optional().default(''),
        performerName: z.string().optional().default(''),
    })
    .superRefine((val, ctx) => {
        if (val.agent === SkinPrepAgent.OTHER && (!val.agentOther || val.agentOther.trim().length < 2)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['agentOther'],
                message: 'Please specify the skin prep agent (min 2 characters)',
            });
        }
        if (val.area === SkinPrepArea.OTHER && (!val.areaOther || val.areaOther.trim().length < 2)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['areaOther'],
                message: 'Please specify the prep area (min 2 characters)',
            });
        }
    });

export type SkinPrep = z.infer<typeof skinPrepSchema>;

// ──────────────────────────────────────────────────────────────────────
// Urinalysis: structured union (enum | custom free-text object)
// ──────────────────────────────────────────────────────────────────────

/**
 * Structured urinalysis value.
 * - Use a `UrinalysisResult` enum string for standard results, OR
 * - Use `{ custom: string }` for free-text when OTHER is selected.
 */
export const urinalysisValueSchema = z.union([
    z.nativeEnum(UrinalysisResult),
    z
        .object({ custom: z.string().min(1, 'Custom urinalysis result required') })
        .strict(),
]);

export type UrinalysisValue = z.infer<typeof urinalysisValueSchema>;

// ──────────────────────────────────────────────────────────────────────
// Section Schemas
// ──────────────────────────────────────────────────────────────────────

export const documentationSchema = z.object({
    documentationComplete: z.boolean(),
    correctConsent: z.boolean(),
});

// ──────────────────────────────────────────────────────────────────────
// Blood Results Options
// ──────────────────────────────────────────────────────────────────────

export const HB_PCV_OPTIONS = [
    { value: 'normal', label: 'Normal' },
    { value: 'low_mild', label: 'Low - Mild' },
    { value: 'low_moderate', label: 'Low - Moderate' },
    { value: 'low_severe', label: 'Low - Severe' },
    { value: 'high', label: 'High' },
    { value: 'not_done', label: 'Not Done' },
] as const;

export const UECS_OPTIONS = [
    { value: 'normal', label: 'Normal' },
    { value: 'abnormal_aki', label: 'Abnormal (AKI)' },
    { value: 'abnormal_ckd', label: 'Abnormal (CKD)' },
    { value: 'abnormal_other', label: 'Abnormal - Other' },
    { value: 'not_done', label: 'Not Done' },
] as const;

export const X_MATCH_UNITS = [0, 1, 2, 3, 4] as const;

export type HbPcvValue = typeof HB_PCV_OPTIONS[number]['value'];
export type UecsValue = typeof UECS_OPTIONS[number]['value'];

export const HB_PCV_LABELS: Record<HbPcvValue, string> = {
    normal: 'Normal',
    low_mild: 'Low - Mild',
    low_moderate: 'Low - Moderate',
    low_severe: 'Low - Severe',
    high: 'High',
    not_done: 'Not Done',
};

export const UECS_LABELS: Record<UecsValue, string> = {
    normal: 'Normal',
    abnormal_aki: 'Abnormal (AKI)',
    abnormal_ckd: 'Abnormal (CKD)',
    abnormal_other: 'Abnormal - Other',
    not_done: 'Not Done',
};

export const bloodResultsSchema = z.object({
    hbPcv: z.string().optional().default(''),
    hbPcvNotes: z.string().optional().default(''),
    uecs: z.string().optional().default(''),
    uecsNotes: z.string().optional().default(''),
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
    /** Legacy boolean — kept for backward compat */
    shaveSkinPrep: z.boolean().optional().default(false),
    /** Structured skin prep details (new). Independent of shaveSkinPrep. */
    skinPrep: skinPrepSchema.optional(),
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
    respiratoryRate: z.number().int().min(6, 'RR must be ≥ 6').max(120, 'RR must be ≤ 120'),
    temperature: z.number().min(34.0, 'Temp must be ≥ 34°C').max(42.0, 'Temp must be ≤ 42°C'),
    /** SpO₂ (peripheral oxygen saturation) — optional at finalization */
    spo2: z.number().int().min(50, 'SpO₂ must be ≥ 50%').max(100, 'SpO₂ must be ≤ 100%').optional(),
    bladderEmptied: z.boolean(),
    height: z.number().min(50).max(250).optional(),
    weight: z.number().min(2, 'Weight must be ≥ 2 kg').max(350, 'Weight must be ≤ 350 kg'),
    /** Structured urinalysis result */
    urinalysis: urinalysisValueSchema.optional(),
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
// Backward-Compat Normalizer
// ──────────────────────────────────────────────────────────────────────

const LEGACY_URINALYSIS_MAP: Record<string, UrinalysisResult> = {
    clear: UrinalysisResult.CLEAR,
    'CLEAR': UrinalysisResult.CLEAR,
    cloudy: UrinalysisResult.CLOUDY,
    'CLOUDY': UrinalysisResult.CLOUDY,
    blood: UrinalysisResult.BLOOD_TRACE,
    'BLOOD_TRACE': UrinalysisResult.BLOOD_TRACE,
    glucose: UrinalysisResult.GLUCOSE,
    'GLUCOSE': UrinalysisResult.GLUCOSE,
    protein: UrinalysisResult.PROTEIN,
    'PROTEIN': UrinalysisResult.PROTEIN,
};

/**
 * Normalizes raw persisted JSON (from any era) into the current draft shape.
 *
 * Safe on `{}`, `null`, `undefined`, and legacy data containing:
 * - `urinalysis` as a plain string
 * - `shaveSkinPrep` boolean without a `skinPrep` sub-object
 */
export function normalizeLegacyChecklistData(raw: unknown): NursePreopWardChecklistDraft {
    if (!raw || typeof raw !== 'object') return {} as NursePreopWardChecklistDraft;

    const data = raw as Record<string, unknown>;

    // ── vitals: urinalysis migration ────────────────────────────────
    let vitals = (data.vitals ?? {}) as Record<string, unknown>;
    if (typeof vitals.urinalysis === 'string') {
        const s = vitals.urinalysis.trim();
        if (!s) {
            // empty string → undefined
            vitals = { ...vitals, urinalysis: undefined };
        } else {
            const mapped = LEGACY_URINALYSIS_MAP[s];
            vitals = {
                ...vitals,
                urinalysis: mapped ?? { custom: s },
            };
        }
    }

    return {
        ...data,
        vitals,
    } as NursePreopWardChecklistDraft;
}

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
