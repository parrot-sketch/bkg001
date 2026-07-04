import { X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SearchAutocomplete } from '@/components/frontdesk/SearchAutocomplete';
import { PatientFilters } from './PatientFilters';
import type { QuickFilter } from '../types/patient-page';

interface PatientToolbarProps {
  isSelectionMode: boolean;
  isBrowseMode: boolean;
  isFetching: boolean;
  isLoading: boolean;
  totalRecords: number;
  hasActiveFilters: boolean;
  activeQuickFilters: QuickFilter[];
  onToggleFilter: (filter: QuickFilter) => void;
  onClearFilters: () => void;
  onExitSelectionMode: () => void;
  onSelectPatient: (patientId: string) => void;
  onOpenRegistration: () => void;
}

/**
 * The `CardHeader` section of the patient registry card.
 * Contains the title, description, search autocomplete, action buttons,
 * and quick-filter chips.
 */
export function PatientToolbar({
  isSelectionMode,
  isBrowseMode,
  isFetching,
  isLoading,
  totalRecords,
  hasActiveFilters,
  activeQuickFilters,
  onToggleFilter,
  onClearFilters,
  onExitSelectionMode,
  onSelectPatient,
  onOpenRegistration,
}: PatientToolbarProps) {
  const description = isSelectionMode
    ? 'Choose a patient to schedule an appointment'
    : isBrowseMode
      ? 'Browse all registered patients'
      : isFetching && !isLoading
        ? 'Searching...'
        : `${totalRecords.toLocaleString()} patients found`;

  return (
    <CardHeader className="border-b border-[#e7d6bf] px-5 py-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold text-[#2c2e4b] leading-none">
            {isSelectionMode ? 'Select a patient' : 'Patients'}
          </CardTitle>
          <CardDescription className="text-xs text-[#2c2e4b]/50 leading-snug">
            {description}
          </CardDescription>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto shrink-0">
          {isSelectionMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onExitSelectionMode}
              className="h-9 text-xs text-[#2c2e4b]/60 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/30 rounded-lg"
            >
              Cancel
            </Button>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-9 text-xs text-[#2c2e4b]/60 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/30 rounded-lg"
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Clear all
            </Button>
          )}

          <SearchAutocomplete
            placeholder="Search by name, phone, ID, insurance..."
            onSelectPatient={(patient) => onSelectPatient(patient.id)}
            className="w-full sm:w-72"
          />

          {!isSelectionMode && (
            <Button
              className="h-9 bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] rounded-lg text-xs font-medium shadow-sm"
              onClick={onOpenRegistration}
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              Add Patient
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <PatientFilters activeFilters={activeQuickFilters} onToggle={onToggleFilter} />
      </div>
    </CardHeader>
  );
}
