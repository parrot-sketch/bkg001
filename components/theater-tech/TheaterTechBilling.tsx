'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Plus, Trash2, Save, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Package } from 'lucide-react';

interface Service {
  id: number;
  service_name: string;
  description: string | null;
  price: number;
  category: string | null;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  unit_cost: number;
  category: string;
}

interface ChargeItem {
  id: string;
  description: string;
  /** Stored as a real number; the input tracks a separate string for editing. */
  amount: number;
  /** Stored as a real number; the input tracks a separate string for editing. */
  quantity: number;
  type: 'service' | 'inventory';
  itemId: number | string;
}

/**
 * Per-row edit state stored separately so the user can freely clear and
 * retype both the quantity and unit-price fields without the app forcing
 * in a fallback value mid-keystroke.
 */
interface RowDraft {
  quantityStr: string;
  amountStr: string;
}

interface TheaterTechBillingProps {
  caseId: string;
}

export function TheaterTechBilling({ caseId }: TheaterTechBillingProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const [chargeItems, setChargeItems] = useState<ChargeItem[]>([]);
  /** Separate string state for editable fields so we don't coerce mid-type. */
  const [rowDrafts, setRowDrafts] = useState<Record<string, RowDraft>>({});

  const [discountStr, setDiscountStr] = useState('0');

  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Load existing billing data ────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const [billingRes, servicesRes, inventoryRes] = await Promise.all([
          fetch(`/api/surgical-cases/${caseId}/billing`),
          fetch('/api/services'),
          fetch('/api/inventory/items?limit=100'),
        ]);

        const [billingData, servicesData, inventoryData] = await Promise.all([
          billingRes.json(),
          servicesRes.json(),
          inventoryRes.json(),
        ]);

        if (billingData.success && billingData.data?.payment) {
          const items: ChargeItem[] =
            billingData.data.payment.billItems?.map((item: any) => ({
              id: `existing-${item.id}`,
              description: item.serviceName,
              amount: item.unitCost ?? 0,
              quantity: item.quantity ?? 1,
              type:
                item.isInventory || item.inventoryItemId
                  ? 'inventory'
                  : 'service',
              itemId: item.inventoryItemId ?? item.serviceId,
            })) ?? [];

          setChargeItems(items);

          const drafts: Record<string, RowDraft> = {};
          for (const it of items) {
            drafts[it.id] = {
              quantityStr: String(it.quantity),
              amountStr: String(it.amount),
            };
          }
          setRowDrafts(drafts);

          const disc = billingData.data.payment.discount ?? 0;
          setDiscountStr(String(disc));
        }

        if (servicesData.success) {
          setServices(servicesData.data ?? []);
        }

        if (inventoryData.success && inventoryData.data?.data) {
          const items: InventoryItem[] = inventoryData.data.data.map(
            (item: any) => ({
              id: String(item.id),
              name: item.name,
              sku: item.sku ?? '',
              unit_cost: item.unitCost ?? 0,
              category: item.category ?? '',
            })
          );
          setInventoryItems(items);
        }
      } catch (error) {
        console.error('Error loading billing data:', error);
        toast.error('Failed to load billing data');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [caseId]);

  // ── Filtered search results ───────────────────────────────────────────────
  const filteredServices = useMemo(() => {
    if (!searchQuery) return services.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return services
      .filter(
        (s) =>
          s.service_name.toLowerCase().includes(q) ||
          s.category?.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [services, searchQuery]);

  const filteredInventory = useMemo(() => {
    if (!searchQuery) return inventoryItems.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return inventoryItems
      .filter(
        (i) =>
          i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [inventoryItems, searchQuery]);

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotal = useMemo(
    () =>
      chargeItems.reduce(
        (sum, item) => sum + (item.amount || 0) * (item.quantity || 0),
        0
      ),
    [chargeItems]
  );

  const discount = useMemo(
    () => parseFloat(discountStr) || 0,
    [discountStr]
  );

  const total = useMemo(
    () => Math.max(0, subtotal - discount),
    [subtotal, discount]
  );

  // ── Add items ─────────────────────────────────────────────────────────────
  const handleAddService = useCallback(
    (service: Service) => {
      if (chargeItems.some((i) => i.type === 'service' && i.itemId === service.id))
        return;

      const newItem: ChargeItem = {
        id: `service-${Date.now()}`,
        description: service.service_name,
        amount: service.price ?? 0,
        quantity: 1,
        type: 'service',
        itemId: service.id,
      };

      setChargeItems((prev) => [...prev, newItem]);
      setRowDrafts((prev) => ({
        ...prev,
        [newItem.id]: {
          quantityStr: '1',
          amountStr: String(newItem.amount),
        },
      }));
      setSearchQuery('');
      setDropdownOpen(false);
    },
    [chargeItems]
  );

  const handleAddInventory = useCallback(
    (item: InventoryItem) => {
      if (chargeItems.some((i) => i.type === 'inventory' && i.itemId === item.id))
        return;

      const newItem: ChargeItem = {
        id: `inv-${Date.now()}`,
        description: item.name,
        amount: item.unit_cost ?? 0,
        quantity: 1,
        type: 'inventory',
        itemId: item.id,
      };

      setChargeItems((prev) => [...prev, newItem]);
      setRowDrafts((prev) => ({
        ...prev,
        [newItem.id]: {
          quantityStr: '1',
          amountStr: String(newItem.amount),
        },
      }));
      setSearchQuery('');
      setDropdownOpen(false);
    },
    [chargeItems]
  );

  const handleRemoveItem = useCallback((id: string) => {
    setChargeItems((prev) => prev.filter((item) => item.id !== id));
    setRowDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // ── Quantity editing ──────────────────────────────────────────────────────
  /**
   * While editing, we store the raw string in rowDrafts so the user can
   * freely clear the field. We only commit the parsed integer back to the
   * chargeItems state when the field loses focus.
   */
  const handleQuantityChange = useCallback((id: string, value: string) => {
    // Allow only digits (and empty string)
    if (value !== '' && !/^\d+$/.test(value)) return;
    setRowDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], quantityStr: value },
    }));
    // Keep chargeItems in sync with whatever is a valid number so totals stay live
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setChargeItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity: parsed } : item))
      );
    }
  }, []);

  const handleQuantityBlur = useCallback((id: string) => {
    setRowDrafts((prev) => {
      const draft = prev[id];
      if (!draft) return prev;
      const parsed = parseInt(draft.quantityStr, 10);
      const safe = isNaN(parsed) || parsed < 1 ? 1 : parsed;
      // Ensure chargeItems reflects the committed value
      setChargeItems((items) =>
        items.map((item) => (item.id === id ? { ...item, quantity: safe } : item))
      );
      return { ...prev, [id]: { ...draft, quantityStr: String(safe) } };
    });
  }, []);

  // ── Amount editing ────────────────────────────────────────────────────────
  const handleAmountChange = useCallback((id: string, value: string) => {
    // Allow digits, one decimal point, and leading minus excluded
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    setRowDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], amountStr: value },
    }));
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      setChargeItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, amount: parsed } : item))
      );
    }
  }, []);

  const handleAmountBlur = useCallback((id: string) => {
    setRowDrafts((prev) => {
      const draft = prev[id];
      if (!draft) return prev;
      const parsed = parseFloat(draft.amountStr);
      const safe = isNaN(parsed) || parsed < 0 ? 0 : parsed;
      setChargeItems((items) =>
        items.map((item) => (item.id === id ? { ...item, amount: safe } : item))
      );
      return { ...prev, [id]: { ...draft, amountStr: String(safe) } };
    });
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (chargeItems.length === 0) {
      toast.error('Add at least one item to save');
      return;
    }

    setIsSaving(true);
    try {
      const billingItems = chargeItems.map((item) =>
        item.type === 'inventory'
          ? {
              inventoryItemId: Number(item.itemId),
              quantity: item.quantity,
              unitCost: item.amount,
            }
          : {
              serviceId: Number(item.itemId),
              quantity: item.quantity,
              unitCost: item.amount,
            }
      );

      const res = await fetch(`/api/surgical-cases/${caseId}/billing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingItems, discount }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Charge sheet saved');
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving billing:', error);
      toast.error('Failed to save charge sheet');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderQuantityInput = (item: ChargeItem, className?: string) => {
    const draft = rowDrafts[item.id] ?? { quantityStr: String(item.quantity), amountStr: String(item.amount) };
    return (
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className={className}
        value={draft.quantityStr}
        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
        onBlur={() => handleQuantityBlur(item.id)}
        aria-label="Quantity"
      />
    );
  };

  const renderAmountInput = (item: ChargeItem, className?: string) => {
    const draft = rowDrafts[item.id] ?? { quantityStr: String(item.quantity), amountStr: String(item.amount) };
    return (
      <Input
        type="text"
        inputMode="decimal"
        className={className}
        value={draft.amountStr}
        onChange={(e) => handleAmountChange(item.id, e.target.value)}
        onBlur={() => handleAmountBlur(item.id)}
        aria-label="Unit price"
      />
    );
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Charge Sheet</CardTitle>
        {chargeItems.length > 0 && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="ml-1">{isSaving ? 'Saving…' : 'Save'}</span>
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Search / Add ── */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Add Charge</label>
          <div className="relative" ref={searchContainerRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
            <Input
              placeholder="Search services or inventory…"
              className="pl-9 h-11 md:h-9 touch-manipulation"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
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
                    {filteredServices.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        className="w-full flex items-center justify-between px-2 py-2.5 text-left hover:bg-slate-50 rounded touch-manipulation"
                        onClick={() => handleAddService(service)}
                      >
                        <span className="text-sm truncate">{service.service_name}</span>
                        <span className="text-sm text-slate-500 shrink-0 ml-2">
                          KSH {service.price.toLocaleString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery && filteredInventory.length > 0 && (
                  <div className={`p-1 ${filteredServices.length > 0 ? 'border-t' : ''}`}>
                    <p className="px-2 py-1 text-xs font-medium text-slate-500">
                      Inventory
                    </p>
                    {filteredInventory.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full flex items-center justify-between px-2 py-2.5 text-left hover:bg-slate-50 rounded touch-manipulation"
                        onClick={() => handleAddInventory(item)}
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
                  filteredInventory.length === 0 && (
                    <p className="p-3 text-sm text-slate-500 text-center">
                      No items found
                    </p>
                  )}
              </div>
            )}
          </div>
        </div>

        {/* ── Items list ── */}
        {chargeItems.length > 0 ? (
          <div className="space-y-3">
            {/* Mobile: stacked cards */}
            <div className="md:hidden space-y-2">
              {chargeItems.map((item) => (
                <div key={item.id} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {item.type === 'service' ? (
                      <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                    ) : (
                      <Package className="h-4 w-4 text-orange-500 shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate flex-1">
                      {item.description}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-slate-400 hover:text-red-500 touch-manipulation"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-slate-500">Qty</label>
                      {renderQuantityInput(item, 'h-9 touch-manipulation')}
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-slate-500">Unit Price</label>
                      {renderAmountInput(item, 'h-9 touch-manipulation')}
                    </div>
                    <div className="flex items-end pb-1">
                      <span className="text-sm font-medium">
                        KSH{' '}
                        {((item.amount || 0) * (item.quantity || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left text-xs font-medium text-slate-500 px-3 py-2">
                      Item
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 px-3 py-2 w-24">
                      Qty
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 px-3 py-2 w-32">
                      Unit Price
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 px-3 py-2 w-28">
                      Total
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {chargeItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {item.type === 'service' ? (
                            <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                          ) : (
                            <Package className="h-4 w-4 text-orange-500 shrink-0" />
                          )}
                          <span className="text-sm">{item.description}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {renderQuantityInput(item, 'h-8 w-20')}
                      </td>
                      <td className="px-3 py-2">
                        {renderAmountInput(item, 'h-8 w-28')}
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-medium">
                        KSH{' '}
                        {((item.amount || 0) * (item.quantity || 0)).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Discount */}
            <div className="flex items-center gap-3 pt-2">
              <label className="text-sm text-slate-600 shrink-0">
                Discount (KSH)
              </label>
              <Input
                type="text"
                inputMode="decimal"
                className="h-9 w-28"
                value={discountStr}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || /^\d*\.?\d*$/.test(v)) setDiscountStr(v);
                }}
                onBlur={() => {
                  const parsed = parseFloat(discountStr);
                  setDiscountStr(String(isNaN(parsed) || parsed < 0 ? 0 : parsed));
                }}
                aria-label="Discount amount"
              />
            </div>

            {/* Totals */}
            <div className="pt-3 border-t space-y-1">
              {discount > 0 && (
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span>KSH {subtotal.toLocaleString()}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Discount</span>
                  <span className="text-red-500">− KSH {discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Total</span>
                <span className="text-lg font-semibold text-slate-900">
                  KSH {total.toLocaleString()}
                </span>
              </div>
            </div>
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