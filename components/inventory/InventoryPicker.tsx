'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Package, Loader2, AlertCircle } from 'lucide-react';
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

interface InventoryItem {
    id: number;
    name: string;
    sku: string | null;
    unitCost: number;
    category: string;
    isBillable: boolean;
}

interface InventoryPickerProps {
    onSelect: (item: InventoryItem) => void;
    className?: string;
    placeholder?: string;
    excludeIds?: number[];
    showZeroPrice?: boolean;
}

export function InventoryPicker({ 
    onSelect, 
    className, 
    placeholder = "Search inventory...", 
    excludeIds = [],
    showZeroPrice = true 
}: InventoryPickerProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showZeroPriceItems, setShowZeroPriceItems] = useState(true);

    useEffect(() => {
        if (open && items.length === 0) {
            fetchItems();
        }
    }, [open]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/inventory/items?limit=100', { credentials: 'include' });
            const result = await res.json();
            console.log('Inventory API response:', result);
            if (result.success) {
                setItems(result.data.data);
            } else {
                toast.error(result.error || 'Failed to load inventory items');
            }
        } catch (error) {
            console.error('Error fetching inventory items:', error);
            toast.error('Error loading inventory');
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = useMemo(() => {
        let filtered = items.filter(i => !excludeIds.includes(i.id));
        
        if (!showZeroPriceItems) {
            filtered = filtered.filter(i => i.unitCost > 0);
        }
        
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(i => 
                i.name.toLowerCase().includes(lower) || 
                i.sku?.toLowerCase().includes(lower) ||
                i.category.toLowerCase().includes(lower)
            );
        }
        return filtered;
    }, [items, searchTerm, excludeIds, showZeroPriceItems]);

    const zeroPriceCount = useMemo(() => 
        items.filter(i => !excludeIds.includes(i.id) && i.unitCost === 0).length
    , [items, excludeIds]);

    const groupedItems = useMemo(() => {
        const groups: Record<string, InventoryItem[]> = {};
        filteredItems.forEach(i => {
            const cat = i.category || 'Other';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(i);
        });
        return groups;
    }, [filteredItems]);

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
                        <Search className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-slate-600 truncate font-medium">
                            {placeholder}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {zeroPriceCount > 0 && (
                            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                {zeroPriceCount} no price
                            </span>
                        )}
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-0 rounded-2xl border-slate-200 shadow-xl overflow-hidden" align="start">
                <Command className="border-none">
                    <CommandInput 
                        placeholder="Search by name, SKU or category..." 
                        className="h-12 border-none focus:ring-0"
                        onValueChange={setSearchTerm}
                    />
                    <CommandList className="max-h-[350px]">
                        <CommandEmpty>
                            {loading ? (
                                <div className="flex items-center justify-center py-6 gap-2 text-slate-400">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">Loading catalog...</span>
                                </div>
                            ) : (
                                <div className="py-6 text-center">
                                    <Package className="h-8 w-8 text-slate-100 mx-auto mb-2" />
                                    <p className="text-sm text-slate-400">No items found.</p>
                                </div>
                            )}
                        </CommandEmpty>
                        {Object.entries(groupedItems).map(([category, categoryItems]) => (
                            <CommandGroup key={category} heading={category}>
                                {categoryItems.map((item) => (
                                    <CommandItem
                                        key={item.id}
                                        value={`${item.name} ${item.sku || ''} ${item.category}`}
                                        onSelect={() => {
                                            onSelect(item);
                                            setOpen(false);
                                        }}
                                        className="px-4 py-3 cursor-pointer hover:bg-slate-50 aria-selected:bg-slate-50"
                                    >
                                        <div className="flex flex-col gap-0.5 w-full">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-slate-900">{item.name}</span>
                                                {item.unitCost > 0 ? (
                                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                        KSH {item.unitCost.toLocaleString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" /> No price
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-mono text-slate-400">{item.sku || 'NO SKU'}</span>
                                                <span className="text-[10px] text-slate-400 uppercase tracking-wider">{item.category}</span>
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