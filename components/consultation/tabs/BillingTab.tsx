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
} from 'lucide-react';
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

  // Find the consultation service (used as the DB FK anchor)
  const consultationService = useMemo(() => {
    // Prefer "Consultation - Initial", fallback to any service with category "Consultation"
    const initial = services.find(s =>
      s.service_name.toLowerCase().includes('consultation') &&
      s.service_name.toLowerCase().includes('initial')
    );
    if (initial) return initial;

    const anyConsultation = services.find(s =>
      s.category?.toLowerCase() === 'consultation'
    );
    if (anyConsultation) return anyConsultation;

    // Last resort: first active service
    return services.length > 0 ? services[0] : null;
  }, [services]);

  // Local state
  const [items, setItems] = useState<ConsultationBillingItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [isDirty, setIsDirty] = useState(false);

  // Defaults from appointment data
  const defaultConsultationFee = billingData?.appointment?.consultationFee ?? 0;

  // Initialize from existing billing data or set default
  useEffect(() => {
    if (billingData?.payment?.billItems && billingData.payment.billItems.length > 0) {
      setItems(
        billingData.payment.billItems.map(item => ({
          key: nextKey(),
          description: item.serviceName,
          amount: item.totalCost,
          serviceId: item.serviceId,
        }))
      );
      setDiscount(billingData.payment.discount || 0);
      setIsDirty(false);
    } else if (items.length === 0 && consultationService && defaultConsultationFee > 0) {
      // Auto-populate with doctor's default consultation fee
      setItems([{
        key: nextKey(),
        description: 'Consultation Fee',
        amount: defaultConsultationFee,
        serviceId: consultationService.id,
      }]);
      setIsDirty(true);
    }
  }, [billingData, consultationService, defaultConsultationFee]);

  // Calculations
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.amount || 0), 0),
    [items]
  );
  const total = Math.max(0, subtotal - discount);

  // ── Actions ──

  const addItem = useCallback(() => {
    setItems(prev => [
      ...prev,
      {
        key: nextKey(),
        description: '',
        amount: 0,
        serviceId: consultationService?.id ?? null,
      },
    ]);
    setIsDirty(true);
  }, [consultationService]);

  const removeItem = useCallback((key: string) => {
    setItems(prev => prev.filter(item => item.key !== key));
    setIsDirty(true);
  }, []);

  const updateDescription = useCallback((key: string, description: string) => {
    setItems(prev => prev.map(item =>
      item.key === key ? { ...item, description } : item
    ));
    setIsDirty(true);
  }, []);

  const updateAmount = useCallback((key: string, amount: number) => {
    setItems(prev => prev.map(item =>
      item.key === key ? { ...item, amount: Math.max(0, amount) } : item
    ));
    setIsDirty(true);
  }, []);

  // Save billing
  const handleSave = useCallback(async () => {
    if (!appointmentId) return;

    // Filter out empty items
    const validItems = items.filter(item => item.description.trim() && item.amount > 0);
    if (validItems.length === 0) return;

    // Map to API format — use the consultation service ID for the FK
    const fallbackServiceId = consultationService?.id ?? 1;

    await saveBilling({
      appointmentId,
      billingItems: validItems.map(item => ({
        serviceId: item.serviceId ?? fallbackServiceId,
        quantity: 1,
        unitCost: item.amount,
      })),
      discount: discount > 0 ? discount : undefined,
    });

    setIsDirty(false);
  }, [appointmentId, items, discount, consultationService, saveBilling]);

  // ── Loading ──
  if (billingLoading || servicesLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300 mx-auto" />
          <p className="text-sm text-slate-500">Loading billing…</p>
        </div>
      </div>
    );
  }

  const isPaid = billingData?.payment?.status === 'PAID';
  const isPartiallyPaid = billingData?.payment?.status === 'PART';
  const isEditable = !isReadOnly && !isPaid;

  return (
    <div className="p-5 lg:p-6 max-w-3xl mx-auto space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Consultation Billing</h2>
          </div>
          <p className="text-xs text-slate-500 ml-6">
            Set the fee for this consultation. Frontdesk will collect payment.
          </p>
        </div>
        {billingData?.payment && (
          <Badge
            variant="outline"
            className={cn(
              'text-[11px] font-semibold px-2.5 py-1',
              isPaid
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isPartiallyPaid
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200',
            )}
          >
            {isPaid ? (
              <><CheckCircle className="h-3 w-3 mr-1" />Paid</>
            ) : isPartiallyPaid ? 'Partially Paid' : 'Unpaid'}
          </Badge>
        )}
      </div>

      {/* ─── Paid notice ─── */}
      {isPaid && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800">Payment Complete</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Receipt: {billingData?.payment?.receiptNumber || 'Pending'}
            </p>
          </div>
        </div>
      )}

      {/* ─── Billing Items ─── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_160px_40px] gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Description</span>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Amount (KSH)</span>
          <span />
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="text-center py-10 px-4">
            <Banknote className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">No billing items</p>
            <p className="text-xs text-slate-400 mt-1">
              Add a consultation fee below
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div
                key={item.key}
                className="grid grid-cols-[1fr_160px_40px] gap-3 px-4 py-3 items-center group"
              >
                {/* Description */}
                {isEditable ? (
                  <Input
                    value={item.description}
                    onChange={(e) => updateDescription(item.key, e.target.value)}
                    placeholder="e.g. Consultation Fee"
                    className="h-9 text-sm border-slate-200 bg-white focus:ring-1 focus:ring-slate-300"
                  />
                ) : (
                  <span className="text-sm font-medium text-slate-800">{item.description}</span>
                )}

                {/* Amount */}
                {isEditable ? (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                      KSH
                    </span>
                    <Input
                      type="number"
                      min={0}
                      value={item.amount || ''}
                      onChange={(e) => updateAmount(item.key, parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="h-9 text-sm text-right pl-12 border-slate-200 bg-white focus:ring-1 focus:ring-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-slate-900 text-right">
                    {item.amount.toLocaleString()}
                  </span>
                )}

                {/* Remove */}
                {isEditable ? (
                  <button
                    onClick={() => removeItem(item.key)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add item button */}
        {isEditable && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={addItem}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add line item
            </button>
          </div>
        )}

        {/* ─── Totals ─── */}
        {items.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50/30 px-4 py-4 space-y-2.5">
            {/* Subtotal (only show if more than 1 item or discount) */}
            {(items.length > 1 || discount > 0) && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-700">
                  KSH {subtotal.toLocaleString()}
                </span>
              </div>
            )}

            {/* Discount */}
            {(discount > 0 || isEditable) && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Discount</span>
                {isEditable ? (
                  <div className="relative w-36">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                      KSH
                    </span>
                    <Input
                      type="number"
                      min={0}
                      max={subtotal}
                      value={discount || ''}
                      onChange={e => {
                        setDiscount(parseFloat(e.target.value) || 0);
                        setIsDirty(true);
                      }}
                      className="h-8 text-sm text-right pl-12 border-slate-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                ) : (
                  <span className="text-emerald-600 font-medium">
                    {discount > 0 ? `- KSH ${discount.toLocaleString()}` : '—'}
                  </span>
                )}
              </div>
            )}

            {/* Already paid (partial) */}
            {isPartiallyPaid && billingData?.payment?.amountPaid && billingData.payment.amountPaid > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Amount Paid</span>
                <span className="text-emerald-600 font-medium">
                  - KSH {billingData.payment.amountPaid.toLocaleString()}
                </span>
              </div>
            )}

            {/* Total */}
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-200">
              <span className="text-sm font-bold text-slate-900">Total Due</span>
              <span className="text-lg font-bold text-slate-900">
                KSH {total.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Save Button ─── */}
      {isEditable && items.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDirty && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" />
                Unsaved changes
              </div>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || !isDirty || items.every(i => !i.description.trim() || i.amount <= 0)}
            size="sm"
            className="gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-5"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Billing
              </>
            )}
          </Button>
        </div>
      )}

      {/* ─── Info notice ─── */}
      {!isPaid && (
        <div className="flex items-start gap-2.5 p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-blue-700">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Once saved, this bill will appear in the frontdesk billing queue.
            Frontdesk staff will collect payment from the patient.
          </span>
        </div>
      )}
    </div>
  );
}
