export const INTRAOP_SECTIONS = [
  { key: 'page1', title: 'Pre-operative Nursing Record', icon: 'FileText' },
  { key: 'page2', title: 'Nursing Operation Record (Intra-operative)', icon: 'FileSignature', isCritical: true },
] as const;

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
