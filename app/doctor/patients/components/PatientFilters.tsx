'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder="Search name, email, phone, file #..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-xs bg-white border-slate-200 rounded-lg"
        />
      </div>

      {/* Sort Tabs */}
      <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
              sortBy === opt.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Result count */}
      <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
        {loading ? '...' : `${resultCount} patient${resultCount !== 1 ? 's' : ''}`}
      </span>
    </div>
  );
}
