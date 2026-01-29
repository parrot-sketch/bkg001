'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search, User } from 'lucide-react';
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

    // If a value is provided but we don't have the patient details, we might want to fetch them
    // For now, we assume the parent component handles initial data if needed, or we rely on the selection
    React.useEffect(() => {
        if (value && !selectedPatient && patients.length > 0) {
            const found = patients.find(p => p.id === value);
            if (found) setSelectedPatient(found);
        }
    }, [value, patients, selectedPatient]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    disabled={disabled}
                >
                    {selectedPatient ? (
                        <div className="flex items-center gap-2 text-left overflow-hidden">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-3 w-3 text-primary" />
                            </div>
                            <div className="flex flex-col truncate">
                                <span className="truncate font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                                <span className="text-xs text-muted-foreground truncate">{selectedPatient.email}</span>
                            </div>
                        </div>
                    ) : (
                        "Select patient..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Search by name, email, or phone..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                    />
                    <CommandList>
                        {loading && <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>}

                        {!loading && patients.length === 0 && searchQuery.length >= 2 && (
                            <CommandEmpty>No patients found.</CommandEmpty>
                        )}

                        {!loading && searchQuery.length < 2 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                Type at least 2 characters to search
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
                                    className="flex items-center gap-3 py-3 cursor-pointer"
                                >
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium truncate">{patient.firstName} {patient.lastName}</span>
                                            <span className="text-xs text-muted-foreground shrink-0">{patient.fileNumber}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="truncate">{patient.email}</span>
                                            <span>•</span>
                                            <span className="truncate">{patient.phone}</span>
                                        </div>
                                    </div>
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === patient.id ? "opacity-100" : "opacity-0"
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
