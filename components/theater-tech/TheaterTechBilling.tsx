'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Plus, Trash2, Save, X, Package, FileText, Loader2, ChevronDown, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Service {
  id: number;
  service_name: string;
  description: string | null;
  price: number;
  category: string | null;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  unit_cost: number;
  category: string;
}

interface ChargeItem {
  id: string;
  description: string;
  amount: number;
  quantity: number;
  type: 'service' | 'inventory';
  itemId: number | string;
}

interface TheaterTechBillingProps {
  caseId: string;
}

export function TheaterTechBilling({ caseId }: TheaterTechBillingProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [chargeItems, setChargeItems] = useState<ChargeItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [inventoryDropdownOpen, setInventoryDropdownOpen] = useState(false);
  const serviceInputRef = useRef<HTMLInputElement>(null);
  const inventoryInputRef = useRef<HTMLInputElement>(null);

  // Load existing billing data
  useEffect(() => {
    async function loadData() {
      try {
        const [billingRes, servicesRes, inventoryRes] = await Promise.all([
          fetch(`/api/surgical-cases/${caseId}/billing`),
          fetch('/api/services'),
          fetch('/api/inventory/items?limit=100')
        ]);

        const billingData = await billingRes.json();
        const servicesData = await servicesRes.json();
        const inventoryData = await inventoryRes.json();

        if (billingData.success && billingData.data?.payment) {
          const items: ChargeItem[] = billingData.data.payment.billItems?.map((item: any) => ({
            id: `existing-${item.id}`,
            description: item.serviceName,
            amount: item.unitCost || 0,
            quantity: item.quantity || 1,
            type: 'service',
            itemId: item.serviceId
          })) || [];
          setChargeItems(items);
          setDiscount(billingData.data.payment.discount || 0);
        }

        if (servicesData.success) {
          setServices(servicesData.data || []);
        }

        if (inventoryData.success && inventoryData.data?.data) {
          const items: InventoryItem[] = inventoryData.data.data.map((item: any) => ({
            id: String(item.id),
            name: item.name,
            sku: item.sku || '',
            unit_cost: item.unitCost || 0,
            category: item.category || ''
          }));
          setInventoryItems(items);
        }
      } catch (error) {
        console.error('Error loading billing data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [caseId]);

  const filteredServices = useMemo(() => {
    if (!searchQuery) return services.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return services.filter(s => 
      s.service_name.toLowerCase().includes(q) || 
      s.category?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [services, searchQuery]);

  const filteredInventory = useMemo(() => {
    if (!searchQuery) return inventoryItems.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return inventoryItems.filter(i => 
      i.name.toLowerCase().includes(q) || 
      i.sku.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [inventoryItems, searchQuery]);

  const total = useMemo(() => {
    return Math.max(0, chargeItems.reduce((sum, item) => sum + (item.amount * item.quantity), 0) - discount);
  }, [chargeItems, discount]);

  const handleAddService = useCallback((service: Service) => {
    const exists = chargeItems.some(item => item.type === 'service' && item.itemId === service.id);
    if (exists) return;
    
    setChargeItems(prev => [...prev, {
      id: `service-${Date.now()}`,
      description: service.service_name,
      amount: service.price || 0,
      quantity: 1,
      type: 'service',
      itemId: service.id
    }]);
    setSearchQuery('');
    setServiceDropdownOpen(false);
  }, [chargeItems]);

  const handleAddInventory = useCallback((item: InventoryItem) => {
    const exists = chargeItems.some(i => i.type === 'inventory' && i.itemId === item.id);
    if (exists) return;
    
    setChargeItems(prev => [...prev, {
      id: `inv-${Date.now()}`,
      description: item.name,
      amount: item.unit_cost || 0,
      quantity: 1,
      type: 'inventory',
      itemId: item.id
    }]);
    setSearchQuery('');
    setInventoryDropdownOpen(false);
  }, [chargeItems]);

  const handleRemoveItem = useCallback((id: string) => {
    setChargeItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleAmountChange = useCallback((id: string, value: string) => {
    const amount = parseFloat(value) || 0;
    setChargeItems(prev => prev.map(item => 
      item.id === id ? { ...item, amount } : item
    ));
  }, []);

  const handleQuantityChange = useCallback((id: string, value: string) => {
    const quantity = parseInt(value) || 1;
    setChargeItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantity } : item
    ));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Only save services (inventory items don't integrate with billing API)
      const serviceItems = chargeItems.filter(item => item.type === 'service');
      
      if (serviceItems.length === 0) {
        toast.error('Add at least one service to save');
        setIsSaving(false);
        return;
      }

      const billingItems = serviceItems.map(item => ({
        serviceId: item.itemId,
        quantity: item.quantity,
        unitCost: item.amount
      }));

      const res = await fetch(`/api/surgical-cases/${caseId}/billing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingItems, discount })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Charge sheet saved');
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving billing:', error);
      toast.error('Failed to save charge sheet');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Charge Sheet</CardTitle>
          <div className="flex items-center gap-2">
            {chargeItems.length > 0 && (
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={isSaving}
                className="h-8"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Items Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Add Charge</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search services or inventory..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setServiceDropdownOpen(true);
                  setInventoryDropdownOpen(true);
                }}
                onFocus={() => {
                  setServiceDropdownOpen(true);
                  setInventoryDropdownOpen(true);
                }}
              />
              {(serviceDropdownOpen || inventoryDropdownOpen) && searchQuery && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-64 overflow-auto">
                  {filteredServices.length > 0 && (
                    <div className="p-1">
                      <p className="px-2 py-1 text-xs font-medium text-slate-500">Services</p>
                      {filteredServices.map(service => (
                        <button
                          key={service.id}
                          className="w-full flex items-center justify-between px-2 py-2 text-left hover:bg-slate-50 rounded"
                          onClick={() => handleAddService(service)}
                        >
                          <span className="text-sm">{service.service_name}</span>
                          <span className="text-sm text-slate-500">KSH {service.price.toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {filteredInventory.length > 0 && (
                    <div className="p-1 border-t">
                      <p className="px-2 py-1 text-xs font-medium text-slate-500">Inventory Items</p>
                      {filteredInventory.map(item => (
                        <button
                          key={item.id}
                          className="w-full flex items-center justify-between px-2 py-2 text-left hover:bg-slate-50 rounded"
                          onClick={() => handleAddInventory(item)}
                        >
                          <span className="text-sm">{item.name}</span>
                          <span className="text-sm text-slate-500">KSH {item.unit_cost.toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {filteredServices.length === 0 && filteredInventory.length === 0 && (
                    <p className="p-3 text-sm text-slate-500 text-center">No items found</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items List */}
        {chargeItems.length > 0 ? (
          <div className="space-y-2">
            <div className="border rounded-md">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left text-xs font-medium text-slate-500 px-3 py-2">Item</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-3 py-2 w-20">Qty</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-3 py-2 w-28">Unit Price</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-3 py-2 w-28">Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {chargeItems.map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {item.type === 'service' ? (
                            <FileText className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Package className="h-4 w-4 text-orange-500" />
                          )}
                          <span className="text-sm">{item.description}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="1"
                          className="h-8 text-sm"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          className="h-8 text-sm"
                          value={item.amount}
                          onChange={(e) => handleAmountChange(item.id, e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-sm font-medium">
                        KSH {(item.amount * item.quantity).toLocaleString()}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Discount */}
            <div className="flex items-center gap-4">
              <label className="text-sm text-slate-600">Discount (KSH)</label>
              <Input
                type="number"
                className="h-8 w-32"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium text-slate-600">Total</span>
              <span className="text-lg font-semibold text-slate-900">
                KSH {total.toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">No charges added yet</p>
            <p className="text-xs text-slate-400 mt-1">Search and add services or inventory items</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}