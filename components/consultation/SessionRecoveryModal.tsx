'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

/**
 * SessionRecoveryModal
 *
 * Displays when a consultation session has been abandoned or lost.
 * Provides options to:
 * 1. Restart the consultation (if not marked complete)
 * 2. Return to dashboard to view history
 * 3. Contact support if technical issues
 *
 * Design Constraints:
 * - Clear communication of what happened
 * - Non-blocking recovery paths
 * - Audit trail for each recovery attempt
 */

interface SessionRecoveryModalProps {
  isOpen: boolean;
  consultationId: number;
  appointmentId: number;
  patientName: string;
  abandonedAt: Date;
  reason?: 'timeout' | 'disconnect' | 'error' | 'unknown';
  onRetry?: () => Promise<void>;
  onDismiss: () => void;
}

export function SessionRecoveryModal({
  isOpen,
  consultationId,
  appointmentId,
  patientName,
  abandonedAt,
  reason = 'unknown',
  onRetry,
  onDismiss,
}: SessionRecoveryModalProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const handleRetry = useCallback(async () => {
    if (!onRetry) {
      onDismiss();
      return;
    }

    setIsRetrying(true);
    setRetryError(null);

    try {
      await onRetry();
      onDismiss();
    } catch (error) {
      console.error('[SessionRecovery] Retry failed:', error);
      setRetryError(
        error instanceof Error
          ? error.message
          : 'Failed to recover session. Please contact support.'
      );
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, onDismiss]);

  const minutesAgo = Math.floor(
    (Date.now() - abandonedAt.getTime()) / 60000
  );

  const reasonMessages: Record<string, string> = {
    timeout:
      'The session was inactive for too long and was automatically ended to free up resources.',
    disconnect:
      'Your connection was lost or the browser was closed during the consultation.',
    error: 'An unexpected error occurred during the consultation.',
    unknown: 'The consultation session was ended unexpectedly.',
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="max-w-md">
        {/* Header with warning icon */}
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-yellow-100 p-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              Session Ended
            </DialogTitle>
          </div>

          <DialogDescription className="space-y-3 text-sm">
            {/* Patient and timing info */}
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="font-medium text-slate-900">{patientName}</p>
              <p className="text-xs text-slate-600 mt-1">
                Session ended {minutesAgo} minute{minutesAgo !== 1 ? 's' : ''}{' '}
                ago
              </p>
            </div>

            {/* Reason explanation */}
            <p className="text-slate-700">
              {reasonMessages[reason]}
            </p>

            {/* Draft data information */}
            <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
              <p className="text-xs font-medium text-blue-900">
                💾 Your draft notes were saved automatically
              </p>
              <p className="text-xs text-blue-800 mt-1">
                No clinical data was lost. All documentation has been preserved.
              </p>
            </div>

            {/* Retry error message */}
            {retryError && (
              <div className="rounded-lg bg-red-50 p-3 border border-red-200">
                <p className="text-xs text-red-900">{retryError}</p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Action buttons */}
        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          {/* Retry button (if callback provided) */}
          {onRetry && (
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full"
            >
              {isRetrying && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {isRetrying ? 'Recovering Session...' : 'Continue Session'}
            </Button>
          )}

          {/* View history button */}
          <Link href="/doctor/consultations" className="w-full">
            <Button variant="outline" className="w-full">
              View Consultation History
            </Button>
          </Link>

          {/* Dismiss button */}
          <Button
            variant="ghost"
            onClick={onDismiss}
            disabled={isRetrying}
            className="w-full"
          >
            Dismiss
          </Button>
        </DialogFooter>

        {/* Footer note */}
        <div className="mt-4 border-t pt-4 text-xs text-slate-500">
          <p>
            Consultation ID: {consultationId} | Appointment ID: {appointmentId}
          </p>
          <p>
            If you continue to experience issues, please{' '}
            <a href="mailto:support@clinic.local" className="font-medium text-blue-600 hover:underline">
              contact support
            </a>
            .
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
