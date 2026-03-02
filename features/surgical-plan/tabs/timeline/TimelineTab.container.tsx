/**
 * Timeline Tab Container
 * 
 * Orchestration component that wires hook to view.
 */

'use client';

import { useTimelineTab } from './useTimelineTab';
import { TimelineTabView } from './TimelineTab.view';

interface TimelineTabContainerProps {
  caseId: string;
}

export function TimelineTabContainer({ caseId }: TimelineTabContainerProps) {
  const hook = useTimelineTab(caseId);

  return (
    <TimelineTabView
      viewModel={hook.viewModel}
      isLoading={hook.isLoading}
      error={hook.error}
      onRetry={hook.refetch}
    />
  );
}
