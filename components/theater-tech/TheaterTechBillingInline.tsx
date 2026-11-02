'use client';

import { useState } from 'react';
import { Loader2, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useChargeSheet } from '@/hooks/theater-tech/useChargeSheet';
import { ChargeSheetPreview } from './ChargeSheetPreview';
import { ChargeSheetStepContent } from './ChargeSheetStepContent';

interface TheaterTechBillingInlineProps {
  caseId: string;
}

export function TheaterTechBillingInline({ caseId }: TheaterTechBillingInlineProps) {
  const cs = useChargeSheet(caseId);
  const [reviewing, setReviewing] = useState(false);

  if (cs.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#caa26a]" />
      </div>
    );
  }

  return (
    <Card className="border-[#e7d6bf] bg-white shadow-lg">
      <CardHeader className="bg-[#2c2e4b] text-white rounded-t-xl pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[#caa26a]" />
            <CardTitle className="text-base font-semibold text-white">Charge Sheet</CardTitle>
          </div>
          {cs.chargeItems.length > 0 && !reviewing && (
            <Button
              size="sm"
              onClick={() => setReviewing(true)}
              className="bg-[#caa26a] hover:bg-[#b8913e] text-white font-bold shadow-sm h-8"
            >
              Review bill
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {reviewing ? (
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
      </CardContent>
    </Card>
  );
}
