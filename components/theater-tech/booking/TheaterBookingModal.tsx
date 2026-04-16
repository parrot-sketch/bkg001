'use client';

/**
 * TheaterBookingModal Component
 *
 * Modal for booking a theater slot for a surgical case.
 * Integrates with the theater tech workflow.
 *
 * - Shows available theaters and their schedules
 * - Allows selecting date and time slot
 * - Locks slot (provisional booking)
 * - Confirms booking
 * - Handles concurrent access with lock expiration
 */

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AlertCircle, Clock, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { TimeSlotPicker } from './TimeSlotPicker';
import { useTheaterBooking } from '@/hooks/theater-tech/useTheaterBooking';

interface TheaterBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  caseDurationMinutes: number;
  patientName: string;
  procedureName: string;
  onBookingConfirmed?: () => void;
}

interface SelectedSlot {
  theaterId: string;
  theaterName: string;
  startTime: string;
  endTime: string;
}

export function TheaterBookingModal({
  isOpen,
  onClose,
  caseId,
  caseDurationMinutes,
  patientName,
  procedureName,
  onBookingConfirmed,
}: TheaterBookingModalProps) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [step, setStep] = useState<'select' | 'locked' | 'confirmed'>('select');
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    theaters,
    isLoadingTheaters,
    fetchTheaters,
    isBooking,
    bookingData,
    bookingError,
    isConfirming,
    confirmData,
    confirmError,
    bookSlot,
    confirm,
  } = useTheaterBooking({ caseId });

  // Fetch theaters when modal opens or date changes
  useEffect(() => {
    if (isOpen && selectedDate) {
      fetchTheaters(selectedDate).catch(() => {});
    }
  }, [isOpen, selectedDate, fetchTheaters]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('select');
      setSelectedSlot(null);
      setLocalError(null);
    }
  }, [isOpen]);

  // Handle successful booking (provisional lock)
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

  // Handle booking error
  useEffect(() => {
    if (bookingError) {
      setLocalError(bookingError);
    }
  }, [bookingError]);

  // Handle successful confirmation
  useEffect(() => {
    if (confirmData) {
      setStep('confirmed');
      setLocalError(null);
    }
  }, [confirmData]);

  // Handle confirmation error
  useEffect(() => {
    if (confirmError) {
      setLocalError(confirmError);
    }
  }, [confirmError]);

  // Handle slot selection from TimeSlotPicker
  const handleSelectSlot = useCallback((theaterId: string, startTime: string, endTime: string) => {
    if (!theaterId || !startTime || !endTime) return;
    
    const theater = theaters?.find(t => t.id === theaterId);
    if (!theater) return;

    setSelectedSlot({
      theaterId,
      theaterName: theater.name,
      startTime,
      endTime,
    });
  }, [theaters]);

  // Handle lock slot button click
  const handleLockSlot = async () => {
    if (!selectedSlot) return;
    setLocalError(null);
    try {
      await bookSlot(selectedSlot.theaterId, selectedSlot.startTime, selectedSlot.endTime);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to lock slot');
    }
  };

  // Handle confirm button click
  const handleConfirmBooking = async () => {
    if (!bookingData?.bookingId) return;
    setLocalError(null);
    try {
      await confirm(bookingData.bookingId);
      onBookingConfirmed?.();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to confirm booking');
    }
  };

  const handleClose = () => {
    if (step === 'locked') {
      if (window.confirm('You have a pending booking. Are you sure you want to cancel?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const isProcessing = isBooking || isConfirming;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Book Theater Slot</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {patientName} — {procedureName}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            {/* Error display */}
            {localError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {localError}
              </div>
            )}

            {/* Time slot picker */}
            <TimeSlotPicker
              theaters={theaters || []}
              selectedDate={selectedDate}
              caseDurationMinutes={caseDurationMinutes}
              selectedTheaterId={selectedSlot?.theaterId}
              selectedStartTime={selectedSlot?.startTime}
              selectedEndTime={selectedSlot?.endTime}
              onDateChange={setSelectedDate}
              onSelectSlot={handleSelectSlot}
              isLoading={isLoadingTheaters}
            />

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                disabled={!selectedSlot || isProcessing}
                onClick={handleLockSlot}
              >
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isProcessing ? 'Locking...' : 'Lock Slot'}
              </Button>
            </div>
          </div>
        )}

        {step === 'locked' && bookingData && (
          <div className="space-y-6">
            {/* Lock confirmation */}
            <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-amber-900">
                  Slot Locked Temporarily
                </div>
                <div className="text-xs text-amber-700 mt-1">
                  This slot is reserved for 15 minutes. Complete confirmation to finalize the booking.
                </div>
              </div>
            </div>

            {/* Booking details */}
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
                    {format(new Date(bookingData.startTime), 'h:mm a')} — {format(new Date(bookingData.endTime), 'h:mm a')}
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

            {/* Error display */}
            {localError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {localError}
              </div>
            )}

            {/* Action buttons */}
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
              <Button
                disabled={isProcessing}
                onClick={handleConfirmBooking}
              >
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isProcessing ? 'Confirming...' : 'Confirm Booking'}
              </Button>
            </div>
          </div>
        )}

        {step === 'confirmed' && confirmData && (
          <div className="space-y-6">
            {/* Success confirmation */}
            <div className="flex items-start gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-emerald-900">
                  Booking Confirmed
                </div>
                <div className="text-xs text-emerald-700 mt-1">
                  The case has been scheduled and the patient has been notified.
                </div>
              </div>
            </div>

            {/* Booking details */}
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
                    {format(new Date(confirmData.startTime), 'h:mm a')} — {format(new Date(confirmData.endTime), 'h:mm a')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Case Status</div>
                  <div className="text-sm font-medium text-purple-700">SCHEDULED</div>
                </div>
              </div>
            </div>

            {/* Billing info */}
            {confirmData.billing && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Theater Fee</div>
                <div className="text-sm font-medium text-slate-800">
                  KES {confirmData.billing.feeAmount.toLocaleString()} 
                  <span className="text-slate-400 font-normal ml-1">
                    ({confirmData.billing.durationHours.toFixed(1)} hours)
                  </span>
                </div>
              </div>
            )}

            {/* Close button */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <Button onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}