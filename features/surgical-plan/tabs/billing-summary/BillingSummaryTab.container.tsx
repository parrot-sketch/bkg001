/**
 * Billing Summary Tab Container
 * 
 * Orchestration component that wires hook to view.
 */

'use client';

import { useBillingSummaryTab } from './useBillingSummaryTab';
import { BillingSummaryTabView } from './BillingSummaryTab.view';

interface BillingSummaryTabContainerProps {
  caseId: string;
}

export function BillingSummaryTabContainer({ caseId }: BillingSummaryTabContainerProps) {
  const hook = useBillingSummaryTab(caseId);

  return (
    <BillingSummaryTabView
      viewModel={hook.viewModel}
      isLoading={hook.isLoading}
      error={hook.error}
      onRetry={hook.refetch}
    />
  );
}
