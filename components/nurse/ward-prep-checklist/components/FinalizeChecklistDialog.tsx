'use client';

import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function FinalizeChecklistDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}) {
  const { open, onOpenChange, onConfirm, isPending } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finalize Checklist</DialogTitle>
          <DialogDescription>
            This will lock the checklist and mark it as complete. You can still amend it later if needed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Finalize
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

