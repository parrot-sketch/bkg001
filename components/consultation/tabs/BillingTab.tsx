'use client';

/**
 * Billing Tab — Consultation Workspace
 *
 * Minimal billing: consultation fee + optional additional items.
 * Frontdesk collects payment from the patient.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Plus,
  Trash2,
  Save,
} from 'lucide-react';
import { useServices } from '@/hooks/useServices';
import { useAppointmentBilling, useSaveBilling } from '@/hooks/doctor/useBilling';
import { toast } from 'sonner';

interface ConsultationBillingItem {
  key: string;
  description: string;
  amount: number;
  serviceId: number | null;
}

interface BillingTabProps {
  appointmentId?: number;
  isReadOnly?: boolean;
}

let keyCounter = 0;
function nextKey(): string {
  return `item-${Date.now()}-${++keyCounter}`;
}

export function BillingTab({ appointmentId, isReadOnly = false }: BillingTabProps) {
  const { services } = useServices();
  const { data: billingData, isLoading: billingLoading } = useAppointmentBilling(appointmentId, !!appointmentId);
  const { mutateAsync: saveBilling, isPending: isSaving } = useSaveBilling();

  const consultationService = useMemo(() => {
    return services.find(s => s.category?.toLowerCase() === 'consultation')
      || services.find(s => s.service_name.toLowerCase().includes('consultation'))
      || (services.length > 0 ? services[0] : null);
  }, [services]);

  const [consultationFee, setConsultationFee] = useState(0);
  const [extraItems, setExtraItems] = useState<ConsultationBillingItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [isDirty, setIsDirty] = useState(false);

  const defaultFee = billingData?.appointment?.consultationFee ?? 0;

  useEffect(() => {
    if (billingData?.payment?.billItems?.length) {
      const consult = billingData.payment.billItems.find(i => i.serviceName.toLowerCase().includes('consultation'));
      const others = billingData.payment.billItems.filter(i => !i.serviceName.toLowerCase().includes('consultation'));
      setConsultationFee(consult?.totalCost || 0);
      setExtraItems(others.map(i => ({ key: nextKey(), description: i.serviceName, amount: i.totalCost, serviceId: i.serviceId })));
      setDiscount(billingData.payment.discount || 0);
      setIsDirty(false);
    } else if (consultationFee === 0 && defaultFee > 0) {
      setConsultationFee(defaultFee);
      setIsDirty(true);
    }
  }, [billingData, defaultFee]);

  const total = useMemo(() => {
    const extras = extraItems.reduce((s, i) => s + (i.amount || 0), 0);
    return Math.max(0, consultationFee + extras - discount);
  }, [consultationFee, extraItems, discount]);

  const addExtra = useCallback(() => {
    setExtraItems(p => [...p, { key: nextKey(), description: '', amount: 0, serviceId: null }]);
    setIsDirty(true);
  }, []);

  const removeExtra = useCallback((key: string) => {
    setExtraItems(p => p.filter(i => i.key !== key));
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!appointmentId) return;
    const items = [];
    if (consultationFee > 0) {
      items.push({ serviceId: consultationService?.id ?? 1, quantity: 1, unitCost: consultationFee });
    }
    extraItems.forEach(i => {
      if (i.description.trim() && i.amount > 0) {
        items.push({
          serviceId: i.serviceId ?? services.find(s => s.service_name === i.description)?.id ?? consultationService?.id ?? 1,
          quantity: 1, unitCost: i.amount,
        });
      }
    });
    if (items.length === 0) return;
    await saveBilling({ appointmentId, billingItems: items, discount: discount > 0 ? discount : undefined });
    setIsDirty(false);
  }, [appointmentId, consultationFee, extraItems, discount, consultationService, services, saveBilling]);

  if (billingLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-5 w-5 animate-spin text-stone-300" />
      </div>
    );
  }

  const isEditable = !isReadOnly && billingData?.payment?.status !== 'PAID';

  return (
    <div className="p-5 lg:p-8 max-w-2xl mx-auto space-y-6">
      {/* Consultation Fee */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-stone-500">Consultation Fee</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">KSH</span>
          <Input
            type="number"
            disabled={!isEditable}
            value={consultationFee || ''}
            onChange={e => { setConsultationFee(parseFloat(e.target.value) || 0); setIsDirty(true); }}
            className="h-10 pl-12 text-right text-sm font-medium text-stone-900 border-stone-200 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>

      {/* Additional Items */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-stone-500">Additional Items</label>
        {extraItems.length === 0 ? (
          <div className="border border-dashed border-stone-200 rounded-lg py-4 text-center">
            <p className="text-xs text-stone-400 mb-2">No additional items</p>
            {isEditable && (
              <Button variant="ghost" size="sm" onClick={addExtra} className="h-7 text-xs text-stone-500">
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {extraItems.map(item => (
              <div key={item.key} className="flex items-center gap-2">
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={e => { setExtraItems(p => p.map(i => i.key === item.key ? { ...i, description: e.target.value } : i)); setIsDirty(true); }}
                  disabled={!isEditable}
                  className="h-9 text-sm flex-1 border-stone-200 rounded-lg"
                />
                <div className="relative w-32">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-stone-400">KSH</span>
                  <Input
                    type="number"
                    value={item.amount || ''}
                    onChange={e => { setExtraItems(p => p.map(i => i.key === item.key ? { ...i, amount: Math.max(0, parseFloat(e.target.value) || 0) } : i)); setIsDirty(true); }}
                    disabled={!isEditable}
                    className="h-9 pl-10 text-right text-sm border-stone-200 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                {isEditable && (
                  <button onClick={() => removeExtra(item.key)} className="p-1.5 text-stone-300 hover:text-stone-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {isEditable && (
              <Button variant="ghost" size="sm" onClick={addExtra} className="h-7 text-xs text-stone-500">
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Discount */}
      {isEditable && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-stone-500">Discount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">KSH</span>
            <Input
              type="number"
              value={discount || ''}
              onChange={e => { setDiscount(parseFloat(e.target.value) || 0); setIsDirty(true); }}
              className="h-9 pl-12 text-right text-sm border-stone-200 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>
      )}

      {/* Total + Save */}
      <div className="flex items-center justify-between pt-4 border-t border-stone-100">
        <div>
          <p className="text-xs text-stone-400">Total Due</p>
          <p className="text-xl font-bold text-stone-900 tabular-nums">KSH {total.toLocaleString()}</p>
        </div>
        {isEditable && (
          <Button
            onClick={handleSave}
            disabled={isSaving || !isDirty || (consultationFee <= 0 && extraItems.length === 0)}
            className="h-9 text-xs bg-stone-900 hover:bg-black"
          >
            {isSaving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving</> : <><Save className="h-3.5 w-3.5 mr-1.5" /> Save</>}
          </Button>
        )}
      </div>
    </div>
  );
}
