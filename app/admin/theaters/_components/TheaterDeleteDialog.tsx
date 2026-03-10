'use client';

import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Theater } from './types';

interface TheaterDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theater: Theater | null;
  saving: boolean;
  onDelete: () => void;
}

export function TheaterDeleteDialog({
  open,
  onOpenChange,
  theater,
  saving,
  onDelete,
}: TheaterDeleteDialogProps) {
  if (!theater) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <div className="h-1.5 w-full bg-rose-500" />
          
          <div className="p-8">
            <DialogHeader className="pb-4">
                <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
                    <AlertTriangle className="h-6 w-6 text-rose-600" />
                </div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                    Decommission Theater?
                </DialogTitle>
                <DialogDescription className="text-slate-500 font-medium pt-2">
                    This action will permanently remove <span className="text-slate-900 font-bold italic">{theater.name}</span> from the clinical infrastructure list. 
                    Historical records will remain, but the room will no longer be available for scheduling.
                </DialogDescription>
            </DialogHeader>

            {theater._count.bookings > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 mb-6">
                    <div className="flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-amber-900">Active Dependencies Detected</p>
                            <p className="text-[11px] text-amber-700 font-medium mt-1">
                                This theater has {theater._count.bookings} scheduled bookings. Deleting it will leave these cases unassigned.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <DialogFooter className="gap-3 sm:gap-0 pt-2">
                <Button
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    disabled={saving}
                    className="rounded-xl font-bold text-slate-500 hover:text-slate-900"
                >
                    Cancel Action
                </Button>
                <Button
                    variant="destructive"
                    onClick={onDelete}
                    disabled={saving}
                    className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/20 px-8"
                >
                    {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Permanently Delete
                </Button>
            </DialogFooter>
          </div>
        </DialogContent>
    </Dialog>
  );
}
