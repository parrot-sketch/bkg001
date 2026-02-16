'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, User } from 'lucide-react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useEligibleStaff } from '@/hooks/doctor/useEligibleStaff';
import { useDebounce } from '@/hooks/use-debounce'; // Assuming this hook exists, or I will implement a local one

interface StaffSelectorProps {
    caseId: string;
    surgicalRole: string;
    value?: string;
    onSelect: (userId: string) => void;
    disabled?: boolean;
}

export function StaffSelector({
    caseId,
    surgicalRole,
    value,
    onSelect,
    disabled
}: StaffSelectorProps) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);

    const { data, isLoading } = useEligibleStaff({
        caseId,
        surgicalRole: surgicalRole as any, // Cast to enum if needed
        query: debouncedSearch
    });

    const selectedUser = data?.items.find((item) => item.id === value);

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
                    {selectedUser ? (
                        <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[10px]">
                                    {selectedUser.fullName.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <span>{selectedUser.fullName}</span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">Select staff member...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Search by name..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                    />
                    <CommandList>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <>
                                {data?.items.length === 0 && (
                                    <CommandEmpty>No eligible staff found.</CommandEmpty>
                                )}
                                <CommandGroup heading="Suggestions">
                                    {data?.items.map((user) => (
                                        <CommandItem
                                            key={user.id}
                                            value={user.id}
                                            onSelect={(currentValue) => {
                                                onSelect(currentValue);
                                                setOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value === user.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex flex-col">
                                                <span className="font-medium">{user.fullName}</span>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>{user.role}</span>
                                                    {user.department && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{user.department}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
