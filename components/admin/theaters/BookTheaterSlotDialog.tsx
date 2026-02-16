'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminSurgicalCasesApi, SurgicalCaseListItemDto } from '@/lib/api/surgical-cases';
import { Loader2, Search, Calendar, Clock, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Theater {
    id: string;
    name: string;
}

interface BookTheaterSlotDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    theater: Theater;
    initialDate?: Date;
    onSuccess?: () => void;
}

export function BookTheaterSlotDialog({
    open,
    onOpenChange,
    theater,
    initialDate,
    onSuccess
}: BookTheaterSlotDialogProps) {
    // Steps: 1=Select Case, 2=Select Time/Lock, 3=Confirm
    const [step, setStep] = useState(1);

    // Data
    const [cases, setCases] = useState<SurgicalCaseListItemDto[]>([]);
    const [loadingCases, setLoadingCases] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Selection
    const [selectedCase, setSelectedCase] = useState<SurgicalCaseListItemDto | null>(null);
    const [date, setDate] = useState<string>(initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('10:00');

    // Booking State
    const [locking, setLocking] = useState(false);
    const [bookingId, setBookingId] = useState<string | null>(null);
    const [confiming, setConfirming] = useState(false);

    // Timer State
    const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes default
    const [isExpired, setIsExpired] = useState(false);

    // Reset on open
    useEffect(() => {
        if (open) {
            setStep(1);
            setSelectedCase(null);
            setBookingId(null);
            setDate(initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
            setIsExpired(false);
            fetchCases();
        }
    }, [open, initialDate]);

    // Countdown Timer
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (step === 3 && timeLeft > 0 && !isExpired) {
            timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        setIsExpired(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [step, timeLeft, isExpired]);

    const fetchCases = async () => {
        setLoadingCases(true);
        try {
            const res = await adminSurgicalCasesApi.getByStatus('READY_FOR_SCHEDULING');
            if (res.success && res.data) {
                setCases(res.data);
            } else {
                toast.error('Failed to load surgical cases');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error loading cases');
        } finally {
            setLoadingCases(false);
        }
    };

    const filteredCases = cases.filter(c =>
        c.patient?.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.patient?.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.procedureName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleLockSlot = async () => {
        if (!selectedCase || !date || !startTime || !endTime) return;

        setLocking(true);
        try {
            const startDateTime = new Date(`${date}T${startTime}`);
            const endDateTime = new Date(`${date}T${endTime}`);

            if (startDateTime >= endDateTime) {
                toast.error('End time must be after start time');
                setLocking(false);
                return;
            }

            const res = await fetch('/api/admin/theaters/schedule/lock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    caseId: selectedCase.id,
                    theaterId: theater.id,
                    startTime: startDateTime.toISOString(),
                    endTime: endDateTime.toISOString(),
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to lock slot');
            }

            setBookingId(data.id);

            // Set timer from server expiry
            if (data.lock_expires_at) {
                const expiresAt = new Date(data.lock_expires_at).getTime();
                const now = new Date().getTime();
                const seconds = Math.floor((expiresAt - now) / 1000);
                setTimeLeft(seconds > 0 ? seconds : 0);
            } else {
                setTimeLeft(300); // 5 min fallback
            }

            setStep(3); // Move to confirm step
            toast.success('Slot locked successfully (Provisional)');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLocking(false);
        }
    };

    const handleConfirmBooking = async () => {
        if (!bookingId) return;

        setConfirming(true);
        try {
            const res = await fetch('/api/admin/theaters/schedule/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to confirm booking');
            }

            toast.success('Booking confirmed successfully');
            onSuccess?.();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setConfirming(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Book Theater Slot</DialogTitle>
                    <DialogDescription>
                        Schedule a surgical case for {theater.name}
                    </DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search patient or procedure..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="border rounded-md h-[300px] overflow-y-auto p-1 space-y-1">
                            {loadingCases ? (
                                <div className="flex justify-center items-center h-full">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : filteredCases.length === 0 ? (
                                <div className="flex flex-col justify-center items-center h-full text-muted-foreground">
                                    <p>No cases ready for scheduling</p>
                                </div>
                            ) : (
                                filteredCases.map(c => (
                                    <div
                                        key={c.id}
                                        onClick={() => setSelectedCase(c)}
                                        className={cn(
                                            "div p-3 rounded-md cursor-pointer hover:bg-slate-50 border border-transparent transition-all",
                                            selectedCase?.id === c.id ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-300" : ""
                                        )}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium text-sm text-slate-900">{c.patient?.firstName} {c.patient?.lastName}</p>
                                                <p className="text-xs text-muted-foreground">{c.procedureName}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className={cn(
                                                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium border",
                                                    c.urgency === 'EMERGENCY' ? "bg-red-50 text-red-700 border-red-200" :
                                                        c.urgency === 'URGENT' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                            "bg-slate-50 text-slate-700 border-slate-200"
                                                )}>
                                                    {c.urgency}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                            <span>Dr. {c.primarySurgeon?.name}</span>
                                            {c.casePlan?.estimatedDurationMinutes && (
                                                <>
                                                    <span>•</span>
                                                    <span>~{c.casePlan.estimatedDurationMinutes} mins</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {step === 2 && selectedCase && (
                    <div className="space-y-4 py-2">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                            <p className="text-sm font-medium text-slate-900">Selected Case</p>
                            <p className="text-sm text-slate-700">{selectedCase.procedureName}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {selectedCase.patient?.firstName} {selectedCase.patient?.lastName} • {selectedCase.urgency}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Start Time</Label>
                                <Input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Time</Label>
                                <Input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4 text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
                            <Lock className="h-4 w-4" />
                            <p className="text-xs">
                                Proceeding will lock this slot for 5 minutes to prevent double booking.
                            </p>
                        </div>
                    </div>
                )}

                {step === 3 && bookingId && selectedCase && (
                    <div className="space-y-6 py-4">
                        <div className="flex flex-col items-center justify-center text-center space-y-2">
                            {isExpired ? (
                                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                                    <AlertTriangle className="h-6 w-6 text-red-600" />
                                </div>
                            ) : (
                                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <Lock className="h-6 w-6 text-green-600" />
                                </div>
                            )}

                            <h3 className="text-lg font-semibold text-slate-900">
                                {isExpired ? 'Lock Expired' : 'Slot Locked!'}
                            </h3>

                            <p className="text-sm text-muted-foreground max-w-xs">
                                {isExpired
                                    ? 'The reservation time has ended. Please try locking the slot again.'
                                    : 'Possible concurrency conflict avoided. You have 5 minutes to confirm details.'}
                            </p>

                            {!isExpired && (
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-sm font-mono font-medium border",
                                    timeLeft < 60 ? "bg-red-50 text-red-700 border-red-200 animate-pulse" : "bg-slate-50 text-slate-700 border-slate-200"
                                )}>
                                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')} remaining
                                </div>
                            )}
                        </div>

                        <div className="rounded-lg border bg-slate-50 p-4 space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Theater</span>
                                <span className="font-medium text-slate-900">{theater.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Date</span>
                                <span className="font-medium text-slate-900">{format(new Date(date), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Time</span>
                                <span className="font-medium text-slate-900">{startTime} - {endTime}</span>
                            </div>
                            <div className="border-t pt-2 mt-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Patient</span>
                                    <span className="font-medium text-slate-900">{selectedCase.patient?.firstName} {selectedCase.patient?.lastName}</span>
                                </div>
                                <div className="flex justify-between mt-1">
                                    <span className="text-muted-foreground">Procedure</span>
                                    <span className="font-medium text-slate-900">{selectedCase.procedureName}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    {step === 1 && (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button
                                onClick={() => setStep(2)}
                                disabled={!selectedCase}
                            >
                                Next
                            </Button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <Button variant="outline" onClick={() => setStep(1)} disabled={locking}>Back</Button>
                            <Button
                                onClick={handleLockSlot}
                                disabled={locking}
                            >
                                {locking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Lock Slot
                            </Button>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confiming}>Cancel Lock</Button>
                            <Button
                                onClick={handleConfirmBooking}
                                disabled={confiming}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {confiming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Booking
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
