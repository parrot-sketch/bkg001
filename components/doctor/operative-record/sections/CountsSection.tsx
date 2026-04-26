'use client';

import type { SurgeonOperativeNoteDraft } from '@/domain/clinical-forms/SurgeonOperativeNote';

interface Props {
  value: SurgeonOperativeNoteDraft['countsConfirmation'];
  disabled: boolean;
  nurseHasDiscrepancy: boolean;
  onChange: (next: NonNullable<SurgeonOperativeNoteDraft['countsConfirmation']>) => void;
}

export function CountsSection({ value, disabled, nurseHasDiscrepancy, onChange }: Props) {
  const v: any = value ?? {};

  return (
    <div className="space-y-3">
      {nurseHasDiscrepancy && (
        <p className="text-xs text-rose-700">
          Nurse intra-op record reports a discrepancy. Counts cannot be marked correct.
        </p>
      )}

      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="countsCorrect"
            checked={v.countsCorrect === true}
            disabled={disabled || nurseHasDiscrepancy}
            onChange={() => onChange({ ...(value ?? {}), countsCorrect: true } as any)}
          />
          Yes
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="countsCorrect"
            checked={v.countsCorrect === false}
            disabled={disabled}
            onChange={() => onChange({ ...(value ?? {}), countsCorrect: false } as any)}
          />
          No
        </label>
      </div>

      {v.countsCorrect === false && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Explanation</label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 border rounded-md text-sm"
            value={v.countsExplanation ?? ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...(value ?? {}), countsExplanation: e.target.value } as any)}
          />
        </div>
      )}
    </div>
  );
}

