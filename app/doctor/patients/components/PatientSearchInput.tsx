'use client';

/**
 * PatientSearchInput
 *
 * A debounced search input for the doctor patients roster.
 * - 300 ms debounce so the API isn't hit on every keystroke
 * - Clear (×) button when the field has a value
 * - Subtle spinner while a fetch is in flight
 */

import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatientSearchInputProps {
  value:        string;
  onChange:     (value: string) => void;
  loading?:     boolean;
  debounceMs?:  number;
  placeholder?: string;
  className?:   string;
}

export function PatientSearchInput({
  value,
  onChange,
  loading     = false,
  debounceMs  = 300,
  placeholder = 'Search by name, file number, phone or email…',
  className,
}: PatientSearchInputProps) {
  // Local draft — only propagated up after the debounce delay
  const [draft, setDraft] = useState(value);
  const timerRef          = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync if parent resets the value externally (e.g. "Clear filters")
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleChange = (raw: string) => {
    setDraft(raw);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(raw), debounceMs);
  };

  const handleClear = () => {
    setDraft('');
    if (timerRef.current) clearTimeout(timerRef.current);
    onChange('');
  };

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className={cn('relative flex items-center', className)}>
      {/* Leading icon — spinner during load, search icon otherwise */}
      <span className="absolute left-3 flex items-center pointer-events-none">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 text-white/40 animate-spin" />
        ) : (
          <Search className="h-3.5 w-3.5 text-white/40" />
        )}
      </span>

      <input
        type="search"
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search patients"
        className={cn(
          'w-full h-9 pl-9 pr-8',
          'bg-white/8 border border-white/15 rounded-lg',
          'text-sm text-white placeholder:text-white/35',
          'focus:outline-none focus:ring-1 focus:ring-[#caa26a]/60 focus:border-[#caa26a]/60',
          'transition-colors duration-150',
          // Remove browser-default search cancel button (we provide our own)
          '[&::-webkit-search-cancel-button]:appearance-none',
        )}
      />

      {/* Trailing clear button */}
      {draft && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2.5 flex items-center justify-center h-4 w-4 rounded-full bg-white/15 hover:bg-white/25 transition-colors duration-150"
        >
          <X className="h-2.5 w-2.5 text-white/70" />
        </button>
      )}
    </div>
  );
}
