'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';

interface Vendor { id: string; name: string; }
interface CatalogItem { id: number; name: string; sku: string | null; unit_cost: number; unit_of_measure: string | null; }
interface POLine { itemName: string; inventoryItemId: number | null; quantityOrdered: number; unitPrice: number; uom: string; }

export function CreatePODialog({ isOpen, onClose, onCreated }: {
  isOpen: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [lines, setLines] = useState<POLine[]>([{ itemName: '', inventoryItemId: null, quantityOrdered: 1, unitPrice: 0, uom: 'Unit' }]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingVendors, setIsLoadingVendors] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [vendorError, setVendorError] = useState('');
  const [itemError, setItemError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setIsLoadingVendors(true);
    setVendorError('');
    apiClient.request<{ data: Vendor[] }>('/stores/vendors?pageSize=200').then(r => {
      if (r.success) {
        setVendors(r.data.data ?? []);
      } else {
        setVendorError('Failed to load vendors. Please try again.');
      }
      setIsLoadingVendors(false);
    }).catch(() => {
      setVendorError('Error loading vendors');
      setIsLoadingVendors(false);
    });

    setIsLoadingItems(true);
    setItemError('');
    apiClient.request<{ data: CatalogItem[] }>('/inventory/items?limit=100').then(r => {
      if (r.success) {
        setItems(r.data.data ?? []);
      } else {
        setItemError('Failed to load inventory items.');
      }
      setIsLoadingItems(false);
    }).catch(() => {
      setItemError('Error loading inventory items');
      setIsLoadingItems(false);
    });
  }, [isOpen]);

  const addLine = () => setLines(prev => [...prev, { itemName: '', inventoryItemId: null, quantityOrdered: 1, unitPrice: 0, uom: 'Unit' }]);
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const updateLine = (idx: number, field: keyof POLine, value: any) => {
    setLines(prev => prev.map((line, i) => {
      if (i !== idx) return line;
      if (field === 'inventoryItemId') {
        const item = items.find(it => it.id === parseInt(value));
        return {
          ...line,
          inventoryItemId: item ? item.id : null,
          itemName: item ? item.name : line.itemName,
          unitPrice: item ? (item.unit_cost ?? 0) : line.unitPrice,
          uom: item?.unit_of_measure || 'Unit',
        };
      }
      return { ...line, [field]: value };
    }));
  };

  const total = lines.reduce((sum, l) => sum + (l.quantityOrdered * l.unitPrice), 0);

  const handleSubmit = async () => {
    if (!vendorId) { toast.error('Select a vendor'); return; }
    const validLines = lines.filter(l => l.itemName && l.quantityOrdered > 0);
    if (validLines.length === 0) { toast.error('Add at least one item'); return; }
    setIsSubmitting(true);
    try {
      const response = await apiClient.request('/stores/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
          vendorId,
          items: validLines.map(l => ({
            inventoryItemId: l.inventoryItemId || undefined,
            itemName: l.itemName,
            quantityOrdered: l.quantityOrdered,
            unitPrice: l.unitPrice,
          })),
          notes: notes || undefined,
        }),
      });
      if (!response.success) throw new Error(response.error || 'Failed');
      toast.success('Purchase order created');
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create PO');
    } finally { setIsSubmitting(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[680px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Purchase Order</DialogTitle>
          <DialogDescription>Create a purchase order for a vendor.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {/* Vendor */}
          <div className="space-y-2">
            <Label>Vendor <span className="text-red-500">*</span></Label>
            {vendorError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{vendorError}</AlertDescription>
              </Alert>
            )}
            <Select value={vendorId} onValueChange={setVendorId} disabled={isLoadingVendors}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingVendors ? 'Loading vendors…' : vendors.length === 0 ? 'No vendors available' : 'Select vendor…'} />
              </SelectTrigger>
              <SelectContent>
                {vendors.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <Label>Line Items</Label>
            {itemError && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{itemError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="flex items-end gap-2 p-3 border rounded-lg bg-muted/30">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Item</Label>
                    <Select
                      value={line.inventoryItemId != null ? String(line.inventoryItemId) : ''}
                      onValueChange={val => updateLine(idx, 'inventoryItemId', val)}
                      disabled={isLoadingItems}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder={isLoadingItems ? 'Loading…' : items.length === 0 ? 'No items' : 'Select item…'} />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map(it => (
                          <SelectItem key={it.id} value={String(it.id)}>
                            {it.name}{it.sku ? ` (${it.sku})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* UOM badge */}
                  <div className="w-16 space-y-1 text-center">
                    <Label className="text-xs">UOM</Label>
                    <div className="h-9 flex items-center justify-center border rounded-md bg-background px-2 text-xs font-medium text-muted-foreground">
                      {line.uom}
                    </div>
                  </div>
                  <div className="w-20 space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min="1" className="h-9 text-sm" value={line.quantityOrdered}
                      onChange={e => updateLine(idx, 'quantityOrdered', parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="w-28 space-y-1">
                    <Label className="text-xs">Unit Price (KES)</Label>
                    <Input type="number" min="0" step="0.01" className="h-9 text-sm" value={line.unitPrice ?? 0}
                      onChange={e => updateLine(idx, 'unitPrice', parseFloat(e.target.value) || 0)} />
                  </div>
                  {lines.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeLine(idx)} className="h-9 px-2 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addLine} className="gap-1">
              <Plus className="h-3 w-3" /> Add Item
            </Button>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
          </div>

          {/* Total */}
          <div className="flex justify-end border-t pt-3">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Order Total</p>
              <p className="text-xl font-bold">KES {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create PO'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
