'use client';

/**
 * ChargeSheetStepContent
 *
 * Shared "charges" UI (search + items + totals) without any footer actions.
 * The parent decides how/where to place Save / Finish buttons.
 */

import { Loader2 } from 'lucide-react';
import type { UseChargeSheetReturn } from '@/hooks/theater-tech/useChargeSheet';
import { ChargeSearchInput } from './ChargeSearchInput';
import { ChargeItemsTable } from './ChargeItemsTable';
import { ChargeTotals } from './ChargeTotals';

interface Props {
  cs: UseChargeSheetReturn;
  emptyHint?: string;
}

export function ChargeSheetStepContent({ cs, emptyHint }: Props) {
  if (cs.isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ChargeSearchInput
        searchQuery={cs.searchQuery}
        dropdownOpen={cs.dropdownOpen}
        filteredServices={cs.filteredServices}
        filteredInventory={cs.filteredInventory}
        onSearchChange={(v) => {
          cs.setSearchQuery(v);
          cs.setDropdownOpen(true);
        }}
        onFocus={() => cs.setDropdownOpen(true)}
        onAddService={cs.handleAddService}
        onAddInventory={cs.handleAddInventory}
        onClose={() => cs.setDropdownOpen(false)}
      />

      {cs.chargeItems.length > 0 ? (
        <div className="space-y-3">
          <ChargeItemsTable
            chargeItems={cs.chargeItems}
            rowDrafts={cs.rowDrafts}
            onQuantityChange={cs.handleQuantityChange}
            onQuantityBlur={cs.handleQuantityBlur}
            onAmountChange={cs.handleAmountChange}
            onAmountBlur={cs.handleAmountBlur}
            onRemoveItem={cs.handleRemoveItem}
            getDraft={cs.getDraft}
          />
          <ChargeTotals
            subtotal={cs.subtotal}
            discount={cs.discount}
            total={cs.total}
            discountStr={cs.discountStr}
            onDiscountChange={cs.handleDiscountChange}
            onDiscountBlur={cs.handleDiscountBlur}
          />
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-lg">
          <p className="text-sm">No charges added yet</p>
          <p className="text-xs mt-1">
            {emptyHint ?? 'Search above to add services or inventory items — or skip and add later'}
          </p>
        </div>
      )}
    </div>
  );
}

