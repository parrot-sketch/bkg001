export const INTRAOP_SECTIONS = [
  { key: 'page1', title: 'Pre-operative Nursing Record', icon: 'FileText' },
  { key: 'page2', title: 'Nursing Operation Record (Intra-operative)', icon: 'FileSignature', isCritical: true },
] as const;

/** Jump targets for the long Nursing Operation Record form */
export const NOR_FIELD_GROUPS = [
  { id: 'nor-patient', title: 'Patient ID', page: 1, fields: ['patientFileNo', 'patientName', 'age', 'sex', 'date', 'doctor'] },
  { id: 'nor-arrival', title: 'Arrival', page: 1, fields: ['arrivalDate', 'timeIn', 'arrivalMode', 'allergies', 'asaClass', 'comments'] },
  { id: 'nor-preop-checklist', title: 'Pre-op checklist', page: 1, fields: ['patientIdVerified', 'informedConsentSigned', 'preOpChecklistCompleted', 'whoChecklistCompleted', 'arrivedWithIVInfusing', 'ivStartedBy', 'ivStartTime', 'cannulaPosition'] },
  { id: 'nor-theatre-safety', title: 'Theatre timing & safety', page: 1, fields: ['antibioticOrdered', 'antibioticType', 'antibioticOrderedBy', 'antibioticTime', 'timeInTheatre', 'timeOutOfTheatre', 'operationStart', 'operationFinish', 'safetyBeltApplied', 'armsSecured', 'properBodyAlignment'] },
  { id: 'nor-catheter', title: 'Urinary catheter', page: 1, fields: ['urinaryCatheterInSitu', 'urinaryCatheterInsertedInTheatre', 'catheterType', 'catheterSize'] },
  { id: 'nor-position', title: 'Patient position', page: 1, fields: ['patientPosition', 'patientPositionOther'] },
  { id: 'nor-skin-prep', title: 'Skin prep', page: 1, fields: ['shavedBy', 'skinPrepAgents', 'skinPrepOther'] },
  { id: 'nor-esu', title: 'Electrosurgical unit', page: 1, fields: ['electrosurgicalUnitNo', 'electrosurgicalMode'], optional: true },
  { id: 'nor-tourniquet', title: 'Tourniquet', page: 1, fields: ['tourniquetType', 'tourniquetSite'], optional: true },
  { id: 'nor-drains', title: 'Drains & irrigation', page: 1, fields: ['drainTypes', 'woundIrrigation'], optional: true },
  { id: 'nor-wound-pack', title: 'Wound pack & class', page: 1, fields: ['woundPackType', 'woundClass'] },
  { id: 'nor-team', title: 'Surgical team', page: 1, fields: ['surgeon', 'assistant', 'anaesthesiologist', 'scrubNurse', 'circulatingNurse', 'anaesthesiaType'] },
  { id: 'nor-diagnosis', title: 'Diagnosis & operation', page: 1, fields: ['preOpDiagnosis', 'intraOpDiagnosis', 'operationsPerformed'] },
  { id: 'nor-counts', title: 'Counts', page: 2, fields: ['swabsCount', 'countCorrect', 'countActionTaken', 'scrubNurseSignature', 'circulatingNurseSignature'], critical: true },
  { id: 'nor-closure', title: 'Wound closure', page: 2, fields: ['nonAbsorbableSuture', 'absorbableSuture', 'dressingApplied'] },
  { id: 'nor-fluids', title: 'Fluids & outputs', page: 2, fields: ['packedCellsML', 'estimatedBloodLossML', 'urinaryOutputML'] },
  { id: 'nor-medications', title: 'Medication', page: 2, fields: ['medications'] },
  { id: 'nor-implants', title: 'Implants', page: 2, fields: ['implants'] },
  { id: 'nor-specimens', title: 'Specimens', page: 2, fields: ['specimens'] },
  { id: 'nor-returned', title: 'Items returned', page: 2, fields: ['itemsToBeReturnedToTheatre'] },
  { id: 'nor-charges', title: 'Charges', page: 2, fields: ['anaestheticMaterialsCharge', 'theatreFee'], optional: true },
] as const;

const FIELD_LABELS: Record<string, string> = {
  patientFileNo: 'Patient file no.',
  patientName: 'Patient name',
  date: 'Date',
  doctor: 'Doctor',
  patientIdVerified: 'Patient ID verified',
  informedConsentSigned: 'Informed consent signed',
  preOpChecklistCompleted: 'Pre-op checklist completed',
  whoChecklistCompleted: 'WHO checklist completed',
  arrivedWithIVInfusing: 'Arrived with IV infusing',
  countCorrect: 'Count correct',
  scrubNurseSignature: 'Scrub nurse signature',
  circulatingNurseSignature: 'Circulating nurse signature',
  scrubNurse: 'Scrub nurse name',
  circulatingNurse: 'Circulating nurse name',
};

export function resolveNorSectionIdForField(fieldPath: string): string {
  const root = fieldPath.split('.')[0] || fieldPath;
  const match = NOR_FIELD_GROUPS.find((g) => (g.fields as readonly string[]).includes(root));
  return match?.id ?? 'nor-patient';
}

export function humanizeIntraOpMissingItem(raw: string): { label: string; sectionId: string; fieldKey: string } {
  // Gate messages are already human-readable (no "path: message")
  if (!raw.includes(':')) {
    return { label: raw, sectionId: 'nor-counts', fieldKey: 'gate' };
  }
  const [path, ...rest] = raw.split(':');
  const message = rest.join(':').trim() || 'Required';
  const fieldKey = (path || '').trim().split('.')[0] || '';
  const fieldLabel = FIELD_LABELS[fieldKey] || fieldKey.replace(/([A-Z])/g, ' $1').replace(/^\w/, (c) => c.toUpperCase());
  const sectionId = resolveNorSectionIdForField(fieldKey);
  const section = NOR_FIELD_GROUPS.find((g) => g.id === sectionId);
  return {
    label: `${section?.title ?? 'Form'} — ${fieldLabel}: ${message}`,
    sectionId,
    fieldKey,
  };
}

export function humanizeIntraOpMissingItems(items: string[]): Array<{ label: string; sectionId: string; fieldKey: string }> {
  const seen = new Set<string>();
  const out: Array<{ label: string; sectionId: string; fieldKey: string }> = [];
  for (const raw of items) {
    const item = humanizeIntraOpMissingItem(raw);
    if (seen.has(item.label)) continue;
    seen.add(item.label);
    out.push(item);
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────
// UI Option Sets (single source of truth)
// ──────────────────────────────────────────────────────────────────────

import type {
  ArrivalMode,
  ASAClass,
  CannulaPosition,
  PatientPosition,
  TourniquetSide,
  AnaesthesiaType,
  WoundClass,
  SkinPrepAgent,
  DrainType,
  WoundIrrigation,
  Sex,
  YesNo,
} from './NurseIntraOpRecord.constants';

export type UiOption<T extends string | number> = { value: T; label: string };

export const YES_NO_OPTIONS: UiOption<YesNo>[] = [
  { value: 'Y', label: 'Yes' },
  { value: 'N', label: 'No' },
];

export const SEX_OPTIONS: UiOption<Sex>[] = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

export const ARRIVAL_MODE_OPTIONS: UiOption<ArrivalMode>[] = [
  { value: 'Stretcher', label: 'Stretcher' },
  { value: 'Wheelchair', label: 'Wheelchair' },
  { value: 'Walking', label: 'Walking' },
];

export const ASA_CLASS_OPTIONS: UiOption<ASAClass>[] = [
  { value: 1, label: 'ASA I' },
  { value: 2, label: 'ASA II' },
  { value: 3, label: 'ASA III' },
  { value: 4, label: 'ASA IV' },
];

export const CANNULA_POSITION_OPTIONS: UiOption<CannulaPosition>[] = [
  { value: 'RA', label: 'RA' },
  { value: 'LA', label: 'LA' },
  { value: 'RL', label: 'RL' },
  { value: 'LL', label: 'LL' },
  { value: 'Other', label: 'Other' },
];

export const PATIENT_POSITION_OPTIONS: UiOption<PatientPosition>[] = [
  { value: 'Supine', label: 'Supine' },
  { value: 'Prone', label: 'Prone' },
  { value: 'Lateral', label: 'Lateral' },
  { value: 'Lithotomy', label: 'Lithotomy' },
  { value: 'Other', label: 'Other' },
];

export const TOURNIQUET_SIDE_OPTIONS: UiOption<TourniquetSide>[] = [
  { value: 'Rt.', label: 'Right (Rt.)' },
  { value: 'Lt.', label: 'Left (Lt.)' },
];

export const ANAESTHESIA_TYPE_OPTIONS: UiOption<AnaesthesiaType>[] = [
  { value: 'General', label: 'General' },
  { value: 'Spinal', label: 'Spinal' },
  { value: 'Regional', label: 'Regional' },
  { value: 'Local', label: 'Local' },
];

export const WOUND_CLASS_OPTIONS: UiOption<WoundClass>[] = [
  { value: 'Clean', label: 'Clean' },
  { value: 'Clean Contaminated', label: 'Clean-contaminated' },
  { value: 'Contaminated', label: 'Contaminated' },
  { value: 'Infected', label: 'Infected/dirty' },
];

export const SKIN_PREP_AGENT_OPTIONS: UiOption<SkinPrepAgent>[] = [
  { value: 'Hibitane in Spirit', label: 'Hibitane in Spirit' },
  { value: 'Hibitane in Water', label: 'Hibitane in Water' },
  { value: 'Povidone Iodine', label: 'Povidone Iodine' },
  { value: 'Other', label: 'Other' },
];

export const DRAIN_TYPE_OPTIONS: UiOption<DrainType>[] = [
  { value: 'Corrugated', label: 'Corrugated' },
  { value: 'Portovac', label: 'Portovac' },
  { value: 'UWS', label: 'UWS' },
  { value: 'NG', label: 'NG' },
  { value: 'Other', label: 'Other' },
];

export const WOUND_IRRIGATION_OPTIONS: UiOption<WoundIrrigation>[] = [
  { value: 'Saline', label: 'Saline' },
  { value: 'Water', label: 'Water' },
  { value: 'Povidone Iodine', label: 'Povidone Iodine' },
  { value: 'Antibiotic', label: 'Antibiotic' },
  { value: 'Other', label: 'Other' },
];
