'use client';

import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useChargeSheet } from '@/hooks/theater-tech/useChargeSheet';
import { ChargeSheetStepContent } from './ChargeSheetStepContent';

interface TheaterTechBillingProps {
  caseId: string;
}

export function TheaterTechBilling({ caseId }: TheaterTechBillingProps) {
  const cs = useChargeSheet(caseId);

  if (cs.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Charge Sheet</CardTitle>
        {cs.chargeItems.length > 0 && (
          <Button
            size="sm"
            onClick={cs.handleSave}
            disabled={cs.isSaving}
            className="h-8"
          >
            {cs.isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="ml-1">
              {cs.isSaving ? 'Saving…' : 'Save'}
            </span>
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <ChargeSheetStepContent
          cs={cs}
          emptyHint="Search and add services or inventory items"
        />
      </CardContent>
    </Card>
  );
}
