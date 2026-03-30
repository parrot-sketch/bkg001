/**
 * Overview Tab Container
 * 
 * Container component for overview tab.
 * Loads data and passes to view component.
 */

'use client';

import { useSurgicalCasePlanPage } from '../../shared/hooks/useSurgicalCasePlanPage';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { OverviewTabView } from './OverviewTab.view';

interface OverviewTabContainerProps {
  caseId: string;
  readOnly?: boolean;
}

export function OverviewTabContainer({ caseId, readOnly = false }: OverviewTabContainerProps) {
  const { isLoading, error, data, refetch } = useSurgicalCasePlanPage(caseId);

  if (isLoading) {
    return <LoadingState variant="minimal" />;
  }

  if (error || !data) {
    return <ErrorState error={error || 'Case not found'} onRetry={refetch} />;
  }

  return <OverviewTabView data={data} readOnly={readOnly} />;
}
