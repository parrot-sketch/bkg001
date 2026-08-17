'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Loader2, Plus } from 'lucide-react';
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
import { Input } from '@/components/ui/input';

export interface StaffUserOption {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface StaffComboboxProps {
  label?: string;
  options: StaffUserOption[];
  isLoading: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  customPlaceholder?: string;
  roleHint?: string;
}

export function StaffCombobox({
  label,
  options,
  isLoading,
  value,
  onChange,
  placeholder = 'Select staff...',
  emptyText = 'No staff found.',
  customPlaceholder = 'Type custom name...',
  roleHint,
}: StaffComboboxProps) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    if (customMode && open && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [customMode, open]);

  const handleSelectOption = (optionId: string) => {
    if (optionId === '__custom__') {
      setCustomMode(true);
      setCustomValue('');
      return;
    }
    setCustomMode(false);
    setCustomValue('');
    onChange(optionId);
    setOpen(false);
  };

  const handleCustomSubmit = () => {
    const trimmed = customValue.trim();
    if (!trimmed) return;
    onChange(`__custom__:${trimmed}`);
    setCustomMode(false);
    setOpen(false);
  };

  const displayValue = value.startsWith('__custom__:')
    ? value.replace('__custom__:', '')
    : selected?.fullName || '';

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between h-9 font-normal"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
              </span>
            ) : displayValue ? (
              displayValue
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder={customPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.fullName}
                    onSelect={() => handleSelectOption(option.id)}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${
                        value === option.id ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    <div className="flex flex-col">
                      <span>{option.fullName}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.email}
                      </span>
                    </div>
                  </CommandItem>
                ))}
                <CommandItem
                  value="__custom__"
                  onSelect={() => handleSelectOption('__custom__')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>Custom...</span>
                    <span className="text-xs text-muted-foreground">
                      Enter a name not in the list
                    </span>
                  </div>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {customMode && (
        <div className="mt-2 flex gap-2">
          <Input
            ref={customInputRef}
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder={customPlaceholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCustomSubmit();
              }
              if (e.key === 'Escape') {
                setCustomMode(false);
                setCustomValue('');
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleCustomSubmit}
            disabled={!customValue.trim()}
          >
            Add
          </Button>
        </div>
      )}

      {roleHint && (
        <p className="text-[11px] text-slate-500 mt-1">{roleHint}</p>
      )}
    </div>
  );
}
