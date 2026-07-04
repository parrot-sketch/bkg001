'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { frontdeskApi } from '@/lib/api/frontdesk';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Loader2, Search, User, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';

interface SearchAutocompleteProps {
  onSelectPatient?: (patient: PatientResponseDto) => void;
  onNavigateToPatient?: (patientId: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
}

export function SearchAutocomplete({
  onSelectPatient,
  onNavigateToPatient,
  placeholder = 'Search patients...',
  className,
  inputClassName,
  autoFocus = false,
}: SearchAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientResponseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 200);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { openBookingDialog } = useBookAppointmentStore();

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    frontdeskApi
      .searchPatients(debouncedQuery)
      .then((res) => {
        if (!cancelled && res.success && res.data) {
          setResults(res.data);
          setOpen(true);
        }
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleSelect = useCallback(
    (patient: PatientResponseDto) => {
      setOpen(false);
      setQuery('');
      if (onSelectPatient) {
        onSelectPatient(patient);
      } else if (onNavigateToPatient) {
        onNavigateToPatient(patient.id);
      } else {
        router.push(`/frontdesk/patient/${patient.id}`);
      }
    },
    [onSelectPatient, onNavigateToPatient, router]
  );

  const handleBook = useCallback(
    (e: React.MouseEvent, patient: PatientResponseDto) => {
      e.stopPropagation();
      setOpen(false);
      setQuery('');
      openBookingDialog({
        initialPatientId: patient.id,
        source: AppointmentSource.FRONTDESK_SCHEDULED,
        bookingChannel: BookingChannel.PATIENT_LIST,
      });
    },
    [openBookingDialog]
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <div className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#caa26a] mx-auto mb-2" />
          <p className="text-xs text-[#2c2e4b]/50">Searching...</p>
        </div>
      );
    }
    return (
      <div className="py-8 text-center">
        <Search className="h-6 w-6 text-[#e7d6bf] mx-auto mb-2" />
        <p className="text-xs text-[#2c2e4b] font-medium">No patients found</p>
        <p className="text-[10px] text-[#2c2e4b]/40 mt-0.5">Try a different search term</p>
      </div>
    );
  };

  return (
    <Popover open={open && !loading && results.length > 0} onOpenChange={(v) => !loading && setOpen(v)}>
      <div className={cn('relative', className)}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#caa26a]/60 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.length >= 2) setOpen(true);
                else setOpen(false);
              }}
              onFocus={() => {
                if (query.length >= 2 && results.length > 0) setOpen(true);
              }}
              placeholder={placeholder}
              autoFocus={autoFocus}
              className={cn(
                'w-full rounded-lg border border-[#e7d6bf] bg-white py-2 pl-9 pr-16 text-sm text-[#2c2e4b] outline-none transition-all',
                'placeholder:text-[#2c2e4b]/30',
                'focus:border-[#caa26a] focus:ring-[#caa26a]/30 focus:ring-2',
                inputClassName
              )}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#caa26a]" />}
              {query && !loading && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md hover:bg-[#e7d6bf]/30 text-[#2c2e4b]/30"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    setOpen(false);
                    inputRef.current?.focus();
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-[#e7d6bf] bg-[#e7d6bf]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#2c2e4b]/40">
                Ctrl K
              </kbd>
            </div>
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="w-[440px] p-0 rounded-xl border border-[#e7d6bf] shadow-xl"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList className="max-h-[320px]">
              {results.length === 0 ? renderEmpty() : (
                <CommandGroup>
                  {results.map((patient) => {
                    const name = `${patient.firstName} ${patient.lastName}`;
                    const age = patient.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : (patient as any).age;
                    const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`;
                    return (
                      <CommandItem
                        key={patient.id}
                        value={patient.id}
                        onSelect={() => handleSelect(patient)}
                        className="flex items-center gap-3 py-3 px-3 cursor-pointer rounded-lg mx-1 my-0.5"
                      >
                        <div className="h-9 w-9 rounded-lg bg-[#e7d6bf]/20 border border-[#e7d6bf] flex items-center justify-center text-xs font-bold text-[#2c2e4b] shrink-0">
                          {patient.profileImage ? (
                            <img src={patient.profileImage} alt={name} className="h-full w-full rounded-lg object-cover" />
                          ) : (
                            initials
                          )}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-semibold text-sm text-[#2c2e4b] truncate">{name}</span>
                          <div className="flex items-center gap-2 text-[11px] text-[#2c2e4b]/50 mt-0.5">
                            <span className="font-mono">{patient.fileNumber}</span>
                            {age != null && <span>· {age} yrs</span>}
                            {patient.phone && <span>· {patient.phone}</span>}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 rounded-lg text-[10px] font-medium text-[#caa26a] hover:bg-[#e7d6bf]/30 shrink-0"
                          onClick={(e) => handleBook(e, patient)}
                        >
                          Book
                        </Button>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </div>
    </Popover>
  );
}
