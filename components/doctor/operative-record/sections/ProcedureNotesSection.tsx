'use client';

import type { SurgeonOperativeNoteDraft } from '@/domain/clinical-forms/SurgeonOperativeNote';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';

interface Props {
  value: SurgeonOperativeNoteDraft['findingsAndSteps'];
  disabled: boolean;
  onChange: (next: NonNullable<SurgeonOperativeNoteDraft['findingsAndSteps']>) => void;
}

export function ProcedureNotesSection({ value, disabled, onChange }: Props) {
  const v: any = value ?? {};

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-2">
        Procedure notes
      </label>
      <RichTextEditor
        content={v.operativeSteps ?? ''}
        onChange={(html) => onChange({ ...(value ?? {}), operativeSteps: html } as any)}
        readOnly={disabled}
        minHeight="220px"
        placeholder="Document operative steps and key findings…"
      />
    </div>
  );
}

