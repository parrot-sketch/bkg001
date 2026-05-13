import {
  ARRIVAL_MODE_OPTIONS,
  ASA_CLASS_OPTIONS,
  CANNULA_POSITION_OPTIONS,
  PATIENT_POSITION_OPTIONS,
  TOURNIQUET_SIDE_OPTIONS,
  ANAESTHESIA_TYPE_OPTIONS,
  WOUND_CLASS_OPTIONS,
  SKIN_PREP_AGENT_OPTIONS,
  DRAIN_TYPE_OPTIONS,
  WOUND_IRRIGATION_OPTIONS,
  SEX_OPTIONS,
  YES_NO_OPTIONS,
} from '@/domain/clinical-forms/NurseIntraOpRecord';

describe('Nurse intra-op UI option sets', () => {
  it('has stable yes/no options', () => {
    expect(YES_NO_OPTIONS.map((o) => o.value)).toEqual(['Y', 'N']);
  });

  it('covers arrival mode enum', () => {
    expect(ARRIVAL_MODE_OPTIONS.map((o) => o.value).sort()).toEqual(['Stretcher', 'Walking', 'Wheelchair'].sort());
  });

  it('covers ASA classes', () => {
    expect(ASA_CLASS_OPTIONS.map((o) => o.value)).toEqual([1, 2, 3, 4]);
  });

  it('covers cannula position enum', () => {
    expect(CANNULA_POSITION_OPTIONS.map((o) => o.value).sort()).toEqual(['LA', 'LL', 'Other', 'RA', 'RL'].sort());
  });

  it('covers patient position enum', () => {
    expect(PATIENT_POSITION_OPTIONS.map((o) => o.value).sort()).toEqual(['Lateral', 'Lithotomy', 'Other', 'Prone', 'Supine'].sort());
  });

  it('covers tourniquet side enum', () => {
    expect(TOURNIQUET_SIDE_OPTIONS.map((o) => o.value).sort()).toEqual(['Lt.', 'Rt.'].sort());
  });

  it('covers anaesthesia type enum', () => {
    expect(ANAESTHESIA_TYPE_OPTIONS.map((o) => o.value).sort()).toEqual(['General', 'Local', 'Regional', 'Spinal'].sort());
  });

  it('covers wound class enum', () => {
    expect(WOUND_CLASS_OPTIONS.map((o) => o.value).sort()).toEqual(['Clean', 'Clean Contaminated', 'Contaminated', 'Infected'].sort());
  });

  it('covers skin prep agent enum', () => {
    expect(SKIN_PREP_AGENT_OPTIONS.map((o) => o.value).sort()).toEqual(['Hibitane in Spirit', 'Hibitane in Water', 'Other', 'Povidone Iodine'].sort());
  });

  it('covers drain type enum', () => {
    expect(DRAIN_TYPE_OPTIONS.map((o) => o.value).sort()).toEqual(['Corrugated', 'NG', 'Other', 'Portovac', 'UWS'].sort());
  });

  it('covers wound irrigation enum', () => {
    expect(WOUND_IRRIGATION_OPTIONS.map((o) => o.value).sort()).toEqual(['Antibiotic', 'Other', 'Povidone Iodine', 'Saline', 'Water'].sort());
  });

  it('covers sex enum', () => {
    expect(SEX_OPTIONS.map((o) => o.value).sort()).toEqual(['Female', 'Male', 'Other'].sort());
  });
});

