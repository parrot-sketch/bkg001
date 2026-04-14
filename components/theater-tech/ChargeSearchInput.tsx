'use client';

/**
 * ChargeSearchInput
 *
 * Search input with dropdown for adding services and inventory items
 * to the charge sheet. Handles outside-click dismissal internally.
 */

import { useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
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
      <label className="text-sm font-medium text-slate-700">Add Charge</label>
      <div className="relative" ref={containerRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
        <Input
          placeholder="Search services or inventory…"
          className="pl-9 h-11 md:h-9 touch-manipulation"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={onFocus}
        />

        {dropdownOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto">
            {!searchQuery && (
              <p className="px-3 py-2 text-xs text-slate-400">
                Type to search services or inventory items
              </p>
            )}

            {searchQuery && filteredServices.length > 0 && (
              <div className="p-1">
                <p className="px-2 py-1 text-xs font-medium text-slate-500">
                  Services
                </p>
                {filteredServices.map((service: Service) => (
                  <button
                    key={service.id}
                    type="button"
                    className="w-full flex items-center justify-between px-2 py-2.5 text-left hover:bg-slate-50 rounded touch-manipulation"
                    onClick={() => onAddService(service)}
                  >
                    <span className="text-sm truncate">
                      {service.service_name}
                    </span>
                    <span className="text-sm text-slate-500 shrink-0 ml-2">
                      KSH {service.price.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {searchQuery && typedInventory.length > 0 && (
              <div
                className={`p-1 ${filteredServices.length > 0 ? 'border-t' : ''}`}
              >
                <p className="px-2 py-1 text-xs font-medium text-slate-500">
                  Inventory
                </p>
                {typedInventory.map((item: InventoryItem) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full flex items-center justify-between px-2 py-2.5 text-left hover:bg-slate-50 rounded touch-manipulation"
                    onClick={() => onAddInventory(item)}
                  >
                    <span className="text-sm truncate">{item.name}</span>
                    <span className="text-sm text-slate-500 shrink-0 ml-2">
                      KSH {item.unit_cost.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {searchQuery &&
              filteredServices.length === 0 &&
              typedInventory.length === 0 && (
                <p className="p-3 text-sm text-slate-500 text-center">
                  No items found
                </p>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
