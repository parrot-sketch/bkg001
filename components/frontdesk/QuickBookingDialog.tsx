'use client';

/**
 * QuickBookingDialog Component - REDESIGNED
 * 
 * Streamlined appointment booking that shows immediate available slots.
 * Since the doctor is in "Available Doctors", we know they have availability.
 * Show next available slots upfront for true "quick" booking.
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PatientCombobox } from '@/components/frontdesk/PatientCombobox';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { getDoctorSchedule } from '@/app/actions/schedule';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { toast } from 'sonner';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon, Clock, User, Stethoscope, CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


interface QuickBookingDialogProps {
    doctor: DoctorResponseDto;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

interface TimeSlot {
    date: Date;
    time: string;
    displayDate: string;
    displayTime: string;
}

export function QuickBookingDialog({
    doctor,
    open,
    onOpenChange,
    onSuccess
}: QuickBookingDialogProps) {
    // Form state
    const [selectedPatient, setSelectedPatient] = useState<PatientResponseDto | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [appointmentType, setAppointmentType] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Slot loading
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [showMoreSlots, setShowMoreSlots] = useState(false);

    // Load next available slots when dialog opens
    useEffect(() => {
        if (open && doctor.id) {
            loadNextAvailableSlots();
        }
    }, [open, doctor.id]);

    // Reset form when dialog closes
    useEffect(() => {
        if (!open) {
            setSelectedPatient(null);
            setSelectedSlot(null);
            setAppointmentType('');
            setNotes('');
            setShowMoreSlots(false);
        }
    }, [open]);

    const loadNextAvailableSlots = async () => {
        setIsLoadingSlots(true);
        try {
            const start = new Date();
            const end = addDays(start, 14); // Look ahead 2 weeks

            const schedule = await getDoctorSchedule(doctor.id, start, end);
            const slots = calculateNextSlots(schedule, start, end);

            setAvailableSlots(slots);
        } catch (error) {
            console.error('Failed to load slots:', error);
            toast.error('Failed to load available slots');
        } finally {
            setIsLoadingSlots(false);
        }
    };

    const calculateNextSlots = (schedule: any, start: Date, end: Date): TimeSlot[] => {
        const slots: TimeSlot[] = [];
        const { workingDays, blocks, appointments } = schedule;

        // Check next 14 days
        for (let i = 0; i < 14; i++) {
            const currentDate = addDays(start, i);
            const dayOfWeek = currentDate.getDay();

            const workRules = workingDays.filter((wd: any) => wd.dayOfWeek === dayOfWeek);
            if (!workRules.length) continue;

            for (const rule of workRules) {
                const [startH, startM] = rule.startTime.split(':').map(Number);
                const [endH, endM] = rule.endTime.split(':').map(Number);

                const slotStart = new Date(currentDate);
                slotStart.setHours(startH, startM, 0, 0);

                const slotEnd = new Date(currentDate);
                slotEnd.setHours(endH, endM, 0, 0);

                if (slotStart < new Date()) continue;

                const isBlocked = blocks.some((b: any) => {
                    const bStart = new Date(b.start_date);
                    const bEnd = new Date(b.end_date);
                    return (bStart < slotEnd && bEnd > slotStart);
                });
                if (isBlocked) continue;

                let chunkStart = new Date(slotStart);
                while (chunkStart < slotEnd) {
                    const chunkEnd = new Date(chunkStart.getTime() + 30 * 60000);

                    const isBooked = appointments.some((appt: any) => {
                        const apptStart = new Date(appt.scheduled_at);
                        const apptEnd = new Date(apptStart.getTime() + (appt.duration_minutes || 30) * 60000);
                        return (apptStart < chunkEnd && apptEnd > chunkStart);
                    });

                    if (!isBooked) {
                        const isToday = isSameDay(chunkStart, new Date());
                        const isTomorrow = isSameDay(chunkStart, addDays(new Date(), 1));

                        let displayDate = format(chunkStart, 'EEEE, MMM d');
                        if (isToday) displayDate = 'Today, ' + format(chunkStart, 'MMM d');
                        if (isTomorrow) displayDate = 'Tomorrow, ' + format(chunkStart, 'MMM d');

                        slots.push({
                            date: new Date(chunkStart),
                            time: format(chunkStart, 'HH:mm'),
                            displayDate,
                            displayTime: format(chunkStart, 'h:mm a'),
                        });

                        if (slots.length >= 20) return slots; // Return top 20
                    }

                    chunkStart = chunkEnd;
                }
            }
            if (slots.length >= 20) break;
        }
        return slots;
    };

    const handleSubmit = async () => {
        if (!selectedPatient || !selectedSlot || !appointmentType) {
            toast.error('Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await frontdeskApi.scheduleAppointment({
                patientId: selectedPatient.id,
                doctorId: doctor.id,
                appointmentDate: selectedSlot.date,
                time: selectedSlot.time,
                type: appointmentType,
                note: notes,
            });

            if (response.success) {
                toast.success('Appointment booked successfully!');
                onOpenChange(false);
                if (onSuccess) onSuccess();
            } else {
                toast.error(response.error || 'Failed to book appointment');
                if (response.error?.includes('booked')) {
                    loadNextAvailableSlots(); // Refresh slots
                }
            }
        } catch (error) {
            console.error('Booking error:', error);
            toast.error('An error occurred while booking');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isFormValid = selectedPatient && selectedSlot && appointmentType;
    const visibleSlots = showMoreSlots ? availableSlots : availableSlots.slice(0, 6);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-primary" />
                        Quick Book Appointment
                    </DialogTitle>
                    <DialogDescription>
                        Book an appointment with {doctor.name} in just a few clicks
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Doctor Info - Read Only */}
                    <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                        <div className="flex items-start gap-4">
                            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                                {doctor.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-lg">{doctor.name}</h3>
                                    <Badge variant="secondary" className="text-xs">
                                        <Stethoscope className="h-3 w-3 mr-1" />
                                        {doctor.specialization}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{doctor.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Patient Selection */}
                    <div className="space-y-2">
                        <Label className="text-base font-semibold flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Select Patient *
                        </Label>
                        <PatientCombobox
                            value={selectedPatient?.id || ''}
                            onSelect={(id, patient) => {
                                if (patient) setSelectedPatient(patient);
                            }}
                        />
                        {selectedPatient && (
                            <div className="rounded-lg border bg-muted/20 p-3 flex gap-3 items-center mt-2">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <User className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-sm">
                                        {selectedPatient.firstName} {selectedPatient.lastName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{selectedPatient.email}</p>
                                </div>
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                        )}
                    </div>

                    {/* Available Slots - Primary Feature */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Select Time Slot *
                        </Label>

                        {isLoadingSlots ? (
                            <div className="flex items-center justify-center py-12 border rounded-lg">
                                <div className="text-center space-y-3">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                                    <p className="text-sm text-muted-foreground">Finding available slots...</p>
                                </div>
                            </div>
                        ) : availableSlots.length > 0 ? (
                            <div className="space-y-3">
                                <div className="grid gap-2">
                                    {visibleSlots.map((slot, idx) => (
                                        <Button
                                            key={idx}
                                            variant={selectedSlot?.date.getTime() === slot.date.getTime() ? 'default' : 'outline'}
                                            size="lg"
                                            onClick={() => setSelectedSlot(slot)}
                                            className={cn(
                                                'w-full justify-between h-auto py-4 px-4',
                                                selectedSlot?.date.getTime() === slot.date.getTime() && 'ring-2 ring-primary ring-offset-2 bg-teal-600 hover:bg-teal-700'
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-full flex items-center justify-center",
                                                    selectedSlot?.date.getTime() === slot.date.getTime()
                                                        ? "bg-white/20"
                                                        : "bg-primary/10"
                                                )}>
                                                    <CalendarIcon className={cn(
                                                        "h-5 w-5",
                                                        selectedSlot?.date.getTime() === slot.date.getTime()
                                                            ? "text-white"
                                                            : "text-primary"
                                                    )} />
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-semibold">{slot.displayDate}</div>
                                                    <div className={cn(
                                                        "text-sm",
                                                        selectedSlot?.date.getTime() === slot.date.getTime()
                                                            ? "text-white/80"
                                                            : "text-muted-foreground"
                                                    )}>
                                                        {slot.displayTime}
                                                    </div>
                                                </div>
                                            </div>
                                            {selectedSlot?.date.getTime() === slot.date.getTime() && (
                                                <CheckCircle2 className="h-5 w-5 text-white" />
                                            )}
                                        </Button>
                                    ))}
                                </div>

                                {availableSlots.length > 6 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowMoreSlots(!showMoreSlots)}
                                        className="w-full"
                                    >
                                        {showMoreSlots ? (
                                            <>
                                                <ChevronUp className="h-4 w-4 mr-2" />
                                                Show Less
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="h-4 w-4 mr-2" />
                                                Show {availableSlots.length - 6} More Slots
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-muted/20">
                                <Clock className="h-12 w-12 text-muted-foreground/30 mb-3" />
                                <p className="text-sm text-muted-foreground font-medium">No available slots in the next 2 weeks</p>
                                <p className="text-xs text-muted-foreground mt-1">Please try again later or contact the doctor directly</p>
                            </div>
                        )}
                    </div>

                    {/* Appointment Details */}
                    <div className="space-y-4 pt-4 border-t">
                        <div className="space-y-2">
                            <Label htmlFor="appointment-type" className="text-base font-semibold">
                                Appointment Type *
                            </Label>
                            <Select value={appointmentType} onValueChange={setAppointmentType}>
                                <SelectTrigger id="appointment-type">
                                    <SelectValue placeholder="Select appointment type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Initial Consultation">Initial Consultation</SelectItem>
                                    <SelectItem value="Follow-up">Follow-up</SelectItem>
                                    <SelectItem value="Routine Checkup">Routine Checkup</SelectItem>
                                    <SelectItem value="Procedure">Procedure</SelectItem>
                                    <SelectItem value="Emergency">Emergency</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes" className="text-base font-semibold">
                                Notes (Optional)
                            </Label>
                            <Textarea
                                id="notes"
                                placeholder="Any additional notes for the doctor..."
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Summary */}
                    {isFormValid && (
                        <div className="rounded-lg bg-primary/5 border-2 border-primary/20 p-4 space-y-2">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                Booking Summary
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="text-muted-foreground">Patient:</span>
                                <span className="font-medium text-right">
                                    {selectedPatient?.firstName} {selectedPatient?.lastName}
                                </span>

                                <span className="text-muted-foreground">Doctor:</span>
                                <span className="font-medium text-right">{doctor.name}</span>

                                <span className="text-muted-foreground">Date & Time:</span>
                                <span className="font-medium text-right">
                                    {selectedSlot && `${selectedSlot.displayDate} at ${selectedSlot.displayTime}`}
                                </span>

                                <span className="text-muted-foreground">Type:</span>
                                <span className="font-medium text-right">{appointmentType}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!isFormValid || isSubmitting}
                        className="bg-teal-600 hover:bg-teal-700"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Booking...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Confirm Booking
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
