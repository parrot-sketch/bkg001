'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { MIN_BIRTH_YEAR } from '@/lib/schema';
import { cn } from '@/lib/utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type Parts = { day: string; month: string; year: string };

function splitIso(value: string): Parts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { year: match[1], month: String(Number(match[2])), day: String(Number(match[3])) };
}

function composeIso({ day, month, year }: Parts): string {
  if (!day || !month || !year) return '';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function daysIn(month: string, year: string): number {
  if (!month) return 31;
  // Unknown year: allow 29 Feb rather than rejecting it before the year is picked.
  return new Date(Date.UTC(Number(year) || 2000, Number(month), 0)).getUTCDate();
}

interface DateOfBirthFieldProps {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  inputClassName: string;
}

/**
 * Day / Month / Year pickers for dates of birth.
 *
 * Native <select>s open the phone's own wheel / list picker, so nothing has to
 * be typed. Days are limited to the chosen month, years run newest first and are
 * grouped by decade. Emits `YYYY-MM-DD` once all three are picked, otherwise ''.
 */
export function DateOfBirthField({ value, onChange, invalid, inputClassName }: DateOfBirthFieldProps) {
  const [parts, setParts] = useState<Parts>(() => splitIso(value) ?? { day: '', month: '', year: '' });

  // Sync when the form value is replaced externally (e.g. a restored draft).
  useEffect(() => {
    const incoming = splitIso(value);
    if (incoming && value !== composeIso(parts)) setParts(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const decades = useMemo(() => {
    const groups: { label: string; years: number[] }[] = [];
    for (let y = new Date().getFullYear(); y >= MIN_BIRTH_YEAR; y--) {
      const label = `${Math.floor(y / 10) * 10}s`;
      if (groups.at(-1)?.label !== label) groups.push({ label, years: [] });
      groups.at(-1)!.years.push(y);
    }
    return groups;
  }, []);

  const maxDay = daysIn(parts.month, parts.year);

  const update = (next: Partial<Parts>) => {
    const merged = { ...parts, ...next };
    if (merged.day && Number(merged.day) > daysIn(merged.month, merged.year)) merged.day = '';
    setParts(merged);
    onChange(composeIso(merged));
  };

  const selectClass = (empty: boolean) =>
    cn(
      inputClassName,
      'appearance-none bg-white pl-3.5 pr-8',
      empty && 'text-[#2c2e4b]/35',
      invalid && empty && 'border-red-400 focus:border-red-400 focus:ring-red-100',
    );
  const subLabel = 'mb-1 block text-xs font-medium text-[#2c2e4b]/55';
  const chevron = <ChevronDown className="pointer-events-none absolute bottom-[1.125rem] right-2.5 h-4 w-4 text-[#2c2e4b]/40" />;

  return (
    <div className="grid grid-cols-[5.25rem_1fr_6.5rem] gap-2.5">
      <label className="relative block">
        <span className={subLabel}>Day</span>
        <select
          aria-label="Day"
          autoComplete="bday-day"
          value={parts.day}
          onChange={(e) => update({ day: e.target.value })}
          className={selectClass(!parts.day)}
        >
          <option value="" disabled>DD</option>
          {Array.from({ length: maxDay }, (_, i) => String(i + 1)).map((d) => (
            <option key={d} value={d} className="text-[#2c2e4b]">{d}</option>
          ))}
        </select>
        {chevron}
      </label>
      <label className="relative block">
        <span className={subLabel}>Month</span>
        <select
          aria-label="Month"
          autoComplete="bday-month"
          value={parts.month}
          onChange={(e) => update({ month: e.target.value })}
          className={selectClass(!parts.month)}
        >
          <option value="" disabled>Month</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={String(i + 1)} className="text-[#2c2e4b]">{name}</option>
          ))}
        </select>
        {chevron}
      </label>
      <label className="relative block">
        <span className={subLabel}>Year</span>
        <select
          aria-label="Year"
          autoComplete="bday-year"
          value={parts.year}
          onChange={(e) => update({ year: e.target.value })}
          className={selectClass(!parts.year)}
        >
          <option value="" disabled>YYYY</option>
          {decades.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.years.map((y) => (
                <option key={y} value={String(y)} className="text-[#2c2e4b]">{y}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {chevron}
      </label>
    </div>
  );
}
