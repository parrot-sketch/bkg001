'use client';

/**
 * Doctor charge sheet — type-first billing composer.
 * Type an item name; catalog suggestions appear. Enter commits.
 * Catalog is never a gate — unmatched text becomes a custom line.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Check,
  Loader2,
  Package,
  Plus,
  Save,
  Stethoscope,
  Tag,
  Trash2,
} from 'lucide-react';

import { useChargeSheet } from '@/hooks/theater-tech/useChargeSheet';
import type {
  ChargeItem,
  InventoryItem,
  Service,
} from '@/components/theater-tech/charge-sheet.types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function money(n: number) {
  return `KSH ${n.toLocaleString()}`;
}

type Suggestion =
  | { kind: 'service'; item: Service }
  | { kind: 'inventory'; item: InventoryItem }
  | { kind: 'custom'; label: string };

export function DoctorChargeSheet({ caseId }: { caseId: string }) {
  const cs = useChargeSheet(caseId);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [savedFlash, setSavedFlash] = useState(false);

  const suggestions = useMemo((): Suggestion[] => {
    const q = cs.searchQuery.trim().toLowerCase();
    const out: Suggestion[] = [];

    if (!q) {
      for (const s of cs.suggestedServices.slice(0, 8)) {
        out.push({ kind: 'service', item: s });
      }
      return out;
    }

    for (const s of cs.filteredServices.slice(0, 8)) {
      out.push({ kind: 'service', item: s });
    }
    for (const i of cs.filteredInventory.slice(0, 6)) {
      out.push({ kind: 'inventory', item: i });
    }

    const typed = cs.searchQuery.trim();
    const exactService = cs.filteredServices.some(
      (s) => s.service_name.toLowerCase() === typed.toLowerCase(),
    );
    const exactInv = cs.filteredInventory.some(
      (i) => i.name.toLowerCase() === typed.toLowerCase(),
    );
    if (!exactService && !exactInv) {
      out.push({ kind: 'custom', label: typed });
    }

    return out;
  }, [
    cs.searchQuery,
    cs.filteredServices,
    cs.filteredInventory,
    cs.suggestedServices,
  ]);

  useEffect(() => {
    setHighlight(0);
  }, [cs.searchQuery, open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const commitSuggestion = (s: Suggestion) => {
    if (s.kind === 'service') cs.handleAddService(s.item);
    else if (s.kind === 'inventory') cs.handleAddInventory(s.item);
    else cs.handleAddCustom(s.label, 1, 0);
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const commitTyped = () => {
    const typed = cs.searchQuery.trim();
    if (!typed) return;

    if (suggestions[highlight]) {
      commitSuggestion(suggestions[highlight]);
      return;
    }

    const exactService = cs.filteredServices.find(
      (s) => s.service_name.toLowerCase() === typed.toLowerCase(),
    );
    if (exactService) {
      cs.handleAddService(exactService);
      setOpen(false);
      return;
    }

    const exactInv = cs.filteredInventory.find(
      (i) => i.name.toLowerCase() === typed.toLowerCase(),
    );
    if (exactInv) {
      cs.handleAddInventory(exactInv);
      setOpen(false);
      return;
    }

    cs.handleAddCustom(typed, 1, 0);
    setOpen(false);
  };

  const handleSave = async () => {
    const ok = await cs.handleSave();
    if (ok) {
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    }
  };

  if (cs.isLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#caa26a]" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28">
      <header className="space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#caa26a]">
          Billing
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#2c2e4b]">
          Charge sheet
        </h1>
        <p className="text-sm text-slate-500">
          Type to add services, stock, or a custom line — then adjust qty and price.
        </p>
      </header>

      {/* Type-first composer */}
      <div
        ref={rootRef}
        className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5"
      >
        <label className="mb-2 block text-xs font-medium text-slate-600">
          Add charge
        </label>
        <div className="relative flex gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              value={cs.searchQuery}
              onChange={(e) => {
                cs.setSearchQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setOpen(true);
                  setHighlight((h) => Math.min(h + 1, Math.max(suggestions.length - 1, 0)));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHighlight((h) => Math.max(h - 1, 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  commitTyped();
                } else if (e.key === 'Escape') {
                  setOpen(false);
                }
              }}
              placeholder="Type a service, stock item, or custom charge…"
              className={cn(
                'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900',
                'placeholder:text-slate-400 focus:border-[#caa26a] focus:outline-none focus:ring-2 focus:ring-[#caa26a]/25',
              )}
            />

            {open && suggestions.length > 0 ? (
              <ul
                id={listId}
                role="listbox"
                className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
              >
                {suggestions.map((s, idx) => {
                  const active = idx === highlight;
                  if (s.kind === 'custom') {
                    return (
                      <li key={`custom-${s.label}`} role="option" aria-selected={active}>
                        <button
                          type="button"
                          className={cn(
                            'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm',
                            active ? 'bg-[#e7d6bf]/40' : 'hover:bg-slate-50',
                          )}
                          onMouseEnter={() => setHighlight(idx)}
                          onClick={() => commitSuggestion(s)}
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <Tag className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-[#2c2e4b]">
                              Use “{s.label}”
                            </span>
                            <span className="text-xs text-slate-400">
                              Custom line — set price after adding
                            </span>
                          </span>
                          <Plus className="h-4 w-4 text-[#caa26a]" />
                        </button>
                      </li>
                    );
                  }

                  const label =
                    s.kind === 'service' ? s.item.service_name : s.item.name;
                  const meta =
                    s.kind === 'service'
                      ? s.item.category || 'Service'
                      : s.item.sku || s.item.category || 'Inventory';
                  const price =
                    s.kind === 'service' ? s.item.price : s.item.unit_cost;
                  const Icon = s.kind === 'service' ? Stethoscope : Package;

                  return (
                    <li
                      key={`${s.kind}-${s.item.id}`}
                      role="option"
                      aria-selected={active}
                    >
                      <button
                        type="button"
                        className={cn(
                          'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm',
                          active ? 'bg-[#e7d6bf]/40' : 'hover:bg-slate-50',
                        )}
                        onMouseEnter={() => setHighlight(idx)}
                        onClick={() => commitSuggestion(s)}
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg',
                            s.kind === 'service'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-amber-50 text-amber-700',
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-slate-900">
                            {label}
                          </span>
                          <span className="text-xs text-slate-400">{meta}</span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-slate-700">
                          {money(price)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <Button
            type="button"
            size="sm"
            className="h-11 shrink-0 gap-1.5 bg-[#2c2e4b] px-4 text-white hover:bg-[#3a3d63]"
            disabled={!cs.searchQuery.trim()}
            onClick={commitTyped}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Enter adds the highlighted suggestion, or creates a custom charge from what you typed.
        </p>
      </div>

      {/* Lines */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 md:px-5">
          <h2 className="text-sm font-semibold text-[#2c2e4b]">
            Line items
            {cs.chargeItems.length > 0 ? (
              <span className="ml-2 text-xs font-medium text-slate-400">
                {cs.chargeItems.length}
              </span>
            ) : null}
          </h2>
          {cs.isDirty ? (
            <span className="text-xs font-medium text-amber-700">Unsaved</span>
          ) : savedFlash ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <Check className="h-3.5 w-3.5" />
              Saved
            </span>
          ) : null}
        </div>

        {cs.chargeItems.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-slate-600">No charges yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Start typing above to add the first line
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {cs.chargeItems.map((item) => (
              <ChargeLine
                key={item.id}
                item={item}
                quantityStr={cs.getDraft(item).quantityStr}
                amountStr={cs.getDraft(item).amountStr}
                onQuantityChange={(v) => cs.handleQuantityChange(item.id, v)}
                onQuantityBlur={() => cs.handleQuantityBlur(item.id)}
                onAmountChange={(v) => cs.handleAmountChange(item.id, v)}
                onAmountBlur={() => cs.handleAmountBlur(item.id)}
                onRemove={() => cs.handleRemoveItem(item.id)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Sticky summary + save */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-[#f7f4ef]/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid grid-cols-3 gap-3 sm:max-w-md sm:flex-1">
            <SummaryCell label="Subtotal" value={money(cs.subtotal)} />
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Discount
              </p>
              <input
                type="text"
                inputMode="decimal"
                value={cs.discountStr}
                onChange={(e) => cs.handleDiscountChange(e.target.value)}
                onBlur={cs.handleDiscountBlur}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-semibold text-rose-600 focus:border-[#caa26a] focus:outline-none focus:ring-2 focus:ring-[#caa26a]/25"
                aria-label="Discount"
              />
            </div>
            <SummaryCell label="Total" value={money(cs.total)} emphasize />
          </div>

          <Button
            type="button"
            size="sm"
            disabled={!cs.isDirty || cs.isSaving || cs.chargeItems.length === 0}
            onClick={() => void handleSave()}
            className="h-10 gap-1.5 bg-[#2c2e4b] px-5 text-white hover:bg-[#3a3d63]"
          >
            {cs.isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {cs.isSaving ? 'Saving…' : 'Save charges'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={cn(
          'flex h-9 items-center text-sm font-semibold',
          emphasize ? 'text-[#2c2e4b]' : 'text-slate-800',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ChargeLine({
  item,
  quantityStr,
  amountStr,
  onQuantityChange,
  onQuantityBlur,
  onAmountChange,
  onAmountBlur,
  onRemove,
}: {
  item: ChargeItem;
  quantityStr: string;
  amountStr: string;
  onQuantityChange: (v: string) => void;
  onQuantityBlur: () => void;
  onAmountChange: (v: string) => void;
  onAmountBlur: () => void;
  onRemove: () => void;
}) {
  const line = (item.amount || 0) * (item.quantity || 0);
  const Icon =
    item.type === 'service' ? Stethoscope : item.type === 'inventory' ? Package : Tag;
  const iconTone =
    item.type === 'service'
      ? 'bg-blue-50 text-blue-600'
      : item.type === 'inventory'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-slate-100 text-slate-600';

  return (
    <li className="px-4 py-3 md:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            className={cn(
              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              iconTone,
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">
              {item.description}
            </p>
            <p className="text-[11px] capitalize text-slate-400">{item.type}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            Qty
            <input
              type="text"
              inputMode="numeric"
              value={quantityStr}
              onChange={(e) => onQuantityChange(e.target.value)}
              onBlur={onQuantityBlur}
              className="h-9 w-16 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm focus:border-[#caa26a] focus:outline-none focus:ring-2 focus:ring-[#caa26a]/25"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            Price
            <input
              type="text"
              inputMode="decimal"
              value={amountStr}
              onChange={(e) => onAmountChange(e.target.value)}
              onBlur={onAmountBlur}
              className="h-9 w-28 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm focus:border-[#caa26a] focus:outline-none focus:ring-2 focus:ring-[#caa26a]/25"
            />
          </label>
          <span className="min-w-[5.5rem] text-right text-sm font-semibold text-[#2c2e4b]">
            {money(line)}
          </span>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${item.description}`}
            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
}
