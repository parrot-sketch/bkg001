'use client';

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { AvailabilitySettings } from '@/components/doctor/schedule/AvailabilitySettings';

interface ManageAvailabilitySheetProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userId: string;
    initialWorkingDays?: any[];
    initialSlotConfig?: any;
}

export function ManageAvailabilitySheet({
    open,
    onClose,
    onSuccess,
    userId,
    initialWorkingDays,
    initialSlotConfig,
}: ManageAvailabilitySheetProps) {
    return (
        <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
            <SheetContent className="w-full overflow-y-auto border-l border-[#e7d6bf] bg-white sm:max-w-xl md:max-w-2xl">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-[#2c2e4b]">Manage schedule & availability</SheetTitle>
                    <SheetDescription className="text-[#2c2e4b]/70">
                        Set your regular working hours, break times, and consultation slot durations.
                    </SheetDescription>
                </SheetHeader>

                {open && (
                    <AvailabilitySettings
                        userId={userId}
                        initialWorkingDays={initialWorkingDays}
                        initialSlotConfig={initialSlotConfig}
                        onSaved={() => {
                            onSuccess();
                            onClose();
                        }}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}
