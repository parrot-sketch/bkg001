'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Service {
  id: string;
  name: string;
  category: string;
}

interface ProcedureSelectProps {
  value: string;
  onChange: (value: string) => void;
  services: Service[];
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ProcedureSelect({
  value,
  onChange,
  services,
  loading = false,
  placeholder = 'Select a procedure...',
  disabled = false,
}: ProcedureSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Group services by category
  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  // Filter services based on search
  const filteredGroups = Object.entries(groupedServices).reduce((acc, [category, items]) => {
    const filtered = items.filter((service) =>
      service.name.toLowerCase().includes(search.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, Service[]>);

  // Get category display name
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      Procedure: 'Surgical Procedures',
      Treatment: 'Treatments',
      Consultation: 'Consultations',
    };
    return labels[category] || category;
  };

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const selectedService = services.find((s) => s.name === value);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !loading && !disabled && setIsOpen(!isOpen)}
        disabled={loading || disabled}
        className={cn(
          'w-full h-11 px-4 py-2 rounded-lg border bg-background text-left flex items-center justify-between transition-all duration-200',
          'hover:border-primary/50 hover:shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isOpen ? 'border-primary ring-2 ring-primary/20' : 'border-input'
        )}
      >
        {loading ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading procedures...
          </span>
        ) : selectedService ? (
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-medium">{selectedService.name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 w-full mt-2 rounded-xl border bg-background shadow-lg overflow-hidden',
            'animate-in fade-in zoom-in-95 duration-200'
          )}
        >
          {/* Search Input */}
          <div className="p-3 border-b bg-muted/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search procedures..."
                className="w-full h-10 pl-10 pr-4 rounded-lg border bg-background text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-[280px] overflow-y-auto p-1">
            {Object.keys(filteredGroups).length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p className="text-sm">No procedures found</p>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="text-sm text-primary hover:underline mt-1"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              Object.entries(filteredGroups).map(([category, items]) => (
                <div key={category} className="mb-2">
                  {/* Category Header */}
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {getCategoryLabel(category)}
                  </div>
                  {/* Items */}
                  {items.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => {
                        onChange(service.name);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={cn(
                        'w-full px-3 py-2.5 text-left flex items-center justify-between rounded-lg transition-colors',
                        'hover:bg-muted',
                        value === service.name
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground'
                      )}
                    >
                      <span className="font-medium text-sm">{service.name}</span>
                      {value === service.name && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t bg-muted/30 text-xs text-muted-foreground text-center">
            {services.length} procedure{services.length !== 1 ? 's' : ''} available
          </div>
        </div>
      )}
    </div>
  );
}
