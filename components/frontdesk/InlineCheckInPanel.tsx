'use client';

/**
 * Inline Check-In Panel
 *
 * Expandable panel that slides below an appointment card for confirming patient arrival.
 * Receives mutation handler from parent to allow CTA-level state coordination.
 */

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Loader2, ClipboardEdit } from 'lucide-react';
import type { UseMutationResult } from '@tanstack/react-query';

interface InlineCheckInPanelProps {
  appointmentId: number;
  patientName: string;
  doctorName?: string;
  time: string;
  isOpen: boolean;
  onToggle: () => void;
  checkInMutation: UseMutationResult<unknown, Error, { appointmentId: number; notes?: string }>;
}

export function InlineCheckInPanel({
  appointmentId,
  patientName,
  doctorName,
  time,
  isOpen,
  onToggle,
  checkInMutation,
}: InlineCheckInPanelProps) {
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [notes, setNotes] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const { mutate: checkIn, isPending: isCheckingIn } = checkInMutation;

  // Track if this panel initiated the check-in (to show its own success state)
  const [ownsCheckIn, setOwnsCheckIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => notesRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // When mutation completes and this panel initiated it, show success
  useEffect(() => {
    if (ownsCheckIn && !isCheckingIn && showSuccess) {
      // Mutation done, success already showing — schedule panel close
      const timer = setTimeout(() => {
        onToggle();
        setShowSuccess(false);
        setOwnsCheckIn(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [ownsCheckIn, isCheckingIn, showSuccess, onToggle]);

  const handleConfirm = () => {
    setOwnsCheckIn(true);
    checkIn(
      { appointmentId, notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          setShowSuccess(true);
          setNotes('');
        },
      },
    );
  };

  const handleCancel = () => {
    onToggle();
    setNotes('');
  };

  const isDisabled = isCheckingIn && !ownsCheckIn;

  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-300 ease-in-out',
        isOpen ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0',
      )}
    >
      <div className="border-t border-[#e7d6bf] bg-[#e7d6bf]/10 px-4 py-4">
        {showSuccess ? (
          <div className="flex items-center justify-center gap-2.5 py-2 text-[#0c5d69]">
            <div className="h-8 w-8 rounded-full bg-[#e7d6bf]/30 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-[#0c5d69]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#2c2e4b]">Patient Checked In</p>
              <p className="text-xs text-[#2c2e4b]/60">{patientName} is now in the waiting room</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-[#2c2e4b]/70">
              <ClipboardEdit className="h-3.5 w-3.5 text-[#caa26a] shrink-0" />
              <span>
                Checking in <strong className="text-[#2c2e4b]">{patientName}</strong>
                {doctorName && (
                  <> for <strong className="text-[#2c2e4b]">{doctorName}</strong></>
                )}
                {' '}at <strong className="text-[#2c2e4b]">{time}</strong>
              </span>
            </div>

            <Textarea
              ref={notesRef}
              placeholder="Add arrival notes (e.g. late arrival, mobility issues)… optional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={isDisabled}
              className="resize-none text-sm border-[#e7d6bf] bg-white focus:border-[#caa26a] focus:ring-[#caa26a]/30 rounded-lg placeholder:text-[#2c2e4b]/30 transition-colors"
            />

            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isCheckingIn}
                className="h-8 text-xs text-[#2c2e4b]/50 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/30 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={isCheckingIn}
                className="h-8 px-4 text-xs font-semibold bg-[#2c2e4b] hover:bg-[#1a1c2f] text-white rounded-lg shadow-sm transition-all"
              >
                {isCheckingIn ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Confirming…
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                    Confirm Arrival
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
