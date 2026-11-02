'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useChargeSheet } from '@/hooks/theater-tech/useChargeSheet';
import { ChargeSheetPreview } from './ChargeSheetPreview';
import { ChargeSheetStepContent } from './ChargeSheetStepContent';
import type { Service } from '@/components/theater-tech/charge-sheet.types';

interface TheaterTechBillingSheetProps {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedServices?: Service[];
}

export function TheaterTechBillingSheet({ caseId, open, onOpenChange, suggestedServices }: TheaterTechBillingSheetProps) {
  const cs = useChargeSheet(caseId, suggestedServices);
  const [reviewing, setReviewing] = useState(false);

  const close = (next: boolean) => {
    if (!next) setReviewing(false);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-none p-0 sm:max-w-3xl sm:rounded-none">
        <DialogHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b border-border px-6 py-4 pr-12 text-left">
          <div>
            <DialogTitle className="text-primary">{reviewing ? 'Review bill' : 'Charge sheet'}</DialogTitle>
            <DialogDescription>
              {reviewing ? 'Check every line and the total, then save.' : 'Add or change lines, then review the bill.'}
            </DialogDescription>
          </div>
          {!reviewing && cs.chargeItems.length > 0 && (
            <Button size="sm" onClick={() => setReviewing(true)} disabled={cs.isLoading} className="shrink-0 rounded-none">
              Review bill
            </Button>
          )}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {cs.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : reviewing ? (
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
          ) : (
            <ChargeSheetStepContent cs={cs} emptyHint="No lines on this bill yet." />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
