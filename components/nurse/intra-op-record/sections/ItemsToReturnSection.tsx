'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Package, RotateCcw } from 'lucide-react';
import { apiClient, ApiResponse } from '@/lib/api/client';

interface InventoryItem {
    id: number;
    name: string;
    sku: string | null;
    category: string;
    quantity_on_hand: number;
    unit_cost: number;
}

interface ItemsToReturnSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled?: boolean;
    caseId?: string;
}

export function ItemsToReturnSection({ data, onChange, disabled, caseId }: ItemsToReturnSectionProps) {
    const items = Array.isArray(data.itemsToReturn) ? data.itemsToReturn : [];
    const setItems = (newItems: any[]) => onChange({ ...data, itemsToReturn: newItems });

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
    const [searching, setSearching] = useState(false);
    const [showSearch, setShowSearch] = useState(false);

    useEffect(() => {
        if (!searchQuery || !caseId) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await apiClient.get<any>(`/inventory/items?q=${encodeURIComponent(searchQuery)}`);
                if (res.success && res.data) {
                    const itemsData = Array.isArray(res.data) ? res.data : (res.data.data || []);
                    setSearchResults(itemsData.slice(0, 10));
                }
            } catch (e) {
                console.error('Search error:', e);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, caseId]);

    const handleAddItem = (item: InventoryItem) => {
        setItems([...items, {
            inventoryItemId: item.id,
            name: item.name,
            sku: item.sku,
            quantity: 1,
            returned: false,
        }]);
        setSearchQuery('');
        setSearchResults([]);
        setShowSearch(false);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_: any, i: number) => i !== index));
    };

    const handleUpdateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-slate-700 border-b pb-2">
                <RotateCcw className="h-4 w-4" />
                <span className="font-semibold">Items to Return to Theatre</span>
            </div>

            {caseId && (
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSearch(!showSearch)}
                        disabled={disabled}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Search Inventory
                    </Button>
                </div>
            )}

            {showSearch && (
                <div className="relative">
                    <Input
                        placeholder="Search inventory items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={disabled || searching}
                        className="pr-20"
                    />
                    {searching && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                            Searching...
                        </span>
                    )}
                    {searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                            {searchResults.map((item) => (
                                <button
                                    key={item.id}
                                    className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center justify-between"
                                    onClick={() => handleAddItem(item)}
                                    disabled={disabled}
                                >
                                    <div>
                                        <p className="font-medium text-sm">{item.name}</p>
                                        <p className="text-xs text-slate-500">SKU: {item.sku || 'N/A'}</p>
                                    </div>
                                    <Package className="h-4 w-4 text-slate-400" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                        <tr>
                            <th className="px-4 py-2 text-left font-medium text-slate-600">Item</th>
                            <th className="px-4 py-2 text-left font-medium text-slate-600 w-24">SKU</th>
                            <th className="px-4 py-2 text-left font-medium text-slate-600 w-24">Qty</th>
                            <th className="px-4 py-2 text-center font-medium text-slate-600 w-20">Returned</th>
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {items.map((item: any, idx: number) => (
                            <tr key={idx}>
                                <td className="px-4 py-2">{item.name}</td>
                                <td className="px-4 py-2 text-slate-500">{item.sku || '-'}</td>
                                <td className="px-4 py-2">
                                    <Input
                                        type="number"
                                        min={1}
                                        value={item.quantity || 1}
                                        onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                                        disabled={disabled}
                                        className="h-8 w-20"
                                    />
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <Checkbox
                                        checked={item.returned === true}
                                        onCheckedChange={(v) => handleUpdateItem(idx, 'returned', v === true)}
                                        disabled={disabled}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveItem(idx)}
                                        disabled={disabled}
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                                    No items to return recorded
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
