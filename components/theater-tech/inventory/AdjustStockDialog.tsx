'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { StockAdjustmentType, StockAdjustmentReason } from '@prisma/client';
import { InventoryItemRow } from '@/app/theater-tech/inventory/components/InventoryDataTable';

interface AdjustStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItemRow | null;
  onSaved: () => void;
}

const ADJUSTMENT_REASONS: { value: StockAdjustmentReason; label: string }[] = [
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'LOST', label: 'Lost' },
  { value: 'THEFT', label: 'Theft' },
  { value: 'COUNT_CORRECTION', label: 'Count Correction' },
  { value: 'RETURN_TO_VENDOR', label: 'Return to Vendor' },
  { value: 'OTHER', label: 'Other' },
];

export function AdjustStockDialog({ open, onOpenChange, item, onSaved }: AdjustStockDialogProps) {
  const [adjustmentType, setAdjustmentType] = useState<StockAdjustmentType>('INCREMENT');
  const [adjustmentReason, setAdjustmentReason] = useState<StockAdjustmentReason>('COUNT_CORRECTION');
  const [quantityChange, setQuantityChange] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!item) return;
    if (quantityChange <= 0) {
      toast.error('Quantity change must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.request(`/stores/inventory/${item.id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({
          adjustmentType,
          adjustmentReason,
          quantityChange,
          notes: notes || undefined,
        }),
      });

      if (!response.success) {
        throw new Error((response as any).error || 'Failed to adjust stock');
      }

      toast.success('Stock adjusted successfully');
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            {item ? `Adjusting stock for: ${item.name}` : 'Select an item to adjust.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Adjustment Type</Label>
            <Select value={adjustmentType} onValueChange={(val) => setAdjustmentType(val as StockAdjustmentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCREMENT">Increment</SelectItem>
                <SelectItem value="DECREMENT">Decrement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={adjustmentReason} onValueChange={(val) => setAdjustmentReason(val as StockAdjustmentReason)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADJUSTMENT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantity Change</Label>
            <Input type="number" min={1} value={quantityChange} onChange={(e) => setQuantityChange(parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !item}>
            {isSubmitting ? 'Adjusting...' : 'Adjust Stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
