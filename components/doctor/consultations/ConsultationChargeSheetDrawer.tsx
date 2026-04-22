'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ChargeSheet } from '@/components/charge-sheet/ChargeSheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DollarSign } from 'lucide-react';

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
      <SheetContent side="right" className="flex w-full flex-col bg-white p-0 sm:max-w-[640px]">
        <SheetHeader className="border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <DollarSign className="h-4 w-4 text-slate-600" />
            </div>
            <SheetTitle className="text-base font-semibold">
              Charge Sheet
            </SheetTitle>
          </div>
        </SheetHeader>
        
        <ScrollArea className="flex-1">
          <div className="p-4">
            <ChargeSheet appointmentId={appointmentId} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
