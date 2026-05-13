'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export type UiOption<T extends string | number> = { value: T; label: string };

export function FieldGroup(props: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white', props.className)}>
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">{props.title}</div>
        {props.description ? <div className="mt-1 text-xs text-slate-500">{props.description}</div> : null}
      </div>
      <div className="p-4">{props.children}</div>
    </section>
  );
}

export function TextField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', props.className)}>
      <Label className="text-xs text-slate-600">{props.label}</Label>
      <Input
        value={props.value}
        disabled={props.disabled}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        className="h-9 bg-white"
      />
    </div>
  );
}

export function NumberField(props: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', props.className)}>
      <Label className="text-xs text-slate-600">{props.label}</Label>
      <Input
        type="number"
        value={props.value ?? ''}
        min={props.min}
        max={props.max}
        disabled={props.disabled}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="h-9 bg-white"
      />
    </div>
  );
}

export function DateField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', props.className)}>
      <Label className="text-xs text-slate-600">{props.label}</Label>
      <Input
        type="date"
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value)}
        className="h-9 bg-white"
      />
    </div>
  );
}

export function TimeField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', props.className)}>
      <Label className="text-xs text-slate-600">{props.label}</Label>
      <Input
        type="time"
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value)}
        className="h-9 bg-white"
      />
    </div>
  );
}

export function TextAreaField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', props.className)}>
      <Label className="text-xs text-slate-600">{props.label}</Label>
      <Textarea
        value={props.value}
        disabled={props.disabled}
        placeholder={props.placeholder}
        rows={props.rows ?? 3}
        onChange={(e) => props.onChange(e.target.value)}
        className="bg-white"
      />
    </div>
  );
}

export function SelectField<T extends string | number>(props: {
  label: string;
  value: T | undefined;
  onChange: (v: T | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  options: UiOption<T>[];
  className?: string;
}) {
  const stringValue = props.value === undefined ? '' : String(props.value);
  const valueMap = React.useMemo(() => new Map(props.options.map((o) => [String(o.value), o.value])), [props.options]);

  return (
    <div className={cn('space-y-1.5', props.className)}>
      <Label className="text-xs text-slate-600">{props.label}</Label>
      <Select
        value={stringValue}
        onValueChange={(v) => props.onChange(v ? (valueMap.get(v) as T) : undefined)}
        disabled={props.disabled}
      >
        <SelectTrigger className="h-9 bg-white">
          <SelectValue placeholder={props.placeholder ?? 'Select…'} />
        </SelectTrigger>
        <SelectContent>
          {props.options.map((o) => (
            <SelectItem key={String(o.value)} value={String(o.value)}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function YesNoField(props: {
  label: string;
  value: 'Y' | 'N' | undefined;
  onChange: (v: 'Y' | 'N' | undefined) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-1.5', props.className)}>
      <div className="text-sm text-slate-700">{props.label}</div>
      <RadioGroup
        className="flex items-center gap-4"
        value={props.value ?? ''}
        onValueChange={(v) => props.onChange((v as 'Y' | 'N') || undefined)}
        disabled={props.disabled}
      >
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <RadioGroupItem value="Y" /> Yes
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <RadioGroupItem value="N" /> No
        </label>
      </RadioGroup>
    </div>
  );
}

export function MultiSelectField<T extends string>(props: {
  label: string;
  value: T[];
  onChange: (v: T[]) => void;
  disabled?: boolean;
  options: UiOption<T>[];
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const cols = props.columns ?? 2;
  return (
    <div className={cn('space-y-2', props.className)}>
      <Label className="text-xs text-slate-600">{props.label}</Label>
      <div className={cn('grid gap-2', cols === 2 && 'grid-cols-2', cols === 3 && 'grid-cols-3', cols === 4 && 'grid-cols-4')}>
        {props.options.map((o) => {
          const checked = props.value.includes(o.value);
          return (
            <label key={o.value} className={cn('flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm', checked ? 'bg-slate-50' : 'bg-white', props.disabled && 'opacity-60')}>
              <input
                type="checkbox"
                checked={checked}
                disabled={props.disabled}
                onChange={(e) => {
                  const set = new Set(props.value);
                  if (e.target.checked) set.add(o.value);
                  else set.delete(o.value);
                  props.onChange(Array.from(set));
                }}
              />
              <span className="text-slate-700">{o.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

