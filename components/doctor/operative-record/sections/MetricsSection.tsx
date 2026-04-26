'use client';

import type { SurgeonOperativeNoteDraft } from '@/domain/clinical-forms/SurgeonOperativeNote';

interface Props {
  value: SurgeonOperativeNoteDraft['intraOpMetrics'];
  disabled: boolean;
  onChange: (next: NonNullable<SurgeonOperativeNoteDraft['intraOpMetrics']>) => void;
}

export function MetricsSection({ value, disabled, onChange }: Props) {
  const v: any = value ?? {};
  const ebl = typeof v.estimatedBloodLossMl === 'number' ? v.estimatedBloodLossMl : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Estimated blood loss (ml)
        </label>
        <input
          type="number"
          min={0}
          className="w-full h-10 px-3 border rounded-md text-sm"
          value={ebl}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...(value ?? {}), estimatedBloodLossMl: Number(e.target.value) } as any)
          }
        />
      </div>
    </div>
  );
}

