'use client';

import { CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChargeSheet } from '@/hooks/theater-tech/useChargeSheet';
import { ChargeSheetStepContent } from '@/components/theater-tech/ChargeSheetStepContent';

export interface ChargeSheetStepWrapperProps {
  caseId: string;
  onBack: () => void;
  onFinalize: () => void;
  finishLabel?: string;
  suggestedServices?: Array<{ id: number; service_name: string; price: number }>;
}

export function ChargeSheetStepWrapper({
  caseId,
  onBack,
  onFinalize,
  finishLabel = 'Finish',
  suggestedServices,
}: ChargeSheetStepWrapperProps) {
  const cs = useChargeSheet(caseId, suggestedServices);

  const handleBack = async () => {
    if (cs.isDirty && cs.chargeItems.length > 0) {
      const ok = window.confirm('You have unsaved charges. Go back without saving?');
      if (!ok) return;
    }
    onBack();
  };

  const handleFinish = async () => {
    // If user has added charges and they are dirty, save first to reduce errors.
    if (cs.chargeItems.length > 0 && cs.isDirty) {
      const saved = await cs.handleSave();
      if (!saved) return;
    }
    onFinalize();
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-slate-500">
          Add services and inventory items to the charge sheet. You can also
          skip this and add charges later from the case plan.
        </p>
      </div>

      {/* Banner: services auto-populated from procedures */}
      {cs.suggestedCount > 0 && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-700">
            <span className="font-semibold">{cs.suggestedCount} service{cs.suggestedCount !== 1 ? 's' : ''} pre-filled</span>
            {' '}from your selected procedures — review and adjust as needed
          </p>
        </div>
      )}

      <ChargeSheetStepContent cs={cs} />

      <div className="sticky bottom-0 -mx-4 md:mx-0 pt-3 pb-4 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-t border-slate-200 px-4 md:px-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" onClick={handleBack} className="sm:w-auto">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 sm:justify-end">
            {cs.chargeItems.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-500 sm:order-1">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    cs.isDirty ? 'bg-amber-400' : 'bg-emerald-500',
                  )}
                />
                <span className="font-medium">
                  {cs.isDirty ? 'Unsaved changes' : 'Charges saved'}
                </span>
              </div>
            )}

            <Button
              onClick={handleFinish}
              disabled={cs.isSaving}
              className="sm:order-2"
            >
              {cs.isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {cs.chargeItems.length > 0 && cs.isDirty ? 'Save & Finish' : finishLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
