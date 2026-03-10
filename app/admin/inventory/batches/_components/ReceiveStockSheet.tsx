'use client';

import { useState } from 'react';
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

interface ReceiveStockSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    inventoryItems: any[];
}

export function ReceiveStockSheet({ open, onOpenChange, onSuccess, inventoryItems }: ReceiveStockSheetProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [newItemId, setNewItemId] = useState<string>('');
    const [newBatch, setNewBatch] = useState('');
    const [newSerial, setNewSerial] = useState('');
    const [newExpiry, setNewExpiry] = useState('');
    const [newQty, setNewQty] = useState('1');
    const [newCost, setNewCost] = useState('0');

    const handleReceiveStock = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newItemId || !newBatch || !newExpiry || !newQty) {
            toast.error('Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/inventory/batches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inventory_item_id: parseInt(newItemId),
                    batch_number: newBatch,
                    serial_number: newSerial || undefined,
                    expiry_date: new Date(newExpiry).toISOString(),
                    quantity: parseInt(newQty),
                    cost_per_unit: parseFloat(newCost),
                    notes: 'Received via Admin Batches UI'
                }),
            });

            if (!res.ok) throw new Error('Failed to receive stock');

            toast.success('Stock received successfully');
            onSuccess();
            resetForm();
        } catch (error) {
            toast.error('Error receiving stock');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setNewItemId('');
        setNewBatch('');
        setNewSerial('');
        setNewExpiry('');
        setNewQty('1');
        setNewCost('0');
    };

    return (
        <Sheet open={open} onOpenChange={(val) => {
            onOpenChange(val);
            if (!val) resetForm();
        }}>
            <SheetContent className="sm:max-w-[450px] overflow-y-auto">
                <form onSubmit={handleReceiveStock} className="flex flex-col h-full">
                    <SheetHeader className="pb-4 border-b">
                        <SheetTitle>Receive New Stock</SheetTitle>
                        <SheetDescription>
                            Enter the details of the incoming inventory batch (Goods Receipt).
                        </SheetDescription>
                    </SheetHeader>
                    
                    <div className="flex-1 py-6 space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="item">Item <span className="text-red-500">*</span></Label>
                            <select
                                id="item"
                                value={newItemId}
                                onChange={(e) => setNewItemId(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            >
                                <option value="">Select Item...</option>
                                {inventoryItems.map((item: any) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name} {item.sku ? `(${item.sku})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="batch">Batch / Lot Number <span className="text-red-500">*</span></Label>
                            <Input
                                id="batch"
                                value={newBatch}
                                onChange={(e) => setNewBatch(e.target.value)}
                                placeholder="e.g. LOT-2024-X"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="serial">Serial Number</Label>
                            <Input
                                id="serial"
                                value={newSerial}
                                onChange={(e) => setNewSerial(e.target.value)}
                                placeholder="Optional (Required for Implants)"
                                className="font-mono text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="expiry">Expiry Date <span className="text-red-500">*</span></Label>
                            <Input
                                id="expiry"
                                type="date"
                                value={newExpiry}
                                onChange={(e) => setNewExpiry(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="qty">Quantity Received <span className="text-red-500">*</span></Label>
                                <Input
                                    id="qty"
                                    type="number"
                                    min="1"
                                    value={newQty}
                                    onChange={(e) => setNewQty(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cost">Unit Cost</Label>
                                <Input
                                    id="cost"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={newCost}
                                    onChange={(e) => setNewCost(e.target.value)}
                                />
                            </div>
                        </div>

                    </div>

                    <SheetFooter className="border-t pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Receiving...' : 'Confirm Receipt'}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
