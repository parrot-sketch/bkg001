'use client';

/**
 * ChargeSheetStepContent
 *
 * Shared "charges" UI (search + items + totals) without any footer actions.
 * The parent decides how/where to place Save / Finish buttons.
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import type { UseChargeSheetReturn } from '@/hooks/theater-tech/useChargeSheet';
import { ChargeSearchInput } from './ChargeSearchInput';
import { ChargeItemsTable } from './ChargeItemsTable';
import { ChargeTotals } from './ChargeTotals';

interface Props {
  cs: UseChargeSheetReturn;
  emptyHint?: string;
}

export function ChargeSheetStepContent({ cs, emptyHint }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevLengthRef = useRef(cs.chargeItems.length);
  const [showAddFab, setShowAddFab] = useState(false);

  useEffect(() => {
    if (cs.chargeItems.length > prevLengthRef.current) {
      const el = containerRef.current;
      if (el) {
        el.scrollTo({ top: 0, behavior: 'smooth' });
      }
      inputRef.current?.focus();
    }
    prevLengthRef.current = cs.chargeItems.length;
  }, [cs.chargeItems.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      setShowAddFab(el.scrollTop > 200);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTopAndFocus = () => {
    const el = containerRef.current;
    if (el) {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    }
    inputRef.current?.focus();
  };

  if (cs.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#caa26a]" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-y-auto">
      {/* Sticky search header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 py-3 shrink-0">
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
          onAddCustom={cs.handleAddCustom}
          onClose={() => cs.setDropdownOpen(false)}
          suggestedServices={cs.suggestedServices}
          inputRef={inputRef}
        />
      </div>

      {/* Items list */}
      <div className="flex-1 px-4 py-4">
        {cs.chargeItems.length > 0 ? (
          <div className="space-y-4">
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
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <p className="text-sm font-medium text-slate-600">No charges added yet</p>
            <p className="text-xs mt-1 text-slate-400">
              {emptyHint ?? 'Search above to add services or inventory items — or skip and add later'}
            </p>
          </div>
        )}
      </div>

      {/* Sticky totals footer */}
      {cs.chargeItems.length > 0 && (
        <div className="sticky bottom-0 z-10 bg-slate-50 border-t border-slate-200 px-4 py-3 shrink-0">
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

      {/* Floating add button when scrolled down */}
      {showAddFab && (
        <button
          type="button"
          onClick={scrollToTopAndFocus}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#2c2e4b] text-white px-4 py-3 shadow-xl hover:bg-[#1e2038] transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-semibold">Add Charge</span>
        </button>
      )}
    </div>
  );
}
