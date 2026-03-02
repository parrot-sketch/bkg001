/**
 * Usage Variance Tab Container
 * 
 * Orchestration component that wires hook to view.
 */

'use client';

import { useUsageVarianceTab } from './useUsageVarianceTab';
import { UsageVarianceTabView } from './UsageVarianceTab.view';

interface UsageVarianceTabContainerProps {
  caseId: string;
}

export function UsageVarianceTabContainer({ caseId }: UsageVarianceTabContainerProps) {
  const hook = useUsageVarianceTab(caseId);

  return (
    <UsageVarianceTabView
      viewModel={hook.viewModel}
      isLoading={hook.isLoading}
      error={hook.error}
      onRetry={hook.refetch}
    />
  );
}
