/**
 * Risk Factors Tab Container
 * 
 * Orchestration component that wires hook to view.
 */

'use client';

import { useRiskFactorsTab } from './useRiskFactorsTab';
import { RiskFactorsTabView } from './RiskFactorsTab.view';

interface RiskFactorsTabContainerProps {
  caseId: string;
  readOnly?: boolean;
}

export function RiskFactorsTabContainer({ caseId, readOnly = false }: RiskFactorsTabContainerProps) {
  const hook = useRiskFactorsTab(caseId);

  return (
    <RiskFactorsTabView
      riskFactors={hook.localRiskFactors}
      preOpNotes={hook.localPreOpNotes}
      isLoading={hook.isLoading}
      isSaving={hook.isSaving}
      error={hook.error}
      onRiskFactorsChange={hook.setRiskFactors}
      onPreOpNotesChange={hook.setPreOpNotes}
      onSave={hook.onSave}
      onRetry={() => hook.onReset()}
      onInsertTemplate={hook.onInsertTemplate}
      canSave={hook.canSave}
      showTemplateDialog={hook.showTemplateDialog}
      onTemplateDialogChange={hook.setShowTemplateDialog}
      readOnly={readOnly}
    />
  );
}
