'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ChargeSheet } from '@/components/charge-sheet/ChargeSheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BadgeDollarSign } from 'lucide-react';

interface ConsultationChargeSheetDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: number;
  patientName: string;
}

export function ConsultationChargeSheetDrawer({
  open,
  onOpenChange,
  appointmentId,
  patientName,
}: ConsultationChargeSheetDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col bg-slate-50 p-0 sm:max-w-[760px] lg:max-w-[980px]">
        <SheetHeader className="border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
              <BadgeDollarSign className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="flex flex-wrap items-center gap-3 text-xl font-semibold tracking-tight text-slate-900">
                <span>Charge Sheet</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Consultation
                </span>
              </SheetTitle>
              <SheetDescription className="mt-1 text-sm text-slate-500">
                Review and update billing for {patientName}&rsquo;s consultation. Price edits apply to this charge sheet only.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        
        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-5 lg:p-6">
            <ChargeSheet 
              appointmentId={appointmentId} 
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
