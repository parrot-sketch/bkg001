/**
 * Planned Items Table Component
 * 
 * Presentational component for displaying and editing planned items.
 */

import { CheckCircle2, AlertTriangle, XCircle, Trash2, ShoppingCart } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '../../../shared/components/EmptyState';
import type { PlannedItemViewModel } from '../inventoryPlanningMappers';
import { cn } from '@/lib/utils';

interface PlannedItemsTableProps {
  items: PlannedItemViewModel[];
  editingItems: Map<number, { quantity: number; notes: string }>;
  onQuantityChange: (itemId: number, quantity: number) => void;
  onNotesChange: (itemId: number, notes: string) => void;
  onRemove: (itemId: number) => void;
  onConsume: (itemId: number) => void;
  canEdit: boolean;
  canConsume: boolean;
}

const STATUS_BADGES = {
  none: { icon: null, variant: 'outline' as const, label: 'Not Used' },
  partial: {
    icon: AlertTriangle,
    variant: 'outline' as const,
    label: 'Partial',
    className: 'border-stone-300 text-stone-600',
  },
  full: {
    icon: CheckCircle2,
    variant: 'outline' as const,
    label: 'Complete',
    className: 'border-stone-300 text-stone-600',
  },
  over: {
    icon: XCircle,
    variant: 'outline' as const,
    label: 'Over-consumed',
    className: 'border-stone-300 text-stone-600',
  },
};

export function PlannedItemsTable({
  items,
  editingItems,
  onQuantityChange,
  onNotesChange,
  onRemove,
  onConsume,
  canEdit,
  canConsume,
}: PlannedItemsTableProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="No planned items"
        description="Add items from inventory to create a surgical plan"
      />
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Planned Qty</TableHead>
            <TableHead>Unit Price</TableHead>
            <TableHead>Total Cost</TableHead>
            <TableHead>Used / Remaining</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const editing = editingItems.get(item.inventoryItemId);
            const statusBadge = STATUS_BADGES[item.consumptionStatus];
            const StatusIcon = statusBadge.icon;

            return (
              <TableRow key={item.inventoryItemId}>
                <TableCell>
                  <div>
                    <p className="font-medium">{item.itemName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {item.isLowStock && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Low Stock
                        </Badge>
                      )}
                      <Badge variant={item.isBillable ? 'default' : 'secondary'} className="text-xs">
                        {item.isBillable ? 'Billable' : 'Non-billable'}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {canEdit ? (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editing?.quantity ?? item.plannedQuantity}
                      onChange={(e) =>
                        onQuantityChange(item.inventoryItemId, parseFloat(e.target.value) || 0)
                      }
                      className="w-20 h-8 text-sm"
                    />
                  ) : (
                    <span className="text-sm">{item.plannedQuantity}</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm">{item.plannedUnitPrice.toFixed(2)}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium">
                    {((editing?.quantity ?? item.plannedQuantity) * item.plannedUnitPrice).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>Used: {item.usedQuantity}</div>
                    <div className="text-muted-foreground">
                      Remaining: {item.remainingQuantity}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {StatusIcon && (
                    <Badge
                      variant={statusBadge.variant}
                      className={cn('text-xs gap-1', 'className' in statusBadge ? statusBadge.className : undefined)}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusBadge.label}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {canEdit ? (
                    <Textarea
                      value={editing?.notes ?? item.notes ?? ''}
                      onChange={(e) => onNotesChange(item.inventoryItemId, e.target.value)}
                      placeholder="Optional notes..."
                      className="w-32 h-16 text-xs resize-none"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {item.notes || '—'}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {canConsume && item.remainingQuantity > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onConsume(item.inventoryItemId)}
                        className="h-7 text-xs"
                      >
                        Consume
                      </Button>
                    )}
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRemove(item.inventoryItemId)}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
