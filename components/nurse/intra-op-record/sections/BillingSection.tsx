'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Banknote, Calculator } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface BillingService {
    id: number;
    service_name: string;
    description: string | null;
    price: number;
    category: string | null;
}

interface BillingItem {
    serviceId: number;
    serviceName: string;
    quantity: number;
    unitCost: number;
}

interface BillingSectionProps {
    data: any;
    onChange: (data: any) => void;
    disabled?: boolean;
    caseId?: string;
}

export function BillingSection({ data, onChange, disabled, caseId }: BillingSectionProps) {
    const billingData = data.billing || {};
    const items: BillingItem[] = billingData.items || [];
    
    const setBilling = (field: string, value: any) => {
        onChange({ ...data, billing: { ...billingData, [field]: value } });
    };

    const setItems = (newItems: BillingItem[]) => {
        setBilling('items', newItems);
    };

    const [services, setServices] = useState<BillingService[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddService, setShowAddService] = useState(false);
    const [selectedService, setSelectedService] = useState<string>('');

    useEffect(() => {
        async function fetchServices() {
            try {
                const res = await apiClient.get<BillingService[]>('/services');
                if (res.success && res.data) {
                    setServices(res.data);
                }
            } catch (e) {
                console.error('Failed to fetch services:', e);
            } finally {
                setLoading(false);
            }
        }
        fetchServices();
    }, []);

    const handleAddService = () => {
        const service = services.find(s => s.id.toString() === selectedService);
        if (!service) return;

        setItems([...items, {
            serviceId: service.id,
            serviceName: service.service_name,
            quantity: 1,
            unitCost: service.price,
        }]);
        setSelectedService('');
        setShowAddService(false);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleUpdateItem = (index: number, field: string, value: number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const total = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-slate-700 border-b pb-2">
                <Banknote className="h-4 w-4" />
                <span className="font-semibold">Billing Information</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Anaesthetic Materials Charge</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">KES</span>
                        <Input
                            type="number"
                            className="pl-12"
                            value={billingData.anaestheticMaterialsCharge || ''}
                            onChange={(e) => setBilling('anaestheticMaterialsCharge', e.target.value)}
                            placeholder="0.00"
                            disabled={disabled}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Theatre Fee</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">KES</span>
                        <Input
                            type="number"
                            className="pl-12"
                            value={billingData.theatreFee || ''}
                            onChange={(e) => setBilling('theatreFee', e.target.value)}
                            placeholder="0.00"
                            disabled={disabled}
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Service Items</Label>
                    {!disabled && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddService(!showAddService)}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Service
                        </Button>
                    )}
                </div>

                {showAddService && (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                        <Select value={selectedService} onValueChange={setSelectedService}>
                            <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select a service..." />
                            </SelectTrigger>
                            <SelectContent>
                                {services.map((service) => (
                                    <SelectItem key={service.id} value={service.id.toString()}>
                                        {service.service_name} - KES {service.price.toLocaleString()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleAddService} disabled={!selectedService}>
                            Add
                        </Button>
                    </div>
                )}

                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-slate-600">Service</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-600 w-24">Qty</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-600 w-28">Unit Price</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-600 w-28">Total</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {items.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="px-4 py-2">{item.serviceName}</td>
                                    <td className="px-4 py-2">
                                        <Input
                                            type="number"
                                            min={1}
                                            value={item.quantity}
                                            onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                                            disabled={disabled}
                                            className="h-8 w-20"
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <Input
                                            type="number"
                                            min={0}
                                            value={item.unitCost}
                                            onChange={(e) => handleUpdateItem(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                                            disabled={disabled}
                                            className="h-8 w-24"
                                        />
                                    </td>
                                    <td className="px-4 py-2 font-medium">
                                        KES {(item.quantity * item.unitCost).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveItem(idx)}
                                            disabled={disabled}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                                        No services added
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {items.length > 0 && (
                            <tfoot className="bg-emerald-50">
                                <tr>
                                    <td colSpan={3} className="px-4 py-3 text-right font-semibold text-slate-700">
                                        Total
                                    </td>
                                    <td className="px-4 py-3 font-bold text-emerald-700">
                                        KES {total.toLocaleString()}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
