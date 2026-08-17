'use client';

/**
 * ChargeItemsTable
 *
 * Responsive display for charge sheet items:
 * - Mobile: stacked cards (md:hidden)
 * - Desktop: table layout (hidden md:block)
 */

import { FileText, Trash2, Package, GripVertical, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { ChargeItem, ChargeItemsTableProps } from './charge-sheet.types';

function ItemTypeIcon({ type }: { type: ChargeItem['type'] }) {
  if (type === 'service') {
    return (
      <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
        <FileText className="h-4 w-4" />
      </div>
    );
  }
  if (type === 'inventory') {
    return (
      <div className="h-8 w-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
        <Package className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
      <Tag className="h-4 w-4" />
    </div>
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
      <div className="md:hidden space-y-3">
        {chargeItems.map((item) => {
          const draft = getDraft(item);
          return (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <GripVertical className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <ItemTypeIcon type={item.type} />
                    <span className="text-sm font-medium text-slate-900 truncate flex-1">
                      {item.description}
                    </span>
                  </div>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                    {item.type}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg touch-manipulation transition-colors"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {typeof item.catalogAmount === 'number' && (
                <p className="mb-3 text-xs text-slate-500 bg-slate-50 rounded-lg px-2 py-1.5">
                  Catalog: KSH {item.catalogAmount.toLocaleString()}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-slate-400 mb-1 block">Qty</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="h-9 border-slate-200 bg-white touch-manipulation"
                    value={draft.quantityStr}
                    onChange={(e) =>
                      onQuantityChange(item.id, e.target.value)
                    }
                    onBlur={() => onQuantityBlur(item.id)}
                    aria-label="Quantity"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-slate-400 mb-1 block">Unit Price (KSH)</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="h-9 border-slate-200 bg-white touch-manipulation"
                    value={draft.amountStr}
                    onChange={(e) =>
                      onAmountChange(item.id, e.target.value)
                    }
                    onBlur={() => onAmountBlur(item.id)}
                    aria-label="Unit price"
                  />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Line Total</span>
                <span className="text-sm font-semibold text-[#2c2e4b]">
                  KSH {lineTotal(item)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[600px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 w-8" />
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">
                Item
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 w-24">
                Type
              </th>
              <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3 w-24">
                Qty
              </th>
              <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3 w-32">
                Unit Price
              </th>
              <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3 w-28">
                Total
              </th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {chargeItems.map((item) => {
              const draft = getDraft(item);
              return (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <GripVertical className="h-4 w-4 text-slate-300" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ItemTypeIcon type={item.type} />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.description}</p>
                        {typeof item.catalogAmount === 'number' && (
                          <p className="text-xs text-slate-500">
                            Catalog: KSH {item.catalogAmount.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="border-slate-200 bg-white text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                      {item.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="h-8 w-20 ml-auto border-slate-200 bg-white text-right"
                      value={draft.quantityStr}
                      onChange={(e) =>
                        onQuantityChange(item.id, e.target.value)
                      }
                      onBlur={() => onQuantityBlur(item.id)}
                      aria-label="Quantity"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Input
                      type="text"
                      inputMode="decimal"
                      className="h-8 w-28 ml-auto border-slate-200 bg-white text-right"
                      value={draft.amountStr}
                      onChange={(e) =>
                        onAmountChange(item.id, e.target.value)
                      }
                      onBlur={() => onAmountBlur(item.id)}
                      aria-label="Unit price"
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-[#2c2e4b]">
                    KSH {lineTotal(item)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
