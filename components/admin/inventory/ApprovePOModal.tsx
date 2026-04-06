'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';

interface PoSummary {
  id: string;
  po_number: string;
  vendor_name: string;
  total_amount: number;
  line_items_count: number;
  ordered_by: string;
  submitted_at: string;
}

interface ApprovePOModalProps {
  isOpen: boolean;
  mode: 'APPROVE' | 'REJECT' | null;
  po: PoSummary | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function ApprovePOModal({ isOpen, mode, po, onConfirm, onClose }: ApprovePOModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Reset state when opening/closing
  React.useEffect(() => {
    if (isOpen) {
      setRejectReason('');
      setInlineError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, po?.id]);

  const handleAction = async () => {
    if (!po || !mode) return;

    if (mode === 'REJECT' && rejectReason.trim().length < 10) {
      setInlineError('Rejection reason must be at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    setInlineError(null);

    try {
      const endpoint = mode === 'APPROVE' 
        ? `/stores/purchase-orders/${po.id}/approve`
        : `/stores/purchase-orders/${po.id}/reject`;

      const response = await apiClient.request(endpoint, {
        method: 'POST',
        body: mode === 'REJECT' ? JSON.stringify({ reason: rejectReason }) : undefined,
      });

      if (!response.success) {
        // We use JSON stringify if the error contains a structured error or correlationId from the backend
        const errorMessage = typeof response.error === 'object' 
          ? JSON.stringify(response.error) 
          : response.error || 'Failed to process request';
        setInlineError(errorMessage);
      } else {
        toast.success(mode === 'APPROVE' ? 'Purchase order approved' : 'Purchase order rejected');
        onConfirm();
      }
    } catch (err) {
      setInlineError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!po) return null;

  const isApprove = mode === 'APPROVE';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Prevent closing if subitting
      if (!isSubmitting) {
        if (!open) onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApprove ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
            {isApprove ? 'Approve Purchase Order' : 'Reject Purchase Order'}
          </DialogTitle>
          <DialogDescription>
            {isApprove 
              ? 'Please review the purchase order details before final financial approval.' 
              : 'Provide a reason for rejecting this purchase order. The requester will be notified.'}
          </DialogDescription>
        </DialogHeader>

        {/* Info Card */}
        <div className="bg-slate-50 border rounded-lg p-4 space-y-3 text-sm my-2">
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">PO Number:</span>
            <span className="font-mono font-medium">{po.po_number}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Vendor:</span>
            <span className="font-medium">{po.vendor_name}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Items Ordered:</span>
            <span>{po.line_items_count} lines</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Requested By:</span>
            <span>{po.ordered_by}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Submitted Date:</span>
            <span>{new Date(po.submitted_at).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total Value:</span>
            <span className="text-lg">
              KES {po.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {inlineError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1 break-words font-mono text-xs">{inlineError}</div>
          </div>
        )}

        {/* Content Flow */}
        <div className="space-y-4">
          {isApprove ? (
            <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Approving this PO authorises procurement to place the order with the vendor.
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="reason">
                Rejection Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                disabled={isSubmitting}
                placeholder="Briefly explain why this order is rejected..."
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (inlineError) setInlineError(null);
                }}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters required. Valid reasoning allows the user to correct and resubmit.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            variant={isApprove ? 'default' : 'destructive'} 
            onClick={handleAction} 
            disabled={isSubmitting || (!isApprove && rejectReason.trim().length < 10)}
            className={isApprove ? "bg-emerald-600 hover:bg-emerald-700" : ""}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isApprove ? 'Approve PO' : 'Reject PO'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
