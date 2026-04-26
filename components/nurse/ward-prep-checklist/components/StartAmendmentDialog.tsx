'use client';

import { FilePen, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function StartAmendmentDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  error?: string;
  isPending?: boolean;
  onStart: () => void;
}) {
  const { open, onOpenChange, reason, onReasonChange, error, isPending, onStart } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Amendment</DialogTitle>
          <DialogDescription>
            Please provide a reason for amending this finalized checklist. This will be recorded in the audit trail.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="amend-reason">
              Reason for amendment
            </label>
            <textarea
              id="amend-reason"
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Describe why this record needs to be amended..."
              rows={4}
              className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onStart} disabled={isPending} className="bg-amber-600 hover:bg-amber-700">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <FilePen className="mr-2 h-4 w-4" />
            Start Amendment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

