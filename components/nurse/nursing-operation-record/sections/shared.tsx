'use client';

import type { YesNo } from '@/domain/clinical-forms/NurseIntraOpRecord';

export function YnCheckboxPair(props: {
  label: string;
  value: YesNo | undefined;
  disabled: boolean;
  onChange: (next: YesNo | undefined) => void;
}) {
  const { label, value, disabled, onChange } = props;
  const y = value === 'Y';
  const n = value === 'N';

  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="flex items-center gap-6">
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={y}
            disabled={disabled}
            onChange={() => onChange(y ? undefined : 'Y')}
            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>Y</span>
        </label>
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={n}
            disabled={disabled}
            onChange={() => onChange(n ? undefined : 'N')}
            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>N</span>
        </label>
      </div>
    </div>
  );
}

export function TickOption(props: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  const { label, checked, disabled, onChange } = props;
  return (
    <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(!checked)}
        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
      />
      <span>{label}</span>
    </label>
  );
}

