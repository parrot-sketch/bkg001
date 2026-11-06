'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { InventoryItem, ChargeSearchInputProps } from './charge-sheet.types';
import { cn } from '@/lib/utils';

export function ChargeSearchInput({
  searchQuery,
  dropdownOpen,
  filteredServices,
  filteredInventory,
  onSearchChange,
  onFocus,
  onClose,
  onAddCustom,
  addBlocked = false,
}: ChargeSearchInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const typedInventory = filteredInventory as InventoryItem[];
  const query = searchQuery.trim();
  const quantityValue = parseInt(quantity, 10);
  const priceValue = parseFloat(price);
  const canAdd =
    query.length > 0 &&
    quantityValue > 0 &&
    price.trim() !== '' &&
    Number.isFinite(priceValue) &&
    priceValue >= 0 &&
    !addBlocked;
  const lineTotal =
    quantityValue > 0 && Number.isFinite(priceValue) ? quantityValue * priceValue : null;

  const suggestions =
    listOpen && dropdownOpen && query.length >= 2
      ? [
          ...filteredServices.map((service) => ({
            key: `service-${service.id}`,
            name: service.service_name,
            price: service.price,
            kind: 'service' as const,
          })),
          ...typedInventory.map((item) => ({
            key: `stock-${item.id}`,
            name: item.name,
            price: item.unit_cost,
            kind: 'stock' as const,
          })),
        ]
      : [];

  const exactCatalogMatch = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return false;
    return (
      filteredServices.some((s) => s.service_name.toLowerCase() === q) ||
      typedInventory.some((i) => i.name.toLowerCase() === q)
    );
  }, [filteredServices, query, typedInventory]);

  const isNewItem = query.length >= 2 && !exactCatalogMatch;

  useEffect(() => {
    if (open) nameRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setListOpen(false);
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const reset = () => {
    onSearchChange('');
    setQuantity('1');
    setPrice('');
    setListOpen(false);
    onClose();
    setOpen(false);
  };

  const addLine = () => {
    if (!canAdd) return;
    if (onAddCustom?.(query, quantityValue, priceValue) === false) return;
    reset();
  };

  const useSuggestion = (name: string, unitPrice: number) => {
    onSearchChange(name);
    setPrice(String(unitPrice));
    setListOpen(false);
    onClose();
    priceRef.current?.focus();
  };

  if (!open) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#2c2e4b]/65">
          Add products or services used in this procedure. New names are kept for next time when
          you save the bill.
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-9 shrink-0 rounded-md border-[#e7d6bf] text-xs font-semibold text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
          onClick={() => {
            setOpen(true);
            onFocus();
          }}
        >
          Add item
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_5rem_8.5rem_7rem] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="charge-line-name" className="text-[#2c2e4b]">
            Product or service
          </Label>
          <Input
            id="charge-line-name"
            ref={nameRef}
            placeholder="Type name — pick a match or enter a new one"
            className="h-10 rounded-md border-[#e7d6bf] text-[#2c2e4b] focus-visible:ring-[#caa26a]"
            value={searchQuery}
            onChange={(event) => {
              onSearchChange(event.target.value);
              setListOpen(true);
              onFocus();
            }}
            onFocus={onFocus}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addLine();
              }
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="charge-line-qty" className="text-[#2c2e4b]">
            Qty
          </Label>
          <Input
            id="charge-line-qty"
            inputMode="numeric"
            className="h-10 rounded-md border-[#e7d6bf] text-[#2c2e4b] focus-visible:ring-[#caa26a]"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="charge-line-price" className="text-[#2c2e4b]">
            Unit price (KES)
          </Label>
          <Input
            id="charge-line-price"
            ref={priceRef}
            inputMode="decimal"
            placeholder="0"
            className="h-10 rounded-md border-[#e7d6bf] text-[#2c2e4b] focus-visible:ring-[#caa26a]"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addLine();
              }
            }}
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[#2c2e4b]/70">Line total</p>
          <p className="flex h-10 items-center tabular-nums text-sm font-semibold text-[#003b53]">
            {lineTotal === null ? '—' : `KES ${lineTotal.toLocaleString()}`}
          </p>
        </div>
      </div>

      {suggestions.length > 0 && (
        <ul className="max-h-48 overflow-auto border border-[#e7d6bf] bg-white">
          {suggestions.map((suggestion) => (
            <li key={suggestion.key}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-[#e7d6bf]/30"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => useSuggestion(suggestion.name, suggestion.price)}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-[#2c2e4b]">{suggestion.name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-[#2c2e4b]/50">
                    {suggestion.kind === 'stock' ? 'Stock' : 'Service'}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-[#005f73]">
                  KES {suggestion.price.toLocaleString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {isNewItem && (
        <p
          className={cn(
            'border border-[#caa26a]/35 bg-[#caa26a]/10 px-3 py-2 text-xs text-[#2c2e4b]',
          )}
        >
          New item — “{query}” will be saved to the billing catalogue when you save this charge
          sheet, so it can be reused next time.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          className="h-9 rounded-md bg-[#caa26a] px-4 text-xs font-semibold text-[#2c2e4b] hover:bg-[#b8913e]"
          onClick={addLine}
          disabled={!canAdd}
        >
          Add to bill
        </Button>
        <button
          type="button"
          className="text-xs font-medium text-[#2c2e4b]/60 hover:text-[#2c2e4b]"
          onClick={reset}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
