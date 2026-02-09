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

  const debouncedSearch = useDebounce(searchQuery, 300);

  React.useEffect(() => {
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
            'w-full justify-between h-11 rounded-xl border-slate-200 hover:border-slate-300 transition-all',
            'text-left font-normal',
            selectedPatient && 'border-emerald-200 bg-emerald-50/30',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          disabled={disabled}
        >
          {selectedPatient ? (
            <div className="flex items-center gap-2.5 text-left overflow-hidden">
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-emerald-700" />
              </div>
              <div className="flex flex-col truncate">
                <span className="truncate text-sm font-semibold text-slate-800">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </span>
                <span className="text-[10px] text-slate-500 truncate">
                  {selectedPatient.fileNumber || selectedPatient.email}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-sm text-slate-400">Search patient by name, email, or phone...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-300" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[440px] p-0 rounded-xl shadow-xl border-slate-200" align="start">
        <Command shouldFilter={false}>
          <div className="relative">
            <CommandInput
              placeholder="Search patients..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-11"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
            )}
          </div>
          <CommandList className="max-h-[280px]">
            {!loading && patients.length === 0 && searchQuery.length >= 2 && (
              <CommandEmpty>
                <div className="py-6 text-center">
                  <User className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No patients found</p>
                  <p className="text-xs text-slate-400 mt-0.5">Try a different search term</p>
                </div>
              </CommandEmpty>
            )}

            {!loading && searchQuery.length < 2 && (
              <div className="py-8 text-center">
                <Search className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">Search Patients</p>
                <p className="text-xs text-slate-400 mt-0.5">Type at least 2 characters to begin</p>
              </div>
            )}

            {loading && patients.length === 0 && (
              <div className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Searching...</p>
              </div>
            )}

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
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  )}>
                    {patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-slate-800 truncate">
                        {patient.firstName} {patient.lastName}
                      </span>
                      {patient.fileNumber && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded shrink-0">
                          {patient.fileNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                      {patient.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 text-slate-300" />
                          {patient.email}
                        </span>
                      )}
                      {patient.phone && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Phone className="h-3 w-3 text-slate-300" />
                          {patient.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Check */}
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0 transition-opacity',
                      value === patient.id ? 'opacity-100 text-emerald-600' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
