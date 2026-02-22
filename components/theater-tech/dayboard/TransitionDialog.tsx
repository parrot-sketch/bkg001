/**
 * Component: TransitionDialog
 *
 * Dialog for confirming case status transitions with optional reason.
 */

import { ChevronRight, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { DayboardCaseDto } from '@/application/dtos/TheaterTechDtos';
import { extractMissingItems, isGateBlockedError } from '@/lib/theater-tech/dayboardHelpers';

interface TransitionDialogProps {
  dialog: { caseData: DayboardCaseDto; action: string; label: string } | null;
  reason: string;
  setReason: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
  error: Error | null;
}

export function TransitionDialog({
  dialog,
  reason,
  setReason,
  onConfirm,
  onClose,
  isPending,
  error,
}: TransitionDialogProps) {
  const missingItems = error && isGateBlockedError(error) ? extractMissingItems(error) : [];

  return (
    <Dialog open={!!dialog} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{dialog?.label}</DialogTitle>
          <DialogDescription className="text-xs">
            Advancing{' '}
            <span className="font-semibold">{dialog?.caseData.patient.fullName}</span> —{' '}
            {dialog?.caseData.procedureName || 'Procedure'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            Reason / Notes (optional)
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Add any notes for the audit trail…"
            className="text-sm"
            rows={2}
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
            <p className="text-xs font-medium text-red-700">{error.message}</p>
            {missingItems.length > 0 && (
              <ul className="space-y-1">
                {missingItems.map((item, i) => (
                  <li key={i} className="text-[11px] text-red-600 flex items-start gap-1.5">
                    <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 mr-1" />
            )}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
