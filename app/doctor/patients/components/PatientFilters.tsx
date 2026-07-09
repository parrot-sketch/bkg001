'use client';

/**
 * PatientFilters
 *
 * Premium filter bar for the doctor patients roster.
 * - Search is handled by the parent (passed as a controlled prop)
 * - Status filter: full assignment lifecycle enum
 * - Sort: assignedAt | name, with asc/desc toggle
 * - Allergies toggle: quick in-memory filter on the current page
 */

import { ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PatientSearchInput } from './PatientSearchInput';

export type SortKey       = 'assignedAt' | 'name';
export type SortOrder     = 'asc' | 'desc';
export type StatusFilter  = 'ACTIVE' | 'DISCHARGED' | 'TRANSFERRED' | 'INACTIVE' | 'ALL';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'assignedAt', label: 'Date assigned' },
  { key: 'name',       label: 'Name A–Z'      },
];

const STATUS_OPTIONS: { key: StatusFilter; label: string; dot: string }[] = [
  { key: 'ACTIVE',      label: 'Active',      dot: 'bg-emerald-400' },
  { key: 'DISCHARGED',  label: 'Discharged',  dot: 'bg-zinc-400'    },
  { key: 'TRANSFERRED', label: 'Transferred', dot: 'bg-blue-400'    },
  { key: 'INACTIVE',    label: 'Inactive',    dot: 'bg-amber-400'   },
  { key: 'ALL',         label: 'All statuses',dot: 'bg-white/40'    },
];

interface PatientFiltersProps {
  searchQuery:     string;
  onSearchChange:  (query: string) => void;
  sortBy:          SortKey;
  onSortByChange:  (key: SortKey) => void;
  sortOrder:       SortOrder;
  onSortOrderToggle: () => void;
  statusFilter:    StatusFilter;
  onStatusChange:  (key: StatusFilter) => void;
  allergiesOnly:   boolean;
  onAllergiesToggle: () => void;
  resultCount:     number;
  total:           number;
  loading:         boolean;
}

export function PatientFilters({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
  statusFilter,
  onStatusChange,
  allergiesOnly,
  onAllergiesToggle,
  resultCount,
  total,
  loading,
}: PatientFiltersProps) {
  const currentStatus = STATUS_OPTIONS.find((o) => o.key === statusFilter) ?? STATUS_OPTIONS[0];

  return (
    <div className="space-y-3">
      {/* ── Row 1: Search ─────────────────────────────────────────────────── */}
      <PatientSearchInput
        value={searchQuery}
        onChange={onSearchChange}
        loading={loading}
        className="w-full"
      />

      {/* ── Row 2: Status pills + Sort + Allergies toggle ────────────────── */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Status filter — pill group */}
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onStatusChange(opt.key)}
              className={cn(
                'inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium transition-all duration-150',
                statusFilter === opt.key
                  ? 'bg-[#caa26a] text-[#2c2e4b] shadow-sm'
                  : 'bg-white/8 border border-white/12 text-white/65 hover:bg-white/14 hover:text-white/90'
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', opt.dot)} />
              {opt.label}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sort-by selector */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 hidden sm:block">
            Sort
          </span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as SortKey)}
              aria-label="Sort patients by"
              className={cn(
                'h-7 appearance-none pl-3 pr-7 rounded-lg border border-white/15 bg-white/8',
                'text-xs text-white/80',
                'focus:outline-none focus:ring-1 focus:ring-[#caa26a]/60',
                'transition-colors duration-150',
                '[&>option]:text-[#2c2e4b] [&>option]:bg-white',
              )}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/40 pointer-events-none" />
          </div>

          {/* Sort direction toggle */}
          <button
            type="button"
            onClick={onSortOrderToggle}
            aria-label={`Sort order: ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
            className="h-7 w-7 flex items-center justify-center rounded-lg border border-white/15 bg-white/8 text-white/60 hover:bg-white/15 hover:text-white transition-colors duration-150"
          >
            {sortOrder === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Allergies toggle */}
        <button
          type="button"
          onClick={onAllergiesToggle}
          aria-pressed={allergiesOnly}
          className={cn(
            'inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium transition-all duration-150',
            allergiesOnly
              ? 'bg-rose-500/80 border border-rose-400/50 text-white shadow-sm shadow-rose-500/20'
              : 'bg-white/8 border border-white/12 text-white/65 hover:bg-white/14 hover:text-white/90'
          )}
        >
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
          Allergies
        </button>

        {/* Result count */}
        <span className="text-xs text-white/40 whitespace-nowrap tabular-nums">
          {loading ? '…' : `${resultCount} of ${total}`}
        </span>
      </div>
    </div>
  );
}
