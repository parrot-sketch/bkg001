/**
 * Billing Estimate Tab Container
 * 
 * Orchestrates the data hook and the view component for the Billing Estimate tab.
 */
'use client';

import { useBillingEstimateTab } from './useBillingEstimateTab';
import { BillingEstimateTabView } from './BillingEstimateTab.view';

interface BillingEstimateTabContainerProps {
  caseId: string;
  readOnly?: boolean;
}

export function BillingEstimateTabContainer({ caseId, readOnly = false }: BillingEstimateTabContainerProps) {
  const hook = useBillingEstimateTab(caseId);

  return (
    <BillingEstimateTabView
      surgeonFee={hook.surgeonFee}
      anaesthesiologistFee={hook.anaesthesiologistFee}
      theatreFee={hook.theatreFee}
      subtotal={hook.subtotal}
      lineItems={hook.lineItems}
      lineItemsTotal={hook.lineItemsTotal}
      totalEstimate={hook.totalEstimate}
      onSurgeonFeeChange={hook.setSurgeonFee}
      onAnaesthesiologistFeeChange={hook.setAnaesthesiologistFee}
      onTheatreFeeChange={hook.setTheatreFee}
      isDirty={hook.isDirty}
      isSaving={hook.isSaving}
      isLoading={hook.isLoading}
      error={hook.error}
      canEdit={!readOnly && hook.canEdit}
      onSave={hook.onSave}
    />
  );
}
