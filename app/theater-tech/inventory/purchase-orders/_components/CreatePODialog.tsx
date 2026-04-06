'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';

interface Vendor { id: string; name: string; }
interface CatalogItem { id: number; name: string; sku: string | null; unit_cost: number; }
interface POLine { itemName: string; inventoryItemId: number | null; quantityOrdered: number; unitPrice: number; }

export function CreatePODialog({ isOpen, onClose, onCreated }: {
  isOpen: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [lines, setLines] = useState<POLine[]>([{ itemName: '', inventoryItemId: null, quantityOrdered: 1, unitPrice: 0 }]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingVendors, setIsLoadingVendors] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [vendorError, setVendorError] = useState('');
  const [itemError, setItemError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    
    // Fetch vendors
    setIsLoadingVendors(true);
    setVendorError('');
    apiClient.request<{ data: Vendor[] }>('/stores/vendors?pageSize=200').then(r => {
      if (r.success) {
        setVendors(r.data.data ?? []);
      } else {
        setVendorError('Failed to load vendors. Please try again.');
        console.error('Vendor load error:', r.error);
      }
      setIsLoadingVendors(false);
    }).catch(err => {
      setVendorError('Error loading vendors');
      console.error(err);
      setIsLoadingVendors(false);
    });

    // Fetch items
    setIsLoadingItems(true);
    setItemError('');
    apiClient.request<{ data: { data: CatalogItem[] } }>('/inventory/items?limit=100').then(r => {
      if (r.success) {
        setItems(r.data.data.data ?? []);
      } else {
        setItemError('Failed to load inventory items.');
        console.error('Item load error:', r.error);
      }
      setIsLoadingItems(false);
    }).catch(err => {
      setItemError('Error loading inventory items');
      console.error(err);
      setIsLoadingItems(false);
    });
  }, [isOpen]);

  const addLine = () => setLines(prev => [...prev, { itemName: '', inventoryItemId: null, quantityOrdered: 1, unitPrice: 0 }]);
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const updateLine = (idx: number, field: keyof POLine, value: any) => {
    setLines(prev => prev.map((line, i) => {
      if (i !== idx) return line;
      if (field === 'inventoryItemId') {
        const item = items.find(it => it.id === parseInt(value));
        return { ...line, inventoryItemId: item ? item.id : null, itemName: item ? item.name : line.itemName, unitPrice: item ? item.unit_cost : line.unitPrice };
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
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Purchase Order</DialogTitle>
          <DialogDescription>Create a purchase order for a vendor.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Vendor <span className="text-red-500">*</span></Label>
            {vendorError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {vendorError}
              </div>
            )}
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              value={vendorId} 
              onChange={e => setVendorId(e.target.value)}
              disabled={isLoadingVendors || vendors.length === 0}
            >
              <option value="">
                {isLoadingVendors ? 'Loading vendors...' : vendors.length === 0 ? 'No vendors available' : 'Select Vendor...'}
              </option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Line Items</Label>
            {itemError && (
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                {itemError}
              </div>
            )}
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="flex items-end gap-2 p-2 border rounded-lg bg-muted/30">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Item</Label>
                    <select 
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      value={line.inventoryItemId ?? ''} 
                      onChange={e => updateLine(idx, 'inventoryItemId', e.target.value)}
                      disabled={isLoadingItems || items.length === 0}
                    >
                      <option value="">
                        {isLoadingItems ? 'Loading...' : items.length === 0 ? 'No items' : 'Select or type below...'}
                      </option>
                      {items.map(it => <option key={it.id} value={it.id}>{it.name}{it.sku ? ` (${it.sku})` : ''}</option>)}
                    </select>
                  </div>
                  <div className="w-20 space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min="1" className="h-9 text-sm" value={line.quantityOrdered}
                      onChange={e => updateLine(idx, 'quantityOrdered', parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Unit Price</Label>
                    <Input type="number" min="0" step="0.01" className="h-9 text-sm" value={line.unitPrice}
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

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
          </div>

          <div className="flex justify-end border-t pt-3">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-lg font-bold">KES {total.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create PO'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
