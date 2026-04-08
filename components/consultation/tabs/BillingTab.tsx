'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Trash2, Save, Package, Stethoscope, FileText } from 'lucide-react';
import { useServices } from '@/hooks/useServices';
import { useAppointmentBilling, useSaveBilling } from '@/hooks/doctor/useBilling';
import { InventoryPicker } from '@/components/inventory/InventoryPicker';
import { ServicePicker } from './ServicePicker';
import { toast } from 'sonner';

interface ChargeItem {
  key: string;
  description: string;
  amount: number;
  serviceId: number | null;
  source: 'procedure' | 'inventory' | 'manual';
  inventoryItemId?: number;
}

function generateKey(): string {
  return 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

export function BillingTab({ appointmentId, isReadOnly = false }: { appointmentId?: number; isReadOnly?: boolean }) {
  const { services } = useServices();
  const { data: billingData, isLoading: billingLoading } = useAppointmentBilling(appointmentId, !!appointmentId);
  const { mutateAsync: saveBilling, isPending: isSaving } = useSaveBilling();

  const consultationService = useMemo(() => 
    services.find(s => s.category?.toLowerCase() === 'consultation') 
    || services.find(s => s.service_name.toLowerCase().includes('consultation')) 
    || null, 
  [services]);

  const procedureServices = useMemo(() => services.filter(s => s.category?.toLowerCase() === 'procedure'), [services]);

  const [consultationFee, setConsultationFee] = useState(0);
  const [items, setItems] = useState<ChargeItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [pickerOpen, setPickerOpen] = useState<'procedure' | 'inventory' | null>(null);

  const defaultFee = billingData?.appointment?.consultationFee ?? 0;

  useEffect(() => {
    if (billingData?.payment?.billItems?.length) {
      const consult = billingData.payment.billItems.find(i => i.serviceName.toLowerCase().includes('consultation'));
      const others = billingData.payment.billItems.filter(i => !i.serviceName.toLowerCase().includes('consultation'));
      setConsultationFee(consult?.totalCost || 0);
      setItems(others.map(i => ({ 
        key: generateKey(), 
        description: i.serviceName, 
        amount: i.totalCost, 
        serviceId: i.serviceId,
        source: 'procedure' as const
      })));
      setDiscount(billingData.payment.discount || 0);
      setIsDirty(false);
    } else if (consultationFee === 0 && defaultFee > 0) {
      setConsultationFee(defaultFee);
      setIsDirty(true);
    }
  }, [billingData, defaultFee]);

  const total = useMemo(() => {
    return Math.max(0, consultationFee + items.reduce((s, i) => s + (i.amount || 0), 0) - discount);
  }, [consultationFee, items, discount]);

  const handleProcedureSelect = useCallback((service: any) => {
    const exists = items.some(i => i.serviceId === service.id);
    if (exists) {
      toast.warning(service.service_name + ' already added');
      return;
    }
    setItems(p => [...p, { 
      key: generateKey(), 
      description: service.service_name, 
      amount: service.price > 0 ? service.price : 0, 
      serviceId: service.id,
      source: 'procedure'
    }]);
    setIsDirty(true);
    toast.success(service.price > 0 
      ? service.service_name + ' - KSH ' + service.price.toLocaleString() 
      : service.service_name + ' added (enter price)');
    setPickerOpen(null);
  }, [items]);

  const handleInventorySelect = useCallback((item: any) => {
    const exists = items.some(i => i.inventoryItemId === item.id);
    if (exists) {
      toast.warning(item.name + ' already added');
      return;
    }
    const itemCost = Number(item.unitCost) || 0;
    setItems(p => [...p, { 
      key: generateKey(), 
      description: item.name, 
      amount: itemCost, 
      serviceId: null,
      source: 'inventory',
      inventoryItemId: item.id
    }]);
    setIsDirty(true);
    toast.success(itemCost > 0 
      ? item.name + ' - KSH ' + itemCost.toLocaleString() 
      : item.name + ' added (enter price)');
    setPickerOpen(null);
  }, [items]);

  const removeItem = useCallback((key: string) => {
    setItems(p => p.filter(i => i.key !== key));
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!appointmentId) return;
    
    const billItems: Array<{serviceId: number; quantity: number; unitCost: number}> = [];

    if (consultationFee > 0 && consultationService) {
      billItems.push({ serviceId: consultationService.id, quantity: 1, unitCost: consultationFee });
    }

    items.forEach(item => {
      if (!item.description.trim() || item.amount <= 0) return;
      
      if (item.source === 'procedure' && item.serviceId) {
        billItems.push({ serviceId: item.serviceId, quantity: 1, unitCost: item.amount });
      } else {
        const matchedService = services.find(s => s.service_name.toLowerCase() === item.description.toLowerCase());
        const defaultService = services.find(s => s.category?.toLowerCase() === 'procedure');
        billItems.push({ 
          serviceId: item.serviceId ?? matchedService?.id ?? defaultService?.id ?? 1, 
          quantity: 1, 
          unitCost: item.amount 
        });
      }
    });

    if (billItems.length === 0) {
      toast.error('Add at least one item with amount');
      return;
    }

    await saveBilling({ 
      appointmentId, 
      billingItems: billItems, 
      discount: discount > 0 ? discount : undefined 
    });
    setIsDirty(false);
    toast.success('Charge sheet saved');
  }, [appointmentId, consultationFee, consultationService, items, discount, services, saveBilling]);

  if (billingLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;
  }

  const isEditable = !isReadOnly && billingData?.payment?.status !== 'PAID' && !billingData?.payment?.finalizedAt;
  const usedProcedureIds = items.filter(i => i.serviceId).map(i => i.serviceId as number);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {billingData?.payment?.chargeSheetNo && (
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <p className="text-xs uppercase tracking-wider text-stone-500">Charge Sheet</p>
            <p className="font-mono font-bold text-stone-900">{billingData.payment.chargeSheetNo}</p>
          </div>
          <span className={billingData.payment.finalizedAt ? 'text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded' : 'text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded'}>
            {billingData.payment.finalizedAt ? 'Finalized' : 'Draft'}
          </span>
        </div>
      )}

      <div className="bg-white rounded-lg border border-stone-200 p-4">
        <label className="text-sm font-semibold text-stone-700 block mb-2">Consultation Fee</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">KSH</span>
          <Input
            type="number"
            disabled={!isEditable}
            value={consultationFee || ''}
            onChange={e => { setConsultationFee(parseFloat(e.target.value) || 0); setIsDirty(true); }}
            className="pl-12 h-10 text-right font-semibold"
          />
        </div>
      </div>

      {isEditable && (
        <div className="bg-stone-50 rounded-lg border border-stone-200 p-4 space-y-4">
          <p className="text-sm font-semibold text-stone-700">Add Items</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setPickerOpen(p => p === 'procedure' ? null : 'procedure')} className="flex items-center gap-3 p-3 bg-white rounded border border-stone-200 hover:border-stone-300 text-left">
              <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center"><Stethoscope className="w-4 h-4 text-blue-600" /></div>
              <div><p className="text-sm font-semibold">Procedure</p><p className="text-xs text-stone-400">{procedureServices.length} available</p></div>
            </button>
            <button onClick={() => setPickerOpen(p => p === 'inventory' ? null : 'inventory')} className="flex items-center gap-3 p-3 bg-white rounded border border-stone-200 hover:border-stone-300 text-left">
              <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center"><Package className="w-4 h-4 text-emerald-600" /></div>
              <div><p className="text-sm font-semibold">Inventory</p><p className="text-xs text-stone-400">From stock</p></div>
            </button>
          </div>
          {pickerOpen === 'procedure' && <ServicePicker onSelect={handleProcedureSelect} excludeIds={usedProcedureIds} />}
          {pickerOpen === 'inventory' && <InventoryPicker onSelect={handleInventorySelect} />}
        </div>
      )}

      <div>
        <label className="text-sm font-semibold text-stone-700 block mb-2">Items ({items.length})</label>
        {items.length === 0 ? (
          <div className="border-2 border-dashed border-stone-200 rounded-lg py-8 text-center">
            <FileText className="w-8 h-8 text-stone-200 mx-auto mb-2" />
            <p className="text-sm text-stone-400">No items added</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.key} className="flex items-center gap-3 p-3 bg-stone-50 rounded border border-stone-200">
                <div className="w-8 h-8 rounded bg-stone-200 flex items-center justify-center">
                  {item.source === 'procedure' ? <Stethoscope className="w-4 h-4 text-blue-600" /> : item.source === 'inventory' ? <Package className="w-4 h-4 text-emerald-600" /> : <FileText className="w-4 h-4 text-stone-600" />}
                </div>
                <input
                  type="text"
                  value={item.description}
                  onChange={e => { setItems(p => p.map(i => i.key === item.key ? { ...i, description: e.target.value } : i)); setIsDirty(true); }}
                  disabled={!isEditable || (item.source === 'procedure' && !!item.serviceId)}
                  className="flex-1 bg-transparent text-sm font-medium border-none focus:outline-none"
                />
                <div className="relative w-24">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-stone-400">KSH</span>
                  <Input
                    type="number"
                    value={item.amount || ''}
                    onChange={e => { setItems(p => p.map(i => i.key === item.key ? { ...i, amount: Math.max(0, parseFloat(e.target.value) || 0) } : i)); setIsDirty(true); }}
                    disabled={!isEditable}
                    className="pl-10 h-8 text-right text-sm"
                  />
                </div>
                {isEditable && <button onClick={() => removeItem(item.key)} className="p-1 text-stone-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
              </div>
            ))}
          </div>
        )}
      </div>

      {discount > 0 && (
        <div className="flex items-center gap-4 p-3 bg-amber-50 rounded border border-amber-200">
          <span className="text-sm font-medium text-amber-800">Discount</span>
          <Input type="number" value={discount || ''} onChange={e => { setDiscount(parseFloat(e.target.value) || 0); setIsDirty(true); }} className="w-24 h-8" />
        </div>
      )}

      <div className="bg-stone-900 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-stone-400">Total Due</p>
          <p className="text-xl font-bold text-white">KSH {total.toLocaleString()}</p>
        </div>
        {isEditable && (
          <Button onClick={handleSave} disabled={isSaving || !isDirty || total <= 0} className="bg-white text-stone-900 hover:bg-stone-100">
            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving</> : <><Save className="w-4 h-4 mr-2" /> Save</>}
          </Button>
        )}
      </div>
    </div>
  );
}