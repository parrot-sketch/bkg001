'use client';

import { Loader2, Save, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useChargeSheet } from '@/hooks/theater-tech/useChargeSheet';
import { ChargeSheetStepContent } from './ChargeSheetStepContent';

interface TheaterTechBillingSheetProps {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TheaterTechBillingSheet({ caseId, open, onOpenChange }: TheaterTechBillingSheetProps) {
  const cs = useChargeSheet(caseId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="bg-[#2c2e4b] text-white rounded-t-xl pb-4 pt-4 px-6 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-[#caa26a]" />
              <SheetTitle className="text-base font-semibold text-white">Charge Sheet</SheetTitle>
            </div>
            {cs.chargeItems.length > 0 && (
              <Button
                size="sm"
                onClick={cs.handleSave}
                disabled={cs.isSaving}
                className="bg-[#caa26a] hover:bg-[#b8913e] text-white font-bold shadow-sm h-8"
              >
                {cs.isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="ml-1.5">
                  {cs.isSaving ? 'Saving…' : 'Save Bill'}
                </span>
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {cs.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#caa26a]" />
            </div>
          ) : (
            <ChargeSheetStepContent
              cs={cs}
              emptyHint="Search and add services or inventory items to build the charge sheet"
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
