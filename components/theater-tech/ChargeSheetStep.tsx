'use client';

/**
 * ChargeSheetStep
 *
 * A lightweight wrapper around TheaterTechBilling designed to live inside
 * the 3-step SurgicalCasePlanForm. It strips the Card wrapper so the form
 * card provides the outer chrome, and exposes the same billing UX without
 * any navigation overhead.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Trash2, Save, FileText, Loader2 } from 'lucide-react';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Service {
  id: number;
  service_name: string;
  price: number;
  category: string | null;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  unit_cost: number;
}

interface ChargeItem {
  id: string;
  description: string;
  amount: number;
  quantity: number;
  type: 'service' | 'inventory';
  itemId: number | string;
}

interface RowDraft {
  quantityStr: string;
  amountStr: string;
}

interface Props {
  caseId: string;
}

export function ChargeSheetStep({ caseId }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [chargeItems, setChargeItems] = useState<ChargeItem[]>([]);
  const [rowDrafts, setRowDrafts] = useState<Record<string, RowDraft>>({});
  const [discountStr, setDiscountStr] = useState('0');
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load existing billing data
  useEffect(() => {
    async function load() {
      try {
        const [billingRes, servicesRes, inventoryRes] = await Promise.all([
          fetch(`/api/surgical-cases/${caseId}/billing`),
          fetch('/api/services'),
          fetch('/api/inventory/items?limit=100'),
        ]);
        const [billing, svcs, inv] = await Promise.all([
          billingRes.json(),
          servicesRes.json(),
          inventoryRes.json(),
        ]);

        if (billing.success && billing.data?.payment?.billItems) {
          const items: ChargeItem[] = billing.data.payment.billItems.map((item: any) => ({
            id: `existing-${item.id}`,
            description: item.serviceName,
            amount: item.unitCost ?? 0,
            quantity: item.quantity ?? 1,
            type: item.isInventory || item.inventoryItemId ? 'inventory' : 'service',
            itemId: item.inventoryItemId ?? item.serviceId,
          }));
          setChargeItems(items);
          const drafts: Record<string, RowDraft> = {};
          for (const it of items) {
            drafts[it.id] = { quantityStr: String(it.quantity), amountStr: String(it.amount) };
          }
          setRowDrafts(drafts);
          setDiscountStr(String(billing.data.payment.discount ?? 0));
        }

        if (svcs.success) setServices(svcs.data ?? []);

        if (inv.success && inv.data?.data) {
          setInventoryItems(
            inv.data.data.map((i: any) => ({
              id: String(i.id),
              name: i.name,
              sku: i.sku ?? '',
              unit_cost: i.unitCost ?? 0,
            }))
          );
        }
      } catch {
        // Non-fatal — billing can be added later
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [caseId]);

  // Filtered search
  const filteredServices = useMemo(() => {
    if (!searchQuery) return services.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return services.filter(
      (s) => s.service_name.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [services, searchQuery]);

  const filteredInventory = useMemo(() => {
    if (!searchQuery) return inventoryItems.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return inventoryItems.filter(
      (i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [inventoryItems, searchQuery]);

  const discount = useMemo(() => parseFloat(discountStr) || 0, [discountStr]);
  const subtotal = useMemo(
    () => chargeItems.reduce((s, i) => s + (i.amount || 0) * (i.quantity || 0), 0),
    [chargeItems]
  );
  const total = useMemo(() => Math.max(0, subtotal - discount), [subtotal, discount]);

  // Add items
  const addService = useCallback(
    (service: Service) => {
      if (chargeItems.some((i) => i.type === 'service' && i.itemId === service.id)) return;
      const newItem: ChargeItem = {
        id: `service-${Date.now()}`,
        description: service.service_name,
        amount: service.price ?? 0,
        quantity: 1,
        type: 'service',
        itemId: service.id,
      };
      setChargeItems((p) => [...p, newItem]);
      setRowDrafts((p) => ({ ...p, [newItem.id]: { quantityStr: '1', amountStr: String(newItem.amount) } }));
      setSearchQuery('');
      setDropdownOpen(false);
    },
    [chargeItems]
  );

  const addInventory = useCallback(
    (item: InventoryItem) => {
      if (chargeItems.some((i) => i.type === 'inventory' && i.itemId === item.id)) return;
      const newItem: ChargeItem = {
        id: `inv-${Date.now()}`,
        description: item.name,
        amount: item.unit_cost ?? 0,
        quantity: 1,
        type: 'inventory',
        itemId: item.id,
      };
      setChargeItems((p) => [...p, newItem]);
      setRowDrafts((p) => ({ ...p, [newItem.id]: { quantityStr: '1', amountStr: String(newItem.amount) } }));
      setSearchQuery('');
      setDropdownOpen(false);
    },
    [chargeItems]
  );

  const removeItem = useCallback((id: string) => {
    setChargeItems((p) => p.filter((i) => i.id !== id));
    setRowDrafts((p) => { const n = { ...p }; delete n[id]; return n; });
  }, []);

  // Quantity editing
  const handleQtyChange = useCallback((id: string, value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    setRowDrafts((p) => ({ ...p, [id]: { ...p[id], quantityStr: value } }));
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setChargeItems((p) => p.map((i) => (i.id === id ? { ...i, quantity: parsed } : i)));
    }
  }, []);

  const handleQtyBlur = useCallback((id: string) => {
    setRowDrafts((p) => {
      const draft = p[id]; if (!draft) return p;
      const safe = Math.max(1, parseInt(draft.quantityStr, 10) || 1);
      setChargeItems((items) => items.map((i) => (i.id === id ? { ...i, quantity: safe } : i)));
      return { ...p, [id]: { ...draft, quantityStr: String(safe) } };
    });
  }, []);

  // Amount editing
  const handleAmtChange = useCallback((id: string, value: string) => {
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    setRowDrafts((p) => ({ ...p, [id]: { ...p[id], amountStr: value } }));
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      setChargeItems((p) => p.map((i) => (i.id === id ? { ...i, amount: parsed } : i)));
    }
  }, []);

  const handleAmtBlur = useCallback((id: string) => {
    setRowDrafts((p) => {
      const draft = p[id]; if (!draft) return p;
      const safe = Math.max(0, parseFloat(draft.amountStr) || 0);
      setChargeItems((items) => items.map((i) => (i.id === id ? { ...i, amount: safe } : i)));
      return { ...p, [id]: { ...draft, amountStr: String(safe) } };
    });
  }, []);

  // Save
  const handleSave = async () => {
    if (chargeItems.length === 0) { toast.error('Add at least one item'); return; }
    setIsSaving(true);
    try {
      const billingItems = chargeItems.map((item) =>
        item.type === 'inventory'
          ? { inventoryItemId: Number(item.itemId), quantity: item.quantity, unitCost: item.amount }
          : { serviceId: Number(item.itemId), quantity: item.quantity, unitCost: item.amount }
      );
      const res = await fetch(`/api/surgical-cases/${caseId}/billing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingItems, discount }),
      });
      const data = await res.json();
      if (data.success) toast.success('Charges saved');
      else toast.error(data.error ?? 'Failed to save');
    } catch {
      toast.error('Failed to save charges');
    } finally {
      setIsSaving(false);
    }
  };

  // Row input helpers
  const getDraft = (item: ChargeItem) =>
    rowDrafts[item.id] ?? { quantityStr: String(item.quantity), amountStr: String(item.amount) };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative" ref={searchRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
        <Input
          placeholder="Search services or inventory…"
          className="pl-9 h-10 touch-manipulation"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setDropdownOpen(true); }}
          onFocus={() => setDropdownOpen(true)}
        />

        {dropdownOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-56 overflow-auto">
            {!searchQuery && (
              <p className="px-3 py-2 text-xs text-slate-400">Type to search services or inventory</p>
            )}
            {searchQuery && filteredServices.length > 0 && (
              <div className="p-1">
                <p className="px-2 py-1 text-xs font-medium text-slate-500">Services</p>
                {filteredServices.map((s) => (
                  <button key={s.id} type="button"
                    className="w-full flex items-center justify-between px-2 py-2 text-left hover:bg-slate-50 rounded touch-manipulation"
                    onClick={() => addService(s)}>
                    <span className="text-sm truncate">{s.service_name}</span>
                    <span className="text-sm text-slate-500 shrink-0 ml-2">KSH {s.price.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}
            {searchQuery && filteredInventory.length > 0 && (
              <div className={`p-1 ${filteredServices.length > 0 ? 'border-t' : ''}`}>
                <p className="px-2 py-1 text-xs font-medium text-slate-500">Inventory</p>
                {filteredInventory.map((item) => (
                  <button key={item.id} type="button"
                    className="w-full flex items-center justify-between px-2 py-2 text-left hover:bg-slate-50 rounded touch-manipulation"
                    onClick={() => addInventory(item)}>
                    <span className="text-sm truncate">{item.name}</span>
                    <span className="text-sm text-slate-500 shrink-0 ml-2">KSH {item.unit_cost.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}
            {searchQuery && filteredServices.length === 0 && filteredInventory.length === 0 && (
              <p className="p-3 text-sm text-slate-500 text-center">No items found</p>
            )}
          </div>
        )}
      </div>

      {/* Items */}
      {chargeItems.length > 0 ? (
        <div className="space-y-3">
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {chargeItems.map((item) => {
              const draft = getDraft(item);
              return (
                <div key={item.id} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {item.type === 'service'
                      ? <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                      : <Package className="h-4 w-4 text-orange-500 shrink-0" />}
                    <span className="text-sm font-medium truncate flex-1">{item.description}</span>
                    <button type="button" onClick={() => removeItem(item.id)}
                      className="p-1 text-slate-400 hover:text-red-500 touch-manipulation">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-slate-500">Qty</label>
                      <Input type="text" inputMode="numeric" pattern="[0-9]*"
                        className="h-9 touch-manipulation"
                        value={draft.quantityStr}
                        onChange={(e) => handleQtyChange(item.id, e.target.value)}
                        onBlur={() => handleQtyBlur(item.id)} />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-slate-500">Unit Price</label>
                      <Input type="text" inputMode="decimal"
                        className="h-9 touch-manipulation"
                        value={draft.amountStr}
                        onChange={(e) => handleAmtChange(item.id, e.target.value)}
                        onBlur={() => handleAmtBlur(item.id)} />
                    </div>
                    <div className="flex items-end pb-1">
                      <span className="text-sm font-medium">
                        KSH {((item.amount || 0) * (item.quantity || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 px-3 py-2">Item</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-3 py-2 w-24">Qty</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-3 py-2 w-32">Unit Price</th>
                  <th className="text-right text-xs font-medium text-slate-500 px-3 py-2 w-28">Total</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chargeItems.map((item) => {
                  const draft = getDraft(item);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {item.type === 'service'
                            ? <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                            : <Package className="h-4 w-4 text-orange-500 shrink-0" />}
                          <span className="text-sm">{item.description}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Input type="text" inputMode="numeric" pattern="[0-9]*"
                          className="h-8 w-20"
                          value={draft.quantityStr}
                          onChange={(e) => handleQtyChange(item.id, e.target.value)}
                          onBlur={() => handleQtyBlur(item.id)} />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="text" inputMode="decimal"
                          className="h-8 w-28"
                          value={draft.amountStr}
                          onChange={(e) => handleAmtChange(item.id, e.target.value)}
                          onBlur={() => handleAmtBlur(item.id)} />
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-medium">
                        KSH {((item.amount || 0) * (item.quantity || 0)).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => removeItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Discount */}
          <div className="flex items-center gap-3 pt-1">
            <label className="text-sm text-slate-600 shrink-0">Discount (KSH)</label>
            <Input type="text" inputMode="decimal" className="h-9 w-28"
              value={discountStr}
              onChange={(e) => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) setDiscountStr(v); }}
              onBlur={() => { const p = parseFloat(discountStr); setDiscountStr(String(isNaN(p) || p < 0 ? 0 : p)); }} />
          </div>

          {/* Totals */}
          <div className="pt-2 border-t space-y-1">
            {discount > 0 && (
              <>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span><span>KSH {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Discount</span>
                  <span className="text-red-500">− KSH {discount.toLocaleString()}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-sm font-medium text-slate-600">Total</span>
              <span className="text-base font-semibold text-slate-900">KSH {total.toLocaleString()}</span>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end pt-1">
            <Button size="sm" variant="outline" onClick={handleSave} disabled={isSaving} className="h-8">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              {isSaving ? 'Saving…' : 'Save Charges'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-lg">
          <p className="text-sm">No charges added yet</p>
          <p className="text-xs mt-1">Search above to add services or inventory items — or skip and add later</p>
        </div>
      )}
    </div>
  );
}
