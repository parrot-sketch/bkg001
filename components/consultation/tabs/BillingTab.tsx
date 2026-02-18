'use client';

/**
 * Billing Tab — Consultation Workspace
 * 
 * Purpose: Manage the consultation billing record.
 * 
 * Design principles:
 * - This is CONSULTATION billing only — not a general service catalog
 * - The doctor determines the fee (types description + amount in KSH)
 * - Simple, direct, no dropdown selections
 * - Uses the consultation service record in the DB as the FK anchor
 * - Frontdesk collects the payment from the patient
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Receipt,
  CheckCircle,
  AlertCircle,
  Loader2,
  Save,
  Plus,
  Trash2,
  Info,
  Banknote,
  Stethoscope,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useServices } from '@/hooks/useServices';
import { useAppointmentBilling, useSaveBilling } from '@/hooks/doctor/useBilling';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface ConsultationBillingItem {
  /** Internal key for React rendering */
  key: string;
  /** Service description typed by the doctor */
  description: string;
  /** Amount in KSH */
  amount: number;
  /** Linked service ID for DB FK (resolved automatically) */
  serviceId: number | null;
}

interface BillingTabProps {
  appointmentId?: number;
  isReadOnly?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

let keyCounter = 0;
function nextKey(): string {
  return `item-${Date.now()}-${++keyCounter}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BillingTab({ appointmentId, isReadOnly = false }: BillingTabProps) {
  const { services, loading: servicesLoading } = useServices();
  const { data: billingData, isLoading: billingLoading } = useAppointmentBilling(appointmentId, !!appointmentId);
  const { mutateAsync: saveBilling, isPending: isSaving } = useSaveBilling();

  // Find the consultation service
  const consultationService = useMemo(() => {
    const initial = services.find(s =>
      s.service_name.toLowerCase().includes('consultation') &&
      s.service_name.toLowerCase().includes('initial')
    );
    if (initial) return initial;

    const anyConsultation = services.find(s =>
      s.category?.toLowerCase() === 'consultation'
    );
    if (anyConsultation) return anyConsultation;

    return services.length > 0 ? services[0] : null;
  }, [services]);

  // Local state
  const [consultationFee, setConsultationFee] = useState<number>(0);
  const [extraItems, setExtraItems] = useState<ConsultationBillingItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [isDirty, setIsDirty] = useState(false);

  // Defaults from appointment data
  const defaultConsultationFee = billingData?.appointment?.consultationFee ?? 0;

  // Initialize from existing billing data
  useEffect(() => {
    if (billingData?.payment?.billItems && billingData.payment.billItems.length > 0) {
      // Find items that match the consultation service
      const consultationItems = billingData.payment.billItems.filter(item =>
        item.serviceName.toLowerCase().includes('consultation')
      );

      const otherItems = billingData.payment.billItems.filter(item =>
        !item.serviceName.toLowerCase().includes('consultation')
      );

      if (consultationItems.length > 0) {
        setConsultationFee(consultationItems[0].totalCost);
      } else {
        setConsultationFee(0);
      }

      setExtraItems(
        otherItems.map(item => ({
          key: nextKey(),
          description: item.serviceName,
          amount: item.totalCost,
          serviceId: item.serviceId,
        }))
      );
      setDiscount(billingData.payment.discount || 0);
      setIsDirty(false);
    } else if (consultationFee === 0 && defaultConsultationFee > 0) {
      setConsultationFee(defaultConsultationFee);
      setIsDirty(true);
    }
  }, [billingData, defaultConsultationFee]);

  // Calculations
  const subtotal = useMemo(() => {
    const extras = extraItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    return consultationFee + extras;
  }, [consultationFee, extraItems]);

  const total = Math.max(0, subtotal - discount);

  // ── Actions ──

  const addExtraItem = useCallback(() => {
    setExtraItems(prev => [
      ...prev,
      {
        key: nextKey(),
        description: '',
        amount: 0,
        serviceId: null,
      },
    ]);
    setIsDirty(true);
  }, []);

  const removeExtraItem = useCallback((key: string) => {
    setExtraItems(prev => prev.filter(item => item.key !== key));
    setIsDirty(true);
  }, []);

  const updateExtraDescription = useCallback((key: string, description: string) => {
    setExtraItems(prev => prev.map(item =>
      item.key === key ? { ...item, description } : item
    ));
    setIsDirty(true);
  }, []);

  const updateExtraAmount = useCallback((key: string, amount: number) => {
    setExtraItems(prev => prev.map(item =>
      item.key === key ? { ...item, amount: Math.max(0, amount) } : item
    ));
    setIsDirty(true);
  }, []);

  // Save billing
  const handleSave = useCallback(async () => {
    if (!appointmentId) return;

    const billingItems = [];

    // Add primary consultation fee
    if (consultationFee > 0) {
      billingItems.push({
        serviceId: consultationService?.id ?? 1,
        quantity: 1,
        unitCost: consultationFee,
      });
    }

    // Add extra items
    extraItems.forEach(item => {
      if (item.description.trim() && item.amount > 0) {
        billingItems.push({
          serviceId: item.serviceId ?? (services.find(s => s.service_name === item.description)?.id ?? consultationService?.id ?? 1),
          quantity: 1,
          unitCost: item.amount,
        });
      }
    });

    if (billingItems.length === 0) return;

    await saveBilling({
      appointmentId,
      billingItems,
      discount: discount > 0 ? discount : undefined,
    });

    setIsDirty(false);
  }, [appointmentId, consultationFee, extraItems, discount, consultationService, services, saveBilling]);

  // ── Loading ──
  if (billingLoading || servicesLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8 bg-white/50">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Synchronizing billing records…</p>
        </div>
      </div>
    );
  }

  const isPaid = billingData?.payment?.status === 'PAID';
  const isPartiallyPaid = billingData?.payment?.status === 'PART';
  const isEditable = !isReadOnly && !isPaid;

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto space-y-8">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Receipt className="h-4 w-4 text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Clinical Billing</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium opacity-70">
            Define consultation fees and additional services. Records sync with Frontdesk.
          </p>
        </div>
        {billingData?.payment && (
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border-2',
              isPaid
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm'
                : isPartiallyPaid
                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                  : 'bg-slate-50 text-slate-500 border-slate-100',
            )}
          >
            {isPaid ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-3 w-3" /> Settlement Complete
              </span>
            ) : isPartiallyPaid ? 'Partial Settlement' : 'Pending Settlement'}
          </Badge>
        )}
      </div>

      {/* ─── Primary Billing Core ─── */}
      <div className="grid gap-6">
        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consultation Fee</span>
            <Stethoscope className="h-3.5 w-3.5 text-slate-300" />
          </div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">Standard Consultation</p>
                <p className="text-xs text-slate-400 font-medium leading-relaxed italic opacity-60">
                  Primary medical consultation record for this session.
                </p>
              </div>
              <div className="relative w-full md:w-48">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">KSH</span>
                <Input
                  type="number"
                  disabled={!isEditable}
                  value={consultationFee || ''}
                  onChange={e => {
                    setConsultationFee(parseFloat(e.target.value) || 0);
                    setIsDirty(true);
                  }}
                  className="h-14 pl-14 text-right pr-6 text-xl font-bold text-slate-900 bg-slate-50/50 border-slate-200 rounded-2xl focus:bg-white transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Additional Items ─── */}
        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Additional Services</span>
            <Plus className="h-3.5 w-3.5 text-slate-300" />
          </div>

          <div className="divide-y divide-slate-100">
            {extraItems.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto">
                  <Plus className="h-5 w-5 text-slate-300" />
                </div>
                <p className="text-xs text-slate-400 font-medium italic opacity-60">No additional services recorded.</p>
                {isEditable && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={addExtraItem}
                    className="text-indigo-600 text-[10px] font-bold uppercase tracking-wider"
                  >
                    Add Procedure / Item
                  </Button>
                )}
              </div>
            ) : (
              extraItems.map((item) => (
                <div key={item.key} className="p-4 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center gap-4 group">
                  <div className="flex-1">
                    {isEditable ? (
                      <Input
                        placeholder="Service description (e.g. Suture, Injection)"
                        value={item.description}
                        onChange={(e) => updateExtraDescription(item.key, e.target.value)}
                        className="h-11 bg-white border-slate-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      />
                    ) : (
                      <span className="text-sm font-bold text-slate-800">{item.description}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-40">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">KSH</span>
                      <Input
                        type="number"
                        disabled={!isEditable}
                        value={item.amount || ''}
                        onChange={(e) => updateExtraAmount(item.key, parseFloat(e.target.value) || 0)}
                        className="h-11 pl-11 text-right text-sm font-bold text-slate-700 bg-slate-50/50 border-slate-200 rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    {isEditable && (
                      <button
                        onClick={() => removeExtraItem(item.key)}
                        className="p-2.5 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}

            {isEditable && extraItems.length > 0 && (
              <div className="px-6 py-3 bg-slate-50/50">
                <button
                  onClick={addExtraItem}
                  className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 uppercase tracking-wider hover:text-indigo-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Another Item
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Totals & Configuration ─── */}
      <div className="bg-slate-900 rounded-[28px] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Banknote className="h-32 w-32" />
        </div>

        <div className="relative z-10 grid gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold tracking-tight">Financial Summary</h3>
              <p className="text-xs text-white/40 font-medium">Final adjustment and total calculation</p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1">Subtotal</p>
                <p className="text-sm font-bold">KSH {subtotal.toLocaleString()}</p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Medical Discount</p>
                <div className="relative w-40">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-white/20">KSH</span>
                  <Input
                    type="number"
                    disabled={!isEditable}
                    value={discount || ''}
                    onChange={e => {
                      setDiscount(parseFloat(e.target.value) || 0);
                      setIsDirty(true);
                    }}
                    className="h-9 pl-10 text-right text-sm font-bold bg-white/5 border-white/10 text-emerald-400 focus:bg-white/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-1">Total Due</p>
              <p className="text-4xl font-bold text-white">
                KSH {total.toLocaleString()}
              </p>
            </div>

            {isEditable && (
              <div className="flex flex-col items-end gap-3">
                <AnimatePresence>
                  {isDirty && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-500 rounded-full text-[9px] font-bold uppercase tracking-wider border border-amber-500/30"
                    >
                      <AlertCircle className="h-3 w-3" /> Still Pending Save
                    </motion.div>
                  )}
                </AnimatePresence>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !isDirty || (consultationFee <= 0 && extraItems.length === 0)}
                  className="h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-10 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 uppercase tracking-wider text-xs border-none"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving Records
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" /> Commit Billing
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
        <Info className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-500 font-medium leading-relaxed italic opacity-60">
          Billing details are synced instantly with the hospital's central financial registry.
          Frontdesk staff will utilize these records for patient discharge and payment collection.
        </p>
      </div>
    </div>
  );
}
