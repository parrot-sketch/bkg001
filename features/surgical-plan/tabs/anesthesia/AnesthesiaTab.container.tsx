/**
 * Anesthesia Tab Container
 * 
 * Orchestration component that wires hook to view.
 */

'use client';

import { useAnesthesiaTab } from './useAnesthesiaTab';
import { AnesthesiaTabView } from './AnesthesiaTab.view';

interface AnesthesiaTabContainerProps {
  caseId: string;
  readOnly?: boolean;
}

export function AnesthesiaTabContainer({ caseId, readOnly = false }: AnesthesiaTabContainerProps) {
  const hook = useAnesthesiaTab(caseId);

  return (
    <AnesthesiaTabView
      anesthesiaPlan={hook.localAnesthesiaPlan}
      specialInstructions={hook.localSpecialInstructions}
      estimatedDurationMinutes={hook.localEstimatedDurationMinutes}
      isLoading={hook.isLoading}
      isSaving={hook.isSaving}
      error={hook.error}
      onAnesthesiaPlanChange={hook.setAnesthesiaPlan}
      onSpecialInstructionsChange={hook.setSpecialInstructions}
      onEstimatedDurationMinutesChange={hook.setEstimatedDurationMinutes}
      onSave={hook.onSave}
      onRetry={() => hook.onReset()}
      canSave={hook.canSave}
      readOnly={readOnly}
    />
  );
}
