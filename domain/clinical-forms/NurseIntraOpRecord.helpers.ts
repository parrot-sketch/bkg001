import type { NurseIntraOpRecordData, NurseIntraOpRecordDraft } from './NurseIntraOpRecord.schemas';

export function createEmptyIntraOpDraft(): NurseIntraOpRecordDraft {
  const today = new Date().toISOString().split('T')[0]!;
  return {
    patientFileNo: '',
    patientName: '',
    age: undefined,
    sex: undefined,
    date: today,
    doctor: '',
    arrivalDate: today,
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
    cannulaPosition: undefined,
    cannulaPositionOther: '',
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
    urinaryCatheterInSitu: undefined,
    urinaryCatheterInsertedInTheatre: undefined,
    catheterType: '',
    catheterSize: '',
    intraOpXRays: '',
    patientPosition: undefined,
    patientPositionOther: '',
    shavedBy: '',
    skinPrepAgents: [],
    skinPrepOther: '',
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
    drainTypes: [],
    drainTypeOther: '',
    woundIrrigation: [],
    woundIrrigationOther: '',
    woundPackType: '',
    woundPackSite: '',
    woundClass: undefined,
    surgeon: '',
    assistant: '',
    anaesthesiologist: '',
    scrubNurse: '',
    circulatingNurse: '',
    observers: '',
    anaesthesiaType: undefined,
    anaesthesiaDetail: '',
    preOpDiagnosis: '',
    intraOpDiagnosis: '',
    operationsPerformed: '',
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
    itemsToBeReturnedToTheatre: '',
    anaestheticMaterialsCharge: undefined,
    theatreFee: undefined,
  };
}

export function getIntraOpSectionCompletion(
  data: Partial<NurseIntraOpRecordDraft> | null | undefined,
): Record<string, { complete: boolean }> {
  const page1Complete =
    !!data?.patientFileNo?.trim() &&
    !!data?.patientName?.trim() &&
    !!data?.date?.trim() &&
    !!data?.doctor?.trim();

  const page2Complete =
    (data?.countCorrect === 'Y' || data?.countCorrect === 'N') &&
    !!data?.scrubNurseSignature &&
    !!data?.circulatingNurseSignature;

  return {
    page1: { complete: page1Complete },
    page2: { complete: page2Complete },
  };
}

export function checkNurseRecoveryGateCompliance(
  data: Pick<NurseIntraOpRecordData, 'countCorrect' | 'whoChecklistCompleted'> | null | undefined,
): string[] {
  const missing: string[] = [];
  if (!data) return ['Record data is missing'];
  if (data.countCorrect !== 'Y') {
    missing.push('Count correct must be Y to transfer to recovery');
  }
  if (data.whoChecklistCompleted !== 'Y') {
    missing.push('WHO checklist must be completed (Y) to transfer to recovery');
  }
  return missing;
}

export function getNurseCountDiscrepancy(
  data: Pick<NurseIntraOpRecordDraft, 'countCorrect'> | null | undefined,
): boolean {
  return data?.countCorrect === 'N';
}

