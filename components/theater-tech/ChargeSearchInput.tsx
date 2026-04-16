'use client';

/**
 * ChargeSearchInput
 *
 * Search input with dropdown for adding services and inventory items
 * to the charge sheet. Handles outside-click dismissal internally.
 */

import { useRef, useEffect } from 'react';
import { Package, Search, Stethoscope } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
}: ChargeSearchInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const typedInventory = filteredInventory as InventoryItem[];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-700">Add Charge</label>
        <p className="text-xs text-slate-500">Search services or stock and add them to this bill.</p>
      </div>
      <div className="relative" ref={containerRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
        <Input
          placeholder="Search services or inventory…"
          className="h-11 rounded-xl border-slate-200 bg-white pl-9 touch-manipulation"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={onFocus}
        />

        {dropdownOpen && (
          <div className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            {!searchQuery && (
              <p className="px-4 py-3 text-xs text-slate-400">
                Type to search services or inventory items
              </p>
            )}

            {searchQuery && filteredServices.length > 0 && (
              <div className="p-2">
                <p className="px-2 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Services
                </p>
                {filteredServices.map((service: Service) => (
                  <button
                    key={service.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-50 touch-manipulation"
                    onClick={() => onAddService(service)}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Stethoscope className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {service.service_name}
                        </p>
                        <p className="text-xs text-slate-500">{service.category || 'Service'}</p>
                      </div>
                    </div>
                    <span className="ml-2 shrink-0 text-sm font-medium text-slate-600">
                      KSH {service.price.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {searchQuery && typedInventory.length > 0 && (
              <div
                className={`p-2 ${filteredServices.length > 0 ? 'border-t border-slate-100' : ''}`}
              >
                <p className="px-2 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Inventory
                </p>
                {typedInventory.map((item: InventoryItem) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-50 touch-manipulation"
                    onClick={() => onAddInventory(item)}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.sku || item.category || 'Inventory item'}</p>
                      </div>
                    </div>
                    <span className="ml-2 shrink-0 text-sm font-medium text-slate-600">
                      KSH {item.unit_cost.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {searchQuery &&
              filteredServices.length === 0 &&
              typedInventory.length === 0 && (
                <p className="p-4 text-sm text-slate-500 text-center">
                  No items found
                </p>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
