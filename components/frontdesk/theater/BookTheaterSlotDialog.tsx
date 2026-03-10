'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Loader2, AlertTriangle, Lock, CheckCircle2, Calculator } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheaterBooking } from './useTheaterBooking';

interface Theater {
    id: string;
    name: string;
    type: string;
    hourlyRate: number;
}

interface BookTheaterSlotDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    surgicalCase: any;
    onSuccess?: () => void;
}

// Helper to format currency
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

// Calculate fee based on start/end time and hourly rate
function calculateFee(startTime: string, endTime: string, hourlyRate: number): { hours: number; fee: number } {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    const durationMinutes = endMinutes - startMinutes;
    const hours = durationMinutes / 60;
    const fee = Math.round(hourlyRate * hours);
    
    return { hours: Math.round(hours * 100) / 100, fee };
}

interface BookTheaterSlotDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    surgicalCase: any; // Using any for brevity here, should be strictly typed
    onSuccess?: () => void;
}

export function BookTheaterSlotDialog({
    open,
    onOpenChange,
    surgicalCase,
    onSuccess
}: BookTheaterSlotDialogProps) {
    const [step, setStep] = useState(1);
    const [theaters, setTheaters] = useState<Theater[]>([]);
    const [loadingTheaters, setLoadingTheaters] = useState(false);

    // Form State
    const [selectedTheater, setSelectedTheater] = useState<string>('');
    const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('10:00');

    // Timer State
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isExpired, setIsExpired] = useState(false);

    const { isLoading, lockExpiresAt, createProvisionalLock, confirmBooking, resetBooking } = useTheaterBooking(surgicalCase?.id || '');

    useEffect(() => {
        if (open) {
            setStep(1);
            resetBooking();
            setIsExpired(false);
            fetchTheaters();
        }
    }, [open]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (step === 2 && lockExpiresAt && !isExpired) {
            timer = setInterval(() => {
                const now = new Date().getTime();
                const expires = lockExpiresAt.getTime();
                const diff = Math.floor((expires - now) / 1000);
                
                if (diff <= 0) {
                    setTimeLeft(0);
                    setIsExpired(true);
                } else {
                    setTimeLeft(diff);
                }
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [step, lockExpiresAt, isExpired]);

    const fetchTheaters = async () => {
        setLoadingTheaters(true);
        try {
            const res = await fetch('/api/frontdesk/theaters');
            const data = await res.json();
            if (data.success && data.data) {
                setTheaters(data.data);
                if (data.data.length > 0) setSelectedTheater(data.data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch theaters', error);
        } finally {
            setLoadingTheaters(false);
        }
    };

    const handleLockSlot = async () => {
        if (!selectedTheater || !date || !startTime || !endTime) return;

        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);

        const success = await createProvisionalLock({
            theaterId: selectedTheater,
            startTime: startDateTime,
            endTime: endDateTime
        });

        if (success) {
            setStep(2);
        }
    };

    const handleConfirm = async () => {
        const success = await confirmBooking();
        if (success) {
            onSuccess?.();
            onOpenChange(false);
        }
    };

    if (!surgicalCase) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Schedule Theater Slot</DialogTitle>
                    <DialogDescription>
                        {surgicalCase.patient?.name} - {surgicalCase.procedure}
                    </DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Operating Theater</Label>
                            <Select value={selectedTheater} onValueChange={setSelectedTheater} disabled={loadingTheaters}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a theater" />
                                </SelectTrigger>
                                <SelectContent>
                                    {theaters.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.name} ({t.type})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
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

                        {/* Theater Fee Calculator */}
                        {selectedTheater && (
                            <div className="rounded-lg border bg-emerald-50 p-4 space-y-3">
                                <div className="flex items-center gap-2 text-emerald-800">
                                    <Calculator className="h-4 w-4" />
                                    <span className="font-semibold text-sm">Theater Fee Estimate</span>
                                </div>
                                {(() => {
                                    const selectedTheaterData = theaters.find(t => t.id === selectedTheater);
                                    const { hours, fee } = calculateFee(startTime, endTime, selectedTheaterData?.hourlyRate || 0);
                                    return (
                                        <>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-emerald-700">Theater Rate</span>
                                                <span className="font-medium text-emerald-900">
                                                    {formatCurrency(selectedTheaterData?.hourlyRate || 0)}/hr
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-emerald-700">Duration</span>
                                                <span className="font-medium text-emerald-900">{hours} hours</span>
                                            </div>
                                            <div className="border-t border-emerald-200 pt-2 flex justify-between">
                                                <span className="font-semibold text-emerald-800">Estimated Total</span>
                                                <span className="font-bold text-emerald-900 text-lg">{formatCurrency(fee)}</span>
                                            </div>
                                            <p className="text-xs text-emerald-600">
                                                * Final billing may vary based on actual surgery duration
                                            </p>
                                        </>
                                    );
                                })()}
                            </div>
                        )}

                        <div className="flex items-center gap-2 mt-4 text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
                            <Lock className="h-4 w-4 shrink-0" />
                            <p className="text-xs">
                                Proceeding will lock this slot temporarily to prevent double bookings.
                            </p>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 py-4">
                        <div className="flex flex-col items-center justify-center text-center space-y-2">
                            {isExpired ? (
                                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                                    <AlertTriangle className="h-6 w-6 text-red-600" />
                                </div>
                            ) : (
                                <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                </div>
                            )}

                            <h3 className="text-lg font-semibold text-slate-900">
                                {isExpired ? 'Lock Expired' : 'Slot Locked Successfully'}
                            </h3>

                            <p className="text-sm text-muted-foreground max-w-xs">
                                {isExpired
                                    ? 'The reservation time has ended. Please go back and try locking the slot again.'
                                    : 'A provisional booking holds this slot. Please confirm details with the patient.'}
                            </p>

                            {!isExpired && (
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-sm font-mono font-medium border",
                                    timeLeft < 60 ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse" : "bg-slate-50 text-slate-700 border-slate-200"
                                )}>
                                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')} remaining
                                </div>
                            )}
                        </div>

                        <div className="rounded-lg border bg-slate-50 p-4 space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Theater</span>
                                <span className="font-medium text-slate-900">
                                    {theaters.find(t => t.id === selectedTheater)?.name}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Date</span>
                                <span className="font-medium text-slate-900">{format(new Date(date), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Time</span>
                                <span className="font-medium text-slate-900">{startTime} - {endTime}</span>
                            </div>
                            {(() => {
                                const selectedTheaterData = theaters.find(t => t.id === selectedTheater);
                                const { hours, fee } = calculateFee(startTime, endTime, selectedTheaterData?.hourlyRate || 0);
                                return (
                                    <div className="border-t border-slate-200 pt-3 flex justify-between">
                                        <span className="font-semibold text-slate-800">Theater Fee</span>
                                        <span className="font-bold text-slate-900">{formatCurrency(fee)}</span>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    {step === 1 && (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button
                                onClick={handleLockSlot}
                                disabled={isLoading || loadingTheaters}
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Lock Slot & Next
                            </Button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <Button variant="outline" onClick={() => { setStep(1); resetBooking(); }} disabled={isLoading}>Back</Button>
                            <Button
                                onClick={handleConfirm}
                                disabled={isLoading || isExpired}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Booking
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
