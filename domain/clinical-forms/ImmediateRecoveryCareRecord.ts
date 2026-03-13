/**
 * Immediate Recovery Care Record Schema
 * 
 * Post-operative immediate recovery monitoring record
 * Completed by nurse immediately after surgery, before transfer to recovery ward
 */

import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────
// Observation Entry (time-series vitals)
// ──────────────────────────────────────────────────────────────────────

const observationEntrySchema = z.object({
    time: z.string().optional(),
    airway: z.string().optional().default(''),
    o2_flow_l_min: z.number().optional(),
    respiratory_rate: z.number().int().optional(),
    pulse: z.number().int().optional(),
    temperature: z.number().optional(),
    bpSystolic: z.number().int().optional(),
    bpDiastolic: z.number().int().optional(),
    oxygen_saturation: z.number().optional(),
    level_of_consciousness: z.string().optional().default(''),
    head_lift: z.string().optional().default(''),
    limb_observations: z.string().optional().default(''),
});

export type ObservationEntry = z.infer<typeof observationEntrySchema>;

// ──────────────────────────────────────────────────────────────────────
// Checklists
// ──────────────────────────────────────────────────────────────────────

const recoveryChecklistSchema = z.object({
    airway_ett_removed: z.string().optional().default(''),
    wound_dressing_checked: z.string().optional().default(''),
    bleeding: z.string().optional().default(''),
    wound_packs_removed: z.string().optional().default(''),
    drains_present: z.string().optional().default(''),
    implants_present: z.string().optional().default(''),
    x_rays_present: z.string().optional().default(''),
});

export type RecoveryChecklist = z.infer<typeof recoveryChecklistSchema>;

// ──────────────────────────────────────────────────────────────────────
// Nausea & Vomiting
// ──────────────────────────────────────────────────────────────────────

const nauseaVomitingSchema = z.object({
    score: z.number().int().min(0).max(5).optional(),
    ponv_medication_given: z.boolean().optional(),
    ponv_medication_specify: z.string().optional().default(''),
    ponv_medication_time: z.string().optional().default(''),
});

export type NauseaVomiting = z.infer<typeof nauseaVomitingSchema>;

// ──────────────────────────────────────────────────────────────────────
// Pain Assessment
// ──────────────────────────────────────────────────────────────────────

const painAssessmentSchema = z.object({
    pain_score: z.number().int().min(0).max(10).optional(),
    analgesia_given: z.boolean().optional(),
    analgesia_specify: z.string().optional().default(''),
    analgesia_time: z.string().optional().default(''),
});

export type PainAssessment = z.infer<typeof painAssessmentSchema>;

// ──────────────────────────────────────────────────────────────────────
// Fluids & Output
// ──────────────────────────────────────────────────────────────────────

const fluidsOutputSchema = z.object({
    iv_fluids_regime: z.string().optional().default(''),
    iv_fluids_amount: z.string().optional().default(''),
    urine_output_ml_kg_hr: z.number().optional(),
    drains_output: z.string().optional().default(''),
    other_output: z.string().optional().default(''),
    total_output_ml_kg_hr: z.number().optional(),
    total_output: z.string().optional().default(''),
});

export type FluidsOutput = z.infer<typeof fluidsOutputSchema>;

// ──────────────────────────────────────────────────────────────────────
// Drugs Administered
// ──────────────────────────────────────────────────────────────────────

const drugAdministeredSchema = z.object({
    drug_name: z.string().optional(),
    dose: z.string().optional(),
    time: z.string().optional(),
    route: z.string().optional(),
});

export type DrugAdministered = z.infer<typeof drugAdministeredSchema>;

// ──────────────────────────────────────────────────────────────────────
// Specimen
// ──────────────────────────────────────────────────────────────────────

const specimenSchema = z.object({
    specimen_taken: z.boolean().optional(),
    taken_to: z.string().optional().default(''),
    taken_by: z.string().optional().default(''),
});

export type Specimen = z.infer<typeof specimenSchema>;

// ──────────────────────────────────────────────────────────────────────
// Handover
// ──────────────────────────────────────────────────────────────────────

const handoverSchema = z.object({
    handover_given_by: z.string().optional().default(''),
    time: z.string().optional().default(''),
    patient_position: z.string().optional().default(''),
});

export type Handover = z.infer<typeof handoverSchema>;

// ──────────────────────────────────────────────────────────────────────
// Recovery Room Handover
// ──────────────────────────────────────────────────────────────────────

const recoveryRoomHandoverSchema = z.object({
    transferred_by: z.string().optional().default(''),
    receiving_nurse: z.string().optional().default(''),
    signature: z.string().optional().default(''),
    time: z.string().optional().default(''),
});

export type RecoveryRoomHandover = z.infer<typeof recoveryRoomHandoverSchema>;

// ──────────────────────────────────────────────────────────────────────
// Ward Recipient
// ──────────────────────────────────────────────────────────────────────

const wardRecipientSchema = z.object({
    receiving_nurse: z.string().optional().default(''),
    signature: z.string().optional().default(''),
    time: z.string().optional().default(''),
});

export type WardRecipient = z.infer<typeof wardRecipientSchema>;

// ──────────────────────────────────────────────────────────────────────
// Full Form Schemas
// ──────────────────────────────────────────────────────────────────────

export const immediateRecoveryCareRecordDraftSchema = z.object({
    handover: handoverSchema.partial().default({}),
    observations: z.array(observationEntrySchema).default([]),
    checklists: recoveryChecklistSchema.partial().default({}),
    nausea_vomiting: nauseaVomitingSchema.partial().default({}),
    pain: painAssessmentSchema.partial().default({}),
    fluids_and_output: fluidsOutputSchema.partial().default({}),
    drugs_administered: z.array(drugAdministeredSchema).default([]),
    specimen: specimenSchema.partial().default({}),
    comments: z.string().optional().default(''),
    recommended_position: z.string().optional().default(''),
    recovery_room_handover: recoveryRoomHandoverSchema.partial().default({}),
    ward_recipient: wardRecipientSchema.partial().default({}),
});

export type ImmediateRecoveryCareRecordDraft = z.infer<typeof immediateRecoveryCareRecordDraftSchema>;

// Final schema requires some fields to be completed
export const immediateRecoveryCareRecordFinalSchema = immediateRecoveryCareRecordDraftSchema.extend({
    handover: handoverSchema,
    observations: z.array(observationEntrySchema).min(1, 'At least one observation entry is required'),
    checklists: recoveryChecklistSchema,
    recovery_room_handover: recoveryRoomHandoverSchema,
    ward_recipient: wardRecipientSchema,
});

export type ImmediateRecoveryCareRecordFinal = z.infer<typeof immediateRecoveryCareRecordFinalSchema>;

// ──────────────────────────────────────────────────────────────────────
// Template Constants
// ──────────────────────────────────────────────────────────────────────

export const RECOVERY_CARE_TEMPLATE_KEY = 'NURSE_IMMEDIATE_RECOVERY_CARE';
export const RECOVERY_CARE_TEMPLATE_VERSION = 1;

// ──────────────────────────────────────────────────────────────────────
// Section Definitions
// ──────────────────────────────────────────────────────────────────────

export interface RecoveryCareSectionMeta {
    key: string;
    title: string;
    icon: string;
    requiredFieldCount: number;
    isCritical?: boolean;
}

export const RECOVERY_CARE_SECTIONS: RecoveryCareSectionMeta[] = [
    { key: 'handover', title: 'Handover from Theater', icon: 'User2', requiredFieldCount: 1 },
    { key: 'observations', title: 'Observations', icon: 'Activity', requiredFieldCount: 1, isCritical: true },
    { key: 'checklists', title: 'Clinical Checklists', icon: 'CheckSquare', requiredFieldCount: 1, isCritical: true },
    { key: 'nausea_vomiting', title: 'Nausea & Vomiting', icon: 'Siren', requiredFieldCount: 0 },
    { key: 'pain', title: 'Pain Assessment', icon: 'Bandage', requiredFieldCount: 0 },
    { key: 'fluids_and_output', title: 'IV Fluids & Output', icon: 'Droplet', requiredFieldCount: 0 },
    { key: 'drugs_administered', title: 'Drugs Administered', icon: 'Pill', requiredFieldCount: 0 },
    { key: 'specimen', title: 'Specimen', icon: 'TestTube', requiredFieldCount: 0 },
    { key: 'handoff', title: 'Recovery Room Handover', icon: 'ArrowRight', requiredFieldCount: 3, isCritical: true },
];

// ──────────────────────────────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────────────────────────────

/**
 * Get missing required fields for finalization
 */
export function getMissingRecoveryCareItems(data: Partial<ImmediateRecoveryCareRecordDraft> | Record<string, unknown>): string[] {
    const missing: string[] = [];
    
    const d = data as Record<string, unknown>;
    
    // Handover required
    const handover = d.handover as Record<string, unknown> | undefined;
    if (!handover?.handover_given_by) {
        missing.push('handover.handover_given_by');
    }
    
    // At least one observation
    const observations = d.observations as unknown[] | undefined;
    if (!observations || observations.length === 0) {
        missing.push('observations (at least one entry required)');
    }
    
    // Recovery room handover
    const rrHandover = d.recovery_room_handover as Record<string, unknown> | undefined;
    if (!rrHandover?.transferred_by) {
        missing.push('recovery_room_handover.transferred_by');
    }
    if (!rrHandover?.receiving_nurse) {
        missing.push('recovery_room_handover.receiving_nurse');
    }
    if (!rrHandover?.time) {
        missing.push('recovery_room_handover.time');
    }
    
    return missing;
}
