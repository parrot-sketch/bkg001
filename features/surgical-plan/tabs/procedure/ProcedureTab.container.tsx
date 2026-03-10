/**
 * Procedure Tab Container
 * 
 * Orchestration component that wires hook to view.
 */

'use client';

import { useProcedureTab } from './useProcedureTab';
import { ProcedureTabView } from './ProcedureTab.view';

interface ProcedureTabContainerProps {
  caseId: string;
}

export function ProcedureTabContainer({ caseId }: ProcedureTabContainerProps) {
  const hook = useProcedureTab(caseId);

  return (
    <ProcedureTabView
      procedureName={hook.localProcedureName}
      procedurePlan={hook.localProcedurePlan}
      isLoading={hook.isLoading}
      isSaving={hook.isSaving}
      error={hook.error}
      onProcedureNameChange={hook.setProcedureName}
      onProcedurePlanChange={hook.setProcedurePlan}
      onSave={hook.onSave}
      onRetry={() => hook.onReset()}
      canSave={hook.canSave}
      services={hook.services}
      servicesLoading={hook.servicesLoading}
    />
  );
}
