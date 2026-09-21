'use client';

import type { SurgeonOperativeNoteDraft } from '@/domain/clinical-forms/SurgeonOperativeNote';
import { TypeField, stripToPlain } from '../ui';

interface Props {
  value: SurgeonOperativeNoteDraft['findingsAndSteps'];
  disabled: boolean;
  onChange: (next: NonNullable<SurgeonOperativeNoteDraft['findingsAndSteps']>) => void;
}

export function ProcedureNotesSection({ value, disabled, onChange }: Props) {
  const v = value ?? ({} as NonNullable<SurgeonOperativeNoteDraft['findingsAndSteps']>);

  const patch = (partial: Partial<NonNullable<SurgeonOperativeNoteDraft['findingsAndSteps']>>) => {
    onChange({ ...v, ...partial } as NonNullable<SurgeonOperativeNoteDraft['findingsAndSteps']>);
  };

  return (
    <div className="space-y-5">
      <TypeField
        label="Findings"
        value={stripToPlain(v.findings)}
        onChange={(findings) => patch({ findings })}
        placeholder="Type key findings…"
        disabled={disabled}
        rows={4}
      />
      <TypeField
        label="Operative steps"
        hint="At least 20 characters required to finalize"
        value={stripToPlain(v.operativeSteps)}
        onChange={(operativeSteps) => patch({ operativeSteps })}
        placeholder="Type what was done — free narrative…"
        disabled={disabled}
        rows={12}
      />
    </div>
  );
}
