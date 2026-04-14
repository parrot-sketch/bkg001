'use client';

import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useChargeSheet } from '@/hooks/theater-tech/useChargeSheet';
import { ChargeSearchInput } from './ChargeSearchInput';
import { ChargeItemsTable } from './ChargeItemsTable';
import { ChargeTotals } from './ChargeTotals';

interface TheaterTechBillingProps {
  caseId: string;
}

export function TheaterTechBilling({ caseId }: TheaterTechBillingProps) {
  const cs = useChargeSheet(caseId);

  if (cs.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Charge Sheet</CardTitle>
        {cs.chargeItems.length > 0 && (
          <Button
            size="sm"
            onClick={cs.handleSave}
            disabled={cs.isSaving}
            className="h-8"
          >
            {cs.isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="ml-1">
              {cs.isSaving ? 'Saving…' : 'Save'}
            </span>
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
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
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">No charges added yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Search and add services or inventory items
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}