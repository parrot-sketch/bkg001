'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, Package, Loader2 } from 'lucide-react';
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
}

export function InventoryPicker({ onSelect, className, placeholder = "Search inventory..." }: InventoryPickerProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (open && items.length === 0) {
            fetchItems();
        }
    }, [open]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/inventory/items?pageSize=100');
            const result = await res.json();
            if (result.success) {
                setItems(result.data.data);
            } else {
                toast.error('Failed to load inventory items');
            }
        } catch (error) {
            console.error('Error fetching inventory items:', error);
            toast.error('Error loading inventory');
        } finally {
            setLoading(false);
        }
    };

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
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0 rounded-2xl border-slate-200 shadow-xl overflow-hidden" align="start">
                <Command className="border-none">
                    <CommandInput 
                        placeholder="Type product name or SKU..." 
                        className="h-12 border-none focus:ring-0"
                        onValueChange={setSearchTerm}
                    />
                    <CommandList className="max-h-[300px]">
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
                        <CommandGroup>
                            {items.map((item) => (
                                <CommandItem
                                    key={item.id}
                                    value={`${item.name} ${item.sku || ''}`}
                                    onSelect={() => {
                                        onSelect(item);
                                        setOpen(false);
                                    }}
                                    className="px-4 py-3 cursor-pointer hover:bg-slate-50 aria-selected:bg-slate-50"
                                >
                                    <div className="flex flex-col gap-0.5 w-full">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-900">{item.name}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.category}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-mono text-slate-400">{item.sku || 'NO SKU'}</span>
                                            {item.isBillable && (
                                                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold">BILLABLE</span>
                                            )}
                                        </div>
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
