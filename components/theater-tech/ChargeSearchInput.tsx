'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { InventoryItem, ChargeSearchInputProps } from './charge-sheet.types';

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
  const canAdd = query.length > 0 && quantityValue > 0 && price.trim() !== '' && Number.isFinite(priceValue) && priceValue >= 0 && !addBlocked;
  const lineTotal = quantityValue > 0 && Number.isFinite(priceValue) ? quantityValue * priceValue : null;
  const suggestions = listOpen && dropdownOpen && query.length >= 2
    ? [
        ...filteredServices.map((service) => ({ key: `service-${service.id}`, name: service.service_name, price: service.price })),
        ...typedInventory.map((item) => ({ key: `stock-${item.id}`, name: item.name, price: item.unit_cost })),
      ]
    : [];

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
      <Button type="button" variant="outline" className="h-10 rounded-none" onClick={() => { setOpen(true); onFocus(); }}>
        Add item
      </Button>
    );
  }

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_5rem_8.5rem_7rem] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="charge-line-name">Item</Label>
          <Input
            id="charge-line-name"
            ref={nameRef}
            placeholder="Item name"
            className="h-10 rounded-none"
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
          <Label htmlFor="charge-line-qty">Quantity</Label>
          <Input
            id="charge-line-qty"
            inputMode="numeric"
            className="h-10 rounded-none"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="charge-line-price">Price per unit</Label>
          <Input
            id="charge-line-price"
            ref={priceRef}
            inputMode="decimal"
            placeholder="KSh"
            className="h-10 rounded-none"
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
          <p className="text-sm font-medium text-foreground">Line total</p>
          <p className="flex h-10 items-center tabular-nums text-sm font-semibold text-primary">
            {lineTotal === null ? '—' : `KSh ${lineTotal.toLocaleString()}`}
          </p>
        </div>
      </div>
      {suggestions.length > 0 && (
        <ul className="max-h-48 overflow-auto border border-border bg-white">
          {suggestions.map((suggestion) => (
            <li key={suggestion.key}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-[#e7d6bf]/30"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => useSuggestion(suggestion.name, suggestion.price)}
              >
                <span className="truncate text-foreground">{suggestion.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">KSh {suggestion.price.toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-3">
        <Button type="button" className="h-10 rounded-none" onClick={addLine} disabled={!canAdd}>
          Add to bill
        </Button>
        <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={reset}>
          Cancel
        </button>
      </div>
    </div>
  );
}
