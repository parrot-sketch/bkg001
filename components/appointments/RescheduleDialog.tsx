'use client';

import { useState, useMemo } from 'react';
import { CalendarClock, Loader2, User, Phone, Mail, ArrowLeft } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

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
            email?: string;
            phone?: string;
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
    const [reason, setReason] = useState('');
    const [step, setStep] = useState<'date' | 'time' | 'review'>('date');
    const { rescheduleAppointment, isRescheduling } = useAppointments();

    // Min date: today (start of day)
    const minDate = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const patientName = appointment.patient
        ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
        : 'Patient';

    const patientInitials = appointment.patient
        ? `${appointment.patient.firstName?.[0] || ''}${appointment.patient.lastName?.[0] || ''}`.toUpperCase()
        : 'P';

    const currentDate = appointment.appointmentDate
        ? format(new Date(appointment.appointmentDate), 'EEE, MMM d, yyyy')
        : '';

    // 30-min slots 08:00-18:00
    const timeSlots = Array.from({ length: 20 }, (_, i) => {
        const hour = 8 + Math.floor(i / 2);
        const minute = i % 2 === 0 ? '00' : '30';
        return `${hour.toString().padStart(2, '0')}:${minute}`;
    });

    const handleReschedule = () => {
        if (!selectedDate || !selectedTime) {
            toast.error('Please select date and time');
            return;
        }

        rescheduleAppointment({
            appointmentId: appointment.id,
            newDate: selectedDate,
            newTime: selectedTime,
            reason: reason.trim() || undefined,
        }, {
            onSuccess: () => {
                onOpenChange(false);
                setSelectedDate(undefined);
                setSelectedTime('');
                setReason('');
                setStep('date');
                onSuccess?.();
            },
        });
    };

    const handleClose = () => {
        if (!isRescheduling) {
            onOpenChange(false);
            setStep('date');
        }
    };

    const canProceed = step === 'review' && selectedDate && selectedTime;

    const newDateFormatted = selectedDate
        ? format(selectedDate, 'EEE, MMM d, yyyy')
        : '';

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <CalendarClock className="h-5 w-5 text-primary" />
                        Reschedule Appointment
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        {step === 'date' && 'Select a new date for the appointment'}
                        {step === 'time' && 'Choose an available time slot'}
                        {step === 'review' && 'Review and confirm changes'}
                    </DialogDescription>
                </DialogHeader>

                {/* Patient & Current Context */}
                <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {patientInitials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{patientName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                            Currently: {currentDate} at {appointment.time}
                        </p>
                    </div>
                </div>

                {/* Stepper */}
                <div className="flex items-center justify-center gap-2 text-xs">
                    <button
                        onClick={() => setStep('date')}
                        className={cn(
                            "px-2 py-1 rounded-full transition-colors",
                            step === 'date' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        )}
                    >
                        Date
                    </button>
                    <span className="text-muted-foreground">→</span>
                    <button
                        onClick={() => selectedDate && setStep('time')}
                        disabled={!selectedDate}
                        className={cn(
                            "px-2 py-1 rounded-full transition-colors",
                            step === 'time' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                            !selectedDate && 'opacity-50 cursor-not-allowed'
                        )}
                    >
                        Time
                    </button>
                    <span className="text-muted-foreground">→</span>
                    <button
                        onClick={() => selectedDate && selectedTime && setStep('review')}
                        disabled={!selectedDate || !selectedTime}
                        className={cn(
                            "px-2 py-1 rounded-full transition-colors",
                            step === 'review' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                            (!selectedDate || !selectedTime) && 'opacity-50 cursor-not-allowed'
                        )}
                    >
                        Review
                    </button>
                </div>

                <ScrollArea className="h-64">
                    <div className="space-y-4 pr-4">
                        {/* Step 1: Date */}
                        {step === 'date' && (
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Select New Date</Label>
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={(date) => {
                                        setSelectedDate(date);
                                        setStep('time');
                                    }}
                                    disabled={(date) => date < minDate}
                                    className="rounded-md border"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Click a date to continue to time selection
                                </p>
                            </div>
                        )}

                        {/* Step 2: Time */}
                        {step === 'time' && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-medium">
                                        Select Time {selectedDate && `— {newDateFormatted}`}
                                    </Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setStep('date')}
                                        className="text-xs h-7"
                                    >
                                        <ArrowLeft className="h-3 w-3 mr-1" />
                                        Change Date
                                    </Button>
                                </div>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {timeSlots.map((time) => (
                                        <Button
                                            key={time}
                                            type="button"
                                            variant={selectedTime === time ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setSelectedTime(time)}
                                            className="text-xs h-9"
                                        >
                                            {time}
                                        </Button>
                                    ))}
                                </div>
                                {selectedTime && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setStep('review')}
                                        className="w-full mt-2"
                                    >
                                        Continue to Review
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Step 3: Review */}
                        {step === 'review' && (
                            <div className="space-y-3">
                                {/* Summary card */}
                                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                                    <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-2">
                                        New Appointment
                                    </p>
                                    <div className="flex items-center gap-2 text-sm">
                                        <CalendarClock className="h-4 w-4 text-primary" />
                                        <span className="font-medium">{newDateFormatted}</span>
                                        <span className="text-primary">{selectedTime}</span>
                                    </div>
                                </div>

                                {/* Compare */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 rounded border bg-muted/20">
                                        <p className="font-semibold text-muted-foreground mb-1">Before</p>
                                        <p>{currentDate}</p>
                                        <p className="text-muted-foreground">{appointment.time}</p>
                                    </div>
                                    <div className="p-2 rounded border border-primary/30 bg-primary/5">
                                        <p className="font-semibold text-primary mb-1">After</p>
                                        <p>{newDateFormatted}</p>
                                        <p className="text-primary">{selectedTime}</p>
                                    </div>
                                </div>

                                {/* Reason */}
                                <div className="space-y-1">
                                    <Label htmlFor="reason" className="text-xs font-medium">
                                        Note for patient <span className="text-muted-foreground">(optional)</span>
                                    </Label>
                                    <Textarea
                                        id="reason"
                                        placeholder="Brief reason for change..."
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        rows={2}
                                        className="text-sm resize-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* BOTTOM ACTIONS — ALWAYS VISIBLE */}
                <DialogFooter className="gap-2 border-t pt-3 mt-3">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClose}
                        disabled={isRescheduling}
                        size="sm"
                    >
                        Cancel
                    </Button>
                    {step === 'time' && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStep('date')}
                            size="sm"
                        >
                            Back to Date
                        </Button>
                    )}
                    {step === 'review' ? (
                        <Button
                            type="button"
                            onClick={handleReschedule}
                            disabled={isRescheduling}
                            size="sm"
                        >
                            {isRescheduling ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Rescheduling...
                                </>
                            ) : (
                                <>
                                    <CalendarClock className="mr-2 h-4 w-4" />
                                    Confirm Reschedule
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={() => step === 'date' && selectedDate ? setStep('time') : null}
                            disabled={!selectedDate}
                            size="sm"
                        >
                            Continue
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
