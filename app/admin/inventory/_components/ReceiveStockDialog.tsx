'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { InventoryItem } from './types';

interface ReceiveStockDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  inventoryItems: InventoryItem[];
  form: { itemId: string; batch: string; serial: string; expiry: string; qty: string; cost: string };
  onChange: (field: string, value: string) => void;
}

export function ReceiveStockDialog({ isOpen, onOpenChange, onSubmit, isSubmitting, inventoryItems, form, onChange }: ReceiveStockDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Receive New Stock</DialogTitle>
          <DialogDescription>Enter details of the incoming inventory batch.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Item</Label>
            <div className="col-span-3">
              <Select value={form.itemId || ''} onValueChange={val => onChange('itemId', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item…" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map(item => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name}{item.sku ? ` (${item.sku})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Batch/Lot</Label>
            <Input className="col-span-3" value={form.batch} onChange={e => onChange('batch', e.target.value)} placeholder="e.g. LOT-2026-X" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Serial #</Label>
            <Input className="col-span-3" value={form.serial} onChange={e => onChange('serial', e.target.value)} placeholder="Optional" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Expiry</Label>
            <Input type="date" className="col-span-3" value={form.expiry} onChange={e => onChange('expiry', e.target.value)} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Quantity</Label>
            <Input type="number" min="1" className="col-span-3" value={form.qty} onChange={e => onChange('qty', e.target.value)} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Unit Cost</Label>
            <Input type="number" min="0" step="0.01" className="col-span-3" value={form.cost} onChange={e => onChange('cost', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>{isSubmitting ? 'Receiving…' : 'Confirm Receipt'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
