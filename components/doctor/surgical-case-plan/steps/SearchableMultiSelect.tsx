'use client';

/**
 * Type-first multi value field.
 * Type a name and press Enter to add; catalog matches suggest, they do not block.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableOption {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SearchableMultiSelectProps {
  options: SearchableOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  loading?: boolean;
  maxItems?: number;
  className?: string;
  renderChip?: (option: SearchableOption) => string;
  allowCustom?: boolean;
  customPlaceholder?: string;
  onCustomCreate?: (value: string) => void;
}

function chipLabel(id: string, options: SearchableOption[]): string {
  if (id.startsWith('__custom__:')) return id.replace('__custom__:', '');
  return options.find((o) => o.id === id)?.label ?? id;
}

export function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Type a name and press Enter…',
  searchPlaceholder,
  emptyText = 'No catalog matches — press Enter to add what you typed.',
  disabled = false,
  loading = false,
  maxItems,
  className,
  renderChip,
  allowCustom = true,
  customPlaceholder,
  onCustomCreate,
}: SearchableMultiSelectProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const atLimit = maxItems !== undefined && value.length >= maxItems;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const available = options.filter((o) => !value.includes(o.id));
    if (!q) return available.slice(0, 12);
    return available
      .filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          (o.description?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 12);
  }, [options, query, value]);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return undefined;
    return options.find((o) => o.label.toLowerCase() === q && !value.includes(o.id));
  }, [options, query, value]);

  const addId = (id: string) => {
    if (value.includes(id) || atLimit) return;
    onChange([...value, id]);
    setQuery('');
    setOpen(true);
    inputRef.current?.focus();
  };

  const addCustom = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || !allowCustom || atLimit) return;
    const customId = `__custom__:${trimmed}`;
    if (value.includes(customId)) {
      setQuery('');
      return;
    }
    // Avoid dupes against catalog labels already selected
    const alreadyLabeled = value.some(
      (v) => chipLabel(v, options).toLowerCase() === trimmed.toLowerCase(),
    );
    if (alreadyLabeled) {
      setQuery('');
      return;
    }
    onChange([...value, customId]);
    onCustomCreate?.(trimmed);
    setQuery('');
    setOpen(true);
    inputRef.current?.focus();
  };

  const commitCurrent = () => {
    if (atLimit) return;
    if (exactMatch) {
      addId(exactMatch.id);
      return;
    }
    if (highlight >= 0 && filtered[highlight] && !filtered[highlight].disabled) {
      addId(filtered[highlight].id);
      return;
    }
    if (allowCustom && query.trim()) addCustom(query);
  };

  const remove = (id: string) => onChange(value.filter((v) => v !== id));

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const showUseTyped =
    allowCustom &&
    !atLimit &&
    query.trim().length > 0 &&
    !exactMatch;

  return (
    <div ref={rootRef} className={cn('space-y-2', className)}>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => {
            const option = options.find((o) => o.id === id);
            const label = option
              ? renderChip
                ? renderChip(option)
                : option.label
              : chipLabel(id, options);
            const isCustom = id.startsWith('__custom__:');
            return (
              <span
                key={id}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium',
                  isCustom
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-slate-200 bg-slate-100 text-slate-700',
                )}
              >
                {label}
                <button
                  type="button"
                  onClick={() => remove(id)}
                  className="ml-0.5 hover:text-red-600"
                  aria-label={`Remove ${label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      ) : null}

      <div
        className={cn(
          'flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 transition-colors',
          open && 'border-[#caa26a] ring-2 ring-[#caa26a]/20',
          (disabled || atLimit) && 'opacity-60',
        )}
      >
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled || loading || atLimit}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          placeholder={
            atLimit
              ? 'Limit reached'
              : customPlaceholder || searchPlaceholder || placeholder
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => {
              if (!rootRef.current?.contains(document.activeElement)) {
                const trimmed = query.trim();
                if (trimmed) {
                  if (exactMatch) addId(exactMatch.id);
                  else if (allowCustom) addCustom(trimmed);
                }
                setOpen(false);
              }
            }, 120);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !query && value.length > 0) {
              remove(value[value.length - 1]);
              return;
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              commitCurrent();
            } else if (e.key === 'Escape') {
              setOpen(false);
              setQuery('');
            }
          }}
        />
        {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" /> : null}
      </div>

      {open && !disabled && !loading && !atLimit ? (
        <div
          id={listId}
          role="listbox"
          className="relative z-40 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 && !showUseTyped ? (
            <p className="px-3 py-2.5 text-xs text-slate-500">{emptyText}</p>
          ) : null}

          {filtered.map((option, idx) => (
            <button
              key={option.id}
              type="button"
              role="option"
              className={cn(
                'flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors',
                highlight === idx ? 'bg-[#e7d6bf]/40' : 'hover:bg-slate-50',
              )}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlight(idx)}
              onClick={() => addId(option.id)}
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 opacity-0" />
              <span className="min-w-0">
                <span className="block font-medium text-slate-800">{option.label}</span>
                {option.description ? (
                  <span className="block text-xs text-slate-500">{option.description}</span>
                ) : null}
              </span>
            </button>
          ))}

          {showUseTyped ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-left text-sm text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addCustom(query)}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-[#caa26a]">
                Add
              </span>
              <span className="truncate font-medium">“{query.trim()}”</span>
              <span className="ml-auto shrink-0 text-[11px] text-slate-400">Enter</span>
            </button>
          ) : null}

          {allowCustom ? (
            <p className="border-t border-slate-100 px-3 py-1.5 text-[10px] text-slate-400">
              Type a name and press Enter — suggestions are optional
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
