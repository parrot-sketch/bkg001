/**
 * Consume From Plan Dialog Component
 * 
 * Presentational component for consuming items from plan.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { PlannedItemViewModel } from '../inventoryPlanningMappers';

interface ConsumeFromPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PlannedItemViewModel | null;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function ConsumeFromPlanDialog({
  open,
  onOpenChange,
  item,
  quantity,
  onQuantityChange,
  onConfirm,
  isLoading,
}: ConsumeFromPlanDialogProps) {
  if (!item) return null;

  const remainingQuantity = item.remainingQuantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Consume from Plan</DialogTitle>
          <DialogDescription>
            Record usage for <strong>{item.itemName}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(e) => onQuantityChange(parseFloat(e.target.value) || 0)}
              className="mt-1"
            />
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div>Planned: {item.plannedQuantity}</div>
              <div>Used: {item.usedQuantity}</div>
              <div>Remaining: {remainingQuantity}</div>
              <div>Stock Available: {item.stockAvailable}</div>
            </div>
          </div>
          {quantity > remainingQuantity && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <p>
                Warning: Requested quantity ({quantity}) exceeds remaining planned quantity (
                {remainingQuantity}). This will be recorded as over-consumption.
              </p>
            </div>
          )}
          {quantity > item.stockAvailable && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              <p>
                Error: Requested quantity ({quantity}) exceeds available stock ({item.stockAvailable}
                ). This operation will fail.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading || quantity <= 0}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Consuming...
              </>
            ) : (
              'Consume'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
