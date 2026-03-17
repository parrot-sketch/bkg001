/**
 * Nurse Intra-Operative Record - Complete Data Model
 * Nairobi Sculpt Aesthetic Centre
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const ArrivalModeEnum = z.enum(['Stretcher', 'Wheelchair', 'Walking']);
export type ArrivalMode = z.infer<typeof ArrivalModeEnum>;

export const SexEnum = z.enum(['Male', 'Female', 'Other']);
export type Sex = z.infer<typeof SexEnum>;

export const ASAClassEnum = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export type ASAClass = z.infer<typeof ASAClassEnum>;

export const PatientPositionEnum = z.enum(['RA', 'LA', 'RL', 'LL', 'Other']);
export type PatientPosition = z.infer<typeof PatientPositionEnum>;

export const SurgicalPositionEnum = z.enum(['Prone', 'Supine', 'Lateral', 'Lithotomy', 'Other']);
export type SurgicalPosition = z.infer<typeof SurgicalPositionEnum>;

export const TourniquetSideEnum = z.enum(['Rt.', 'Lt.']);
export type TourniquetSide = z.infer<typeof TourniquetSideEnum>;

export const AnaesthesiaTypeEnum = z.enum(['General', 'Spinal', 'Regional', 'Local']);
export type AnaesthesiaType = z.infer<typeof AnaesthesiaTypeEnum>;

export const WoundClassEnum = z.enum(['Clean', 'Clean Contaminated', 'Contaminated', 'Infected']);
export type WoundClass = z.infer<typeof WoundClassEnum>;

export const YesNoEnum = z.enum(['Y', 'N']);
export type YesNo = z.infer<typeof YesNoEnum>;

// ============================================================================
// SUB-SCHEMAS
// ============================================================================

export const SkinPrepAgentEnum = z.enum([
  'Hibitane in Spirit',
  'Povidone Iodine',
  'Hibitane in Water',
  'Other'
]);
export type SkinPrepAgent = z.infer<typeof SkinPrepAgentEnum>;

export const DrainTypeEnum = z.enum(['Corrugated', 'Portovac', 'UWS', 'NG', 'Other']);
export type DrainType = z.infer<typeof DrainTypeEnum>;

export const WoundIrrigationEnum = z.enum([
  'Saline',
  'Water',
  'Povidone Iodine',
  'Antibiotic',
  'Other'
]);
export type WoundIrrigation = z.infer<typeof WoundIrrigationEnum>;

// ============================================================================
// DYNAMIC ROW SCHEMAS
// ============================================================================

export const MedicationRowSchema = z.object({
  id: z.string(),
  drug: z.string(),
  route: z.string(),
  time: z.string(),
  sign: z.string(),
});
export type MedicationRow = z.infer<typeof MedicationRowSchema>;

export const ImplantRowSchema = z.object({
  id: z.string(),
  description: z.string(),
  lotNo: z.string(),
  size: z.string(),
});
export type ImplantRow = z.infer<typeof ImplantRowSchema>;

export const SpecimenRowSchema = z.object({
  id: z.string(),
  type: z.string(),
  histology: z.boolean(),
  cytology: z.boolean(),
  notForAnalysis: z.boolean(),
  disposition: z.string(),
});
export type SpecimenRow = z.infer<typeof SpecimenRowSchema>;

// ============================================================================
// SWAB COUNT SCHEMA
// ============================================================================

export const SwabCountSchema = z.object({
  abdominalSwabs: z.number().min(0),
  raytecSwabs: z.number().min(0),
  throatPacks: z.number().min(0),
  other: z.number().min(0),
});
export type SwabCount = z.infer<typeof SwabCountSchema>;

// ============================================================================
// MAIN FORM SCHEMA
// ============================================================================

export const NurseIntraOpRecordSchema = z.object({
  // Patient & Case Info
  patientFileNo: z.string().min(1, 'Patient File No. is required'),
  patientName: z.string().min(1, 'Patient Name is required'),
  age: z.number().optional(),
  sex: SexEnum.optional(),
  date: z.string().min(1, 'Date is required'),
  doctor: z.string().min(1, 'Doctor is required'),

  // Arrival & Pre-Theatre Assessment
  arrivalDate: z.string().optional(),
  timeIn: z.string().optional(),
  arrivalMode: ArrivalModeEnum.optional(),
  allergies: z.string().optional(),
  asaClass: ASAClassEnum.optional(),
  comments: z.string().optional(),

  // Pre-op Checklist
  patientIdVerified: YesNoEnum.optional(),
  informedConsentSigned: YesNoEnum.optional(),
  preOpChecklistCompleted: YesNoEnum.optional(),
  whoChecklistCompleted: YesNoEnum.optional(),
  arrivedWithIVInfusing: YesNoEnum.optional(),

  // Theatre Setup & Safety
  ivStartedBy: z.string().optional(),
  ivStartTime: z.string().optional(),
  patientPosition: PatientPositionEnum.optional(),
  patientPositionOther: z.string().optional(),
  antibioticOrdered: YesNoEnum.optional(),
  antibioticType: z.string().optional(),
  antibioticOrderedBy: z.string().optional(),
  antibioticTime: z.string().optional(),

  timeInTheatre: z.string().optional(),
  timeOutOfTheatre: z.string().optional(),
  operationStart: z.string().optional(),
  operationFinish: z.string().optional(),

  safetyBeltApplied: YesNoEnum.optional(),
  safetyBeltPosition: z.string().optional(),
  armsSecured: YesNoEnum.optional(),
  armsPosition: z.string().optional(),
  properBodyAlignment: YesNoEnum.optional(),
  pressurePointsDescription: z.string().optional(),

  surgicalPosition: SurgicalPositionEnum.optional(),
  surgicalPositionOther: z.string().optional(),

  shavedBy: z.string().optional(),
  skinPrepAgents: z.array(SkinPrepAgentEnum).optional(),
  skinPrepOther: z.string().optional(),

  urinaryCatheterInSitu: YesNoEnum.optional(),
  urinaryCatheterInsertedInTheatre: YesNoEnum.optional(),
  catheterType: z.string().optional(),
  catheterSize: z.string().optional(),
  intraOpXRays: z.string().optional(),

  // Electrosurgical
  electrosurgicalUnitNo: z.string().optional(),
  electrosurgicalMode: z.string().optional(),
  coatSet: z.string().optional(),
  cutSet: z.string().optional(),
  electrosurgicalSkinCheckedBefore: z.string().optional(),
  electrosurgicalSkinCheckedAfter: z.string().optional(),

  // Tourniquet
  tourniquetType: z.string().optional(),
  tourniquetSite: z.string().optional(),
  tourniquetSide: TourniquetSideEnum.optional(),
  tourniquetPressure: z.number().optional(),
  tourniquetTimeOn: z.string().optional(),
  tourniquetTimeOff: z.string().optional(),
  tourniquetSkinCheckedBefore: z.string().optional(),
  tourniquetSkinCheckedAfter: z.string().optional(),

  // Anaesthesia
  anaesthesiaType: AnaesthesiaTypeEnum.optional(),
  anaesthesiaDetail: z.string().optional(),
  anaesthesiologist: z.string().optional(),

  // Intra-op Events
  drainTypes: z.array(DrainTypeEnum).optional(),
  drainTypeOther: z.string().optional(),
  woundIrrigation: z.array(WoundIrrigationEnum).optional(),
  woundIrrigationOther: z.string().optional(),
  woundPackType: z.string().optional(),
  woundPackSite: z.string().optional(),
  woundClass: WoundClassEnum.optional(),

  // Swabs, Instruments & Sharps Count
  swabsCount: z.object({
    preliminaryCheck: SwabCountSchema,
    woundClosure: SwabCountSchema,
    finalCount: SwabCountSchema,
  }).optional(),
  countCorrect: YesNoEnum.optional(),
  countActionTaken: z.string().optional(),
  scrubNurseSignature: z.string().optional(),
  circulatingNurseSignature: z.string().optional(),

  // Wound Closure & Dressing
  nonAbsorbableSuture: z.string().optional(),
  absorbableSuture: z.string().optional(),
  otherClosure: z.string().optional(),
  dressingApplied: z.string().optional(),

  // Fluids, Blood & Output
  packedCellsML: z.number().optional(),
  wholeBloodML: z.number().optional(),
  otherBloodProductsML: z.number().optional(),
  ivInfusionML: z.number().optional(),
  estimatedBloodLossML: z.number().optional(),
  urinaryOutputML: z.number().optional(),

  // Dynamic Tables
  medications: z.array(MedicationRowSchema).optional(),
  implants: z.array(ImplantRowSchema).optional(),
  specimens: z.array(SpecimenRowSchema).optional(),

  // Theatre Team
  surgeon: z.string().optional(),
  assistant: z.string().optional(),
  scrubNurse: z.string().optional(),
  circulatingNurse: z.string().optional(),
  observers: z.string().optional(),

  // Diagnosis & Operations
  preOpDiagnosis: z.string().optional(),
  intraOpDiagnosis: z.string().optional(),
  operationsPerformed: z.string().optional(),

  // Financial Summary
  anaestheticMaterialsCharge: z.number().optional(),
  theatreFee: z.number().optional(),
}).superRefine((data, ctx) => {
  // Conditional validation: antibiotic fields required if antibioticOrdered = 'Y'
  if (data.antibioticOrdered === 'Y') {
    if (!data.antibioticType || data.antibioticType.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Antibiotic type is required when antibiotic is ordered',
        path: ['antibioticType'],
      });
    }
    if (!data.antibioticOrderedBy || data.antibioticOrderedBy.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ordered by is required when antibiotic is ordered',
        path: ['antibioticOrderedBy'],
      });
    }
    if (!data.antibioticTime || data.antibioticTime.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Time is required when antibiotic is ordered',
        path: ['antibioticTime'],
      });
    }
  }

  // Conditional validation: countActionTaken required if countCorrect = 'N'
  if (data.countCorrect === 'N') {
    if (!data.countActionTaken || data.countActionTaken.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Action taken is required when count is incorrect',
        path: ['countActionTaken'],
      });
    }
  }

  // Surgical position Other requires text
  if (data.surgicalPosition === 'Other') {
    if (!data.surgicalPositionOther || data.surgicalPositionOther.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please specify other surgical position',
        path: ['surgicalPositionOther'],
      });
    }
  }

  // Patient position Other requires text
  if (data.patientPosition === 'Other') {
    if (!data.patientPositionOther || data.patientPositionOther.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please specify other patient position',
        path: ['patientPositionOther'],
      });
    }
  }
});

export type NurseIntraOpRecord = z.infer<typeof NurseIntraOpRecordSchema>;

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export function createEmptyRecord(): NurseIntraOpRecord {
  return {
    patientFileNo: '',
    patientName: '',
    age: undefined,
    sex: undefined,
    date: new Date().toISOString().split('T')[0],
    doctor: '',
    arrivalDate: new Date().toISOString().split('T')[0],
    timeIn: '',
    arrivalMode: undefined,
    allergies: '',
    asaClass: undefined,
    comments: '',
    patientIdVerified: undefined,
    informedConsentSigned: undefined,
    preOpChecklistCompleted: undefined,
    whoChecklistCompleted: undefined,
    arrivedWithIVInfusing: undefined,
    ivStartedBy: '',
    ivStartTime: '',
    patientPosition: undefined,
    patientPositionOther: '',
    antibioticOrdered: undefined,
    antibioticType: '',
    antibioticOrderedBy: '',
    antibioticTime: '',
    timeInTheatre: '',
    timeOutOfTheatre: '',
    operationStart: '',
    operationFinish: '',
    safetyBeltApplied: undefined,
    safetyBeltPosition: '',
    armsSecured: undefined,
    armsPosition: '',
    properBodyAlignment: undefined,
    pressurePointsDescription: '',
    surgicalPosition: undefined,
    surgicalPositionOther: '',
    shavedBy: '',
    skinPrepAgents: [],
    skinPrepOther: '',
    urinaryCatheterInSitu: undefined,
    urinaryCatheterInsertedInTheatre: undefined,
    catheterType: '',
    catheterSize: '',
    intraOpXRays: '',
    electrosurgicalUnitNo: '',
    electrosurgicalMode: '',
    coatSet: '',
    cutSet: '',
    electrosurgicalSkinCheckedBefore: '',
    electrosurgicalSkinCheckedAfter: '',
    tourniquetType: '',
    tourniquetSite: '',
    tourniquetSide: undefined,
    tourniquetPressure: undefined,
    tourniquetTimeOn: '',
    tourniquetTimeOff: '',
    tourniquetSkinCheckedBefore: '',
    tourniquetSkinCheckedAfter: '',
    anaesthesiaType: undefined,
    anaesthesiaDetail: '',
    anaesthesiologist: '',
    drainTypes: [],
    drainTypeOther: '',
    woundIrrigation: [],
    woundIrrigationOther: '',
    woundPackType: '',
    woundPackSite: '',
    woundClass: undefined,
    swabsCount: {
      preliminaryCheck: { abdominalSwabs: 0, raytecSwabs: 0, throatPacks: 0, other: 0 },
      woundClosure: { abdominalSwabs: 0, raytecSwabs: 0, throatPacks: 0, other: 0 },
      finalCount: { abdominalSwabs: 0, raytecSwabs: 0, throatPacks: 0, other: 0 },
    },
    countCorrect: undefined,
    countActionTaken: '',
    scrubNurseSignature: '',
    circulatingNurseSignature: '',
    nonAbsorbableSuture: '',
    absorbableSuture: '',
    otherClosure: '',
    dressingApplied: '',
    packedCellsML: undefined,
    wholeBloodML: undefined,
    otherBloodProductsML: undefined,
    ivInfusionML: undefined,
    estimatedBloodLossML: undefined,
    urinaryOutputML: undefined,
    medications: [],
    implants: [],
    specimens: [],
    surgeon: '',
    assistant: '',
    scrubNurse: '',
    circulatingNurse: '',
    observers: '',
    preOpDiagnosis: '',
    intraOpDiagnosis: '',
    operationsPerformed: '',
    anaestheticMaterialsCharge: undefined,
    theatreFee: undefined,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) return 'KES 0';
  return `KES ${amount.toLocaleString()}`;
}
