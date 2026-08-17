'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, Clock, Loader2, CheckCircle } from 'lucide-react';
import { TimeSlotPicker } from '@/components/theater-tech/booking/TimeSlotPicker';
import { useTheaterBooking } from '@/hooks/theater-tech/useTheaterBooking';
import type { TheaterBookingSlot } from '@/hooks/theater-tech/useTheaterBooking';

interface TheaterBookingDialogProps {
  caseId: string;
  caseDurationMinutes: number;
  patientName: string;
  procedureName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingConfirmed?: (confirmed?: {
    bookingId: string;
    theaterId: string;
    theaterName: string;
    startTime: string;
    endTime: string;
    caseStatus: string;
    billing?: { feeAmount: number; durationHours: number };
  }) => void;
}

interface SelectedSlot {
  theaterId: string;
  theaterName: string;
  startTime: string;
  endTime: string;
}

export function TheaterBookingDialog({
  caseId,
  caseDurationMinutes,
  patientName,
  procedureName,
  open,
  onOpenChange,
  onBookingConfirmed,
}: TheaterBookingDialogProps) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [step, setStep] = useState<'select' | 'locked' | 'confirmed'>('select');
  const [localError, setLocalError] = useState<string | null>(null);
  const [customDuration, setCustomDuration] = useState<string>(String(caseDurationMinutes || 60));

  const {
    theaters,
    isLoadingTheaters,
    isBooking,
    bookingData,
    bookingError,
    isConfirming,
    confirmData,
    confirmError,
    bookSlot,
    confirm,
    theatersError,
  } = useTheaterBooking({ caseId, date: selectedDate, enabled: open });

  const effectiveDuration = parseInt(customDuration, 10) || 60;
  const estimatedFee = Math.round((effectiveDuration / 60) * 2500);

  useEffect(() => {
    if (!open) {
      setStep('select');
      setSelectedSlot(null);
      setLocalError(null);
      setCustomDuration(String(caseDurationMinutes || 60));
    }
  }, [open, caseDurationMinutes]);

  useEffect(() => {
    if (bookingData) {
      setSelectedSlot({
        theaterId: bookingData.theaterId,
        theaterName: bookingData.theaterName,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
      });
      setStep('locked');
      setLocalError(null);
    }
  }, [bookingData]);

  useEffect(() => {
    if (bookingError) {
      setLocalError(bookingError);
    }
  }, [bookingError]);

  useEffect(() => {
    if (theatersError) {
      setLocalError(theatersError.message);
    }
  }, [theatersError]);

  useEffect(() => {
    if (confirmData) {
      setStep('confirmed');
      setLocalError(null);
    }
  }, [confirmData]);

  useEffect(() => {
    if (confirmError) {
      setLocalError(confirmError);
    }
  }, [confirmError]);

  const handleSelectSlot = (theaterId: string, startTime: string, endTime: string) => {
    if (!theaterId || !startTime || !endTime) return;
    const theater = theaters?.find((t) => t.id === theaterId);
    if (!theater) return;
    setSelectedSlot({
      theaterId,
      theaterName: theater.name,
      startTime,
      endTime,
    });
  };

  const handleLockSlot = async () => {
    if (!selectedSlot) return;
    setLocalError(null);
    try {
      await bookSlot(selectedSlot.theaterId, selectedSlot.startTime, selectedSlot.endTime);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to lock slot');
    }
  };

  const handleConfirmBooking = async () => {
    if (!bookingData?.bookingId) return;
    setLocalError(null);
    try {
      const confirmed = await confirm(bookingData.bookingId);
      onBookingConfirmed?.({
        bookingId: confirmed.bookingId,
        theaterId: confirmed.theaterId,
        theaterName: confirmed.theaterName,
        startTime: confirmed.startTime,
        endTime: confirmed.endTime,
        caseStatus: confirmed.caseStatus,
        billing: confirmed.billing ?? undefined,
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to confirm booking');
    }
  };

  const handleClose = () => {
    if (step === 'locked') {
      if (window.confirm('You have a pending booking. Are you sure you want to cancel?')) {
        onOpenChange(false);
      }
    } else {
      onOpenChange(false);
    }
  };

  const isProcessing = isBooking || isConfirming;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="bg-[#2c2e4b] text-white px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-semibold text-white">Book Theater</DialogTitle>
              <p className="text-xs text-white/70 mt-0.5">
                {patientName} — {procedureName}
              </p>
            </div>
            {step === 'confirmed' && confirmData?.billing && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-white/60">Theater Fee</p>
                <p className="text-sm font-bold text-[#caa26a]">
                  KES {(confirmData.billing.feeAmount ?? 0).toLocaleString()}
                  <span className="text-white/60 font-normal ml-1">
                    ({(confirmData.billing.durationHours ?? 0).toFixed(1)} hrs)
                  </span>
                </p>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-white p-6">
          {step === 'select' && (
            <div className="space-y-4">
              {localError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {localError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Duration (minutes)</p>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={15}
                    step={15}
                    className="h-8 text-sm font-semibold text-slate-900 border-slate-200 bg-white"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                  />
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Estimated Fee</p>
                  <p className="text-sm font-semibold text-slate-900">
                    KES {estimatedFee.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Status</p>
                  <p className="text-sm font-semibold text-slate-900">Open for booking</p>
                </div>
              </div>

              <TimeSlotPicker
                theaters={theaters || []}
                selectedDate={selectedDate}
                caseDurationMinutes={effectiveDuration}
                selectedTheaterId={selectedSlot?.theaterId}
                selectedStartTime={selectedSlot?.startTime}
                selectedEndTime={selectedSlot?.endTime}
                onDateChange={setSelectedDate}
                onSelectSlot={handleSelectSlot}
                isLoading={isLoadingTheaters}
              />

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button disabled={!selectedSlot || isProcessing} onClick={handleLockSlot}>
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isProcessing ? 'Locking...' : 'Lock Slot'}
                </Button>
              </div>
            </div>
          )}

          {step === 'locked' && bookingData && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-amber-900">Slot Locked Temporarily</div>
                  <div className="text-xs text-amber-700 mt-1">
                    This slot is reserved for 15 minutes. Complete confirmation to finalize the booking.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Theater</div>
                    <div className="text-sm font-medium text-slate-800">{bookingData.theaterName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Date</div>
                    <div className="text-sm font-medium text-slate-800">
                      {format(new Date(bookingData.startTime), 'MMMM d, yyyy')}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Time</div>
                    <div className="text-sm font-medium text-slate-800">
                      {format(new Date(bookingData.startTime), 'h:mm a')} —{' '}
                      {format(new Date(bookingData.endTime), 'h:mm a')}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Lock Expires</div>
                    <div className="text-sm font-medium text-red-600">
                      {format(new Date(bookingData.lockExpiresAt), 'h:mm:ss a')}
                    </div>
                  </div>
                </div>
              </div>

              {localError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {localError}
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('select');
                    setSelectedSlot(null);
                  }}
                >
                  Select Different Slot
                </Button>
                <Button disabled={isProcessing} onClick={handleConfirmBooking}>
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isProcessing ? 'Confirming...' : 'Confirm Booking'}
                </Button>
              </div>
            </div>
          )}

          {step === 'confirmed' && confirmData && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-emerald-900">Booking Confirmed</div>
                  <div className="text-xs text-emerald-700 mt-1">
                    The case has been scheduled and the patient has been notified.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Theater</div>
                    <div className="text-sm font-medium text-slate-800">{confirmData.theaterName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Date</div>
                    <div className="text-sm font-medium text-slate-800">
                      {format(new Date(confirmData.startTime), 'MMMM d, yyyy')}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Time</div>
                    <div className="text-sm font-medium text-slate-800">
                      {format(new Date(confirmData.startTime), 'h:mm a')} —{' '}
                      {format(new Date(confirmData.endTime), 'h:mm a')}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Case Status</div>
                    <div className="text-sm font-medium text-purple-700">SCHEDULED</div>
                  </div>
                </div>
              </div>

              {confirmData.billing && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Theater Fee</div>
                  <div className="text-sm font-medium text-slate-800">
                    KES {(confirmData.billing.feeAmount ?? 0).toLocaleString()}
                    <span className="text-slate-400 font-normal ml-1">
                      ({(confirmData.billing.durationHours ?? 0).toFixed(1)} hours)
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-200">
                <Button onClick={() => onOpenChange(false)}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
