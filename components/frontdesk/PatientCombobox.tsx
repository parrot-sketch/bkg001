'use client';

/**
 * PatientCombobox Component — Enhanced
 * 
 * Searchable patient selector with debounced search, file number display,
 * and polished visual design matching the Quick Book dialog aesthetic.
 */

import * as React from 'react';
import { Check, ChevronsUpDown, Search, User, Loader2, Phone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { useDebounce } from '@/hooks/useDebounce';

interface PatientComboboxProps {
  value?: string;
  onSelect: (patientId: string, patient?: PatientResponseDto) => void;
  disabled?: boolean;
}

export function PatientCombobox({ value, onSelect, disabled }: PatientComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [patients, setPatients] = React.useState<PatientResponseDto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedPatient, setSelectedPatient] = React.useState<PatientResponseDto | null>(null);
  const [authError, setAuthError] = React.useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  React.useEffect(() => {
    setAuthError(false);
    async function searchPatients() {
      if (!debouncedSearch || debouncedSearch.length < 2) {
        setPatients([]);
        return;
      }

      setLoading(true);
      try {
        const response = await frontdeskApi.searchPatients(debouncedSearch);
        if (response.success && response.data) {
          setPatients(response.data);
        } else if (!response.success && response.status === 401) {
          setAuthError(true);
        }
      } catch (error) {
        console.error('Error searching patients:', error);
      } finally {
        setLoading(false);
      }
    }

    if (debouncedSearch) {
      searchPatients();
    }
  }, [debouncedSearch]);

  // Sync selection if value changes externally
  React.useEffect(() => {
    if (value && !selectedPatient && patients.length > 0) {
      const found = patients.find(p => p.id === value);
      if (found) setSelectedPatient(found);
    }
  }, [value, patients, selectedPatient]);

  // Clear internal state when value is cleared externally
  React.useEffect(() => {
    if (!value) {
      setSelectedPatient(null);
      setSearchQuery('');
      setAuthError(false);
    }
  }, [value]);

   return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between h-11 rounded-lg border-[#e7d6bf] hover:border-[#caa26a]/50 transition-all',
            'text-left font-normal',
            selectedPatient && 'border-[#caa26a] bg-[#e7d6bf]/15',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          disabled={disabled}
        >
          {selectedPatient ? (
            <div className="flex items-center gap-2.5 text-left overflow-hidden">
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#e7d6bf]/30 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-[#caa26a]" />
              </div>
              <div className="flex flex-col truncate">
                <span className="truncate text-sm font-semibold text-[#2c2e4b]">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </span>
                <span className="text-[10px] text-[#2c2e4b]/60 truncate">
                  {selectedPatient.fileNumber || selectedPatient.email}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-sm text-[#2c2e4b]/40">Search patient by name, email, or phone...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-[#2c2e4b]/30" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[440px] p-0 rounded-xl shadow-xl border border-[#e7d6bf]" align="start">
        <Command shouldFilter={false}>
          <div className="relative">
            <CommandInput
              placeholder="Search patients..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-11"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#caa26a]" />
            )}
          </div>
          <CommandList className="max-h-[280px]">
            {authError && (
              <div className="py-6 text-center">
                <p className="text-sm text-red-600 font-medium">Session expired</p>
                <p className="text-xs text-[#2c2e4b]/50 mt-0.5">Please refresh the page and log in again</p>
              </div>
            )}

            {!authError && !loading && patients.length === 0 && searchQuery.length >= 2 && (
              <CommandEmpty>
                <div className="py-6 text-center">
                  <User className="h-8 w-8 text-[#e7d6bf] mx-auto mb-2" />
                  <p className="text-sm text-[#2c2e4b]">No patients found</p>
                  <p className="text-xs text-[#2c2e4b]/50 mt-0.5">Try a different search term</p>
                </div>
              </CommandEmpty>
            )}

            {!authError && !loading && searchQuery.length < 2 && (
              <div className="py-8 text-center">
                <Search className="h-8 w-8 text-[#e7d6bf] mx-auto mb-2" />
                <p className="text-sm text-[#2c2e4b] font-medium">Search Patients</p>
                <p className="text-xs text-[#2c2e4b]/50 mt-0.5">Type at least 2 characters to begin</p>
              </div>
            )}

            {!authError && loading && patients.length === 0 && (
              <div className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#caa26a] mx-auto mb-2" />
                <p className="text-xs text-[#2c2e4b]/50">Searching...</p>
              </div>
            )}

            {!authError && (
              <CommandGroup>
                {patients.map((patient) => (
                  <CommandItem
                    key={patient.id}
                    value={patient.id}
                    onSelect={() => {
                      setSelectedPatient(patient);
                      onSelect(patient.id, patient);
                      setOpen(false);
                    }}
                    className="flex items-center gap-3 py-3 px-3 cursor-pointer rounded-lg mx-1 my-0.5"
                  >
                    {/* Avatar */}
                    <div className={cn(
                      'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold',
                      value === patient.id
                        ? 'bg-[#e7d6bf]/40 text-[#2c2e4b]'
                        : 'bg-[#e7d6bf]/20 text-[#2c2e4b]/70'
                    )}>
                      {patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
                    </div>

                    {/* Info */}
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-[#2c2e4b] truncate">
                          {patient.firstName} {patient.lastName}
                        </span>
                        {patient.fileNumber && (
                          <span className="text-[10px] font-mono text-[#2c2e4b]/50 bg-[#e7d6bf]/20 px-1.5 py-0.5 rounded shrink-0">
                            {patient.fileNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[#2c2e4b]/50 mt-0.5">
                        {patient.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3 text-[#caa26a]/60" />
                            {patient.email}
                          </span>
                        )}
                        {patient.phone && (
                          <span className="flex items-center gap-1 shrink-0">
                            <Phone className="h-3 w-3 text-[#caa26a]/60" />
                            {patient.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Check */}
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0 transition-opacity',
                        value === patient.id ? 'opacity-100 text-[#caa26a]' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
