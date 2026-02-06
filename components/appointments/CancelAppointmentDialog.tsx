'use client';

/**
 * Cancel Appointment Dialog
 * 
 * Allows doctor to cancel an appointment with a reason
 */

import { useState } from 'react';
import { XCircle, Loader2, AlertTriangle } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAppointments } from '@/hooks/useAppointments';
import { toast } from 'sonner';

interface CancelAppointmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointmentId: number;
    onSuccess?: () => void;
}

export function CancelAppointmentDialog({
    open,
    onOpenChange,
    appointmentId,
    onSuccess,
}: CancelAppointmentDialogProps) {
    const [reason, setReason] = useState('');
    const { cancelAppointment, isCancelling } = useAppointments();

    const handleCancel = () => {
        if (!reason.trim()) {
            toast.error('Please provide a reason for cancellation');
            return;
        }

        cancelAppointment({
            appointmentId,
            reason,
        }, {
            onSuccess: () => {
                onOpenChange(false);
                setReason('');
                onSuccess?.(); // Trigger success callback
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <XCircle className="h-5 w-5" />
                        Cancel Appointment
                    </DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. The patient and frontdesk will be notified.
                    </DialogDescription>
                </DialogHeader>

                <Alert variant="destructive" className="my-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        Cancelling this appointment will free up the time slot and notify all parties.
                    </AlertDescription>
                </Alert>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="reason">
                            Reason for Cancellation <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="reason"
                            placeholder="Please explain why you're cancelling this appointment..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            This reason will be shared with the patient and frontdesk staff.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isCancelling}
                    >
                        Keep Appointment
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={isCancelling || !reason.trim()}
                    >
                        {isCancelling ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Cancelling...
                            </>
                        ) : (
                            <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel Appointment
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
