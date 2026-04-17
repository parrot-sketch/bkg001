'use client';

/**
 * ChargeSheetStep
 *
 * A wrapper designed to live inside the 3-step SurgicalCasePlanForm.
 * It strips the Card wrapper (the form card provides the outer chrome)
 * and exposes the same billing UX via shared sub-components.
 */

import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChargeSheet } from '@/hooks/theater-tech/useChargeSheet';
import { ChargeSheetStepContent } from './ChargeSheetStepContent';

interface Props {
  caseId: string;
}

export function ChargeSheetStep({ caseId }: Props) {
  const cs = useChargeSheet(caseId);

  if (cs.isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ChargeSheetStepContent cs={cs} />

      {/* Save button (standalone usage) */}
      {cs.chargeItems.length > 0 && (
        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            variant={cs.isDirty ? 'default' : 'outline'}
            onClick={cs.handleSave}
            disabled={cs.isSaving}
            className="h-8"
          >
            {cs.isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {cs.isSaving ? 'Saving…' : cs.isDirty ? 'Save Charges' : 'Saved'}
          </Button>
        </div>
      )}
    </div>
  );
}
