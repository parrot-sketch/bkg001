'use client';

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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-border px-5 py-4">
        <ChargeSearchInput
          searchQuery={cs.searchQuery}
          dropdownOpen={cs.dropdownOpen}
          filteredServices={cs.filteredServices}
          filteredInventory={cs.filteredInventory}
          onSearchChange={(value) => {
            cs.setSearchQuery(value);
            cs.setDropdownOpen(true);
          }}
          onFocus={() => cs.setDropdownOpen(true)}
          onAddService={cs.handleAddService}
          onAddInventory={cs.handleAddInventory}
          onAddCustom={cs.handleAddCustom}
          onClose={() => cs.setDropdownOpen(false)}
          suggestedServices={cs.suggestedServices}
          addBlocked={cs.addBlocked}
        />
      </div>

      {cs.duplicateMessage && (
        <p className="border-b border-primary/30 bg-[#e7d6bf]/30 px-5 py-3 text-sm text-primary">
          {cs.duplicateMessage}
        </p>
      )}

      {cs.chargeItems.length > 0 ? (
        <ChargeItemsTable
          chargeItems={cs.chargeItems}
          rowDrafts={cs.rowDrafts}
          onQuantityChange={cs.handleQuantityChange}
          onQuantityBlur={cs.handleQuantityBlur}
          onAmountChange={cs.handleAmountChange}
          onAmountBlur={cs.handleAmountBlur}
          onDescriptionChange={cs.handleDescriptionChange}
          onDescriptionFocus={cs.handleDescriptionFocus}
          onDescriptionBlur={cs.handleDescriptionBlur}
          highlightedItemId={cs.highlightedItemId}
          onRemoveItem={cs.handleRemoveItem}
          getDraft={cs.getDraft}
        />
      ) : (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          {emptyHint ?? 'No lines on this bill yet.'}
        </p>
      )}

      {cs.chargeItems.length > 0 && (
        <div className="border-t border-border bg-[#e7d6bf]/30 px-5 py-4">
          <ChargeTotals
            subtotal={cs.subtotal}
            discount={cs.discount}
            total={cs.total}
            discountStr={cs.discountStr}
            onDiscountChange={cs.handleDiscountChange}
            onDiscountBlur={cs.handleDiscountBlur}
          />
        </div>
      )}
    </div>
  );
}
