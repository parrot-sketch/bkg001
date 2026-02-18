import { z } from 'zod';

/**
 * Domain Logic: Nurse Intra-Operative Record
 * 
 * This file defines the comprehensive domain model for the Intra-Operative Nurse Record.
 * Includes schemas for all 14 clinical sections, completion logic, and recovery gates.
 */

// 1. Constants and Enums
export const INTRAOP_TEMPLATE_KEY = 'NURSE_INTRAOP_RECORD' as const;
export const INTRAOP_TEMPLATE_VERSION = 2;

// 2. Sub-Schemas for specific sections

export const theatreEntrySchema = z.object({
    arrivalTime: z.string().optional(),
    arrivalMethod: z.string().optional(), // STRETCHER, WHEELCHAIR, WALKING
    identityChecked: z.boolean().optional(),
    consentFormChecked: z.boolean().optional(),
    siteMarked: z.boolean().optional(),
    theatreEntryTime: z.string().optional(),
    timeIn: z.string().optional(), // UI uses timeIn
    asaClass: z.string().optional(),
    allergies: z.string().optional(),
    comments: z.string().optional(),
});

export const safetyChecksSchema = z.object({
    whoSignIndone: z.boolean().optional(),
    whoTimeOutDone: z.boolean().optional(),
    whoSignOutDone: z.boolean().optional(),
    ivSiteChecked: z.boolean().optional(),
    ivPatencyChecked: z.boolean().optional(),
    patientIdVerified: z.boolean().optional(),
    informedConsentSigned: z.boolean().optional(),
    preOpChecklistCompleted: z.boolean().optional(),
    whoChecklistCompleted: z.boolean().optional(),
    arrivedWithIvInfusing: z.boolean().optional(),
    ivStartedBy: z.string().optional(),
    ivStartTime: z.string().optional(),
    antibioticOrdered: z.boolean().optional(),
    antibioticType: z.string().optional(),
    antibioticOrderedBy: z.string().optional(),
    antibioticTime: z.string().optional(),
});

export const timingsSchema = z.object({
    anaesthesiaStart: z.string().optional(),
    surgeryStart: z.string().optional(),
    surgeryEnd: z.string().optional(),
    anaesthesiaEnd: z.string().optional(),
    theatreExitTime: z.string().optional(),
    timeIntoTheatre: z.string().optional(),
    timeOutOfTheatre: z.string().optional(),
    operationStart: z.string().optional(),
    operationFinish: z.string().optional(),
});

export const staffingSchema = z.object({
    surgeon: z.string().optional(),
    assistant: z.string().optional(),
    anaesthesiologist: z.string().optional(),
    scrubNurse: z.string().optional(),
    circulatingNurse: z.string().optional(),
    observers: z.string().optional(),
});

export const diagnosesSchema = z.object({
    preOpDiagnosis: z.string().optional(),
    postOpDiagnosis: z.string().optional(),
    intraOpDiagnosis: z.string().optional(),
    procedureDone: z.string().optional(),
    operationPerformed: z.string().optional(),
    side: z.enum(['LEFT', 'RIGHT', 'BILATERAL', 'N/A']).optional(),
});

export const catheterSchema = z.object({
    catheterInserted: z.boolean().optional(),
    catheterType: z.string().optional(),
    catheterSize: z.string().optional(),
    type: z.string().optional(), // UI compatibility
    size: z.string().optional(), // UI compatibility
    insertionTime: z.string().optional(),
    insertedBy: z.string().optional(),
    inSitu: z.boolean().optional(),
    insertedInTheatre: z.boolean().optional(),
});

export const surgicalDetailsSchema = z.object({
    woundClassification: z.enum(['CLEAN', 'CLEAN_CONTAMINATED', 'CONTAMINATED', 'DIRTY']).optional(),
    woundClass: z.string().optional(), // For UI compatibility
    drainsPlaced: z.boolean().optional(),
    drainType: z.array(z.string()).optional().default([]),
    otherDrainType: z.string().optional(),
    drainSite: z.string().optional(),
    implantsUsed: z.boolean().optional(),
    woundIrrigation: z.array(z.string()).optional().default([]),
    otherIrrigation: z.string().optional(),
    woundPackType: z.string().optional(),
    woundPackSite: z.string().optional(),
    intraOpXraysTaken: z.string().optional(),
});

export const electrosurgicalSchema = z.object({
    cauteryUsed: z.boolean().optional(),
    unitNo: z.string().optional(),
    mode: z.string().optional(),
    cutSet: z.string().optional(),
    coagSet: z.string().optional(),
    skinCheckedBefore: z.boolean().optional(),
    skinCheckedAfter: z.boolean().optional(),
    plateSite: z.string().optional(),
});

export const tourniquetSchema = z.object({
    tourniquetUsed: z.boolean().optional(),
    site: z.string().optional(),
    type: z.string().optional(),
    laterality: z.string().optional(),
    pressure: z.string().optional(),
    onTime: z.string().optional(),
    offTime: z.string().optional(),
    timeOn: z.string().optional(), // UI compatibility
    timeOff: z.string().optional(), // UI compatibility
    skinCheckedBefore: z.boolean().optional(),
    skinCheckedAfter: z.boolean().optional(),
});

export const positioningSchema = z.object({
    position: z.string().optional(),
    otherPosition: z.string().optional(),
    safetyBeltApplied: z.boolean().optional(),
    safetyBeltPosition: z.string().optional(),
    armsSecured: z.boolean().optional(),
    armsPosition: z.string().optional(),
    bodyAlignmentCorrect: z.boolean().optional(),
    pressurePointsDescribe: z.string().optional(),
    skinProtected: z.boolean().optional(),
    nerveProtected: z.boolean().optional(),
});

export const countItemSchema = z.object({
    name: z.string(),
    preliminary: z.number().default(0),
    woundClosure: z.number().default(0),
    final: z.number().default(0),
});

export const countsSchema = z.object({
    swabsCorrect: z.boolean().optional(),
    instrumentsCorrect: z.boolean().optional(),
    sharpsCorrect: z.boolean().optional(),
    countCorrect: z.boolean().optional(),
    comments: z.string().optional(),
    actionIfIncorrect: z.string().optional(),
    scrubNurseSignature: z.string().optional(),
    circulatingNurseSignature: z.string().optional(),
    items: z.array(countItemSchema).optional().default([]),
});

export const closureSchema = z.object({
    skinClosureMethod: z.string().optional(),
    skinClosure: z.string().optional(),
    dressingType: z.string().optional(),
    dressingApplied: z.string().optional(),
    countVerifiedBy: z.string().optional(),
});

export const fluidsSchema = z.object({
    estimatedBloodLossMl: z.number(),
    urinaryOutputMl: z.number(),
    ivFluidsAdministered: z.string().optional(),
    bloodTransfusionPackedCellsMl: z.number().optional().default(0),
    bloodTransfusionWholeMl: z.number().optional().default(0),
    bloodTransfusionOtherMl: z.number().optional().default(0),
    ivInfusionTotalMl: z.number().optional().default(0),
});

// Table Structures
export const medicationItemSchema = z.object({
    name: z.string().optional(),
    drug: z.string().optional(), // UI compatibility
    dose: z.string().optional(),
    route: z.string().optional(),
    time: z.string().optional(),
    administeredBy: z.string().optional(),
    sign: z.string().optional(), // UI compatibility
});

export const implantItemSchema = z.object({
    name: z.string().optional(),
    item: z.string().optional(), // UI compatibility
    serialNumber: z.string().optional(),
    lotNo: z.string().optional(), // UI compatibility
    manufacturer: z.string().optional(),
    expiryDate: z.string().optional(),
    size: z.string().optional(),
});

export const specimenItemSchema = z.object({
    type: z.string().optional(),
    site: z.string().optional(),
    labRequestSent: z.boolean().optional(),
    histology: z.boolean().optional(),
    cytology: z.boolean().optional(),
    notForAnalysis: z.boolean().optional(),
    disposition: z.string().optional(),
});

// 3. Root Schemas

// Strict schema for Finalization
export const nurseIntraOpRecordFinalSchema = z.object({
    entry: theatreEntrySchema,
    safety: safetyChecksSchema,
    timings: timingsSchema,
    staffing: staffingSchema,
    diagnoses: diagnosesSchema,
    catheter: catheterSchema,
    positioning: positioningSchema,
    skinPrep: z.object({
        agentUsed: z.string().optional(),
        preppedBy: z.string().optional(),
        shavedBy: z.string().optional(),
        prepAgent: z.string().optional(),
        otherPrepAgent: z.string().optional(),
    }),
    equipment: z.object({
        electrosurgical: electrosurgicalSchema,
        tourniquet: tourniquetSchema,
    }),
    surgicalDetails: surgicalDetailsSchema,
    counts: countsSchema,
    closure: closureSchema,
    fluids: fluidsSchema,
    medications: z.array(medicationItemSchema).default([]),
    implants: z.array(implantItemSchema).default([]),
    specimens: z.array(specimenItemSchema).default([]),
    itemsToReturnToTheatre: z.string().default(''),
    billing: z.object({
        anaestheticMaterialsCharge: z.string().default(''),
        theatreFee: z.string().default(''),
    }),
});

// Draft schema allows everything to be optional
export const nurseIntraOpRecordDraftSchema = z.object({
    entry: theatreEntrySchema.partial().optional().default({}),
    safety: safetyChecksSchema.partial().optional().default({}),
    timings: timingsSchema.partial().optional().default({}),
    staffing: staffingSchema.partial().optional().default({}),
    diagnoses: diagnosesSchema.partial().optional().default({}),
    catheter: catheterSchema.partial().optional().default({}),
    positioning: positioningSchema.partial().optional().default({}),
    skinPrep: z.object({
        agentUsed: z.string().optional(),
        preppedBy: z.string().optional(),
        shavedBy: z.string().optional(),
        prepAgent: z.string().optional(),
        otherPrepAgent: z.string().optional(),
    }).partial().optional().default({}),
    equipment: z.object({
        electrosurgical: electrosurgicalSchema.partial(),
        tourniquet: tourniquetSchema.partial(),
    }).partial().optional().default({}),
    surgicalDetails: surgicalDetailsSchema.partial().optional().default({}),
    counts: countsSchema.partial().optional().default({}),
    closure: closureSchema.partial().optional().default({}),
    fluids: fluidsSchema.partial().optional().default({}),
    medications: z.array(medicationItemSchema).optional().default([]),
    implants: z.array(implantItemSchema).optional().default([]),
    specimens: z.array(specimenItemSchema).optional().default([]),
    itemsToReturnToTheatre: z.string().optional().default(''),
    billing: z.object({
        anaestheticMaterialsCharge: z.string().optional().default(''),
        theatreFee: z.string().optional().default(''),
    }).partial().optional().default({}),
});

// 4. Types
export type NurseIntraOpRecordData = z.infer<typeof nurseIntraOpRecordFinalSchema>;
export type NurseIntraOpRecordDraft = z.infer<typeof nurseIntraOpRecordDraftSchema>;
export type MedicationItem = z.infer<typeof medicationItemSchema>;
export type ImplantItem = z.infer<typeof implantItemSchema>;
export type SpecimenItem = z.infer<typeof specimenItemSchema>;

// 5. Constants for UI
export const INTRAOP_SECTIONS = [
    { key: 'entry', title: 'Arrival & Entry', icon: 'LogIn' },
    { key: 'safety', title: 'Safety Checks & IV', icon: 'ShieldCheck', isCritical: true },
    { key: 'timings', title: 'Theatrical Timings', icon: 'Clock' },
    { key: 'staffing', title: 'Surgical Team', icon: 'Users' },
    { key: 'diagnoses', title: 'Diagnoses & Operation', icon: 'Stethoscope' },
    { key: 'positioning', title: 'Positioning & alignment', icon: 'UserCheck' },
    { key: 'catheter', title: 'Catheterization', icon: 'Droplets' },
    { key: 'skinPrep', title: 'Skin Preparation', icon: 'Sparkles' },
    { key: 'equipment', title: 'Equipment (Cautery/Tourniquet)', icon: 'Zap' },
    { key: 'surgicalDetails', title: 'Surgical Details (Drains/Class)', icon: 'Activity' },
    { key: 'counts', title: 'Instruments & Sharps Count', icon: 'ListCheck', isCritical: true },
    { key: 'closure', title: 'Closure & Dressing', icon: 'Bandage' },
    { key: 'fluids', title: 'Fluids & Transfusions', icon: 'Droplet' },
    { key: 'tables', title: 'Medications, Implants & Specimens', icon: 'Table' },
];

// Heuristics for Completion
export function getIntraOpSectionCompletion(data: any) {
    const sections: Record<string, { complete: boolean }> = {};
    if (!data) return sections;

    for (const section of INTRAOP_SECTIONS) {
        const key = section.key === 'tables' ? 'medications' : section.key;
        const sectionData = data[key];

        if (!sectionData) {
            sections[section.key] = { complete: false };
            continue;
        }

        if (section.key === 'tables') {
            const hasMeds = (data.medications?.length ?? 0) > 0;
            const hasImplants = (data.implants?.length ?? 0) > 0;
            const hasSpecimens = (data.specimens?.length ?? 0) > 0;
            sections.tables = { complete: hasMeds || hasImplants || hasSpecimens };
        } else if (section.key === 'counts') {
            sections.counts = { complete: !!sectionData.countCorrect };
        } else if (section.key === 'equipment') {
            const hasCautery = !!sectionData.electrosurgical?.unitNo;
            const hasTourniquet = !!sectionData.tourniquet?.site;
            sections.equipment = { complete: hasCautery || hasTourniquet || sectionData.electrosurgical?.cauteryUsed === false };
        } else {
            // General heuristic: check if at least one field is filled
            const hasValue = Object.values(sectionData).some(v => v !== '' && v !== null && v !== undefined && v !== false);
            sections[section.key] = { complete: hasValue };
        }
    }
    return sections;
}

// Discharge/Recovery Gate Compliance
export function checkNurseRecoveryGateCompliance(data: any) {
    const missing: string[] = [];
    if (!data) return ['Record data is missing'];

    // Core clinical safety requirements for recovery transfer
    if (!data.counts || !data.counts.countCorrect) {
        missing.push('Surgical counts (instruments, swabs, sharps) are incorrect or unverified');
    }

    if (!data.safety || !data.safety.whoSignOutDone) {
        missing.push('WHO Sign-Out process incomplete');
    }

    return missing;
}
