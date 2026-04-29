'use client';

import type { WardChecklistSectionProps } from '@/components/nurse/ward-prep-checklist/types';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { BooleanField, TextField, SelectOrCustomField } from '@/components/nurse/ward-prep-checklist/fields';
import { NumberField } from '@/components/nurse/ward-prep-checklist/fields/NumberField';
import { getVitalsWarningMap } from '@/domain/helpers/vitalsWarnings';
import { formatSex } from '@/components/nurse/ward-prep-checklist/utils';
import {
  UrinalysisResult,
  URINALYSIS_LABELS,
  type UrinalysisValue,
} from '@/domain/clinical-forms/NursePreopWardChecklist';

export function VitalsSection({ data, onChange, disabled, patient }: WardChecklistSectionProps) {
  const d = data.vitals ?? {};
  const set = (field: string, value: unknown) => onChange({ ...data, vitals: { ...d, [field]: value } });
  const warningMap = getVitalsWarningMap({
    bpSystolic: d.bpSystolic,
    bpDiastolic: d.bpDiastolic,
    pulse: d.pulse,
    respiratoryRate: d.respiratoryRate,
    temperature: d.temperature,
    spo2: d.spo2,
  });
  const urinalysisOptions = Object.values(UrinalysisResult).map((r) => ({ value: r, label: URINALYSIS_LABELS[r] }));
  const showFoetalFields = formatSex(patient?.gender) === 'F';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <NumberField label="Blood Pressure Systolic" value={d.bpSystolic} onChange={(v) => set('bpSystolic', v)} min={60} max={260} unit="mmHg" disabled={disabled} warning={warningMap.get('bpSystolic')} />
        <NumberField label="Blood Pressure Diastolic" value={d.bpDiastolic} onChange={(v) => set('bpDiastolic', v)} min={30} max={160} unit="mmHg" disabled={disabled} warning={warningMap.get('bpDiastolic')} />
        <NumberField label="Pulse Rate" value={d.pulse} onChange={(v) => set('pulse', v)} min={30} max={220} unit="bpm" disabled={disabled} warning={warningMap.get('pulse')} />
        <NumberField label="Respiratory Rate" value={d.respiratoryRate} onChange={(v) => set('respiratoryRate', v)} min={6} max={120} unit="/min" disabled={disabled} warning={warningMap.get('respiratoryRate')} />
        <TextField label="CVP" value={d.cvp} onChange={(v) => set('cvp', v)} disabled={disabled} />
        <NumberField label="Temperature" value={d.temperature} onChange={(v) => set('temperature', v)} min={34} max={42} step={0.1} unit="°C" disabled={disabled} warning={warningMap.get('temperature')} />
      </div>

      <Separator />

      <BooleanField label="Bladder Emptied" value={d.bladderEmptied} onChange={(v) => set('bladderEmptied', v)} disabled={disabled} />

      {showFoetalFields ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField label="Foetal Heart Rate" value={d.foetalHeartRate} onChange={(v) => set('foetalHeartRate', v)} min={30} max={260} unit="bpm" disabled={disabled} />
          <TextField label="Foetal Heart Rate notes" value={d.foetalHeartRateNotes} onChange={(v) => set('foetalHeartRateNotes', v)} disabled={disabled} />
        </div>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <NumberField label="Height" value={d.height} onChange={(v) => set('height', v)} min={50} max={250} unit="cm" disabled={disabled} />
        <NumberField label="Weight in kg" value={d.weight} onChange={(v) => set('weight', v)} min={2} max={350} unit="kg" disabled={disabled} />
      </div>

      <Separator />

      <BooleanField label="Urinalysis Done" value={d.urinalysisDone} onChange={(v) => set('urinalysisDone', v)} disabled={disabled} />
      <SelectOrCustomField
        label="Urinalysis Result"
        value={d.urinalysis as UrinalysisValue | undefined}
        onChange={(v) => set('urinalysis', v)}
        options={urinalysisOptions}
        disabled={disabled}
      />

      <TextField
        label="Other Forms as Required"
        value={d.otherFormsRequired}
        onChange={(v) => set('otherFormsRequired', v)}
        disabled={disabled}
      />
    </div>
  );
}
