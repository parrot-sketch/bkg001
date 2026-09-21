'use client';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

export function stripToPlain(htmlOrText: string | null | undefined): string {
  if (!htmlOrText) return '';
  return htmlOrText
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function ChoicePill({
  selected,
  onClick,
  disabled,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50',
        selected
          ? 'border-[#2c2e4b] bg-[#2c2e4b] text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-[#caa26a]/60 hover:text-[#2c2e4b]',
      )}
    >
      {children}
    </button>
  );
}

export function YesNoToggle({
  value,
  onChange,
  disabled,
  yesDisabled,
}: {
  value: 'Y' | 'N' | null;
  onChange: (next: 'Y' | 'N') => void;
  disabled?: boolean;
  yesDisabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <ChoicePill
        selected={value === 'Y'}
        disabled={disabled || yesDisabled}
        onClick={() => onChange('Y')}
      >
        Yes
      </ChoicePill>
      <ChoicePill selected={value === 'N'} disabled={disabled} onClick={() => onChange('N')}>
        No
      </ChoicePill>
    </div>
  );
}

export function TypeField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  disabled,
  rows = 3,
  className,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
      <textarea
        rows={rows}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900',
          'placeholder:text-slate-400 focus:border-[#caa26a] focus:outline-none focus:ring-2 focus:ring-[#caa26a]/25',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      />
    </div>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      <input
        type="text"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900',
          'placeholder:text-slate-400 focus:border-[#caa26a] focus:outline-none focus:ring-2 focus:ring-[#caa26a]/25',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      />
    </div>
  );
}
