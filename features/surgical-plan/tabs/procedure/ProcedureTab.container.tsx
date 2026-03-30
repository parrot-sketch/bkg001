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
  readOnly?: boolean;
}

export function ProcedureTabContainer({ caseId, readOnly = false }: ProcedureTabContainerProps) {
  const hook = useProcedureTab(caseId);

  return (
    <ProcedureTabView
      caseId={caseId}
      procedureName={hook.localProcedureName}
      procedurePlan={hook.localProcedurePlan}
      equipmentNotes={hook.localEquipmentNotes}
      patientPositioning={hook.localPatientPositioning}
      surgeonNarrative={hook.localSurgeonNarrative}
      postOpInstructions={hook.localPostOpInstructions}
      
      isLoading={hook.isLoading}
      isSaving={hook.isSaving}
      error={hook.error}
      
      onProcedureNameChange={hook.setProcedureName}
      onProcedurePlanChange={hook.setProcedurePlan}
      onEquipmentNotesChange={hook.setEquipmentNotes}
      onPatientPositioningChange={hook.setPatientPositioning}
      onSurgeonNarrativeChange={hook.setSurgeonNarrative}
      onPostOpInstructionsChange={hook.setPostOpInstructions}
      
      onSave={hook.onSave}
      onRetry={() => hook.onReset()}
      canSave={hook.canSave}
      readOnly={readOnly}
      services={hook.services}
      servicesLoading={hook.servicesLoading}
    />
  );
}
