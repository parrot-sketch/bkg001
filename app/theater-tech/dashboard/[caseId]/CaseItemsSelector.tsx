'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PackageOpen, Plus, Trash2, Edit2, Loader2, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { addCaseItem, removeCaseItem, updateCaseItemQuantity } from '@/actions/theater-tech/case-items';

interface InventoryItem {
  id: number;
  name: string;
  sku: string | null;
  category: string;
}

interface CaseItem {
  id: string;
  inventory_item_id: number;
  quantity: number;
  inventory_item: { name: string; category: string };
  notes: string | null;
}

interface CaseItemsSelectorProps {
  caseId: string;
  catalog: InventoryItem[];
  selectedItems: CaseItem[];
  isEditable: boolean;
}

export function CaseItemsSelector({ caseId, catalog, selectedItems, isEditable }: CaseItemsSelectorProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(1);

  const handleAdd = () => {
    if (!selectedInventoryId || quantity < 1) return;
    startTransition(async () => {
      const res = await addCaseItem(caseId, Number(selectedInventoryId), quantity);
      if (res.success) {
        toast.success(res.msg);
        setSelectedInventoryId('');
        setQuantity(1);
      } else {
        toast.error(res.msg);
      }
    });
  };

  const handleRemove = (itemId: string) => {
    startTransition(async () => {
      const res = await removeCaseItem(itemId);
      if (res.success) toast.success(res.msg);
      else toast.error(res.msg);
    });
  };

  const saveEdit = (itemId: string) => {
    startTransition(async () => {
      const res = await updateCaseItemQuantity(itemId, editQty);
      if (res.success) {
        toast.success(res.msg);
        setEditingId(null);
      } else {
        toast.error(res.msg);
      }
    });
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <PackageOpen className="h-5 w-5 text-primary" />
          Theater Prep Item Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditable && (
          <div className="flex items-end gap-3 bg-slate-50 p-4 rounded-md border">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium">Select Item</label>
              <Select value={selectedInventoryId} onValueChange={setSelectedInventoryId} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Search inventory catalog..." />
                </SelectTrigger>
                <SelectContent>
                  {catalog.map(i => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {i.name} {i.sku ? `(${i.sku})` : ''} - {i.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24 space-y-1.5">
              <label className="text-sm font-medium">Qty</label>
              <Input 
                type="number" 
                min="1" 
                value={quantity} 
                onChange={e => setQuantity(Number(e.target.value) || 1)}
                disabled={isPending}
              />
            </div>
            <Button onClick={handleAdd} disabled={!selectedInventoryId || isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {selectedItems.length === 0 ? (
            <div className="text-center py-6 text-slate-500 border rounded-md border-dashed">
              No items selected for this case yet.
            </div>
          ) : (
            selectedItems.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 border rounded-md hover:bg-slate-50">
                <div className="pr-4">
                  <p className="font-medium">{item.inventory_item.name}</p>
                  <p className="text-xs text-slate-500">{item.inventory_item.category}</p>
                </div>
                
                <div className="flex items-center gap-4">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        className="w-20" 
                        min="1" 
                        value={editQty} 
                        onChange={e => setEditQty(Number(e.target.value))} 
                      />
                      <Button size="icon" variant="ghost" onClick={() => saveEdit(item.id)} disabled={isPending}>
                        <Save className="h-4 w-4 text-green-600" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm font-medium">Qty: {item.quantity}</span>
                  )}
                  
                  {isEditable && editingId !== item.id && (
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditingId(item.id); setEditQty(item.quantity); }} disabled={isPending}>
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleRemove(item.id)} disabled={isPending}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
