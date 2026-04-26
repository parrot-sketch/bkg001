'use client';

import type { WardChecklistSectionProps } from '@/components/nurse/ward-prep-checklist/types';
import { MedicationAdministrationList } from '@/components/nurse/MedicationAdministrationList';
import { BooleanField, TimeField } from '@/components/nurse/ward-prep-checklist/fields';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function MedicationsSection({ data, onChange, disabled, caseId, patient, formResponseId }: WardChecklistSectionProps) {
  const d = data.medications ?? {};
  const set = (field: string, value: unknown) => onChange({ ...data, medications: { ...d, [field]: value } });

  return (
    <div className="space-y-4">
      {/* Workflow integration: selecting inventory meds updates billing/charge sheet via med-admin records */}
      <MedicationAdministrationList
        caseId={caseId}
        patient={patient}
        formResponseId={formResponseId}
        readOnly={disabled}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <BooleanField
            label="Pre-medication given"
            value={d.preMedGiven}
            onChange={(v) => set('preMedGiven', v)}
            disabled={disabled}
          />
        </div>
        <TimeField
          label="Pre-medication time given"
          value={d.preMedTimeGiven}
          onChange={(v) => set('preMedTimeGiven', v)}
          disabled={disabled}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm">Pre-medication (details)</Label>
        <Textarea
          value={(d.preMedicationText as string) || ''}
          onChange={(e) => set('preMedicationText', e.target.value)}
          disabled={disabled}
          className="bg-white text-sm resize-none"
          rows={2}
          placeholder="Specify pre-medication…"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <BooleanField
            label="Peri-operative medication given"
            value={d.periOpMedsGiven}
            onChange={(v) => set('periOpMedsGiven', v)}
            disabled={disabled}
          />
        </div>
        <TimeField
          label="Peri-operative time given"
          value={d.periOpMedsTimeGiven}
          onChange={(v) => set('periOpMedsTimeGiven', v)}
          disabled={disabled}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm">Peri-operative medication (details)</Label>
        <Textarea
          value={(d.periOpMedicationText as string) || ''}
          onChange={(e) => set('periOpMedicationText', e.target.value)}
          disabled={disabled}
          className="bg-white text-sm resize-none"
          rows={2}
          placeholder="Specify peri-operative medication…"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm">5. MEDICATION – Regular Medication (Specify)</Label>
        <Textarea
          value={(d.regularMedicationText as string) || ''}
          onChange={(e) => set('regularMedicationText', e.target.value)}
          disabled={disabled}
          className="bg-white text-sm resize-none"
          rows={2}
          placeholder="Enter regular medication details…"
        />
      </div>
    </div>
  );
}
