import { z } from 'zod';
import {
  yesNoEnum,
  arrivalModeEnum,
  asaClassEnum,
  cannulaPositionEnum,
  patientPositionEnum,
  tourniquetSideEnum,
  anaesthesiaTypeEnum,
  woundClassEnum,
  sexEnum,
  skinPrepAgentEnum,
  drainTypeEnum,
  woundIrrigationEnum,
  signatureProofSchema,
} from './NurseIntraOpRecord.constants';
import {
  medicationRowSchema,
  implantRowSchema,
  specimenRowSchema,
  swabsCountTableSchema,
} from './NurseIntraOpRecord.tables';

// ──────────────────────────────────────────────────────────────────────
// Draft schema (lenient, allows empty strings)
// ──────────────────────────────────────────────────────────────────────

export const nurseIntraOpRecordDraftSchema = z
  .object({
    // Patient identification
    patientFileNo: z.string().optional().default(''),
    patientName: z.string().optional().default(''),
    age: z.number().optional(),
    sex: sexEnum.optional(),
    date: z.string().optional().default(''),
    doctor: z.string().optional().default(''),

    // Arrival details
    arrivalDate: z.string().optional().default(''),
    timeIn: z.string().optional().default(''),
    arrivalMode: arrivalModeEnum.optional(),
    allergies: z.string().optional().default(''),
    asaClass: asaClassEnum.optional(),
    comments: z.string().optional().default(''),

    // Pre-op checklist (Y/N)
    patientIdVerified: yesNoEnum.optional(),
    informedConsentSigned: yesNoEnum.optional(),
    preOpChecklistCompleted: yesNoEnum.optional(),
    whoChecklistCompleted: yesNoEnum.optional(),
    arrivedWithIVInfusing: yesNoEnum.optional(),

    // IV start details
    ivStartedBy: z.string().optional().default(''),
    ivStartTime: z.string().optional().default(''),
    cannulaPosition: cannulaPositionEnum.optional(),
    cannulaPositionOther: z.string().optional().default(''),

    // Theatre timing & safety
    antibioticOrdered: yesNoEnum.optional(),
    antibioticType: z.string().optional().default(''),
    antibioticOrderedBy: z.string().optional().default(''),
    antibioticTime: z.string().optional().default(''),
    timeInTheatre: z.string().optional().default(''),
    timeOutOfTheatre: z.string().optional().default(''),
    operationStart: z.string().optional().default(''),
    operationFinish: z.string().optional().default(''),
    safetyBeltApplied: yesNoEnum.optional(),
    safetyBeltPosition: z.string().optional().default(''),
    armsSecured: yesNoEnum.optional(),
    armsPosition: z.string().optional().default(''),
    properBodyAlignment: yesNoEnum.optional(),
    pressurePointsDescription: z.string().optional().default(''),

    // Urinary catheter & intra-op imaging
    urinaryCatheterInSitu: yesNoEnum.optional(),
    urinaryCatheterInsertedInTheatre: yesNoEnum.optional(),
    catheterType: z.string().optional().default(''),
    catheterSize: z.string().optional().default(''),
    intraOpXRays: z.string().optional().default(''),

    // Patient position (tick)
    patientPosition: patientPositionEnum.optional(),
    patientPositionOther: z.string().optional().default(''),

    // Skin prep
    shavedBy: z.string().optional().default(''),
    skinPrepAgents: z.array(skinPrepAgentEnum).optional().default([]),
    skinPrepOther: z.string().optional().default(''),

    // Electrosurgical unit
    electrosurgicalUnitNo: z.string().optional().default(''),
    electrosurgicalMode: z.string().optional().default(''),
    coatSet: z.string().optional().default(''),
    cutSet: z.string().optional().default(''),
    electrosurgicalSkinCheckedBefore: z.string().optional().default(''),
    electrosurgicalSkinCheckedAfter: z.string().optional().default(''),

    // Tourniquet
    tourniquetType: z.string().optional().default(''),
    tourniquetSite: z.string().optional().default(''),
    tourniquetSide: tourniquetSideEnum.optional(),
    tourniquetPressure: z.number().optional(),
    tourniquetTimeOn: z.string().optional().default(''),
    tourniquetTimeOff: z.string().optional().default(''),
    tourniquetSkinCheckedBefore: z.string().optional().default(''),
    tourniquetSkinCheckedAfter: z.string().optional().default(''),

    // Drain type
    drainTypes: z.array(drainTypeEnum).optional().default([]),
    drainTypeOther: z.string().optional().default(''),

    // Wound irrigation
    woundIrrigation: z.array(woundIrrigationEnum).optional().default([]),
    woundIrrigationOther: z.string().optional().default(''),

    // Wound pack
    woundPackType: z.string().optional().default(''),
    woundPackSite: z.string().optional().default(''),

    // Wound class
    woundClass: woundClassEnum.optional(),

    // Surgical team & anaesthesia
    surgeon: z.string().optional().default(''),
    assistant: z.string().optional().default(''),
    anaesthesiologist: z.string().optional().default(''),
    scrubNurse: z.string().optional().default(''),
    circulatingNurse: z.string().optional().default(''),
    observers: z.string().optional().default(''),
    anaesthesiaType: anaesthesiaTypeEnum.optional(),
    anaesthesiaDetail: z.string().optional().default(''),

    // Diagnosis & operation
    preOpDiagnosis: z.string().optional().default(''),
    intraOpDiagnosis: z.string().optional().default(''),
    operationsPerformed: z.string().optional().default(''),

    // ───────── Page 2 ─────────

    swabsCount: swabsCountTableSchema.optional().default({}),
    countCorrect: yesNoEnum.optional(),
    countActionTaken: z.string().optional().default(''),
    scrubNurseSignature: z.string().optional().default(''),
    circulatingNurseSignature: z.string().optional().default(''),

    // Wound closure
    nonAbsorbableSuture: z.string().optional().default(''),
    absorbableSuture: z.string().optional().default(''),
    otherClosure: z.string().optional().default(''),
    dressingApplied: z.string().optional().default(''),

    // Infusions / transfusions (mL)
    packedCellsML: z.number().optional(),
    wholeBloodML: z.number().optional(),
    otherBloodProductsML: z.number().optional(),
    ivInfusionML: z.number().optional(),
    estimatedBloodLossML: z.number().optional(),
    urinaryOutputML: z.number().optional(),

    // Tables
    medications: z.array(medicationRowSchema).optional().default([]),
    implants: z.array(implantRowSchema).optional().default([]),
    specimens: z.array(specimenRowSchema).optional().default([]),

    // Items to be returned to theatre
    itemsToBeReturnedToTheatre: z.string().optional().default(''),

    // Charges
    anaestheticMaterialsCharge: z.number().optional(),
    theatreFee: z.number().optional(),

    // Tamper-evident proof (server-attached on finalization)
    signatureProof: signatureProofSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.antibioticOrdered === 'Y') {
      if (!data.antibioticType || data.antibioticType.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['antibioticType'],
          message: 'Type is required when antibiotic is ordered',
        });
      }
      if (!data.antibioticOrderedBy || data.antibioticOrderedBy.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['antibioticOrderedBy'],
          message: 'Ordered by is required when antibiotic is ordered',
        });
      }
      if (!data.antibioticTime || data.antibioticTime.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['antibioticTime'],
          message: 'Time is required when antibiotic is ordered',
        });
      }
    }

    if (data.countCorrect === 'N') {
      if (!data.countActionTaken || data.countActionTaken.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['countActionTaken'],
          message: 'Action taken is required when count is incorrect',
        });
      }
    }

    if (data.patientPosition === 'Other' && (!data.patientPositionOther || data.patientPositionOther.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['patientPositionOther'],
        message: 'Please specify other position',
      });
    }

    if (data.cannulaPosition === 'Other' && (!data.cannulaPositionOther || data.cannulaPositionOther.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cannulaPositionOther'],
        message: 'Please specify other cannula position',
      });
    }
  });

// ──────────────────────────────────────────────────────────────────────
// Final schema (strict, required for finalization)
// ──────────────────────────────────────────────────────────────────────

export const nurseIntraOpRecordFinalSchema = nurseIntraOpRecordDraftSchema.superRefine((data, ctx) => {
  // Patient identification required
  if (!data.patientFileNo || data.patientFileNo.trim().length < 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['patientFileNo'], message: 'Patient file no. is required' });
  }
  if (!data.patientName || data.patientName.trim().length < 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['patientName'], message: 'Patient name is required' });
  }
  if (!data.date || data.date.trim().length < 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['date'], message: 'Date is required' });
  }
  if (!data.doctor || data.doctor.trim().length < 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['doctor'], message: 'Doctor is required' });
  }

  // Pre-op checklist required (paper has explicit Y/N)
  const requiredYN: Array<keyof typeof data> = [
    'patientIdVerified',
    'informedConsentSigned',
    'preOpChecklistCompleted',
    'whoChecklistCompleted',
    'arrivedWithIVInfusing',
  ];
  for (const key of requiredYN) {
    if (data[key] !== 'Y' && data[key] !== 'N') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key as string], message: 'Required (Y/N)' });
    }
  }

  // Counts must be completed + signatures exist
  if (data.countCorrect !== 'Y' && data.countCorrect !== 'N') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['countCorrect'], message: 'Count correct is required (Y/N)' });
  }
  if (!data.scrubNurseSignature || !/^data:image\//.test(data.scrubNurseSignature)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scrubNurseSignature'], message: 'Scrub nurse signature is required' });
  }
  if (!data.circulatingNurseSignature || !/^data:image\//.test(data.circulatingNurseSignature)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['circulatingNurseSignature'], message: 'Circulating nurse signature is required' });
  }
});

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

export type NurseIntraOpRecordData = z.infer<typeof nurseIntraOpRecordFinalSchema>;
export type NurseIntraOpRecordDraft = z.infer<typeof nurseIntraOpRecordDraftSchema>;

