/**
 * Overview Tab Container
 * 
 * Placeholder overview tab to validate registry wiring.
 * Displays basic case metadata.
 */

'use client';

import { useSurgicalCasePlanPage } from '../../shared/hooks/useSurgicalCasePlanPage';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { OverviewTabView } from './OverviewTab.view';

interface OverviewTabContainerProps {
  caseId: string;
}

export function OverviewTabContainer({ caseId }: OverviewTabContainerProps) {
  const { isLoading, error, data, refetch } = useSurgicalCasePlanPage(caseId);

  if (isLoading) {
    return <LoadingState variant="minimal" />;
  }

  if (error || !data) {
    return <ErrorState error={error || 'Case not found'} onRetry={refetch} />;
  }

  return <OverviewTabView data={data} />;
}
