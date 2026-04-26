'use client';

import type { WardChecklistSectionProps } from '@/components/nurse/ward-prep-checklist/types';
import { Separator } from '@/components/ui/separator';
import { ShieldAlert } from 'lucide-react';
import { BooleanField, TimeField, RedAllergyField } from '@/components/nurse/ward-prep-checklist/fields';

export function AllergiesNpoSection({ data, onChange, disabled, patientAllergies }: WardChecklistSectionProps) {
  const d = data.allergiesNpo ?? {};
  const set = (field: string, value: unknown) => onChange({ ...data, allergiesNpo: { ...d, [field]: value } });

  return (
    <div className="space-y-4">
      {patientAllergies && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-lg shadow-sm">
          <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700">KNOWN ALLERGIES - PATIENT RECORD</p>
            <p className="text-base font-semibold text-red-800 mt-1">{patientAllergies}</p>
          </div>
        </div>
      )}

      <BooleanField
        label="Allergies documented"
        value={d.allergiesDocumented}
        onChange={(v) => set('allergiesDocumented', v)}
        disabled={disabled}
      />

      <RedAllergyField
        value={d.allergiesDetails}
        onChange={(v) => set('allergiesDetails', v)}
        disabled={disabled}
      />

      <Separator />

      <BooleanField
        label="7. NIL BY MOUTH"
        value={d.npoStatus}
        onChange={(v) => set('npoStatus', v)}
        disabled={disabled}
      />
      {d.npoStatus && (
        <div className="pl-7">
          <TimeField
            label="FASTED FROM (TIME)"
            value={d.npoFastedFromTime}
            onChange={(v) => set('npoFastedFromTime', v)}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

