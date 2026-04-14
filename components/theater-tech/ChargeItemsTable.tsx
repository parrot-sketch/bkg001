'use client';

/**
 * ChargeItemsTable
 *
 * Responsive display for charge sheet items:
 * - Mobile: stacked cards (md:hidden)
 * - Desktop: table layout (hidden md:block)
 */

import { FileText, Trash2, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { ChargeItem, ChargeItemsTableProps } from './charge-sheet.types';

function ItemTypeIcon({ type }: { type: ChargeItem['type'] }) {
  return type === 'service' ? (
    <FileText className="h-4 w-4 text-blue-500 shrink-0" />
  ) : (
    <Package className="h-4 w-4 text-orange-500 shrink-0" />
  );
}

function lineTotal(item: ChargeItem): string {
  return ((item.amount || 0) * (item.quantity || 0)).toLocaleString();
}

export function ChargeItemsTable({
  chargeItems,
  onQuantityChange,
  onQuantityBlur,
  onAmountChange,
  onAmountBlur,
  onRemoveItem,
  getDraft,
}: ChargeItemsTableProps) {
  return (
    <div className="space-y-3">
      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-2">
        {chargeItems.map((item) => {
          const draft = getDraft(item);
          return (
            <div key={item.id} className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <ItemTypeIcon type={item.type} />
                <span className="text-sm font-medium truncate flex-1">
                  {item.description}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1 text-slate-400 hover:text-red-500 touch-manipulation"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-xs text-slate-500">Qty</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="h-9 touch-manipulation"
                    value={draft.quantityStr}
                    onChange={(e) =>
                      onQuantityChange(item.id, e.target.value)
                    }
                    onBlur={() => onQuantityBlur(item.id)}
                    aria-label="Quantity"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-500">Unit Price</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="h-9 touch-manipulation"
                    value={draft.amountStr}
                    onChange={(e) =>
                      onAmountChange(item.id, e.target.value)
                    }
                    onBlur={() => onAmountBlur(item.id)}
                    aria-label="Unit price"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <span className="text-sm font-medium">
                    KSH {lineTotal(item)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-xs font-medium text-slate-500 px-3 py-2">
                Item
              </th>
              <th className="text-left text-xs font-medium text-slate-500 px-3 py-2 w-24">
                Qty
              </th>
              <th className="text-left text-xs font-medium text-slate-500 px-3 py-2 w-32">
                Unit Price
              </th>
              <th className="text-right text-xs font-medium text-slate-500 px-3 py-2 w-28">
                Total
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {chargeItems.map((item) => {
              const draft = getDraft(item);
              return (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <ItemTypeIcon type={item.type} />
                      <span className="text-sm">{item.description}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="h-8 w-20"
                      value={draft.quantityStr}
                      onChange={(e) =>
                        onQuantityChange(item.id, e.target.value)
                      }
                      onBlur={() => onQuantityBlur(item.id)}
                      aria-label="Quantity"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      className="h-8 w-28"
                      value={draft.amountStr}
                      onChange={(e) =>
                        onAmountChange(item.id, e.target.value)
                      }
                      onBlur={() => onAmountBlur(item.id)}
                      aria-label="Unit price"
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-medium">
                    KSH {lineTotal(item)}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
