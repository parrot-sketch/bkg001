/**
 * Domain: Nurse Post-Operative Recovery / PACU Record
 *
 * Strict TypeScript types and zod validation for the digitized NSAC
 * Perioperative Record recovery/PACU nurse documentation.
 *
 * Sections:
 *   A) Arrival & Baseline — time arrived, airway, oxygen, consciousness, pain, nausea
 *   B) Vitals Monitoring — array of observations at intervals
 *   C) Interventions & Medications — meds, fluids, urine, drains, dressing
 *   D) Discharge Readiness (GATE) — criteria checklist + decision + handover + signature
 *
 * Source of truth: ClinicalFormTemplate key = "NURSE_RECOVERY_RECORD"
 */

import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────

export const RECOVERY_TEMPLATE_KEY = 'NURSE_RECOVERY_RECORD' as const;
export const RECOVERY_TEMPLATE_VERSION = 1;

// ──────────────────────────────────────────────────────────────────────
// Shared patterns
// ──────────────────────────────────────────────────────────────────────

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
const optionalTime = z
    .string()
    .regex(timePattern, 'Must be in HH:MM format (24h)')
    .optional()
    .or(z.literal(''));

// ──────────────────────────────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────────────────────────────

export const airwayStatusEnum = z.enum([
    'PATENT',
    'ORAL_AIRWAY',
    'NASAL_AIRWAY',
    'LMA_IN_SITU',
    'ETT_IN_SITU',
    'OTHER',
]);

export const oxygenDeliveryEnum = z.enum([
    'ROOM_AIR',
    'NASAL_CANNULA',
    'FACE_MASK',
    'NON_REBREATHER',
    'VENTURI',
    'OTHER',
]);

export const consciousnessEnum = z.enum([
    'ALERT',
    'RESPONSIVE_TO_VOICE',
    'RESPONSIVE_TO_PAIN',
    'UNRESPONSIVE',
    'DROWSY',
]);

export const nauseaVomitingEnum = z.enum([
    'NONE',
    'MILD_NAUSEA',
    'MODERATE_NAUSEA',
    'VOMITING',
    'SEVERE_VOMITING',
]);

export const dischargeDecisionEnum = z.enum([
    'DISCHARGE_TO_WARD',
    'DISCHARGE_HOME',
    'HOLD',
]);

// ──────────────────────────────────────────────────────────────────────
// A) Arrival & Baseline Section
// ──────────────────────────────────────────────────────────────────────

export const arrivalBaselineSchema = z.object({
    timeArrivedRecovery: z
        .string()
        .regex(timePattern, 'Must be in HH:MM format (24h)'),
    airwayStatus: airwayStatusEnum,
    oxygenDelivery: oxygenDeliveryEnum,
    oxygenFlowRate: z.string().optional().default(''), // e.g. "4L/min"
    consciousness: consciousnessEnum,
    painScore: z.number().int().min(0, 'Pain score min 0').max(10, 'Pain score max 10'),
    nauseaVomiting: nauseaVomitingEnum,
    arrivalNotes: z.string().optional().default(''),
});

// ──────────────────────────────────────────────────────────────────────
// B) Vitals Monitoring Section
// ──────────────────────────────────────────────────────────────────────

export const vitalsObservationSchema = z.object({
    time: z.string().regex(timePattern, 'Must be in HH:MM format (24h)'),
    bpSys: z.number().int().min(50, 'Systolic BP min 50').max(300, 'Systolic BP max 300'),
    bpDia: z.number().int().min(20, 'Diastolic BP min 20').max(200, 'Diastolic BP max 200'),
    pulse: z.number().int().min(20, 'Pulse min 20').max(250, 'Pulse max 250'),
    rr: z.number().int().min(4, 'RR min 4').max(60, 'RR max 60'),
    spo2: z.number().int().min(50, 'SpO2 min 50').max(100, 'SpO2 max 100'),
    tempC: z.number().min(33.0, 'Temp min 33°C').max(42.0, 'Temp max 42°C').optional(),
});

export const vitalsMonitoringSchema = z.object({
    observations: z.array(vitalsObservationSchema).default([]),
    vitalsNotRecordedReason: z.string().optional().default(''),
});

// ──────────────────────────────────────────────────────────────────────
// C) Interventions & Medications Section
// ──────────────────────────────────────────────────────────────────────

export const medicationItemSchema = z.object({
    name: z.string().min(2, 'Medication name required'),
    dose: z.string().min(1, 'Dose required'),
    route: z.string().min(1, 'Route required'), // IV, IM, PO, etc.
    time: z.string().regex(timePattern, 'Must be in HH:MM format (24h)'),
});

export const fluidItemSchema = z.object({
    type: z.string().min(2, 'Fluid type required'),
    volumeMl: z.number().int().min(0, 'Volume min 0').max(10000, 'Volume max 10000'),
});

export const drainItemSchema = z.object({
    type: z.string().min(2, 'Drain type required'),
    site: z.string().min(2, 'Drain site required'),
    outputMl: z.number().int().min(0, 'Output min 0').max(5000, 'Output max 5000'),
});

export const interventionsSchema = z.object({
    medications: z.array(medicationItemSchema).default([]),
    fluids: z.array(fluidItemSchema).default([]),
    urineOutputMl: z.number().int().min(0).optional(),
    drains: z.array(drainItemSchema).default([]),
    dressingStatus: z.string().optional().default(''), // e.g. "Intact", "Oozing", "Re-dressed"
    interventionNotes: z.string().optional().default(''),
});

// ──────────────────────────────────────────────────────────────────────
// D) Discharge Readiness (GATE) Section
// ──────────────────────────────────────────────────────────────────────

export const dischargeCriteriaSchema = z.object({
    vitalsStable: z.boolean(),
    painControlled: z.boolean(),
    nauseaControlled: z.boolean(),
    bleedingControlled: z.boolean(),
    airwayStable: z.boolean(),
});

export const dischargeReadinessSchema = z.object({
    dischargeCriteria: dischargeCriteriaSchema,
    dischargeDecision: dischargeDecisionEnum,
    nurseHandoverNotes: z.string().optional().default(''),
    dischargeTime: optionalTime.default(''),
    // Nurse signature metadata (populated on finalization)
    finalizedByName: z.string().min(2, 'Nurse name is required').optional().default(''),
    finalizedByUserId: z.string().optional().default(''),
    finalizedAt: z.string().optional().default(''), // ISO datetime
});

// ──────────────────────────────────────────────────────────────────────
// Full Form Schema — Draft (lenient, all sections partial)
// ──────────────────────────────────────────────────────────────────────

export const nurseRecoveryRecordDraftSchema = z.object({
    arrivalBaseline: arrivalBaselineSchema.partial().optional().default({}),
    vitalsMonitoring: vitalsMonitoringSchema.partial().optional().default({}),
    interventions: interventionsSchema.partial().optional().default({}),
    dischargeReadiness: dischargeReadinessSchema.deepPartial().optional().default({}),
});

// ──────────────────────────────────────────────────────────────────────
// Full Form Schema — Final (strict, all required enforced)
// ──────────────────────────────────────────────────────────────────────

/**
 * Final schema with refinements:
 * 1. At least one vitals observation OR explicit "not recorded" reason
 * 2. If dischargeDecision !== HOLD, all dischargeCriteria must be true
 * 3. dischargeDecision must be present
 * 4. Nurse signature fields must be present on finalize
 */
export const nurseRecoveryRecordFinalSchema = z
    .object({
        arrivalBaseline: arrivalBaselineSchema,
        vitalsMonitoring: vitalsMonitoringSchema,
        interventions: interventionsSchema,
        dischargeReadiness: dischargeReadinessSchema,
    })
    .refine(
        (data) => {
            // At least one vitals observation or explicit reason
            const hasObs = data.vitalsMonitoring.observations.length > 0;
            const hasReason =
                data.vitalsMonitoring.vitalsNotRecordedReason != null &&
                data.vitalsMonitoring.vitalsNotRecordedReason.trim().length >= 5;
            return hasObs || hasReason;
        },
        {
            message:
                'At least one vitals observation is required, or provide a reason why vitals were not recorded (min 5 chars)',
            path: ['vitalsMonitoring', 'observations'],
        },
    )
    .refine(
        (data) => {
            // If discharge decision is not HOLD, all criteria must be true
            if (data.dischargeReadiness.dischargeDecision === 'HOLD') return true;
            const c = data.dischargeReadiness.dischargeCriteria;
            return (
                c.vitalsStable &&
                c.painControlled &&
                c.nauseaControlled &&
                c.bleedingControlled &&
                c.airwayStable
            );
        },
        {
            message:
                'All discharge criteria must be met when discharge decision is not HOLD',
            path: ['dischargeReadiness', 'dischargeCriteria'],
        },
    )
    .refine(
        (data) => {
            // Nurse signature required
            return (
                data.dischargeReadiness.finalizedByName != null &&
                data.dischargeReadiness.finalizedByName.trim().length >= 2
            );
        },
        {
            message: 'Nurse name is required for finalization',
            path: ['dischargeReadiness', 'finalizedByName'],
        },
    );

// ──────────────────────────────────────────────────────────────────────
// TypeScript Types (inferred from zod)
// ──────────────────────────────────────────────────────────────────────

export type NurseRecoveryRecordData = z.infer<typeof nurseRecoveryRecordFinalSchema>;
export type NurseRecoveryRecordDraft = z.infer<typeof nurseRecoveryRecordDraftSchema>;
export type VitalsObservation = z.infer<typeof vitalsObservationSchema>;
export type MedicationItem = z.infer<typeof medicationItemSchema>;
export type FluidItem = z.infer<typeof fluidItemSchema>;
export type DrainItem = z.infer<typeof drainItemSchema>;
export type DischargeCriteria = z.infer<typeof dischargeCriteriaSchema>;

// ──────────────────────────────────────────────────────────────────────
// Section metadata (for UI rendering)
// ──────────────────────────────────────────────────────────────────────

export interface RecoverySectionMeta {
    key: string;
    title: string;
    icon: string;
    requiredFieldCount: number;
    isCritical?: boolean;
}

export const RECOVERY_SECTIONS: RecoverySectionMeta[] = [
    { key: 'arrivalBaseline', title: 'Arrival & Baseline Assessment', icon: 'HeartPulse', requiredFieldCount: 6 },
    { key: 'vitalsMonitoring', title: 'Vitals Monitoring', icon: 'Activity', requiredFieldCount: 1, isCritical: true },
    { key: 'interventions', title: 'Interventions & Medications', icon: 'Syringe', requiredFieldCount: 0 },
    { key: 'dischargeReadiness', title: 'Discharge Readiness & Handover', icon: 'ClipboardCheck', requiredFieldCount: 6, isCritical: true },
];

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

/**
 * Returns missing required fields for finalization.
 * Runs the final schema and collects ZodError issues.
 */
export function getMissingRecoveryItems(
    data: Partial<NurseRecoveryRecordDraft> | Record<string, unknown>,
): string[] {
    const result = nurseRecoveryRecordFinalSchema.safeParse(data);
    if (result.success) return [];

    return result.error.issues.map((issue) => {
        const path = issue.path.join('.');
        return `${path}: ${issue.message}`;
    });
}

/**
 * Computes section-level completion for progress display.
 */
export function getRecoverySectionCompletion(
    data: Partial<NurseRecoveryRecordDraft> | Record<string, unknown>,
): Record<string, { complete: boolean; errors: string[] }> {
    const schemas: Record<string, z.ZodTypeAny> = {
        arrivalBaseline: arrivalBaselineSchema,
        vitalsMonitoring: vitalsMonitoringSchema,
        interventions: interventionsSchema,
        dischargeReadiness: dischargeReadinessSchema,
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

/**
 * Checks the critical items needed before RECOVERY → COMPLETED transition:
 * - Recovery Record must be FINAL (checked externally in gate; this validates data)
 * - dischargeDecision !== HOLD
 * - All dischargeCriteria must be true (if not HOLD)
 * - At least one vitals observation (or explicit reason)
 * - Nurse signature present
 *
 * Returns array of missing item labels. Empty = safe to transition.
 */
export function getCompletionGateItems(
    data: Partial<NurseRecoveryRecordDraft> | Record<string, unknown>,
): string[] {
    const missing: string[] = [];
    const d = data as any;

    // Arrival baseline
    const arrival = d?.arrivalBaseline ?? {};
    if (!arrival.timeArrivedRecovery) {
        missing.push('Time arrived in recovery not recorded');
    }

    // Vitals: at least one observation or reason
    const vitals = d?.vitalsMonitoring ?? {};
    const hasObs = Array.isArray(vitals.observations) && vitals.observations.length > 0;
    const hasReason =
        typeof vitals.vitalsNotRecordedReason === 'string' &&
        vitals.vitalsNotRecordedReason.trim().length >= 5;
    if (!hasObs && !hasReason) {
        missing.push('No vitals observations recorded and no reason provided');
    }

    // Discharge readiness
    const discharge = d?.dischargeReadiness ?? {};
    const criteria = discharge?.dischargeCriteria ?? {};
    const decision = discharge?.dischargeDecision;

    if (!decision) {
        missing.push('Discharge decision not made');
    } else if (decision === 'HOLD') {
        missing.push('Discharge decision is HOLD — patient cannot be discharged');
    } else {
        // Decision is DISCHARGE_TO_WARD or DISCHARGE_HOME — all criteria must be met
        if (!criteria.vitalsStable) missing.push('Discharge criteria: vitals not stable');
        if (!criteria.painControlled) missing.push('Discharge criteria: pain not controlled');
        if (!criteria.nauseaControlled) missing.push('Discharge criteria: nausea not controlled');
        if (!criteria.bleedingControlled) missing.push('Discharge criteria: bleeding not controlled');
        if (!criteria.airwayStable) missing.push('Discharge criteria: airway not stable');
    }

    // Nurse signature
    if (!discharge.finalizedByName || discharge.finalizedByName.trim().length < 2) {
        missing.push('Nurse signature/name not provided');
    }

    return missing;
}
