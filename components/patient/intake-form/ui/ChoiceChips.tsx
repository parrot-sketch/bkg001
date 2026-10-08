'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChoiceChipsProps {
  name: string;
  value: string | undefined;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  columns?: 2 | 3 | 4;
  invalid?: boolean;
  /** Allow tapping the selected chip again to clear it (for optional questions). */
  allowDeselect?: boolean;
}

/**
 * Large tappable radio options. Faster and clearer on phones than a native
 * <select>, which hides the choices behind an extra tap.
 */
export function ChoiceChips({
  name,
  value,
  onChange,
  options,
  columns = 3,
  invalid,
  allowDeselect,
}: ChoiceChipsProps) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      aria-invalid={invalid || undefined}
      className={cn(
        'grid gap-2',
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-3',
        columns === 4 && 'grid-cols-4',
      )}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(selected && allowDeselect ? '' : option.value)}
            className={cn(
              'relative flex min-h-12 items-center justify-center rounded-xl border px-2 py-2.5 text-center text-[15px] font-medium transition active:scale-[0.98]',
              selected
                ? 'border-[#2c2e4b] bg-[#2c2e4b] text-white shadow-sm'
                : cn('bg-white text-[#2c2e4b]', invalid ? 'border-red-300' : 'border-[#e7d6bf]'),
            )}
          >
            {selected && <Check className="mr-1.5 h-4 w-4 shrink-0 text-[#caa26a]" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
