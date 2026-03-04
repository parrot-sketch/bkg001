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
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * PatientSwitchConfirmation
 *
 * Confirmation dialog before switching to a new patient.
 *
 * Features:
 * - Shows current and next patient
 * - Auto-saves draft notes before switch
 * - Prevents data loss
 * - Confirms all changes are preserved
 * - Provides audit trail
 *
 * Design Principles:
 * - Safety first: Require explicit confirmation
 * - Transparency: Show what will be saved
 * - Clarity: Make consequences clear
 * - Speed: Don't block workflow unnecessarily
 */

interface PatientSwitchConfirmationProps {
  isOpen: boolean;
  currentPatientName: string;
  nextPatientName: string;
  hasDrafts: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function PatientSwitchConfirmation({
  isOpen,
  currentPatientName,
  nextPatientName,
  hasDrafts,
  onConfirm,
  onCancel,
}: PatientSwitchConfirmationProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);

  const handleConfirm = useCallback(async () => {
    setIsProcessing(true);
    setSaveError(null);
    setSavedSuccessfully(false);

    try {
      await onConfirm();
      setSavedSuccessfully(true);

      // Brief delay to show success state before closing
      await new Promise((resolve) => setTimeout(resolve, 800));
      onCancel();
    } catch (error) {
      console.error('[PatientSwitch] Error during confirmation:', error);
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Failed to save and switch. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  }, [onConfirm, onCancel]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
            </div>
            <DialogTitle>Switch to Next Patient?</DialogTitle>
          </div>

          <DialogDescription className="space-y-4 text-sm">
            {/* Current patient info */}
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
              <p className="text-xs font-medium text-slate-600">COMPLETING</p>
              <p className="font-semibold text-slate-900 mt-1">
                {currentPatientName}
              </p>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="text-slate-400">↓</div>
            </div>

            {/* Next patient info */}
            <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200">
              <p className="text-xs font-medium text-emerald-700">STARTING</p>
              <p className="font-semibold text-emerald-900 mt-1">
                {nextPatientName}
              </p>
            </div>

            {/* Draft notes info */}
            {hasDrafts && (
              <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
                <p className="text-xs text-blue-900">
                  ✓ Your draft notes for {currentPatientName} will be auto-saved
                  before switching
                </p>
              </div>
            )}

            {/* Save error */}
            {saveError && (
              <div className="rounded-lg bg-red-50 p-3 border border-red-200">
                <p className="text-xs font-medium text-red-900">{saveError}</p>
              </div>
            )}

            {/* Success state */}
            {savedSuccessfully && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-emerald-50 p-3 border border-emerald-200 flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-900 font-medium">
                  Changes saved. Switching now...
                </p>
              </motion.div>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Actions */}
        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {isProcessing && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isProcessing ? 'Saving and switching...' : 'Switch Patient'}
          </Button>

          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="w-full"
          >
            Cancel
          </Button>
        </DialogFooter>

        {/* Help text */}
        <div className="mt-4 pt-4 border-t text-xs text-slate-500">
          <p>
            Switching patients will save your current notes and begin the next
            consultation. No data will be lost.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
