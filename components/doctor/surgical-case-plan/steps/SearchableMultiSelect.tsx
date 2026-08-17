'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { cn } from '@/lib/utils';

export interface SearchableOption {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SearchableMultiSelectProps {
  options: SearchableOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  loading?: boolean;
  maxItems?: number;
  className?: string;
  renderChip?: (option: SearchableOption) => string;
  allowCustom?: boolean;
  customPlaceholder?: string;
  onCustomCreate?: (value: string) => void;
}

export function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  disabled = false,
  loading = false,
  maxItems,
  className,
  renderChip,
  allowCustom = false,
  customPlaceholder = 'Enter custom value...',
  onCustomCreate,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);

  const selectedOptions = options.filter((o) => value.includes(o.id));
  const customValues = value.filter((v) => v.startsWith('__custom__:'));

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      if (maxItems && value.length >= maxItems) return;
      onChange([...value, id]);
    }
  };

  const remove = (id: string) => {
    onChange(value.filter((v) => v !== id));
  };

  useEffect(() => {
    if (customMode && open && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [customMode, open]);

  const handleSelectOption = (optionId: string) => {
    if (optionId === '__custom__' && allowCustom && onCustomCreate) {
      setCustomMode(true);
      setCustomValue('');
      return;
    }
    toggle(optionId);
    setOpen(false);
  };

  const handleCustomSubmit = () => {
    const trimmed = customValue.trim();
    if (!trimmed) return;
    const customId = `__custom__:${trimmed}`;
    onChange([...value, customId]);
    onCustomCreate?.(trimmed);
    setCustomMode(false);
    setCustomValue('');
  };

  return (
    <div className={cn('space-y-2', className)}>
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((option) => (
            <span
              key={option.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
            >
              {renderChip ? renderChip(option) : option.label}
              <button
                type="button"
                onClick={() => remove(option.id)}
                className="ml-0.5 hover:text-red-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {customValues.map((cv) => (
            <span
              key={cv}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-800 text-xs font-medium border border-amber-200"
            >
              {cv.replace('__custom__:', '')}
              <button
                type="button"
                onClick={() => remove(cv)}
                className="ml-0.5 hover:text-red-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn('w-full justify-between font-normal h-9', className)}
            disabled={disabled || loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
              </span>
            ) : (
              <span className="text-slate-400">
                {placeholder}
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder={searchPlaceholder}
            />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = value.includes(option.id);
                  const isDisabled =
                    option.disabled ||
                    (maxItems !== undefined &&
                      !isSelected &&
                      value.length >= maxItems);

                  return (
                    <CommandItem
                      key={option.id}
                      value={option.label}
                      onSelect={() => {
                        if (!isDisabled) handleSelectOption(option.id);
                      }}
                      disabled={isDisabled}
                    >
                      <div
                        className={cn(
                          'mr-2 flex h-4 w-4 items-center justify-center rounded border',
                          isSelected
                            ? 'border-slate-800 bg-slate-800 text-white'
                            : 'border-slate-300'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        {option.description && (
                          <span className="text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
                {allowCustom && (
                  <CommandItem
                    value="__custom__"
                    onSelect={() => handleSelectOption('__custom__')}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>Custom...</span>
                      <span className="text-xs text-muted-foreground">
                        Enter a value not in the list
                      </span>
                    </div>
                  </CommandItem>
                )}
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
    </div>
  );
}
