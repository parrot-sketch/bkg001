'use client';

/**
 * Type-first single value field.
 * Doctors type freely; catalog options appear as suggestions, never a gate.
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

interface SearchableSelectProps {
  options: SearchableOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  allowCustom?: boolean;
  customPlaceholder?: string;
  onCustomCreate?: (value: string) => void;
}

function displayFromValue(value: string | undefined, options: SearchableOption[]): string {
  if (!value) return '';
  if (value.startsWith('__custom__:')) return value.replace('__custom__:', '');
  return options.find((o) => o.id === value)?.label ?? '';
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search…',
  searchPlaceholder,
  emptyText = 'No matches',
  disabled = false,
  loading = false,
  className,
  allowCustom = true,
  customPlaceholder,
  onCustomCreate,
}: SearchableSelectProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(() => displayFromValue(value, options));
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    setQuery(displayFromValue(value, options));
  }, [value, options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 12);
    return options
      .filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          (o.description?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 12);
  }, [options, query]);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return undefined;
    return options.find((o) => o.label.toLowerCase() === q);
  }, [options, query]);

  const commitCustom = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (!allowCustom) return;
    const customId = `__custom__:${trimmed}`;
    onChange(customId);
    onCustomCreate?.(trimmed);
    setQuery(trimmed);
    setOpen(false);
  };

  const commitOption = (option: SearchableOption) => {
    if (option.disabled) return;
    onChange(option.id);
    setQuery(option.label);
    setOpen(false);
  };

  const commitCurrent = () => {
    if (exactMatch) {
      commitOption(exactMatch);
      return;
    }
    if (highlight >= 0 && filtered[highlight] && !filtered[highlight].disabled) {
      commitOption(filtered[highlight]);
      return;
    }
    if (allowCustom && query.trim()) {
      commitCustom(query);
    }
  };

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
    query.trim().length > 0 &&
    !exactMatch;

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 transition-colors',
          open && 'border-[#caa26a] ring-2 ring-[#caa26a]/20',
          disabled && 'opacity-60',
        )}
      >
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled || loading}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          placeholder={customPlaceholder || searchPlaceholder || placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value.trim() && value) onChange('');
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Defer so option click can run first
            window.setTimeout(() => {
              if (!rootRef.current?.contains(document.activeElement)) {
                const trimmed = query.trim();
                const currentDisplay = displayFromValue(value, options);
                if (trimmed && trimmed !== currentDisplay) {
                  if (exactMatch) commitOption(exactMatch);
                  else if (allowCustom) commitCustom(trimmed);
                }
                setOpen(false);
              }
            }, 120);
          }}
          onKeyDown={(e) => {
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
              setQuery(displayFromValue(value, options));
            }
          }}
        />
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
        ) : query ? (
          <button
            type="button"
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Clear"
            onClick={() => {
              setQuery('');
              onChange('');
              inputRef.current?.focus();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {open && !disabled && !loading ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 && !showUseTyped ? (
            <p className="px-3 py-2.5 text-xs text-slate-500">{emptyText}</p>
          ) : null}

          {filtered.map((option, idx) => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={value === option.id}
              disabled={option.disabled}
              className={cn(
                'flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors',
                highlight === idx ? 'bg-[#e7d6bf]/40' : 'hover:bg-slate-50',
                option.disabled && 'opacity-40',
              )}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlight(idx)}
              onClick={() => commitOption(option)}
            >
              <Check
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0 text-[#2c2e4b]',
                  value === option.id ? 'opacity-100' : 'opacity-0',
                )}
              />
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
              onClick={() => commitCustom(query)}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-[#caa26a]">
                Use
              </span>
              <span className="truncate font-medium">“{query.trim()}”</span>
              <span className="ml-auto shrink-0 text-[11px] text-slate-400">Enter</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
