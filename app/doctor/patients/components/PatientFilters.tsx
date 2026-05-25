'use client';

import { Input } from '@/components/ui/input';

type SortKey = 'name' | 'recent' | 'visits';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name A–Z' },
  { key: 'recent', label: 'Recent Visit' },
  { key: 'visits', label: 'Most Visits' },
];

interface PatientFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: SortKey;
  setSortBy: (key: SortKey) => void;
  resultCount: number;
  loading: boolean;
}

export function PatientFilters({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  resultCount,
  loading,
}: PatientFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1">
        <Input
          placeholder="Search by name, file number, phone, email"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 text-sm bg-white border-slate-200 rounded-none"
        />
      </div>

      <div className="flex items-center gap-3 sm:justify-end">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Sort
        </label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="h-9 border border-slate-200 bg-white px-3 text-sm text-slate-900 rounded-none"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="text-sm text-slate-600 whitespace-nowrap">
          {loading ? '…' : `${resultCount} patient${resultCount !== 1 ? 's' : ''}`}
        </div>
      </div>
    </div>
  );
}
