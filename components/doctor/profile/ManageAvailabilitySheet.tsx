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
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>Manage Schedule & Availability</SheetTitle>
                    <SheetDescription>
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
