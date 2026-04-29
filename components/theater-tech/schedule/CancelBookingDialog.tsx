'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useTheaterBookingActions } from '@/hooks/theater-tech/useTheaterBookingActions';

export function CancelBookingDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string | null;
  title: string;
  subtitle?: string;
}) {
  const { open, onOpenChange, bookingId, title, subtitle } = props;
  const { cancelBooking, isCancelling } = useTheaterBookingActions();
  const [reason, setReason] = useState('');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setReason('');
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancel Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm text-slate-700">
            <div className="font-medium">{title}</div>
            {subtitle ? <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-xs text-slate-600">
              Reason (optional)
            </Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., patient request, surgeon unavailable…"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCancelling}>
            Close
          </Button>
          <Button
            variant="destructive"
            disabled={!bookingId || isCancelling}
            onClick={async () => {
              if (!bookingId) return;
              try {
                await cancelBooking({ bookingId, reason: reason.trim() || undefined });
                toast.success('Booking cancelled');
                onOpenChange(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Failed to cancel booking');
              }
            }}
          >
            Cancel Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

