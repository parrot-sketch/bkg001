'use client';

/**
 * ChargeSheetStep
 *
 * A wrapper designed to live inside the 3-step SurgicalCasePlanForm.
 * It strips the Card wrapper (the form card provides the outer chrome)
 * and exposes the same billing UX via shared sub-components.
 */

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChargeSheet } from '@/hooks/theater-tech/useChargeSheet';
import { ChargeSheetPreview } from './ChargeSheetPreview';
import { ChargeSheetStepContent } from './ChargeSheetStepContent';

interface Props {
  caseId: string;
}

export function ChargeSheetStep({ caseId }: Props) {
  const cs = useChargeSheet(caseId);
  const [reviewing, setReviewing] = useState(false);

  if (cs.isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (reviewing) {
    return (
      <ChargeSheetPreview
        items={cs.chargeItems}
        subtotal={cs.subtotal}
        discount={cs.discount}
        total={cs.total}
        caseInfo={cs.caseInfo}
        saving={cs.isSaving}
        onBack={() => setReviewing(false)}
        onSave={() => {
          void cs.handleSave();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <ChargeSheetStepContent cs={cs} />

      {cs.chargeItems.length > 0 && (
        <div className="flex justify-end pt-1">
          <Button size="sm" onClick={() => setReviewing(true)} className="h-8 rounded-none">
            Review bill
          </Button>
        </div>
      )}
    </div>
  );
}
