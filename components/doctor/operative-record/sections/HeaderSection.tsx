'use client';

import type { SurgeonOperativeNoteDraft } from '@/domain/clinical-forms/SurgeonOperativeNote';

interface Props {
  value: SurgeonOperativeNoteDraft['header'];
  disabled: boolean;
  onChange: (next: NonNullable<SurgeonOperativeNoteDraft['header']>) => void;
}

const ANESTHESIA_TYPE_OPTIONS = ['GENERAL', 'REGIONAL', 'LOCAL', 'SEDATION', 'TIVA', 'MAC'] as const;

export function HeaderSection({ value, disabled, onChange }: Props) {
  const v: any = value ?? {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Pre-operative diagnosis
          </label>
          <input
            className="w-full h-10 px-3 border rounded-md text-sm"
            value={v.diagnosisPreOp ?? ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...(value ?? {}), diagnosisPreOp: e.target.value } as any)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Operative diagnosis
          </label>
          <input
            className="w-full h-10 px-3 border rounded-md text-sm"
            value={v.diagnosisPostOp ?? ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...(value ?? {}), diagnosisPostOp: e.target.value } as any)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Procedure performed
          </label>
          <input
            className="w-full h-10 px-3 border rounded-md text-sm"
            value={v.procedurePerformed ?? ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...(value ?? {}), procedurePerformed: e.target.value } as any)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Anaesthesia type
          </label>
          <select
            className="w-full h-10 px-3 border rounded-md text-sm bg-white"
            value={v.anesthesiaType ?? ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...(value ?? {}), anesthesiaType: e.target.value } as any)}
          >
            <option value="">— Select —</option>
            {ANESTHESIA_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

