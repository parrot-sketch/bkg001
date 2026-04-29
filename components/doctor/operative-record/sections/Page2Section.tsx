'use client';

import type { SurgeonOperativeNoteDraft } from '@/domain/clinical-forms/SurgeonOperativeNote';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';

interface Props {
  value: SurgeonOperativeNoteDraft['operativeRecord'];
  disabled: boolean;
  onChange: (next: NonNullable<SurgeonOperativeNoteDraft['operativeRecord']>) => void;
}

export function Page2Section({ value, disabled, onChange }: Props) {
  const v: any = value ?? {};

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
          OPERATION RECORD
        </label>
        <RichTextEditor
          content={v.operationRecord ?? ''}
          onChange={(html) => onChange({ ...(value ?? {}), operationRecord: html } as any)}
          readOnly={disabled}
          minHeight="220px"
          placeholder="Structured operation record…"
        />
      </div>

      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
          POST-OPERATIVE INSTRUCTIONS
        </label>
        <RichTextEditor
          content={v.postOperativeInstructions ?? ''}
          onChange={(html) => onChange({ ...(value ?? {}), postOperativeInstructions: html } as any)}
          readOnly={disabled}
          minHeight="220px"
          placeholder="Post-operative instructions…"
        />
      </div>

      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">
          SIGNATURE OF SURGEON/ANAESTHESIOLOGIST
        </label>
        {v.surgeonOrAnesthesiologistSignaturePng ? (
          <img
            alt="Surgeon/anaesthesiologist signature"
            src={v.surgeonOrAnesthesiologistSignaturePng}
            className="max-w-[320px] border rounded-md bg-white"
            style={{ height: '100px' }}
          />
        ) : (
          <p className="text-xs text-slate-500 italic">Signature captured upon finalization</p>
        )}
      </div>
    </div>
  );
}
