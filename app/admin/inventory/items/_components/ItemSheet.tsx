'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface InventoryItemFormData {
    id?: number;
    name: string;
    sku: string;
    category: string;
    uom: string;
    reorderPoint: string;
    isImplant: boolean;
    manufacturer: string;
}

interface ItemSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    initialData?: InventoryItemFormData | null;
}

export function ItemSheet({ open, onOpenChange, onSuccess, initialData }: ItemSheetProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState<InventoryItemFormData>({
        name: '',
        sku: '',
        category: 'MEDICATION',
        uom: 'Unit',
        reorderPoint: '10',
        isImplant: false,
        manufacturer: '',
    });

    // Populate data when editing
    useEffect(() => {
        if (open && initialData) {
            setFormData(initialData);
        } else if (open && !initialData) {
            resetForm();
        }
    }, [open, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name) {
            toast.error("Item Name is required");
            return;
        }

        setIsSubmitting(true);
        try {
            const url = formData.id ? `/api/inventory/items/${formData.id}` : '/api/inventory/items';
            const method = formData.id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    sku: formData.sku || undefined,
                    category: formData.category,
                    unitOfMeasure: formData.uom,
                    unitCost: 0,
                    reorderPoint: parseInt(formData.reorderPoint) || 0,
                    isImplant: formData.isImplant,
                    manufacturer: formData.manufacturer || undefined,
                })
            });

            if (!res.ok) {
                const error = await res.text();
                throw new Error(error || 'Failed to save item');
            }

            toast.success(`Item ${formData.id ? 'updated' : 'created'} successfully`);
            onSuccess();
            resetForm();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to save item");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            sku: '',
            category: 'MEDICATION',
            uom: 'Unit',
            reorderPoint: '10',
            isImplant: false,
            manufacturer: '',
        });
    };

    const handleChange = (field: keyof InventoryItemFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const isEdit = !!formData.id;

    return (
        <Sheet open={open} onOpenChange={(val) => {
            onOpenChange(val);
            if (!val) resetForm();
        }}>
            <SheetContent className="sm:max-w-[450px] overflow-y-auto">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <SheetHeader className="pb-4 border-b">
                        <SheetTitle>{isEdit ? 'Edit Item' : 'Add New Item'}</SheetTitle>
                        <SheetDescription>
                            {isEdit 
                                ? 'Update the catalog details for this item.' 
                                : 'Define a new item in the catalog. Stock levels are populated by receiving batches.'
                            }
                        </SheetDescription>
                    </SheetHeader>
                    
                    <div className="flex-1 py-6 space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Item Name <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="e.g. Saline Solution 500ml"
                                required
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sku">SKU / Code</Label>
                                <Input
                                    id="sku"
                                    value={formData.sku}
                                    onChange={(e) => handleChange('sku', e.target.value)}
                                    placeholder="e.g. MED-SAL"
                                    className="font-mono text-sm uppercase"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <select
                                    id="category"
                                    value={formData.category}
                                    onChange={(e) => handleChange('category', e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="MEDICATION">Medication</option>
                                    <option value="CONSUMABLE">Consumable</option>
                                    <option value="EQUIPMENT">Equipment</option>
                                    <option value="IMPLANT">Implant</option>
                                    <option value="SUTURE">Suture</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="uom">Unit of Measure</Label>
                                <Input
                                    id="uom"
                                    value={formData.uom}
                                    onChange={(e) => handleChange('uom', e.target.value)}
                                    placeholder="e.g. Box, Pcs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reorder">Reorder Point</Label>
                                <Input
                                    id="reorder"
                                    type="number"
                                    min="0"
                                    value={formData.reorderPoint}
                                    onChange={(e) => handleChange('reorderPoint', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="manufacturer">Manufacturer / Brand</Label>
                            <Input
                                id="manufacturer"
                                value={formData.manufacturer}
                                onChange={(e) => handleChange('manufacturer', e.target.value)}
                                placeholder="Optional"
                            />
                        </div>

                        <div className="flex items-start space-x-3 p-4 rounded-md border border-slate-200 bg-slate-50">
                            <input 
                                type="checkbox" 
                                id="isImplant" 
                                checked={formData.isImplant}
                                onChange={(e) => handleChange('isImplant', e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <div className="space-y-1">
                                <Label htmlFor="isImplant" className="font-medium cursor-pointer">
                                    High-Value Implant
                                </Label>
                                <p className="text-xs text-slate-500">
                                    Requires strict tracking and serialization upon receiving.
                                </p>
                            </div>
                        </div>
                    </div>

                    <SheetFooter className="border-t pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Item'}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
