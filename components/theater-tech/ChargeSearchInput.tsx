'use client';

/**
 * ChargeSearchInput
 *
 * Search input with dropdown for adding services and inventory items
 * to the charge sheet. Handles outside-click dismissal internally.
 */

import { useRef, useEffect, useState } from 'react';
import { Package, Search, Stethoscope, Plus, Zap, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type {
  Service,
  InventoryItem,
  ChargeSearchInputProps,
} from './charge-sheet.types';

export function ChargeSearchInput({
  searchQuery,
  dropdownOpen,
  filteredServices,
  filteredInventory,
  onSearchChange,
  onFocus,
  onAddService,
  onAddInventory,
  onClose,
  suggestedServices = [],
  inputRef,
  onAddCustom,
}: ChargeSearchInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customDesc, setCustomDesc] = useState('');
  const [customQty, setCustomQty] = useState('1');
  const [customPrice, setCustomPrice] = useState('');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
        setShowCustomForm(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const typedInventory = filteredInventory as InventoryItem[];

  const handleSubmitCustom = () => {
    if (!customDesc.trim() || !customPrice) return;
    onAddCustom?.(customDesc.trim(), parseInt(customQty, 10) || 1, parseFloat(customPrice) || 0);
    setCustomDesc('');
    setCustomQty('1');
    setCustomPrice('');
    setShowCustomForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-[#2c2e4b]">Add Charge</label>
        <p className="text-xs text-slate-400">Search services or stock</p>
      </div>
      <div className="relative" ref={containerRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
        <Input
          ref={inputRef}
          placeholder="Search services or inventory…"
          className="h-11 rounded-xl border-slate-200 bg-white pl-9 pr-4 touch-manipulation focus:border-[#caa26a] focus:ring-[#caa26a]/20"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={onFocus}
        />

        {dropdownOpen && (
          <div className="absolute z-50 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
            {!searchQuery && (
              <div className="p-2">
                {suggestedServices.length > 0 && (
                  <div className="mb-2">
                    <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2c2e4b] flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-[#caa26a]" />
                      Quick Add
                    </p>
                    <div className="flex flex-wrap gap-1.5 px-2 py-2">
                      {suggestedServices.map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-[#caa26a] hover:text-[#2c2e4b] touch-manipulation"
                          onClick={() => onAddService(service)}
                        >
                          <Plus className="h-3 w-3 text-[#caa26a]" />
                          {service.service_name}
                          <span className="text-slate-400 ml-1">
                            KSH {service.price.toLocaleString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!showCustomForm ? (
                  <div className={`${suggestedServices.length > 0 ? 'border-t border-slate-100 pt-2' : ''}`}>
                    <button
                      type="button"
                      onClick={() => setShowCustomForm(true)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50 touch-manipulation"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <Tag className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">Add Custom Item</p>
                        <p className="text-xs text-slate-500">Enter item details manually</p>
                      </div>
                    </button>
                    <p className="px-2 py-2 text-xs text-slate-400 text-center">
                      Type to search services or inventory items
                    </p>
                  </div>
                ) : (
                  <div className={`${suggestedServices.length > 0 ? 'border-t border-slate-100 pt-2' : ''} p-2 space-y-2`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2c2e4b]">Custom Item</p>
                    <Input
                      placeholder="Item description"
                      className="h-9 text-sm"
                      value={customDesc}
                      onChange={(e) => setCustomDesc(e.target.value)}
                      autoFocus
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Qty"
                        className="h-9 text-sm"
                        value={customQty}
                        onChange={(e) => setCustomQty(e.target.value)}
                      />
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="Unit Price (KSH)"
                        className="h-9 text-sm"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSubmitCustom}
                      disabled={!customDesc.trim() || !customPrice}
                      className="w-full bg-[#2c2e4b] hover:bg-[#1e2038] text-white"
                    >
                      Add Custom Item
                    </Button>
                  </div>
                )}
              </div>
            )}

            {searchQuery && filteredServices.length > 0 && (
              <div className="p-2">
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2c2e4b]">
                  Services
                </p>
                {filteredServices.map((service: Service) => (
                  <button
                    key={service.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#caa26a]/5 touch-manipulation group"
                    onClick={() => onAddService(service)}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                        <Stethoscope className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 group-hover:text-[#2c2e4b] transition-colors">
                          {service.service_name}
                        </p>
                        <p className="text-xs text-slate-500">{service.category || 'Service'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="ml-2 shrink-0 text-sm font-semibold text-slate-700">
                        KSH {service.price.toLocaleString()}
                      </span>
                      <Plus className="h-4 w-4 text-slate-400 group-hover:text-[#caa26a] transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchQuery && typedInventory.length > 0 && (
              <div
                className={`p-2 ${filteredServices.length > 0 ? 'border-t border-slate-100' : ''}`}
              >
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#2c2e4b]">
                  Inventory
                </p>
                {typedInventory.map((item: InventoryItem) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#caa26a]/5 touch-manipulation group"
                    onClick={() => onAddInventory(item)}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600 group-hover:bg-orange-100 transition-colors">
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 group-hover:text-[#2c2e4b] transition-colors">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.sku || item.category || 'Inventory item'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="ml-2 shrink-0 text-sm font-semibold text-slate-700">
                        KSH {item.unit_cost.toLocaleString()}
                      </span>
                      <Plus className="h-4 w-4 text-slate-400 group-hover:text-[#caa26a] transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchQuery &&
              filteredServices.length === 0 &&
              typedInventory.length === 0 && (
                <div className="p-6 text-center">
                  <p className="text-sm text-slate-500">No items found</p>
                  <p className="text-xs text-slate-400 mt-1">Try a different search term</p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
