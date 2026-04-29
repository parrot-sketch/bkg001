'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { TimeSlotPicker } from '@/components/theater-tech/booking/TimeSlotPicker';
import { useTheaterBooking } from '@/hooks/theater-tech/useTheaterBooking';
import { useTheaterBookingActions } from '@/hooks/theater-tech/useTheaterBookingActions';

type SelectedSlot = { theaterId: string; theaterName: string; startTime: string; endTime: string };

export function RescheduleBookingDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: null | {
    bookingId: string;
    caseId: string;
    patientName: string;
    procedure: string;
    startTime: string;
    endTime: string;
  };
}) {
  const { open, onOpenChange, booking } = props;
  const { rescheduleBooking, isRescheduling } = useTheaterBookingActions();

  const initialDate = useMemo(() => {
    const dt = booking?.startTime ? new Date(booking.startTime) : new Date();
    return format(dt, 'yyyy-MM-dd');
  }, [booking?.startTime]);

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelectedDate(initialDate);
    setSelectedSlot(null);
    setReason('');
  }, [open, initialDate]);

  const { theaters, isLoadingTheaters, theatersError } = useTheaterBooking({
    caseId: booking?.caseId || '00000000-0000-0000-0000-000000000000',
    date: selectedDate,
    enabled: open,
  });

  const headerTitle = booking ? `${booking.patientName} — ${booking.procedure}` : 'Booking';
  const currentSlotLabel = booking?.startTime
    ? `${format(new Date(booking.startTime), 'MMM d, yyyy HH:mm')} — ${format(new Date(booking.endTime), 'HH:mm')}`
    : '';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setSelectedSlot(null);
          setReason('');
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reschedule Theater Booking</DialogTitle>
        </DialogHeader>

        {booking ? (
          <div className="text-sm text-slate-700">
            <div className="font-medium">{headerTitle}</div>
            <div className="text-xs text-slate-500 mt-0.5">Current: {currentSlotLabel}</div>
          </div>
        ) : null}

        {theatersError ? (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {theatersError.message}
          </div>
        ) : null}

        <TimeSlotPicker
          theaters={(theaters || []).map((t) => ({
            ...t,
            // Ensure dates are Date objects for the picker
            bookings: (t.bookings || []).map((b: any) => ({
              ...b,
              startTime: new Date(b.startTime),
              endTime: new Date(b.endTime),
              lockedAt: b.lockedAt ? new Date(b.lockedAt) : null,
              lockExpiresAt: b.lockExpiresAt ? new Date(b.lockExpiresAt) : null,
            })),
          })) as any}
          selectedDate={selectedDate}
          caseDurationMinutes={60}
          selectedTheaterId={selectedSlot?.theaterId}
          selectedStartTime={selectedSlot?.startTime}
          selectedEndTime={selectedSlot?.endTime}
          onDateChange={setSelectedDate}
          onSelectSlot={(theaterId, startTime, endTime) => {
            const theater = (theaters || []).find((t) => t.id === theaterId);
            if (!theater) return;
            setSelectedSlot({
              theaterId,
              theaterName: theater.name,
              startTime,
              endTime,
            });
          }}
          isLoading={isLoadingTheaters}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-xs text-slate-600">
              Reason (optional)
            </Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., surgeon request, slot conflict…"
            />
          </div>
          <div className="text-xs text-slate-500 md:text-right md:self-end">
            {selectedSlot ? (
              <span>
                New: {format(new Date(selectedSlot.startTime), 'MMM d, yyyy HH:mm')} —{' '}
                {format(new Date(selectedSlot.endTime), 'HH:mm')} ({selectedSlot.theaterName})
              </span>
            ) : (
              <span>Select a new slot to proceed.</span>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRescheduling}>
            Close
          </Button>
          <Button
            disabled={!booking?.bookingId || !selectedSlot || isRescheduling}
            onClick={async () => {
              if (!booking?.bookingId || !selectedSlot) return;
              try {
                await rescheduleBooking({
                  bookingId: booking.bookingId,
                  theaterId: selectedSlot.theaterId,
                  startTime: selectedSlot.startTime,
                  endTime: selectedSlot.endTime,
                  reason: reason.trim() || undefined,
                });
                toast.success('Booking rescheduled');
                onOpenChange(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Failed to reschedule booking');
              }
            }}
          >
            Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

