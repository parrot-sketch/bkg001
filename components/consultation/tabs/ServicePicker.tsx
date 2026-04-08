'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Stethoscope, AlertCircle } from 'lucide-react';
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
import { toast } from 'sonner';

interface ServiceItem {
    id: number;
    service_name: string;
    price: number;
    category: string | null;
}

interface ServicePickerProps {
    onSelect: (service: ServiceItem) => void;
    className?: string;
    placeholder?: string;
    excludeIds?: number[];
    showZeroPrice?: boolean;
}

export function ServicePicker({ 
    onSelect, 
    className, 
    placeholder = "Search procedures...", 
    excludeIds = [],
    showZeroPrice = false 
}: ServicePickerProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showZeroPriceItems, setShowZeroPriceItems] = useState(showZeroPrice);

    useEffect(() => {
        if (open && services.length === 0) {
            fetchServices();
        }
    }, [open]);

    const fetchServices = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/services');
            const result = await res.json();
            if (result.success && result.data) {
                setServices(result.data);
            } else {
                toast.error('Failed to load services');
            }
        } catch (error) {
            console.error('Error fetching services:', error);
            toast.error('Error loading services');
        } finally {
            setLoading(false);
        }
    };

    const filteredServices = useMemo(() => {
        let filtered = services.filter(s => !excludeIds.includes(s.id));
        
        if (!showZeroPriceItems) {
            filtered = filtered.filter(s => s.price > 0);
        }
        
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(s => 
                s.service_name.toLowerCase().includes(lower) || 
                s.category?.toLowerCase().includes(lower)
            );
        }
        return filtered;
    }, [services, searchTerm, excludeIds, showZeroPriceItems]);

    const zeroPriceCount = useMemo(() => 
        services.filter(s => !excludeIds.includes(s.id) && s.price === 0).length
    , [services, excludeIds]);

    const groupedServices = useMemo(() => {
        const groups: Record<string, ServiceItem[]> = {};
        filteredServices.forEach(s => {
            const cat = s.category || 'Other';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(s);
        });
        return groups;
    }, [filteredServices]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between h-11 px-4 border-slate-200 rounded-xl hover:bg-slate-50 transition-all", className)}
                >
                    <div className="flex items-center gap-2 truncate">
                        <Stethoscope className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-slate-600 truncate font-medium">
                            {placeholder}
                        </span>
                    </div>
                    {zeroPriceCount > 0 && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mr-2">
                            {zeroPriceCount} no price
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-0 rounded-2xl border-slate-200 shadow-xl overflow-hidden" align="start">
                <Command className="border-none">
                    <CommandInput 
                        placeholder="Search procedures or services..." 
                        className="h-12 border-none focus:ring-0"
                        onValueChange={setSearchTerm}
                    />
                    <CommandList className="max-h-[350px]">
                        <CommandEmpty>
                            {loading ? (
                                <div className="flex items-center justify-center py-6 gap-2 text-slate-400">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">Loading services...</span>
                                </div>
                            ) : (
                                <div className="py-6 text-center">
                                    <Stethoscope className="h-8 w-8 text-slate-100 mx-auto mb-2" />
                                    <p className="text-sm text-slate-400">No services found.</p>
                                </div>
                            )}
                        </CommandEmpty>
                        {Object.entries(groupedServices).map(([category, items]) => (
                            <CommandGroup key={category} heading={category}>
                                {items.map((service) => (
                                    <CommandItem
                                        key={service.id}
                                        value={`${service.service_name} ${service.category || ''}`}
                                        onSelect={() => {
                                            onSelect(service);
                                            setOpen(false);
                                        }}
                                        className="px-4 py-3 cursor-pointer hover:bg-slate-50 aria-selected:bg-slate-50"
                                    >
                                        <div className="flex flex-col gap-0.5 w-full">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-slate-900">{service.service_name}</span>
                                                {service.price > 0 ? (
                                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                        KSH {service.price.toLocaleString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" /> No price
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                        {zeroPriceCount > 0 && !showZeroPriceItems && (
                            <div className="border-t border-slate-100 p-3">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setShowZeroPriceItems(true);
                                    }}
                                    className="w-full text-center text-sm text-amber-600 hover:text-amber-700 flex items-center justify-center gap-2 py-2"
                                >
                                    <AlertCircle className="w-4 h-4" />
                                    Show {zeroPriceCount} items without price
                                </button>
                            </div>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}