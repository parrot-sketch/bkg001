'use client';

/**
 * Reschedule Dialog
 * 
 * Allows doctor to suggest a reschedule for an appointment
 */

import { useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
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
import { Calendar } from '@/components/ui/calendar';
import { useAppointments } from '@/hooks/useAppointments';
import { toast } from 'sonner';

interface RescheduleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointment: any;
    onSuccess?: () => void;
}

export function RescheduleDialog({
    open,
    onOpenChange,
    appointment,
    onSuccess,
}: RescheduleDialogProps) {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [selectedTime, setSelectedTime] = useState('');
    const [reason, setReason] = useState('');
    const { rescheduleAppointment, isRescheduling } = useAppointments();

    const handleReschedule = () => {
        if (!selectedDate || !selectedTime) {
            toast.error('Please select both date and time');
            return;
        }

        rescheduleAppointment({
            appointmentId: appointment.id,
            newDate: selectedDate,
            newTime: selectedTime,
            reason,
        }, {
            onSuccess: () => {
                onOpenChange(false);
                setSelectedDate(undefined);
                setSelectedTime('');
                setReason('');
                onSuccess?.(); // Trigger success callback
            },
        });
    };

    // Generate time slots
    const timeSlots = [];
    for (let hour = 8; hour < 18; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            timeSlots.push(time);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarClock className="h-5 w-5 text-primary" />
                        Reschedule Appointment
                    </DialogTitle>
                    <DialogDescription>
                        Suggest a new date and time for this appointment. The frontdesk will be notified.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Select New Date</Label>
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                disabled={(date) => date < new Date()}
                                className="rounded-md border"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="time">Select New Time</Label>
                            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 border rounded-md">
                                {timeSlots.map((time) => (
                                    <Button
                                        key={time}
                                        variant={selectedTime === time ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSelectedTime(time)}
                                        className="justify-start"
                                    >
                                        {time}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason for Rescheduling</Label>
                        <Textarea
                            id="reason"
                            placeholder="Explain why you need to reschedule..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isRescheduling}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleReschedule}
                        disabled={isRescheduling || !selectedDate || !selectedTime}
                    >
                        {isRescheduling ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Rescheduling...
                            </>
                        ) : (
                            <>
                                <CalendarClock className="mr-2 h-4 w-4" />
                                Suggest Reschedule
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
