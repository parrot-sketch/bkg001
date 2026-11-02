'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { ChargeItem, ChargeItemsTableProps } from './charge-sheet.types';

function lineTotal(item: ChargeItem): string {
  return ((item.amount || 0) * (item.quantity || 0)).toLocaleString();
}

const cell = 'border-b border-border px-3 py-2 align-middle';
const head = 'h-9 border-b border-border bg-[#e7d6bf]/30 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-secondary';

export function ChargeItemsTable({
  chargeItems,
  onQuantityChange,
  onQuantityBlur,
  onAmountChange,
  onAmountBlur,
  onDescriptionChange,
  onDescriptionFocus,
  onDescriptionBlur,
  highlightedItemId,
  onRemoveItem,
  getDraft,
}: ChargeItemsTableProps) {
  useEffect(() => {
    if (!highlightedItemId) return;
    document.getElementById(`charge-row-${highlightedItemId}`)?.scrollIntoView({ block: 'nearest' });
  }, [highlightedItemId]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr>
            <th className={head}>Item</th>
            <th className={`${head} text-right`}>Qty</th>
            <th className={`${head} text-right`}>Price per unit</th>
            <th className={`${head} text-right`}>Line total</th>
            <th className={`${head} w-10`} />
          </tr>
        </thead>
        <tbody>
          {chargeItems.map((item) => {
            const draft = getDraft(item);
            return (
              <tr
                key={item.id}
                id={`charge-row-${item.id}`}
                className={item.id === highlightedItemId ? 'bg-[#e7d6bf]/30' : 'hover:bg-[#e7d6bf]/30'}
              >
                <td className={`${cell} font-medium text-foreground`}>
                  {onDescriptionChange ? (
                    <Input
                      className="h-9 rounded-none"
                      value={item.description}
                      onChange={(event) => onDescriptionChange(item.id, event.target.value)}
                      onFocus={() => onDescriptionFocus?.(item.id)}
                      onBlur={() => onDescriptionBlur?.(item.id)}
                      aria-label="Item name"
                    />
                  ) : (
                    item.description
                  )}
                </td>
                <td className={`${cell} text-right`}>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="ml-auto h-9 w-20 rounded-none text-right"
                    value={draft.quantityStr}
                    onChange={(event) => onQuantityChange(item.id, event.target.value)}
                    onBlur={() => onQuantityBlur(item.id)}
                    aria-label="Quantity"
                  />
                </td>
                <td className={`${cell} text-right`}>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="ml-auto h-9 w-28 rounded-none text-right"
                    value={draft.amountStr}
                    onChange={(event) => onAmountChange(item.id, event.target.value)}
                    onBlur={() => onAmountBlur(item.id)}
                    aria-label="Unit price"
                  />
                </td>
                <td className={`${cell} text-right tabular-nums font-medium text-foreground`}>{lineTotal(item)}</td>
                <td className={cell}>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${item.description}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
