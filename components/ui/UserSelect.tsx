/**
 * UserSelect Component
 *
 * A combobox for selecting users (staff members) in forms.
 * Supports filtering by role.
 */

'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
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
import { useUsers, type UserOption } from '@/hooks/useUsers';

interface UserSelectProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    role?: string;
    disabled?: boolean;
}

export function UserSelect({
    value,
    onChange,
    placeholder = 'Select user...',
    role,
    disabled = false,
}: UserSelectProps) {
    const [open, setOpen] = useState(false);
    const { data: users = [], isLoading } = useUsers(role);

    const selectedUser = users.find((u) => u.id === value || u.name === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-9 font-normal"
                    disabled={disabled || isLoading}
                >
                    {isLoading ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading...
                        </span>
                    ) : selectedUser ? (
                        selectedUser.name
                    ) : (
                        placeholder
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                        <CommandEmpty>No users found.</CommandEmpty>
                        <CommandGroup>
                            {users.map((user) => (
                                <CommandItem
                                    key={user.id}
                                    value={user.name}
                                    onSelect={() => {
                                        onChange(user.name);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={`mr-2 h-4 w-4 ${
                                            (selectedUser?.id === user.id || selectedUser?.name === user.name)
                                                ? 'opacity-100'
                                                : 'opacity-0'
                                        }`}
                                    />
                                    <div className="flex flex-col">
                                        <span>{user.name}</span>
                                        <span className="text-xs text-muted-foreground">{user.role}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
