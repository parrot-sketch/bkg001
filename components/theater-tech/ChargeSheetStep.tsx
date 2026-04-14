'use client';

/**
 * ChargeSheetStep
 *
 * A wrapper designed to live inside the 3-step SurgicalCasePlanForm.
 * It strips the Card wrapper (the form card provides the outer chrome)
 * and exposes the same billing UX via shared sub-components.
 */

import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChargeSheet } from '@/hooks/theater-tech/useChargeSheet';
import { ChargeSearchInput } from './ChargeSearchInput';
import { ChargeItemsTable } from './ChargeItemsTable';
import { ChargeTotals } from './ChargeTotals';

interface Props {
  caseId: string;
}

export function ChargeSheetStep({ caseId }: Props) {
  const cs = useChargeSheet(caseId);

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

          {/* Save button */}
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={cs.handleSave}
              disabled={cs.isSaving}
              className="h-8"
            >
              {cs.isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              {cs.isSaving ? 'Saving…' : 'Save Charges'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-lg">
          <p className="text-sm">No charges added yet</p>
          <p className="text-xs mt-1">
            Search above to add services or inventory items — or skip and add
            later
          </p>
        </div>
      )}
    </div>
  );
}
