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
      <SheetContent side="right" className="w-[95%] sm:max-w-[700px] p-0 flex flex-col bg-slate-50/50">
        <SheetHeader className="p-6 pb-4 bg-white border-b border-slate-200">
          <SheetTitle className="text-xl font-bold flex items-center justify-between">
            <span>Charge Sheet</span>
            <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">
              Consultation
            </span>
          </SheetTitle>
          <SheetDescription className="text-sm text-slate-500">
            Managing billing for {patientName}'s consultation.
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-full">
            <ChargeSheet 
              appointmentId={appointmentId} 
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
