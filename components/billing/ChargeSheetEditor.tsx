'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, FileText, Loader2, Package } from 'lucide-react';
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
import { useChargeSheet, type BillItem } from '@/hooks/billing/useChargeSheet';
import { servicesApi, type ServiceDto } from '@/lib/api/services';
import { inventoryApi, type InventoryItemDto } from '@/lib/api/inventory';

type ItemType = 'service' | 'inventory';

interface ChargeSheetEditorProps {
  appointmentId: number;
  existingItems?: BillItem[];
  onSaved?: () => void;
  onChange?: (items: BillItem[], total: number, discount: number) => void;
}

export function ChargeSheetEditor({ appointmentId, existingItems = [], onSaved, onChange }: ChargeSheetEditorProps) {
  const { chargeSheet, isLoading, isSaving, saveChargeSheet, refetch } = useChargeSheet(appointmentId);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemDto[]>([]);
  const [items, setItems] = useState<BillItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);

  useEffect(() => {
    if (chargeSheet) {
      setItems(existingItems.length > 0 ? existingItems : chargeSheet.billItems);
      setDiscount(existingItems.length > 0 ? discount : chargeSheet.discount);
    }
  }, [chargeSheet]);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await servicesApi.getAll();
        if (response.success && response.data) {
          setServices(response.data);
        }
      } catch (error) {
        console.error('Failed to load services:', error);
      } finally {
        setIsLoadingServices(false);
      }
    };
    loadServices();
  }, []);

  useEffect(() => {
    const loadInventory = async () => {
      try {
        const response = await inventoryApi.getAll({ limit: 1000 });
        if (response.success && response.data?.data) {
          setInventoryItems(response.data.data.filter((item) => item.isBillable && item.quantityOnHand > 0));
        }
      } catch (error) {
        console.error('Failed to load inventory items:', error);
      } finally {
        setIsLoadingInventory(false);
      }
    };
    loadInventory();
  }, []);

  const handleSave = async () => {
    if (!appointmentId) return;
    await saveChargeSheet(
      {
        billingItems: items
          .filter((item) => (item.serviceId && item.serviceId > 0) || (item.inventoryItemId && item.inventoryItemId > 0))
          .map((item) => ({
            serviceId: item.isInventory ? undefined : item.serviceId,
            inventoryItemId: item.isInventory ? item.inventoryItemId : undefined,
            quantity: item.quantity,
            unitCost: item.unitCost,
          })),
        discount,
      },
      {
        onSuccess: () => {
          refetch();
          onSaved?.();
        },
      }
    );
  };

  const totalBeforeDiscount = items.reduce((sum, item) => sum + item.totalCost, 0);
  const finalTotal = Math.max(0, totalBeforeDiscount - discount);

  useEffect(() => {
    onChange?.(items, totalBeforeDiscount, discount);
  }, [items, totalBeforeDiscount, discount, onChange]);

  const addItem = (type: ItemType = 'service') => {
    const newItem: BillItem = {
      serviceId: 0,
      serviceName: '',
      quantity: 1,
      unitCost: 0,
      totalCost: 0,
      isInventory: type === 'inventory',
    };
    if (type === 'inventory') {
      newItem.inventoryItemId = 0;
    }
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof BillItem, value: string | number | boolean) => {
    const updated = [...items];
    const currentItem = updated[index];

    if (field === 'isInventory') {
      updated[index] = {
            ...currentItem,
            isInventory: value as boolean,
            serviceId: value ? undefined : currentItem.serviceId,
            inventoryItemId: value ? currentItem.inventoryItemId : undefined,
            serviceName: '',
            unitCost: 0,
            totalCost: 0,
          };
      setItems(updated);
      return;
    }

    if (field === 'serviceId' && !currentItem.isInventory) {
      const service = services.find((s) => s.id === Number(value));
      updated[index] = {
        ...currentItem,
        serviceId: Number(value),
        serviceName: service?.service_name || '',
        unitCost: service?.price || 0,
        totalCost: currentItem.quantity * (service?.price || 0),
      };
    } else if (field === 'inventoryItemId' && currentItem.isInventory) {
      const inventoryItem = inventoryItems.find((s) => s.id === Number(value));
      updated[index] = {
        ...currentItem,
        inventoryItemId: Number(value),
        serviceName: inventoryItem?.name || '',
        unitCost: inventoryItem?.unitCost || 0,
        totalCost: currentItem.quantity * (inventoryItem?.unitCost || 0),
      };
    } else if (field === 'quantity' || field === 'unitCost') {
      const quantity = field === 'quantity' ? Number(value) : currentItem.quantity;
      const unitCost = field === 'unitCost' ? Number(value) : currentItem.unitCost;
      updated[index] = {
        ...currentItem,
        [field]: Number(value),
        totalCost: quantity * unitCost,
      };
    }

    setItems(updated);
  };

  const getItemLabel = (item: BillItem): string => {
    if (item.isInventory) {
      const inv = inventoryItems.find((i) => i.id === item.inventoryItemId);
      return inv ? `${inv.name} (${inv.unitOfMeasure})` : 'Select inventory item';
    }
    const service = services.find((s) => s.id === item.serviceId);
    return service ? `${service.service_name} — KSH ${service.price}` : 'Select service';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#caa26a]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-[#e7d6bf]/30 flex items-center justify-center border border-[#e7d6bf]">
          <FileText className="h-4 w-4 text-[#caa26a]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#2c2e4b]">Charge Sheet</h3>
          <p className="text-[10px] text-[#2c2e4b]/60">Billable services and items for this appointment</p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2 p-2 rounded-lg border border-[#e7d6bf] bg-white">
            <div className="w-24">
              <Select
                value={item.isInventory ? 'inventory' : 'service'}
                onValueChange={(value) => updateItem(index, 'isInventory', value === 'inventory')}
              >
                <SelectTrigger className="h-8 text-xs border-[#e7d6bf] bg-white">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-0">
              <Select
                value={item.isInventory ? String(item.inventoryItemId || 0) : String(item.serviceId || 0)}
                onValueChange={(value) => updateItem(index, item.isInventory ? 'inventoryItemId' : 'serviceId', value)}
              >
                <SelectTrigger className="h-8 text-xs border-[#e7d6bf] bg-white">
                  <SelectValue placeholder={item.isInventory ? 'Select inventory item' : 'Select service'} />
                </SelectTrigger>
                <SelectContent>
                  {(item.isInventory ? isLoadingInventory : isLoadingServices) ? (
                    <SelectItem value="0" disabled>Loading...</SelectItem>
                  ) : item.isInventory ? (
                    inventoryItems.map((inv) => (
                      <SelectItem key={inv.id} value={String(inv.id)}>
                        {inv.name} — KSH {inv.unitCost} ({inv.quantityOnHand} in stock)
                      </SelectItem>
                    ))
                  ) : (
                    services.map((service) => (
                      <SelectItem key={service.id} value={String(service.id)}>
                        {service.service_name} — KSH {service.price}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="w-16">
              <Input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                className="h-8 text-xs border-[#e7d6bf] bg-white"
              />
            </div>
            <div className="w-24">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={item.unitCost}
                onChange={(e) => updateItem(index, 'unitCost', e.target.value)}
                className="h-8 text-xs border-[#e7d6bf] bg-white"
              />
            </div>
            <div className="w-24 text-right text-xs font-medium text-[#2c2e4b]">
              KSH {item.totalCost.toLocaleString()}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeItem(index)}
              className="h-8 w-8 text-red-600 hover:text-red-700 shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addItem('service')}
          className="flex-1 h-8 text-xs border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30 rounded-lg"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Service
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addItem('inventory')}
          className="flex-1 h-8 text-xs border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30 rounded-lg"
        >
          <Package className="h-3.5 w-3.5 mr-1.5" />
          Add Inventory
        </Button>
      </div>

      <div className="space-y-1.5 pt-2 border-t border-[#e7d6bf]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#2c2e4b]/60">Subtotal</span>
          <span className="font-medium text-[#2c2e4b]">KSH {totalBeforeDiscount.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#2c2e4b]/60">Discount</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
            className="h-7 w-24 text-xs border-[#e7d6bf] bg-white text-right"
          />
        </div>
        <div className="flex items-center justify-between text-sm font-semibold pt-1 border-t border-[#e7d6bf]">
          <span className="text-[#2c2e4b]">Total</span>
          <span className="text-[#2c2e4b]">KSH {finalTotal.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 h-9 rounded-lg bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] font-medium shadow-sm"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            'Save Charge Sheet'
          )}
        </Button>
      </div>
    </div>
  );
}
