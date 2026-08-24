'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';

export interface ItemFormData {
  name: string;
  sku?: string;
  category: string;
  unit_of_measure: string;
  unit_cost: number;
  reorder_point: number;
  low_stock_threshold: number;
  description?: string;
  supplier?: string;
  manufacturer?: string;
  is_billable: boolean;
  is_implant: boolean;
}

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Record<string, any> | null;
  onSaved: () => void;
}

const CATEGORIES = [
  { value: InventoryCategory.MEDICATION, label: 'Medication' },
  { value: InventoryCategory.ANESTHETIC, label: 'Anesthetic' },
  { value: InventoryCategory.DISPOSABLE, label: 'Disposable' },
  { value: InventoryCategory.SUTURE, label: 'Suture' },
  { value: InventoryCategory.DRESSING, label: 'Dressing' },
  { value: InventoryCategory.IMPLANT, label: 'Implant' },
  { value: InventoryCategory.INSTRUMENT, label: 'Instrument' },
  { value: InventoryCategory.SPECIMEN_CONTAINER, label: 'Specimen Container' },
  { value: InventoryCategory.OTHER, label: 'Other' },
];

export function ItemFormDialog({ open, onOpenChange, item, onSaved }: ItemFormDialogProps) {
  const [form, setForm] = useState<ItemFormData>({
    name: '',
    sku: '',
    category: InventoryCategory.OTHER,
    unit_of_measure: 'unit',
    unit_cost: 0,
    reorder_point: 0,
    low_stock_threshold: 0,
    description: '',
    supplier: '',
    manufacturer: '',
    is_billable: true,
    is_implant: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        sku: item.sku || '',
        category: item.category,
        unit_of_measure: item.unitOfMeasure,
        unit_cost: item.unitCost,
        reorder_point: item.reorderPoint,
        low_stock_threshold: item.lowStockThreshold,
        description: item.description || '',
        supplier: item.supplier || '',
        manufacturer: item.manufacturer || '',
        is_billable: item.isBillable,
        is_implant: item.isImplant,
      });
    } else {
      setForm({
        name: '',
        sku: '',
        category: InventoryCategory.OTHER,
        unit_of_measure: 'unit',
        unit_cost: 0,
        reorder_point: 0,
        low_stock_threshold: 0,
        description: '',
        supplier: '',
        manufacturer: '',
        is_billable: true,
        is_implant: false,
      });
    }
  }, [item, open]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Item name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name,
        sku: form.sku || undefined,
        category: form.category,
        unit_of_measure: form.unit_of_measure,
        unit_cost: form.unit_cost,
        reorder_point: form.reorder_point,
        low_stock_threshold: form.low_stock_threshold,
        description: form.description || undefined,
        supplier: form.supplier || undefined,
        manufacturer: form.manufacturer || undefined,
        is_billable: form.is_billable,
        is_implant: form.is_implant,
      };

      const endpoint = item ? `/inventory/items/${item.id}` : '/inventory/items';
      const method = item ? 'PATCH' : 'POST';

      const response = await apiClient.request(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      if (!response.success) {
        throw new Error((response as any).error || 'Failed to save item');
      }

      toast.success(item ? 'Item updated' : 'Item created');
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          <DialogDescription>
            {item ? 'Update the item details below.' : 'Enter the item details below.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label>Name <span className="text-red-500">*</span></Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Surgical Gloves" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Auto-generated if empty" />
            </div>
            <div className="space-y-2">
              <Label>Category <span className="text-red-500">*</span></Label>
              <Select value={form.category} onValueChange={(val) => setForm({ ...form, category: val as InventoryCategory })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unit of Measure <span className="text-red-500">*</span></Label>
              <Input value={form.unit_of_measure} onChange={(e) => setForm({ ...form, unit_of_measure: e.target.value })} placeholder="e.g. box, unit" />
            </div>
            <div className="space-y-2">
              <Label>Unit Cost</Label>
              <Input type="number" min={0} step={0.01} value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Reorder Point</Label>
              <Input type="number" min={0} step={1} value={form.reorder_point} onChange={(e) => setForm({ ...form, reorder_point: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Low Stock Threshold</Label>
              <Input type="number" min={0} step={1} value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Manufacturer</Label>
              <Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="Optional" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_billable} onChange={(e) => setForm({ ...form, is_billable: e.target.checked })} />
              Billable
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_implant} onChange={(e) => setForm({ ...form, is_implant: e.target.checked })} />
              Implant
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : (item ? 'Update Item' : 'Create Item')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
