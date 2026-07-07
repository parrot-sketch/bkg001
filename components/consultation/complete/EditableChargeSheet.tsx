'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';
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
import { servicesApi, type ServiceDto } from '@/lib/api/services';

interface BillItem {
  serviceId: number;
  serviceName: string;
  quantity: number;
  unitCost: number;
}

interface EditableChargeSheetProps {
  appointmentId: number;
  existingItems?: BillItem[];
  defaultTotal?: number;
  onChange: (items: BillItem[], total: number, discount: number) => void;
}

export function EditableChargeSheet({
  appointmentId,
  existingItems = [],
  defaultTotal = 0,
  onChange,
}: EditableChargeSheetProps) {
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [items, setItems] = useState<BillItem[]>(existingItems);
  const [discount, setDiscount] = useState(0);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

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
    const total = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    onChange(items, total, discount);
  }, [items, discount, onChange]);

  const addItem = () => {
    setItems([...items, { serviceId: 0, serviceName: '', quantity: 1, unitCost: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof BillItem, value: string | number) => {
    const updated = [...items];
    if (field === 'serviceId') {
      const service = services.find((s) => s.id === value);
      updated[index] = {
        ...updated[index],
        serviceId: Number(value),
        serviceName: service?.service_name || '',
        unitCost: service?.price || 0,
      };
    } else if (field === 'quantity' || field === 'unitCost') {
      updated[index] = { ...updated[index], [field]: Number(value) };
    }
    setItems(updated);
  };

  const totalBeforeDiscount = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const finalTotal = Math.max(0, totalBeforeDiscount - discount);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-[#e7d6bf]/30 flex items-center justify-center border border-[#e7d6bf]">
          <FileText className="h-4 w-4 text-[#caa26a]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#2c2e4b]">Charge Sheet</h3>
          <p className="text-[10px] text-[#2c2e4b]/60">Billable services for this consultation</p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2 p-2 rounded-lg border border-[#e7d6bf] bg-white">
            <div className="flex-1 min-w-0">
              <Select
                value={String(item.serviceId)}
                onValueChange={(value) => updateItem(index, 'serviceId', value)}
              >
                <SelectTrigger className="h-8 text-xs border-[#e7d6bf] bg-white">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingServices ? (
                    <SelectItem value="0" disabled>Loading services...</SelectItem>
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
            <div className="w-20 text-right text-xs font-medium text-[#2c2e4b]">
              KSH {(item.quantity * item.unitCost).toLocaleString()}
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

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        className="w-full h-8 text-xs border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30 rounded-lg"
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Service
      </Button>

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
    </div>
  );
}
