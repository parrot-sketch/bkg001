'use client';

import { Search, Users } from 'lucide-react';
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
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
        <Input
          placeholder="Search patients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-xs bg-white border-stone-200 rounded-md"
        />
      </div>

      {/* Sort Tabs */}
      <div className="flex items-center gap-3">
        {SORT_OPTIONS.map((opt) => {
          const isActive = sortBy === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                isActive
                  ? "bg-stone-900 text-white"
                  : "text-stone-500 hover:text-stone-700 hover:bg-stone-100"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Result count */}
      <div className="flex items-center gap-2 text-xs text-stone-400 ml-auto">
        <Users className="h-3.5 w-3.5" />
        <span className="font-medium">
          {loading ? '...' : `${resultCount} patient${resultCount !== 1 ? 's' : ''}`}
        </span>
      </div>
    </div>
  );
}
