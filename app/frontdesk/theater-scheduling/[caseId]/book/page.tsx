'use client';

/**
 * Frontdesk Theater Booking Page
 *
 * Book theater slot for a surgical case.
 * Features:
 * - Calendar view of available dates
 * - Theater selection
 * - Time slot selection
 * - Two-phase booking (lock → confirm)
 * - Conflict detection
 */

import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { useTheaterSchedulingQueue, useTheaters, useBookTheater, useConfirmBooking } from '@/hooks/frontdesk/useTheaterScheduling';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Building2,
    Calendar as CalendarIcon,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Loader2,
    User,
    Stethoscope,
} from 'lucide-react';
import { format, addDays, isSameDay, startOfDay, setHours, setMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Time slots (30-minute intervals from 8 AM to 6 PM)
const TIME_SLOTS = Array.from({ length: 21 }, (_, i) => {
    const hour = 8 + Math.floor(i / 2);
    const minute = (i % 2) * 30;
    return { hour, minute, label: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}` };
});

export default function TheaterBookingPage() {
    const router = useRouter();
    const params = useParams();
    const caseId = params.caseId as string;
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();

    // State
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedTheater, setSelectedTheater] = useState<string>('');
    const [selectedStartTime, setSelectedStartTime] = useState<string>('');
    const [selectedEndTime, setSelectedEndTime] = useState<string>('');
    const [lockedBookingId, setLockedBookingId] = useState<string | null>(null);

    // Fetch case details
    const { data: queueData, isLoading: loadingQueue } = useTheaterSchedulingQueue(isAuthenticated && !!user);
    const caseData = useMemo(() => {
        return queueData?.cases.find(c => c.id === caseId);
    }, [queueData, caseId]);

    // Fetch theaters for selected date
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const { data: theatersData, isLoading: loadingTheaters } = useTheaters(dateString, isAuthenticated && !!user);

    // Mutations
    const bookTheater = useBookTheater(caseId);
    const confirmBooking = useConfirmBooking(caseId);

    // Calculate available time slots
    const availableSlots = useMemo(() => {
        if (!theatersData || !selectedTheater) return [];

        const theater = theatersData.theaters.find(t => t.id === selectedTheater);
        if (!theater) return [];

        const bookedSlots = theater.bookings
            .filter(b => b.status !== 'CANCELLED')
            .map(b => ({
                start: new Date(b.startTime),
                end: new Date(b.endTime),
            }));

        return TIME_SLOTS.map(slot => {
            const slotStart = setMinutes(setHours(startOfDay(selectedDate), slot.hour), slot.minute);
            const slotEnd = new Date(slotStart.getTime() + 2 * 60 * 60 * 1000); // 2-hour default duration

            const isBooked = bookedSlots.some(booked => {
                return (slotStart >= booked.start && slotStart < booked.end) ||
                       (slotEnd > booked.start && slotEnd <= booked.end) ||
                       (slotStart <= booked.start && slotEnd >= booked.end);
            });

            return {
                ...slot,
                available: !isBooked,
            };
        });
    }, [theatersData, selectedTheater, selectedDate]);

    // Handle lock slot
    const handleLockSlot = async () => {
        if (!selectedTheater || !selectedStartTime || !selectedEndTime) {
            return;
        }

        const startDateTime = new Date(`${dateString}T${selectedStartTime}`);
        const endDateTime = new Date(`${dateString}T${selectedEndTime}`);

        try {
            const result = await bookTheater.mutateAsync({
                theaterId: selectedTheater,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
            });
            setLockedBookingId(result.bookingId);
        } catch (error) {
            // Error handled by mutation
        }
    };

    // Handle confirm booking
    const handleConfirmBooking = async () => {
        if (!lockedBookingId) return;

        try {
            await confirmBooking.mutateAsync({ bookingId: lockedBookingId });
            // Navigate back to scheduling queue
            router.push('/frontdesk/theater-scheduling');
        } catch (error) {
            // Error handled by mutation
        }
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-[80vh]">
                <div className="text-center">
                    <div className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-cyan-500 animate-spin mx-auto mb-4" />
                    <p className="text-sm font-medium text-slate-500">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md">
                    <p className="text-slate-500 mb-8">Please log in to book theater.</p>
                    <Link href="/login">
                        <Button size="lg" className="w-full">Return to Login</Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (loadingQueue || !caseData) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-12 w-64" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <header className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link href="/frontdesk/theater-scheduling">
                                <Button variant="ghost" size="sm">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back
                                </Button>
                            </Link>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Book Theater</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Select theater and time slot for {caseData.patient?.name || 'patient'}
                        </p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Case Information */}
                <div className="lg:col-span-1 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Case Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Patient */}
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                                    {caseData.patient?.name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'P'}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{caseData.patient?.name || 'Unknown Patient'}</p>
                                    {caseData.patient?.fileNumber && (
                                        <p className="text-xs text-slate-500">#{caseData.patient.fileNumber}</p>
                                    )}
                                </div>
                            </div>

                            {/* Procedure */}
                            <div className="flex items-start gap-2">
                                <Stethoscope className="h-4 w-4 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-slate-500">Procedure</p>
                                    <p className="text-sm font-medium text-slate-900">{caseData.procedure}</p>
                                </div>
                            </div>

                            {/* Surgeon */}
                            {caseData.surgeon && (
                                <div className="flex items-start gap-2">
                                    <User className="h-4 w-4 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-slate-500">Surgeon</p>
                                        <p className="text-sm font-medium text-slate-900">{caseData.surgeon.name}</p>
                                    </div>
                                </div>
                            )}

                            {/* Urgency */}
                            <div>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'text-xs',
                                        caseData.urgency === 'EMERGENCY' && 'bg-rose-50 text-rose-700 border-rose-200',
                                        caseData.urgency === 'URGENT' && 'bg-amber-50 text-amber-700 border-amber-200',
                                        caseData.urgency === 'ELECTIVE' && 'bg-slate-50 text-slate-700 border-slate-200'
                                    )}
                                >
                                    {caseData.urgency}
                                </Badge>
                            </div>

                            {/* Pre-op Status */}
                            {caseData.preOpChecklistFinalized && (
                                <div className="flex items-center gap-2 text-sm text-emerald-700">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>Pre-op checklist completed</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Booking Form */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Calendar */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5" />
                                Select Date
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => {
                                    if (date) {
                                        setSelectedDate(date);
                                        setSelectedStartTime('');
                                        setSelectedEndTime('');
                                        setLockedBookingId(null);
                                    }
                                }}
                                disabled={(date) => date < startOfDay(new Date())}
                                className="rounded-md border"
                            />
                        </CardContent>
                    </Card>

                    {/* Theater Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Select Theater
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingTheaters ? (
                                <Skeleton className="h-10 w-full" />
                            ) : (
                                <Select
                                    value={selectedTheater}
                                    onValueChange={(value) => {
                                        setSelectedTheater(value);
                                        setSelectedStartTime('');
                                        setSelectedEndTime('');
                                        setLockedBookingId(null);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a theater" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {theatersData?.theaters
                                            .filter(t => t.isActive)
                                            .map((theater) => (
                                                <SelectItem key={theater.id} value={theater.id}>
                                                    {theater.name} ({theater.type})
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </CardContent>
                    </Card>

                    {/* Time Slot Selection */}
                    {selectedTheater && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    Select Time Slot
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                    {availableSlots.map((slot) => {
                                        const slotValue = slot.label;
                                        const isSelected = selectedStartTime === slotValue;
                                        const isDisabled = !slot.available || lockedBookingId !== null;

                                        return (
                                            <Button
                                                key={slotValue}
                                                variant={isSelected ? 'default' : 'outline'}
                                                size="sm"
                                                disabled={isDisabled}
                                                onClick={() => {
                                                    if (slot.available) {
                                                        setSelectedStartTime(slotValue);
                                                        // Default 2-hour duration
                                                        const [hours, minutes] = slotValue.split(':').map(Number);
                                                        const endHour = hours + 2;
                                                        const endMinutes = minutes;
                                                        setSelectedEndTime(`${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`);
                                                    }
                                                }}
                                                className={cn(
                                                    'text-xs',
                                                    !slot.available && 'opacity-50 cursor-not-allowed',
                                                    isSelected && 'bg-blue-600 text-white'
                                                )}
                                            >
                                                {slot.label}
                                            </Button>
                                        );
                                    })}
                                </div>
                                {selectedStartTime && selectedEndTime && (
                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <p className="text-sm font-medium text-blue-900">
                                            Selected: {selectedStartTime} - {selectedEndTime}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Actions */}
                    {lockedBookingId ? (
                        <Card className="border-emerald-200 bg-emerald-50">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-emerald-900 mb-1">Slot Locked</p>
                                        <p className="text-sm text-emerald-700">
                                            Please confirm to complete the booking. Lock expires in 5 minutes.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleConfirmBooking}
                                        disabled={confirmBooking.isPending}
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        {confirmBooking.isPending ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Confirming...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                                Confirm Booking
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="p-6">
                                <Button
                                    onClick={handleLockSlot}
                                    disabled={!selectedTheater || !selectedStartTime || !selectedEndTime || bookTheater.isPending}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                    size="lg"
                                >
                                    {bookTheater.isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Locking Slot...
                                        </>
                                    ) : (
                                        <>
                                            <Clock className="h-4 w-4 mr-2" />
                                            Lock Slot
                                        </>
                                    )}
                                </Button>
                                {(!selectedTheater || !selectedStartTime || !selectedEndTime) && (
                                    <p className="text-xs text-slate-500 mt-2 text-center">
                                        Please select date, theater, and time slot
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
