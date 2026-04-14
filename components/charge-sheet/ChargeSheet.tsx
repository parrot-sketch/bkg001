'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChargeSearchInput } from '@/components/theater-tech/ChargeSearchInput';
import { ChargeItemsTable } from '@/components/theater-tech/ChargeItemsTable';
import { ChargeTotals } from '@/components/theater-tech/ChargeTotals';
import type { Service, InventoryItem, ChargeItem, RowDraft } from '@/components/theater-tech/charge-sheet.types';

export interface ChargeSheetProps {
  appointmentId?: number;
  surgicalCaseId?: string;
}

export function ChargeSheet({ appointmentId, surgicalCaseId }: ChargeSheetProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [chargeItems, setChargeItems] = useState<ChargeItem[]>([]);
  const [rowDrafts, setRowDrafts] = useState<Record<string, RowDraft>>({});
  const [discountStr, setDiscountStr] = useState('0');
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  let billingEndpoint: string;
  if (appointmentId) {
    billingEndpoint = `/api/appointments/${appointmentId}/billing`;
  } else if (surgicalCaseId) {
    billingEndpoint = `/api/surgical-cases/${surgicalCaseId}/billing`;
  } else {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-8 text-center text-slate-500">
          <p className="text-sm">Error: Either appointmentId or surgicalCaseId required</p>
        </CardContent>
      </Card>
    );
  }

  useEffect(() => {
    async function loadData() {
      try {
        const [billingRes, servicesRes, inventoryRes] = await Promise.all([
          fetch(billingEndpoint),
          fetch('/api/services'),
          fetch('/api/inventory/items?limit=100'),
        ]);

        const [billingData, servicesData, inventoryData] = await Promise.all([
          billingRes.json(),
          servicesRes.json(),
          inventoryRes.json(),
        ]);

        if (billingData.success && billingData.data?.payment?.billItems) {
          const items: ChargeItem[] = billingData.data.payment.billItems.map((item: any) => ({
            id: `existing-${item.serviceId}`,
            description: item.serviceName,
            amount: item.unitCost || 0,
            quantity: item.quantity || 1,
            type: item.isInventory || item.inventoryItemId ? 'inventory' as const : 'service' as const,
            itemId: item.inventoryItemId || item.serviceId,
          }));
          setChargeItems(items);

          const drafts: Record<string, RowDraft> = {};
          for (const it of items) {
            drafts[it.id] = {
              quantityStr: String(it.quantity),
              amountStr: String(it.amount),
            };
          }
          setRowDrafts(drafts);

          const disc = billingData.data.payment.discount || 0;
          setDiscountStr(String(disc));
        }

        if (servicesData.success) {
          setServices(servicesData.data || []);
        }

        if (inventoryData.success && inventoryData.data?.data) {
          const items: InventoryItem[] = inventoryData.data.data.map((i: any) => {
            const uc = i.unitCost;
            const unitCost = typeof uc === 'number' ? uc : Number(uc) || 0;
            return {
              id: String(i.id),
              name: i.name,
              sku: (i.sku as string) || '',
              unit_cost: unitCost,
              category: (i.category as string) || '',
            };
          });
          setInventoryItems(items);
        }
      } catch (error) {
        console.error('Error loading billing data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [billingEndpoint]);

  const filteredServices = useMemo(() => {
    if (!searchQuery) return services.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return services
      .filter((s) => s.service_name.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q))
      .slice(0, 10);
  }, [services, searchQuery]);

  const filteredInventory = useMemo(() => {
    if (!searchQuery) return inventoryItems.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return inventoryItems
      .filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
      .slice(0, 10);
  }, [inventoryItems, searchQuery]);

  const subtotal = useMemo(
    () => chargeItems.reduce((sum, item) => sum + (item.amount || 0) * (item.quantity || 0), 0),
    [chargeItems]
  );

  const discount = useMemo(() => parseFloat(discountStr) || 0, [discountStr]);

  const total = useMemo(() => Math.max(0, subtotal - discount), [subtotal, discount]);

  const handleAddService = useCallback((service: Service) => {
    if (chargeItems.some((i) => i.type === 'service' && i.itemId === service.id)) return;
    const newItem: ChargeItem = {
      id: `service-${Date.now()}`,
      description: service.service_name,
      amount: service.price || 0,
      quantity: 1,
      type: 'service',
      itemId: service.id,
    };
    setChargeItems((prev) => [...prev, newItem]);
    setRowDrafts((prev) => ({
      ...prev,
      [newItem.id]: { quantityStr: '1', amountStr: String(newItem.amount) },
    }));
    setSearchQuery('');
    setDropdownOpen(false);
  }, [chargeItems]);

  const handleAddInventory = useCallback((item: InventoryItem) => {
    if (chargeItems.some((i) => i.type === 'inventory' && i.itemId === item.id)) return;
    const newItem: ChargeItem = {
      id: `inv-${Date.now()}`,
      description: item.name,
      amount: item.unit_cost || 0,
      quantity: 1,
      type: 'inventory',
      itemId: item.id,
    };
    setChargeItems((prev) => [...prev, newItem]);
    setRowDrafts((prev) => ({
      ...prev,
      [newItem.id]: { quantityStr: '1', amountStr: String(newItem.amount) },
    }));
    setSearchQuery('');
    setDropdownOpen(false);
  }, [chargeItems]);

  const handleRemoveItem = useCallback((id: string) => {
    setChargeItems((prev) => prev.filter((item) => item.id !== id));
    setRowDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleQuantityChange = useCallback((id: string, value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    setRowDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], quantityStr: value },
    }));
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
      setChargeItems((items) =>
        items.map((item) => (item.id === id ? { ...item, quantity: safe } : item))
      );
      return { ...prev, [id]: { ...draft, quantityStr: String(safe) } };
    });
  }, []);

  const handleAmountChange = useCallback((id: string, value: string) => {
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

  const handleDiscountChange = useCallback((value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setDiscountStr(value);
    }
  }, []);

  const handleDiscountBlur = useCallback(() => {
    const parsed = parseFloat(discountStr);
    setDiscountStr(String(isNaN(parsed) || parsed < 0 ? 0 : parsed));
  }, [discountStr]);

  const handleSave = useCallback(async () => {
    if (chargeItems.length === 0) {
      toast.error('Add at least one item to save');
      return;
    }

    setIsSaving(true);
    try {
      const billingItems = chargeItems.map((item) =>
        item.type === 'inventory'
          ? { inventoryItemId: Number(item.itemId), quantity: item.quantity, unitCost: item.amount }
          : { serviceId: Number(item.itemId), quantity: item.quantity, unitCost: item.amount }
      );

      const res = await fetch(billingEndpoint, {
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
  }, [chargeItems, billingEndpoint, discount]);

  const getDraft = useCallback(
    (item: ChargeItem): RowDraft =>
      rowDrafts[item.id] ?? { quantityStr: String(item.quantity), amountStr: String(item.amount) },
    [rowDrafts]
  );

  if (isLoading) {
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
        {chargeItems.length > 0 && (
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="ml-1">{isSaving ? 'Saving…' : 'Save'}</span>
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <ChargeSearchInput
          searchQuery={searchQuery}
          dropdownOpen={dropdownOpen}
          filteredServices={filteredServices}
          filteredInventory={filteredInventory}
          onSearchChange={(v) => {
            setSearchQuery(v);
            setDropdownOpen(true);
          }}
          onFocus={() => setDropdownOpen(true)}
          onAddService={handleAddService}
          onAddInventory={handleAddInventory}
          onClose={() => setDropdownOpen(false)}
        />

        {chargeItems.length > 0 ? (
          <div className="space-y-3">
            <ChargeItemsTable
              chargeItems={chargeItems}
              rowDrafts={rowDrafts}
              onQuantityChange={handleQuantityChange}
              onQuantityBlur={handleQuantityBlur}
              onAmountChange={handleAmountChange}
              onAmountBlur={handleAmountBlur}
              onRemoveItem={handleRemoveItem}
              getDraft={getDraft}
            />
            <ChargeTotals
              subtotal={subtotal}
              discount={discount}
              total={total}
              discountStr={discountStr}
              onDiscountChange={handleDiscountChange}
              onDiscountBlur={handleDiscountBlur}
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