'use client';

/**
 * Confirm Appointment Dialog
 * 
 * Allows doctor to confirm a pending appointment
 */

import { useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAppointments } from '@/hooks/useAppointments';

interface ConfirmAppointmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointmentId: number;
    onSuccess?: () => void;
}

export function ConfirmAppointmentDialog({
    open,
    onOpenChange,
    appointmentId,
    onSuccess,
}: ConfirmAppointmentDialogProps) {
    const [notes, setNotes] = useState('');
    const { confirmAppointment, isConfirming } = useAppointments();

    const handleConfirm = () => {
        confirmAppointment(
            { appointmentId, notes },
            {
                onSuccess: () => {
                    onOpenChange(false);
                    setNotes('');
                    onSuccess?.(); // Trigger success callback
                },
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Confirm Appointment
                    </DialogTitle>
                    <DialogDescription>
                        Confirm this appointment to add it to your schedule. The patient will be notified.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Add any notes for this appointment..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isConfirming}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isConfirming}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {isConfirming ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Confirming...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Confirm Appointment
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
