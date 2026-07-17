'use client';

import { Button } from '@/components/ui/button';
import type { StatusFilter } from '../Filters/PatientFilters';

export interface DoctorPatientsEmptyStateProps {
  mode: 'no-patients' | 'no-search' | 'no-filters';
  statusFilter?: StatusFilter;
  searchQuery?: string;
  onClearSearch?: () => void;
  onClearFilters?: () => void;
}

export function DoctorPatientsEmptyState({
  mode,
  statusFilter = 'ACTIVE',
  searchQuery = '',
  onClearSearch,
  onClearFilters,
}: DoctorPatientsEmptyStateProps) {
  const isNoSearch = mode === 'no-search';
  const isNoFilters = mode === 'no-filters';

  const heading = isNoSearch
    ? 'No patients match your search'
    : isNoFilters
      ? 'No patients match your filters'
      : statusFilter === 'ALL'
        ? 'No patients on record'
        : `No ${statusFilter.toLowerCase()} patients`;

  const description = isNoSearch
    ? 'Try a different name, file number, or phone number.'
    : isNoFilters
      ? 'Clear the active filter to see the full page.'
      : statusFilter === 'ACTIVE'
        ? 'Patients appear here once assigned to your active care.'
        : 'Try switching the status filter above.';

  return (
    <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#e7d6bf] rounded-xl">
      <h3 className="text-sm font-semibold text-[#2c2e4b]">{heading}</h3>
      <p className="text-xs text-[#2c2e4b]/60 max-w-xs text-center mt-1">{description}</p>
      {isNoSearch && onClearSearch && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 rounded-lg border-[#e7d6bf] text-[#2c2e4b]"
          onClick={onClearSearch}
        >
          Clear search
        </Button>
      )}
      {isNoFilters && onClearFilters && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 rounded-lg border-[#e7d6bf] text-[#2c2e4b]"
          onClick={onClearFilters}
        >
          Clear filter
        </Button>
      )}
    </div>
  );
}
