

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

const signatureDataUrlSchema = z
    .string()
    .regex(/^data:image\/(png|svg\+xml)/, 'Signature must be an image data URL');

const signatureProofSchema = z.object({
    version: z.literal(1),
    algorithm: z.literal('sha256'),
    hash: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid SHA256 hash'),
    signedByUserId: z.string().min(1),
    signedAt: z.string().min(10),
    userAgent: z.string().optional(),
    ip: z.string().optional(),
});

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
  diagnosisPostOp: z.string().min(3, 'Operative diagnosis is required'),
  procedurePlanned: z.string().optional().default(''),
  procedurePerformed: z.string().min(3, 'Operation(s) is required'),
  side: z.string().optional().default(''),
  surgeonId: z.string().min(1, 'Surgeon ID is required'),
  surgeonName: z.string().optional().default(''),
  assistants: z.array(assistantSchema).default([]),
  anesthesiologistId: z.string().optional().default(''),
  anesthesiologistName: z.string().optional().default(''),
  anesthesiaType: anesthesiaTypeEnum,
  // Page 1 - Preparation fields
  shavingY: z.boolean().optional().default(false),
  shavingN: z.boolean().optional().default(false),
  shavingExtent: z.string().optional().default(''),
  skinPrepY: z.boolean().optional().default(false),
  skinPrepN: z.boolean().optional().default(false),
});

// ──────────────────────────────────────────────────────────────────────
// B) Findings & Operative Steps
// ──────────────────────────────────────────────────────────────────────

const MEANINGLESS_CONTENT = /^(n\/?a|none|nil|tbd|test|asdf|xxx+|\.+)$/i;

function stripHtml(input: string) {
    return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export const findingsAndStepsSchema = z.object({
    findings: z.string().optional().default(''),
    operativeSteps: z
        .string()
        .refine(
            (val) => stripHtml(val).length >= 20,
            'Operative steps description must be at least 20 characters',
        )
        .refine(
            (val) => !MEANINGLESS_CONTENT.test(stripHtml(val)),
            'Operative steps must contain meaningful clinical content',
        ),
});

// ──────────────────────────────────────────────────────────────────────
// I) Operative Record (Page 2)
// ──────────────────────────────────────────────────────────────────────

export const operativeRecordSchema = z.object({
  operationRecord: z
    .string()
    .refine((val) => stripHtml(val).length >= 10, 'Operation record must be at least 10 characters'),
  postOperativeInstructions: z
    .string()
    .refine(
      (val) => stripHtml(val).length >= 10,
      'Post-operative instructions must be at least 10 characters',
    ),
  // Page 2 signature (combined surgeon/anaesthesiologist)
  surgeonOrAnesthesiologistSignaturePng: signatureDataUrlSchema,
});

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
  countsCorrectY: z.boolean().optional().default(false),
  countsCorrectN: z.boolean().optional().default(false),
  countsExplanation: z.string().optional().default(''),
  scrubNurseSignaturePng: z.string().optional().default(''),
  surgeonSignaturePage1Png: z.string().optional().default(''),
});

/**
 * Validate that Y/N checkboxes are mutually exclusive for counts
 */
export function validateCountsCheckboxes(data: z.infer<typeof countsConfirmationSchema>): string | null {
  const y = data.countsCorrectY === true;
  const n = data.countsCorrectN === true;
  if (y && n) return 'Please select only one option for counts confirmation';
  if (!y && !n) return 'Please select an option for counts confirmation';
  if (n && (!data.countsExplanation || data.countsExplanation.trim().length < 5)) {
    return 'Explanation required when counts are not correct (min 5 chars)';
  }
  return null;
}

/**
 * If nurse record indicates discrepancy → countsCorrectN MUST be selected.
 * If countsCorrectN is selected → explanation required.
 * Y/N checkboxes must be mutually exclusive.
 */
export function buildCountsConfirmationFinalSchema(nurseHasDiscrepancy: boolean) {
  return countsConfirmationSchema
    .superRefine((d, ctx) => {
      // Check mutual exclusivity
      if (d.countsCorrectY && d.countsCorrectN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['countsCorrectN'],
          message: 'Please select only one option for counts confirmation',
        });
      }
      if (!d.countsCorrectY && !d.countsCorrectN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['countsCorrectY'],
          message: 'Please select an option for counts confirmation',
        });
      }

      // Nurse discrepancy check
      if (nurseHasDiscrepancy && d.countsCorrectY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['countsCorrectY'],
          message: 'Nurse intra-op record reports a count discrepancy. Counts cannot be marked correct.',
        });
      }

      // Explanation required when N is selected
      if (d.countsCorrectN && (!d.countsExplanation || d.countsExplanation.trim().length < 5)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['countsExplanation'],
          message: 'Explanation required when counts are not correct (min 5 chars)',
        });
      }

      // Server-side signatures must exist on finalization
      if (!d.scrubNurseSignaturePng || !/^data:image\//.test(d.scrubNurseSignaturePng)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scrubNurseSignaturePng'],
          message: 'Scrub nurse signature is required on finalization',
        });
      }
      if (!d.surgeonSignaturePage1Png || !/^data:image\//.test(d.surgeonSignaturePage1Png)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['surgeonSignaturePage1Png'],
          message: 'Surgeon signature is required on finalization',
        });
      }
    });
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
    operativeRecord: operativeRecordSchema.partial().optional().default({}),
    intraOpMetrics: intraOpMetricsSchema.partial().optional().default({}),
    implantsUsed: implantsUsedSchema.partial().optional().default({}),
    specimens: specimensSchema.partial().optional().default({}),
    complications: complicationsSchema.partial().optional().default({}),
    countsConfirmation: countsConfirmationSchema.partial().optional().default({}),
    postOpPlan: postOpPlanSchema.partial().optional().default({}),
    signatureProof: signatureProofSchema.optional(),
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
        operativeRecord: operativeRecordSchema,
        intraOpMetrics: intraOpMetricsSchema.partial().optional().default({}),
        implantsUsed: implantsUsedSchema.partial().optional().default({}),
        specimens: specimensSchema.partial().optional().default({}),
        complications: z.object({
      complicationsOccurred: z.boolean().optional().default(false),
      complicationsDetails: z.string().optional().default(''),
    }).optional().default({}),
        countsConfirmation: buildCountsConfirmationFinalSchema(nurseHasDiscrepancy),
        postOpPlan: postOpPlanSchema.partial().optional().default({}),
        signatureProof: signatureProofSchema.optional(),
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
    { key: 'operativeRecord', title: 'Operative Record', icon: 'FileSignature', requiredFieldCount: 3, isCritical: true },
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
        operativeRecord: operativeRecordSchema,
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
    nurseIntraOpData: unknown,
): boolean {
    if (!nurseIntraOpData || typeof nurseIntraOpData !== 'object') return false;
    const root = nurseIntraOpData as Record<string, unknown>;

    // New nursing operation record model (flat)
    if (root.countCorrect === 'N') return true;

    // Older call sites sometimes passed `data.counts` directly (or legacy shapes)
    if (root.countDiscrepancy === true) return true;
    if (root.countCorrect === false) return true;

    // Older models (nested)
    const counts = root.counts;
    if (counts && typeof counts === 'object') {
        const c = counts as Record<string, unknown>;
        if (c.countDiscrepancy === true) return true;
        if (c.countCorrect === false) return true;
    }

    return false;
}
