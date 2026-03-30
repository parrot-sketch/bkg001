/**
 * Team Tab Container
 * 
 * Container component for surgical team selection tab.
 * Loads data and passes to view component.
 */

'use client';

import { useSurgicalCasePlanPage } from '../../shared/hooks/useSurgicalCasePlanPage';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { TeamTabView } from './TeamTab.view';

interface TeamTabContainerProps {
  caseId: string;
  readOnly?: boolean;
}

export function TeamTabContainer({ caseId, readOnly = false }: TeamTabContainerProps) {
  const { isLoading, error, data, refetch } = useSurgicalCasePlanPage(caseId);

  if (isLoading) {
    return <LoadingState variant="minimal" />;
  }

  if (error || !data) {
    return <ErrorState error={error || 'Case not found'} onRetry={refetch} />;
  }

  return <TeamTabView data={data} readOnly={readOnly} />;
}
