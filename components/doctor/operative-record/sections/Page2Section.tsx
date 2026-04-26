'use client';

import type { SurgeonOperativeNoteDraft } from '@/domain/clinical-forms/SurgeonOperativeNote';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { SignaturePad } from '@/components/consent/SignaturePad';

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
        <label className="block text-xs font-medium text-slate-600 mb-2">
          Operation record
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
        <label className="block text-xs font-medium text-slate-600 mb-2">
          Post-operative instructions
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
        <label className="block text-xs font-medium text-slate-600 mb-2">
          Surgeon signature
        </label>
        {disabled ? (
          v.surgeonSignaturePng ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Surgeon signature"
              src={v.surgeonSignaturePng}
              className="max-w-[320px] border rounded-md bg-white"
            />
          ) : (
            <p className="text-xs text-slate-500">No signature captured.</p>
          )
        ) : (
          <SignaturePad
            onSignatureChange={(png) =>
              onChange({ ...(value ?? {}), surgeonSignaturePng: png } as any)
            }
            width={520}
            height={160}
          />
        )}
      </div>
    </div>
  );
}

