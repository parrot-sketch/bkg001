'use client';

import type { SurgeonOperativeNoteDraft } from '@/domain/clinical-forms/SurgeonOperativeNote';

interface Props {
  value: SurgeonOperativeNoteDraft['complications'];
  disabled: boolean;
  onChange: (next: NonNullable<SurgeonOperativeNoteDraft['complications']>) => void;
}

export function ComplicationsSection({ value, disabled, onChange }: Props) {
  const v: any = value ?? {};

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="complicationsOccurred"
            checked={v.complicationsOccurred === false}
            disabled={disabled}
            onChange={() => onChange({ ...(value ?? {}), complicationsOccurred: false } as any)}
          />
          No
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="complicationsOccurred"
            checked={v.complicationsOccurred === true}
            disabled={disabled}
            onChange={() => onChange({ ...(value ?? {}), complicationsOccurred: true } as any)}
          />
          Yes
        </label>
      </div>

      {v.complicationsOccurred === true && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Details
          </label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 border rounded-md text-sm"
            value={v.complicationsDetails ?? ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...(value ?? {}), complicationsDetails: e.target.value } as any)}
          />
        </div>
      )}
    </div>
  );
}

