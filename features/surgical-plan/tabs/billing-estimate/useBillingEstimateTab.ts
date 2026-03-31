/**
 * Hook: useBillingEstimateTab
 * 
 * Logic to handle the pre-operative billing estimate fees.
 * Hooks into the new saveBillingEstimate server action.
 */
import { useState, useCallback, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import { useSurgicalCasePlanPage } from '../../shared/hooks/useSurgicalCasePlanPage';
import { saveBillingEstimate } from '@/actions/doctor/surgical-plan';
import { BillingEstimateStatus } from '@prisma/client';
import type { BillingEstimateViewModel, BillingLineItem } from '../../core/types';

export function useBillingEstimateTab(caseId: string) {
  const { data, isLoading, error, canEdit } = useSurgicalCasePlanPage(caseId);
  
  const billingEstimate = data?.billingEstimate ?? null;

  const [surgeonFee, setSurgeonFee] = useState<number>(0);
  const [anaesthesiologistFee, setAnaesthesiologistFee] = useState<number>(0);
  const [theatreFee, setTheatreFee] = useState<number>(0);

  const [isPending, startTransition] = useTransition();

  // Initialize state when data loads
  useEffect(() => {
    if (billingEstimate) {
      setSurgeonFee(billingEstimate.surgeonFee ?? 0);
      setAnaesthesiologistFee(billingEstimate.anaesthesiologistFee ?? 0);
      setTheatreFee(billingEstimate.theatreFee ?? 0);
    }
  }, [billingEstimate]);

  const isDirty = 
    (billingEstimate?.surgeonFee ?? 0) !== surgeonFee ||
    (billingEstimate?.anaesthesiologistFee ?? 0) !== anaesthesiologistFee ||
    (billingEstimate?.theatreFee ?? 0) !== theatreFee;

  const handleSave = useCallback(() => {
    if (!canEdit) return;

    startTransition(async () => {
      const result = await saveBillingEstimate(caseId, {
        surgeonFee,
        anaesthesiologistFee,
        theatreFee,
      });

      if (result.success) {
        toast.success(result.msg);
      } else {
        toast.error(result.msg);
        // Reset to last known good state
        setSurgeonFee(billingEstimate?.surgeonFee ?? 0);
        setAnaesthesiologistFee(billingEstimate?.anaesthesiologistFee ?? 0);
        setTheatreFee(billingEstimate?.theatreFee ?? 0);
      }
    });
  }, [caseId, surgeonFee, anaesthesiologistFee, theatreFee, canEdit, billingEstimate]);

  const lineItems = billingEstimate?.lineItems ?? [];
  const lineItemsTotal = lineItems.reduce((acc: number, item: BillingLineItem) => acc + item.totalPrice, 0);
  const totalEstimate = surgeonFee + anaesthesiologistFee + theatreFee + lineItemsTotal;

  return {
    surgeonFee,
    anaesthesiologistFee,
    theatreFee,
    subtotal: surgeonFee + anaesthesiologistFee + theatreFee,
    lineItems,
    lineItemsTotal,
    totalEstimate,
    setSurgeonFee,
    setAnaesthesiologistFee,
    setTheatreFee,
    isDirty,
    isSaving: isPending,
    isLoading,
    error: error as Error | null,
    canEdit,
    onSave: handleSave,
  };
}
