/**
 * Used Items Tab Container
 * 
 * Orchestration component that wires hook to view.
 */

'use client';

import { useUsedItemsTab } from './useUsedItemsTab';
import { UsedItemsTabView } from './UsedItemsTab.view';

interface UsedItemsTabContainerProps {
  caseId: string;
}

export function UsedItemsTabContainer({ caseId }: UsedItemsTabContainerProps) {
  const hook = useUsedItemsTab(caseId);

  return (
    <UsedItemsTabView
      viewModel={hook.viewModel}
      isLoading={hook.isLoading}
      error={hook.error}
      onRetry={hook.refetch}
    />
  );
}
