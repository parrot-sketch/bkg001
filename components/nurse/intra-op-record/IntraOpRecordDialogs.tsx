'use client';

/**
 * Intra-Op Record Dialogs
 *
 * Finalize confirmation and missing items dialogs.
 */

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Lock, AlertTriangle, Circle } from 'lucide-react';

// ─── Finalize Dialog ──────────────────────────────────────────

interface FinalizeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isPending: boolean;
    hasDiscrepancy: boolean;
}

export function FinalizeDialog({ open, onOpenChange, onConfirm, isPending, hasDiscrepancy }: FinalizeDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Finalize Intra-Op Record?</DialogTitle>
                    <DialogDescription>
                        This will lock the intra-operative record and record your digital signature.
                        All required fields including final counts and sign-out must be completed.
                        The record cannot be edited after finalization.
                    </DialogDescription>
                </DialogHeader>
                {hasDiscrepancy && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700 font-medium">
                            ⚠ Count discrepancy is flagged. Ensure discrepancy notes are documented.
                        </p>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isPending}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {isPending ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Finalizing...</>
                        ) : (
                            <><Lock className="w-4 h-4 mr-2" /> Finalize & Sign</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Missing Items Dialog ─────────────────────────────────────

interface MissingItemsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: string[];
}

export function MissingItemsDialog({ open, onOpenChange, items }: MissingItemsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Cannot Finalize
                    </DialogTitle>
                    <DialogDescription>
                        The following required fields are missing or invalid:
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-64 overflow-y-auto space-y-1.5">
                    {items.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                            <Circle className="h-3 w-3 text-destructive shrink-0 mt-1" />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>
                        Close & Fix Issues
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
