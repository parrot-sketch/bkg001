'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PatientSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  isFetching: boolean;
  placeholder?: string;
}

export function PatientSearchInput({
  value,
  onChange,
  isFetching,
  placeholder = 'Search by name, phone, ID...',
}: PatientSearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const commitSearch = useCallback(
    (trimmed: string) => {
      if (trimmed !== valueRef.current) {
        onChange(trimmed);
      }
    },
    [onChange],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        commitSearch(newValue.trim());
      }, 350);
    },
    [commitSearch],
  );

  const handleClear = useCallback(() => {
    setLocalValue('');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    onChange('');
  }, [onChange]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full sm:w-72">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2c2e4b]/40 pointer-events-none z-10" />
      <Input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        className="h-9 rounded-lg border-[#e7d6bf] bg-white pl-9 pr-9 text-xs touch-manipulation focus:border-[#caa26a] focus:ring-[#caa26a]/20"
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full text-[#2c2e4b]/40 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/30 transition-colors z-10"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      {isFetching && localValue && (
        <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-[#caa26a] font-medium z-0">
          Searching...
        </span>
      )}
    </div>
  );
}
