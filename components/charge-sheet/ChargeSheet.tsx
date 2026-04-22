'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Save, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChargeItemsTable } from '@/components/theater-tech/ChargeItemsTable';
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
  const [showDropdown, setShowDropdown] = useState(false);

  let billingEndpoint: string;
  if (appointmentId) {
    billingEndpoint = `/api/appointments/${appointmentId}/billing`;
  } else if (surgicalCaseId) {
    billingEndpoint = `/api/surgical-cases/${surgicalCaseId}/billing`;
  } else {
    return <p className="text-sm text-slate-500">Error: Missing ID</p>;
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
            catalogAmount: item.unitCost || 0,
            quantity: item.quantity || 1,
            type: item.isInventory || item.inventoryItemId ? 'inventory' as const : 'service' as const,
            itemId: item.inventoryItemId || item.serviceId,
          }));
          setChargeItems(items);
          const drafts: Record<string, RowDraft> = {};
          for (const it of items) {
            drafts[it.id] = { quantityStr: String(it.quantity), amountStr: String(it.amount) };
          }
          setRowDrafts(drafts);
          setDiscountStr(String(billingData.data.payment.discount || 0));
        }

        if (servicesData.success) setServices(servicesData.data || []);
        if (inventoryData.success && inventoryData.data?.data) {
          setInventoryItems(inventoryData.data.data.map((i: any) => ({
            id: String(i.id),
            name: i.name,
            sku: (i.sku as string) || '',
            unit_cost: typeof i.unitCost === 'number' ? i.unitCost : Number(i.unitCost) || 0,
            category: (i.category as string) || '',
          })));
        }
      } catch (error) {
        console.error('Error loading billing data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [billingEndpoint]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return [];
    const svcs = services.filter(s => s.service_name.toLowerCase().includes(q)).slice(0, 5);
    const invs = inventoryItems.filter(i => i.name.toLowerCase().includes(q)).slice(0, 5);
    return [...svcs.map(s => ({ type: 'service' as const, item: s })), ...invs.map(i => ({ type: 'inventory' as const, item: i }))];
  }, [services, inventoryItems, searchQuery]);

  const subtotal = useMemo(() => chargeItems.reduce((sum, item) => sum + (item.amount || 0) * (item.quantity || 0), 0), [chargeItems]);
  const discount = useMemo(() => parseFloat(discountStr) || 0, [discountStr]);
  const total = useMemo(() => Math.max(0, subtotal - discount), [subtotal, discount]);

  const handleAddItem = useCallback((type: 'service' | 'inventory', item: Service | InventoryItem) => {
    const exists = chargeItems.some(i => i.type === type && i.itemId === (item as any).id);
    if (exists) return;
    const newItem: ChargeItem = {
      id: `${type}-${Date.now()}`,
      description: type === 'service' ? (item as Service).service_name : (item as InventoryItem).name,
      amount: type === 'service' ? (item as Service).price || 0 : (item as InventoryItem).unit_cost || 0,
      catalogAmount: type === 'service' ? (item as Service).price || 0 : (item as InventoryItem).unit_cost || 0,
      quantity: 1,
      type,
      itemId: String((item as any).id),
    };
    setChargeItems(prev => [...prev, newItem]);
    setRowDrafts(prev => ({ ...prev, [newItem.id]: { quantityStr: '1', amountStr: String(newItem.amount) } }));
    setSearchQuery('');
    setShowDropdown(false);
  }, [chargeItems]);

  const handleRemove = useCallback((id: string) => {
    setChargeItems(prev => prev.filter(i => i.id !== id));
    setRowDrafts(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, []);

  const handleQuantityChange = useCallback((id: string, value: string) => {
    if (value && !/^\d+$/.test(value)) return;
    setRowDrafts(prev => ({ ...prev, [id]: { ...prev[id], quantityStr: value } }));
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setChargeItems(prev => prev.map(i => i.id === id ? { ...i, quantity: parsed } : i));
    }
  }, []);

  const handleQuantityBlur = useCallback((id: string) => {
    const draft = rowDrafts[id];
    if (!draft) return;
    const parsed = parseInt(draft.quantityStr, 10);
    const safe = isNaN(parsed) || parsed < 1 ? 1 : parsed;
    setChargeItems(items => items.map(i => i.id === id ? { ...i, quantity: safe } : i));
    setRowDrafts(prev => ({ ...prev, [id]: { ...draft, quantityStr: String(safe) } }));
  }, [rowDrafts]);

  const handleAmountChange = useCallback((id: string, value: string) => {
    if (value && !/^\d*\.?\d*$/.test(value)) return;
    setRowDrafts(prev => ({ ...prev, [id]: { ...prev[id], amountStr: value } }));
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      setChargeItems(prev => prev.map(i => i.id === id ? { ...i, amount: parsed } : i));
    }
  }, []);

  const handleAmountBlur = useCallback((id: string) => {
    const draft = rowDrafts[id];
    if (!draft) return;
    const parsed = parseFloat(draft.amountStr);
    const safe = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setChargeItems(items => items.map(i => i.id === id ? { ...i, amount: safe } : i));
    setRowDrafts(prev => ({ ...prev, [id]: { ...draft, amountStr: String(safe) } }));
  }, [rowDrafts]);

  const handleDiscountChange = useCallback((value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) setDiscountStr(value);
  }, []);

  const handleDiscountBlur = useCallback(() => {
    const parsed = parseFloat(discountStr);
    setDiscountStr(String(isNaN(parsed) || parsed < 0 ? 0 : parsed));
  }, [discountStr]);

  const handleSave = useCallback(async () => {
    if (chargeItems.length === 0) { toast.error('Add at least one item'); return; }
    setIsSaving(true);
    try {
      const billingItems = chargeItems.map(i => i.type === 'inventory'
        ? { inventoryItemId: Number(i.itemId), quantity: i.quantity, unitCost: i.amount }
        : { serviceId: Number(i.itemId), quantity: i.quantity, unitCost: i.amount }
      );
      const res = await fetch(billingEndpoint, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ billingItems, discount }) });
      const data = await res.json();
      if (data.success) toast.success('Saved');
      else toast.error(data.error || 'Failed');
    } catch { toast.error('Failed to save'); }
    finally { setIsSaving(false); }
  }, [chargeItems, billingEndpoint, discount]);

  const getDraft = useCallback((item: ChargeItem): RowDraft => rowDrafts[item.id] ?? { quantityStr: String(item.quantity), amountStr: String(item.amount) }, [rowDrafts]);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input placeholder="Search services or inventory..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} className="h-10" />
        {showDropdown && filteredItems.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
            {filteredItems.map((i, idx) => (
              <button key={idx} onClick={() => handleAddItem(i.type, i.item as any)} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50">
                <span className="text-sm text-slate-900">{(i.item as any).service_name || (i.item as any).name}</span>
                <span className="text-xs text-slate-500">KSH {i.type === 'service' ? (i.item as Service).price : (i.item as InventoryItem).unit_cost}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {chargeItems.length > 0 ? (
        <div className="space-y-4">
          <ChargeItemsTable chargeItems={chargeItems} rowDrafts={rowDrafts} onQuantityChange={handleQuantityChange} onQuantityBlur={handleQuantityBlur} onAmountChange={handleAmountChange} onAmountBlur={handleAmountBlur} onRemoveItem={handleRemove} getDraft={getDraft} />

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-sm text-slate-600">Discount</span>
            <Input value={discountStr} onChange={e => handleDiscountChange(e.target.value)} onBlur={handleDiscountBlur} className="h-8 w-24" />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <div className="text-sm text-slate-600">Total</div>
            <div className="text-lg font-semibold">KSH {total.toLocaleString()}</div>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full h-10 bg-slate-900 hover:bg-slate-800">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="ml-2">{isSaving ? 'Saving...' : 'Save'}</span>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
          <p className="text-sm text-slate-500">No items added</p>
        </div>
      )}
    </div>
  );
}
