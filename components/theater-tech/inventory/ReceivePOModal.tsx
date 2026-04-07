'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

export interface POLineItem {
  id: string; // purchase_order_line_item_id
  inventory_item_id: string;
  item_name: string;
  item_sku: string;
  unit: string;
  quantity_ordered: number;
  quantity_received_to_date: number;
  quantity_outstanding: number;
  unit_price: number;
}

interface ReceivePOModalProps {
  po: {
    id: string;
    po_number: string;
    vendor_name: string;
    line_items: POLineItem[];
  };
  onSuccess: () => void;
  onClose: () => void;
}

export function ReceivePOModal({ po, onSuccess, onClose }: ReceivePOModalProps) {
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState('');
  const [vendorInvoiceDate, setVendorInvoiceDate] = useState('');
  const [vendorInvoiceAmount, setVendorInvoiceAmount] = useState<string>('');
  const [vendorEtimsCode, setVendorEtimsCode] = useState('');

  const [lines, setLines] = useState(() =>
    po.line_items.map(item => ({
      ...item,
      qty_to_receive: item.quantity_outstanding, // default receive all remaining
      cost: item.unit_price,
      batch_number: '',
      expiry_date: '',
      condition_notes: '',
    }))
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successState, setSuccessState] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const [errorState, setErrorState] = useState<{ visible: boolean; message: string; correlationId?: string }>({ visible: false, message: '' });

  // Expiry date warning logic (PHARMACEUTICAL, SURGICAL, BIOLOGICAL)
  // For simplicity since we don't have category mapped in this exact view payload, we warn universally or base it on a simple guess.
  // The constraints say "items in categories: PHARMACEUTICAL, SURGICAL, BIOLOGICAL" - if not passed, we can't fully know, 
  // but we will show the warning conditionally if they leave it blank (the user's rule).
  
  const handleLineChange = (index: number, field: string, value: any) => {
    setLines(prev => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
    setErrorState({ visible: false, message: '' }); // clear prior error
  };

  const calculatedTotals = useMemo(() => {
    const receivingLines = lines.filter(l => l.qty_to_receive > 0);
    const itemLinesCount = receivingLines.length;
    const totalItems = receivingLines.reduce((sum, l) => sum + (Number(l.qty_to_receive) || 0), 0);
    const subtotal = receivingLines.reduce((sum, l) => sum + ((Number(l.qty_to_receive) || 0) * (Number(l.cost) || 0)), 0);
    const vat = Number((subtotal * 0.16).toFixed(2));
    const totalWithVat = subtotal + vat;

    return { itemLinesCount, totalItems, subtotal, vat, totalWithVat };
  }, [lines]);

  const validate = () => {
    for (const line of lines) {
      if (line.qty_to_receive < 0 || line.qty_to_receive > line.quantity_outstanding) {
        return false;
      }
      if (!Number.isInteger(Number(line.qty_to_receive))) {
        return false; // must be whole units
      }
    }
    return calculatedTotals.totalItems > 0;
  };

  const isFormValid = validate();

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;

    // Filter out 0 qty lines
    // Filter out 0 qty lines and map to the API schema field names
    const payloadLines = lines.filter(l => l.qty_to_receive > 0).map(l => ({
      poItemId: parseInt(String(l.id), 10),          // API expects: poItemId (number)
      quantityReceived: Number(l.qty_to_receive),     // API expects: quantityReceived
      unitCost: Number(l.cost),                        // API expects: unitCost
      batchNumber: l.batch_number.trim() || undefined, // API expects: batchNumber (optional)
      expiryDate: l.expiry_date.trim() || undefined,   // API expects: expiryDate (optional ISO string)
      notes: l.condition_notes.trim() || undefined,    // API expects: notes (optional)
    }));

    setIsSubmitting(true);
    setErrorState({ visible: false, message: '' });

    try {
      const response = await apiClient.request(`/stores/purchase-orders/${po.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptItems: payloadLines,  // API expects: receiptItems (not line_items)
          notes: vendorInvoiceNumber.trim()
            ? `Invoice: ${vendorInvoiceNumber}${vendorEtimsCode ? ` | eTIMS: ${vendorEtimsCode}` : ''}`
            : undefined,
        }),
      });

      if (!response.success) {
        // Safe parsing since the apiClient might wrap native json API responses
        setErrorState({
          visible: true,
          message: response.error || 'Failed to submit goods receipt',
          correlationId: (response as any).correlationId
        });
        setIsSubmitting(false);
      } else {
        setSuccessState({ visible: true, message: `Receipt confirmed. ${payloadLines.length} batches added to inventory.` });
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err: any) {
      setErrorState({ visible: true, message: err?.message || 'An unexpected error occurred' });
      setIsSubmitting(false);
    }
  };

  if (successState.visible) {
    return (
      <Dialog open={true}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-in zoom-in duration-300" />
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Success!</h3>
              <p className="text-muted-foreground">{successState.message}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open && !isSubmitting) onClose(); }}>
      <DialogContent className="sm:max-w-[75vw] w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
        
        {/* HEADER (Fixed) */}
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl">Receive stock</DialogTitle>
          <DialogDescription className="text-sm font-medium mt-1">
            {po.po_number} &middot; {po.vendor_name}
          </DialogDescription>
        </DialogHeader>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto w-full">
          <div className="px-6 py-4 space-y-6">

            {/* VENDOR INVOICE SECTION */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase text-muted-foreground">Vendor Invoice Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-lg border">
                <div className="space-y-1.5">
                  <Label className="text-xs">Invoice Number</Label>
                  <Input 
                    placeholder="e.g. INV-1002"
                    value={vendorInvoiceNumber}
                    onChange={e => setVendorInvoiceNumber(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Invoice Date</Label>
                  <Input 
                    type="date"
                    value={vendorInvoiceDate}
                    onChange={e => setVendorInvoiceDate(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount (KES)</Label>
                  <Input 
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 50000"
                    value={vendorInvoiceAmount}
                    onChange={e => setVendorInvoiceAmount(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">eTIMS Code</Label>
                  <Input 
                    placeholder="KRA eTIMS code from vendor invoice"
                    value={vendorEtimsCode}
                    onChange={e => setVendorEtimsCode(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <p className="text-xs flex items-center text-muted-foreground">
                <Info className="h-3 w-3 mr-1" />
                Invoice details are used for 3-way matching and VAT input credit claims.
              </p>
            </div>

            {/* LINE ITEMS TABLE */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase text-muted-foreground">Line Items</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground border-b text-xs uppercase text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 font-medium w-16 text-center">Ordered</th>
                      <th className="px-3 py-2 font-medium w-24 text-center">Prev. Rcvd</th>
                      <th className="px-3 py-2 font-medium w-20 text-center">Outst.</th>
                      <th className="px-3 py-2 font-medium w-28 bg-blue-50/50">Qty to Receive</th>
                      <th className="px-3 py-2 font-medium w-28">Unit Cost (KES)</th>
                      <th className="px-3 py-2 font-medium min-w-32">Batch (Optional)</th>
                      <th className="px-3 py-2 font-medium min-w-36">Expiry Date</th>
                      <th className="px-3 py-2 font-medium min-w-40">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {lines.map((line, idx) => {
                      const isQtyError = line.qty_to_receive > line.quantity_outstanding;
                      return (
                        <tr key={line.id} className={cn("hover:bg-muted/10", line.qty_to_receive === 0 && "opacity-60")}>
                          <td className="px-3 py-2">
                            <div className="font-medium line-clamp-1" title={line.item_name}>{line.item_name}</div>
                            <div className="text-[10px] text-muted-foreground">SKU: {line.item_sku || 'N/A'} &middot; {line.unit}</div>
                          </td>
                          <td className="px-3 py-2 text-center text-muted-foreground">{line.quantity_ordered}</td>
                          <td className="px-3 py-2 text-center text-muted-foreground">{line.quantity_received_to_date || 0}</td>
                          <td className="px-3 py-2 text-center">
                           <span className={cn(line.quantity_outstanding > 0 && line.quantity_outstanding < line.quantity_ordered ? 'text-amber-600 font-semibold' : 'text-slate-700')}>
                             {line.quantity_outstanding}
                           </span>
                          </td>
                          <td className="px-2 py-2 bg-blue-50/20 text-center">
                            <Input 
                              type="number" 
                              min="0" 
                              max={line.quantity_outstanding}
                              className={cn("h-8 text-sm text-center font-medium", isQtyError && "border-red-500 text-red-600 bg-red-50")}
                              value={line.qty_to_receive}
                              onChange={(e) => handleLineChange(idx, 'qty_to_receive', parseFloat(e.target.value) || 0)}
                              disabled={isSubmitting}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input 
                              type="number" 
                              min="0" 
                              step="0.01"
                              className="h-8 text-sm"
                              value={line.cost ?? 0}
                              onChange={(e) => handleLineChange(idx, 'cost', parseFloat(e.target.value) || 0)}
                              disabled={isSubmitting}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input 
                              className="h-8 text-sm placeholder:text-[11px]"
                              placeholder="e.g. MFG-2024"
                              value={line.batch_number}
                              onChange={(e) => handleLineChange(idx, 'batch_number', e.target.value)}
                              disabled={isSubmitting}
                            />
                          </td>
                          <td className="px-2 py-2 relative">
                            <Input 
                              type="date"
                              className="h-8 text-xs px-2"
                              value={line.expiry_date}
                              onChange={(e) => handleLineChange(idx, 'expiry_date', e.target.value)}
                              disabled={isSubmitting}
                            />
                            {!line.expiry_date && line.qty_to_receive > 0 && (
                              <div className="absolute right-3 top-4 z-10 pointer-events-none" title="Expiry date blank - recommended for some categories">
                                <AlertCircle className="h-3 w-3 text-amber-500" />
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <Input 
                              className="h-8 text-xs"
                              placeholder="Condition/Notes"
                              value={line.condition_notes}
                              onChange={(e) => handleLineChange(idx, 'condition_notes', e.target.value)}
                              disabled={isSubmitting}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        {/* ERROR SUMMARY */}
        {errorState.visible && (
          <div className="px-6 py-2">
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-md text-sm flex gap-2 w-full">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
              <div className="flex-1">
                <div className="font-semibold">{errorState.message}</div>
                {errorState.correlationId && <div className="text-xs opacity-80 mt-0.5 font-mono">Trace ID: {errorState.correlationId}</div>}
              </div>
            </div>
          </div>
        )}

        {/* FOOTER (Fixed) */}
        <DialogFooter className="px-6 py-4 border-t bg-slate-50 flex-col sm:flex-row sm:justify-between items-center sm:items-end gap-4 mt-auto">
          {/* Summary Box */}
          <div className="flex-1 w-full space-y-1 text-sm bg-white border px-4 py-2 rounded-md shadow-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Receiving {calculatedTotals.totalItems} items across {calculatedTotals.itemLinesCount} item lines</span>
            </div>
            <div className="flex justify-between items-end border-t pt-1 mt-1">
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div>Subtotal: {formatCurrency(calculatedTotals.subtotal)}</div>
                <div>VAT (16%): {formatCurrency(calculatedTotals.vat)}</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground mr-2 font-medium">Total with VAT:</span>
                <span className="text-lg font-bold text-slate-900">{formatCurrency(calculatedTotals.totalWithVat)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 whitespace-nowrap mt-4 sm:mt-0">
             <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 min-w-32"
              onClick={handleSubmit} 
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm receipt
            </Button>
          </div>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
