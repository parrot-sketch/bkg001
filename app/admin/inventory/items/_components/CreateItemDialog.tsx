'use client';

import { useState } from 'react';
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

export function CreateItemDialog({ open, onOpenChange, onSuccess }: { open: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [category, setCategory] = useState('MEDICATION');
    const [uom, setUom] = useState('Unit');
    const [reorderPoint, setReorderPoint] = useState('10');
    const [isImplant, setIsImplant] = useState(false);
    const [manufacturer, setManufacturer] = useState('');

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
                    unitOfMeasure: uom,
                    unitCost: 0,
                    reorderPoint: parseInt(reorderPoint) || 0,
                    isImplant: isImplant,
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
        setCategory('MEDICATION');
        setUom('Unit');
        setReorderPoint('10');
        setIsImplant(false);
        setManufacturer('');
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
                                onChange={(e) => setName(e.target.value)}
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
                                placeholder="e.g. MED-SAL-500"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="category" className="text-right">Category</Label>
                            <select
                                id="category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="MEDICATION">Medication</option>
                                <option value="CONSUMABLE">Consumable</option>
                                <option value="EQUIPMENT">Equipment</option>
                                <option value="IMPLANT">Implant</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="uom" className="text-right">Unit of Measure</Label>
                            <Input
                                id="uom"
                                value={uom}
                                onChange={(e) => setUom(e.target.value)}
                                className="col-span-3"
                                placeholder="e.g. Unit, Box, Bottle"
                            />
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
