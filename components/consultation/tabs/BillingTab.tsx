'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Trash2, Save, Package, Stethoscope, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppointmentBilling, useSaveBilling } from '@/hooks/doctor/useBilling';
import { InventoryPicker } from '@/components/inventory/InventoryPicker';
import { ServicePicker } from './ServicePicker';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChargeItem {
  key: string;
  description: string;
  amount: number;
  serviceId: number | null;
  source: 'procedure' | 'inventory';
  inventoryItemId?: number;
}

function generateKey(): string {
  return 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

export function BillingTab({ appointmentId, isReadOnly = false }: { appointmentId?: number; isReadOnly?: boolean }) {
  const { data: billingData, isLoading: billingLoading } = useAppointmentBilling(appointmentId, !!appointmentId);
  const { mutateAsync: saveBilling, isPending: isSaving } = useSaveBilling();

  const [consultationFee, setConsultationFee] = useState(0);
  const [items, setItems] = useState<ChargeItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [pickerOpen, setPickerOpen] = useState<'procedure' | 'inventory' | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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
      setLastSaved(new Date());
    }
  }, [billingData]);

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
    setHasChanges(true);
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
    setHasChanges(true);
    toast.success(itemCost > 0 
      ? item.name + ' - KSH ' + itemCost.toLocaleString() 
      : item.name + ' added (enter price)');
    setPickerOpen(null);
  }, [items]);

  const removeItem = useCallback((key: string) => {
    setItems(p => p.filter(i => i.key !== key));
    setIsDirty(true);
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!appointmentId) return;
    
    const saveFee = consultationFee;
    const saveItems = items;
    const saveDiscount = discount;

    const billItems = [];
    
    if (saveFee > 0) {
      billItems.push({ serviceId: 1, quantity: 1, unitCost: saveFee });
    }
    
    saveItems.forEach(item => {
      if (item.amount > 0) {
        billItems.push({ serviceId: item.serviceId ?? 1, quantity: 1, unitCost: item.amount });
      }
    });

    await saveBilling({ 
      appointmentId, 
      billingItems: billItems,
      discount: saveDiscount > 0 ? saveDiscount : undefined,
    });
    setIsDirty(false);
    setHasChanges(false);
    setLastSaved(new Date());
    toast.success('Charge sheet saved');
  }, [appointmentId, consultationFee, items, discount, saveBilling]);

  if (billingLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    );
  }

  const isEditable = !isReadOnly && billingData?.payment?.status !== 'PAID' && !billingData?.payment?.finalizedAt;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {billingData?.payment?.chargeSheetNo && (
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <p className="text-xs uppercase tracking-wider text-stone-500">Charge Sheet</p>
            <p className="font-mono font-bold text-stone-900">{billingData.payment.chargeSheetNo}</p>
          </div>
          <span className={cn(
            "text-xs px-2 py-1 rounded",
            billingData.payment.finalizedAt ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          )}>
            {billingData.payment.finalizedAt ? 'Finalized' : 'Draft'}
          </span>
        </div>
      )}

      {hasChanges && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-700">You have unsaved changes</span>
        </div>
      )}

      {lastSaved && !isDirty && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="text-sm text-emerald-700">
            Saved at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      <div className="bg-white rounded-lg border border-stone-200 p-4">
        <label className="text-sm font-semibold text-stone-700 block mb-2">Your Consultation Fee</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">KSH</span>
          <Input
            type="number"
            disabled={!isEditable}
            value={consultationFee || ''}
            placeholder="0"
            onChange={e => { setConsultationFee(parseFloat(e.target.value) || 0); setIsDirty(true); setHasChanges(true); }}
            className="pl-12 h-10 text-right font-semibold text-lg"
          />
        </div>
        <p className="text-xs text-stone-400 mt-2">Enter your consultation fee amount</p>
      </div>

      {isEditable && (
        <div className="bg-stone-50 rounded-lg border border-stone-200 p-4 space-y-4">
          <p className="text-sm font-semibold text-stone-700">Add Additional Items</p>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setPickerOpen(p => p === 'procedure' ? null : 'procedure')} 
              className="flex items-center gap-3 p-3 bg-white rounded border border-stone-200 hover:border-stone-300 text-left transition-colors"
            >
              <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Procedures</p>
                <p className="text-xs text-stone-400">Medical procedures</p>
              </div>
            </button>
            <button 
              onClick={() => setPickerOpen(p => p === 'inventory' ? null : 'inventory')} 
              className="flex items-center gap-3 p-3 bg-white rounded border border-stone-200 hover:border-stone-300 text-left transition-colors"
            >
              <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center">
                <Package className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Inventory</p>
                <p className="text-xs text-stone-400">Items from stock</p>
              </div>
            </button>
          </div>
          {pickerOpen === 'procedure' && <ServicePicker onSelect={handleProcedureSelect} excludeIds={items.filter(i => i.serviceId).map(i => i.serviceId as number)} />}
          {pickerOpen === 'inventory' && <InventoryPicker onSelect={handleInventorySelect} />}
        </div>
      )}

      <div>
        <label className="text-sm font-semibold text-stone-700 block mb-2">
          Additional Items ({items.length})
        </label>
        {items.length === 0 ? (
          <div className="border-2 border-dashed border-stone-200 rounded-lg py-8 text-center">
            <FileText className="w-8 h-8 text-stone-200 mx-auto mb-2" />
            <p className="text-sm text-stone-400">No additional items added</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.key} className="flex items-center gap-3 p-3 bg-stone-50 rounded border border-stone-200">
                <div className="w-8 h-8 rounded bg-stone-200 flex items-center justify-center">
                  {item.source === 'procedure' ? (
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Package className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <input
                  type="text"
                  value={item.description}
                  disabled
                  className="flex-1 bg-transparent text-sm font-medium border-none focus:outline-none"
                />
                <div className="relative w-24">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-stone-400">KSH</span>
                  <Input
                    type="number"
                    value={item.amount || ''}
                    onChange={e => { 
                      setItems(p => p.map(i => i.key === item.key ? { ...i, amount: Math.max(0, parseFloat(e.target.value) || 0) } : i)); 
                      setIsDirty(true);
                      setHasChanges(true);
                    }}
                    disabled={!isEditable}
                    className="pl-10 h-8 text-right text-sm"
                  />
                </div>
                {isEditable && (
                  <button 
                    onClick={() => removeItem(item.key)} 
                    className="p-1 text-stone-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-stone-700">Discount</label>
        <Input 
          type="number" 
          value={discount || ''} 
          placeholder="0"
          onChange={e => { setDiscount(parseFloat(e.target.value) || 0); setIsDirty(true); setHasChanges(true); }} 
          className="w-24 h-8" 
          disabled={!isEditable}
        />
      </div>

      <div className="bg-stone-900 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-stone-400">Total Due</p>
          <p className="text-xl font-bold text-white">KSH {total.toLocaleString()}</p>
        </div>
        {isEditable && (
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !isDirty || total <= 0} 
            className="bg-white text-stone-900 hover:bg-stone-100"
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save Charge Sheet</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}