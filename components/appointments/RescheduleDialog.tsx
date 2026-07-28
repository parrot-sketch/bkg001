'use client';

import { useState, useMemo } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useAppointments } from '@/hooks/useAppointments';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface RescheduleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointment: {
        id: number;
        appointmentDate: Date | string;
        time: string;
        patient?: {
            firstName?: string;
            lastName?: string;
        };
    };
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
    const { rescheduleAppointment, isRescheduling } = useAppointments({ onRescheduleSuccess: onSuccess });

    const minDate = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const patientName = appointment.patient
        ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
        : 'Patient';

    const currentDateFormatted = appointment.appointmentDate
        ? format(new Date(appointment.appointmentDate), 'EEE, MMM d, yyyy')
        : '';

    const newDateFormatted = selectedDate
        ? format(selectedDate, 'EEE, MMM d, yyyy')
        : '';

    const canSubmit = selectedDate && selectedTime;

    const handleReschedule = () => {
        if (!selectedDate || !selectedTime) {
            toast.error('Please select date and time');
            return;
        }

        rescheduleAppointment({
            appointmentId: appointment.id,
            newDate: selectedDate,
            newTime: selectedTime,
        });

        onOpenChange(false);
        setSelectedDate(undefined);
        setSelectedTime('');
    };

    const handleClose = () => {
        if (!isRescheduling) {
            onOpenChange(false);
            setSelectedDate(undefined);
            setSelectedTime('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarClock className="h-5 w-5 text-[#caa26a]" />
                        Reschedule Appointment
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5">
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-[#e7d6bf] bg-[#faf8f5]">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#2c2e4b] truncate">
                                {patientName}
                            </p>
                            <p className="text-xs text-[#2c2e4b]/60 mt-0.5">
                                Currently: {currentDateFormatted} at {appointment.time}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[#2c2e4b]">
                                New Date
                            </label>
                            <div className="flex justify-center">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    disabled={(date) => date < minDate}
                                    className="rounded-md border border-[#e7d6bf]"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[#2c2e4b]">
                                New Time
                            </label>
                            <input
                                type="time"
                                value={selectedTime}
                                onChange={(e) => setSelectedTime(e.target.value)}
                                className="w-full h-10 rounded-lg border border-[#e7d6bf] px-3 text-sm text-[#2c2e4b] focus:border-[#caa26a] focus:ring-1 focus:ring-[#caa26a]/20 outline-none"
                            />
                            <p className="text-[10px] text-[#2c2e4b]/40">
                                Use 24h format (e.g. 14:30)
                            </p>
                        </div>
                    </div>

                    {canSubmit && (
                        <div className="p-3 rounded-lg bg-[#caa26a]/5 border border-[#caa26a]/20">
                            <p className="text-[10px] font-semibold text-[#caa26a] uppercase tracking-wide mb-1">
                                New Appointment
                            </p>
                            <div className="flex items-center gap-2 text-sm">
                                <CalendarClock className="h-4 w-4 text-[#caa26a]" />
                                <span className="font-medium text-[#2c2e4b]">
                                    {newDateFormatted} at {selectedTime}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-[#e7d6bf]">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isRescheduling}
                        className="flex-1 border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleReschedule}
                        disabled={isRescheduling || !canSubmit}
                        className="flex-1 bg-[#caa26a] text-white hover:bg-[#caa26a]/90"
                    >
                        {isRescheduling ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Rescheduling...
                            </>
                        ) : (
                            'Confirm Reschedule'
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
