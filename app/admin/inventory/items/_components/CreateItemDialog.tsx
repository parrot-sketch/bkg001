'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSkuPrefix } from '@/lib/inventory/sku-prefixes';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';
import { UnitOfMeasureInput } from './UnitOfMeasureInput';

function generateSku(name: string, category: string): string {
    try {
      // Try to get prefix from centralized config
      const prefix = getSkuPrefix(category as InventoryCategory);
      const namePart = name
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .substring(0, 4);
      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      const date = new Date().toISOString().slice(2, 7).replace('-', '');
      return `${prefix}-${namePart || 'ITEM'}-${date}${random}`;
    } catch (error) {
      // Fallback for unknown categories
      console.error('SKU prefix error:', error);
      const namePart = name
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .substring(0, 4);
      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      const date = new Date().toISOString().slice(2, 7).replace('-', '');
      return `GEN-${namePart || 'ITEM'}-${date}${random}`;
    }
}

export function CreateItemDialog({ open, onOpenChange, onSuccess }: { open: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [category, setCategory] = useState(InventoryCategory.MEDICATION);
    const [uom, setUom] = useState('Unit');
    const [reorderPoint, setReorderPoint] = useState('10');
    const [isImplant, setIsImplant] = useState(false);
    const [manufacturer, setManufacturer] = useState('');

    // Auto-generate SKU when name or category changes
    useEffect(() => {
        if (name) {
            setSku(generateSku(name, category));
        }
    }, [name, category]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!name) {
            toast.error("Item Name is required");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/inventory/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    sku: sku || undefined,
                    category,
                    unit_of_measure: uom,
                    unit_cost: 0,
                    reorder_point: parseInt(reorderPoint) || 0,
                    is_implant: isImplant,
                    manufacturer: manufacturer || undefined,
                })
            });

            if (!res.ok) {
                const error = await res.text();
                throw new Error(error || 'Failed to create item');
            }

            toast.success("Item created successfully");
            onSuccess();
            resetForm();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to create item");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setName('');
        setSku('');
        setCategory(InventoryCategory.MEDICATION);
        setUom('Unit');
        setReorderPoint('10');
        setIsImplant(false);
        setManufacturer('');
    };

    const handleNameChange = (value: string) => {
        setName(value);
        if (!sku) {
            setSku(generateSku(value, category));
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            onOpenChange(val);
            if (!val) resetForm();
        }}>
            <DialogContent className="sm:max-w-[550px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add New Inventory Item</DialogTitle>
                        <DialogDescription>
                            Define a new item in the catalog. Stock levels are populated by receiving batches.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                className="col-span-3"
                                placeholder="e.g. Saline Solution 500ml"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="sku" className="text-right">SKU</Label>
                            <Input
                                id="sku"
                                value={sku}
                                onChange={(e) => setSku(e.target.value)}
                                className="col-span-3"
                                placeholder="Auto-generated"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="category" className="text-right">Category</Label>
                            <select
                                id="category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value as InventoryCategory)}
                                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value={InventoryCategory.IMPLANT}>Implant</option>
                                <option value={InventoryCategory.SUTURE}>Suture</option>
                                <option value={InventoryCategory.ANESTHETIC}>Anesthetic</option>
                                <option value={InventoryCategory.MEDICATION}>Medication</option>
                                <option value={InventoryCategory.DISPOSABLE}>Disposable</option>
                                <option value={InventoryCategory.INSTRUMENT}>Instrument</option>
                                <option value={InventoryCategory.DRESSING}>Dressing</option>
                                <option value={InventoryCategory.SPECIMEN_CONTAINER}>Specimen Container</option>
                                <option value={InventoryCategory.OTHER}>Other</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <div className="col-span-4">
                                <UnitOfMeasureInput
                                    id="uom"
                                    value={uom}
                                    onChange={setUom}
                                    label="Unit of Measure"
                                    showLabel={true}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="reorder" className="text-right">Reorder Point</Label>
                            <Input
                                id="reorder"
                                type="number"
                                min="0"
                                value={reorderPoint}
                                onChange={(e) => setReorderPoint(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="manufacturer" className="text-right">Manufacturer</Label>
                            <Input
                                id="manufacturer"
                                value={manufacturer}
                                onChange={(e) => setManufacturer(e.target.value)}
                                className="col-span-3"
                                placeholder="Optional"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <div className="col-start-2 col-span-3 flex items-center space-x-2">
                                <input 
                                    type="checkbox" 
                                    id="isImplant" 
                                    checked={isImplant}
                                    onChange={(e) => setIsImplant(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <Label htmlFor="isImplant" className="font-normal cursor-pointer">
                                    Flag as high-value Implant (requires strict tracking)
                                </Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Item'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
