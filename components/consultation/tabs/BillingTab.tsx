'use client';

/**
 * Billing Tab - Consultation Workspace
 * 
 * Allows doctors to manage billing during a consultation:
 * - Add/remove services rendered
 * - Set quantities and view costs
 * - Apply discounts
 * - Save billing that frontdesk will collect
 * 
 * This tab bridges the consultation workflow with the billing workflow.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  Plus,
  Trash2,
  Save,
  Receipt,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useServices } from '@/hooks/useServices';
import { useAppointmentBilling, useSaveBilling, type BillItem } from '@/hooks/doctor/useBilling';
import type { ServiceDto } from '@/lib/api/services';

// ============================================================================
// TYPES
// ============================================================================

interface BillingItem {
  serviceId: number;
  serviceName: string;
  category: string | null;
  quantity: number;
  unitCost: number;
}

interface BillingTabProps {
  appointmentId?: number;
  /**
   * If true, billing is completely locked (e.g., non-doctor user viewing the record).
   * If false, billing editability is determined by payment status:
   * - PAID → read-only
   * - UNPAID/PART/no payment → editable
   * 
   * NOTE: This is intentionally separate from consultation isReadOnly.
   * Billing should remain editable even after a consultation is completed,
   * so doctors can retroactively add billing for consultations that were
   * completed without billing items.
   */
  isReadOnly?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BillingTab({ appointmentId, isReadOnly = false }: BillingTabProps) {
  const { services, loading: servicesLoading } = useServices();
  const { data: billingData, isLoading: billingLoading } = useAppointmentBilling(appointmentId, !!appointmentId);
  const { mutateAsync: saveBilling, isPending: isSaving } = useSaveBilling();

  // Local state
  const [billingItems, setBillingItems] = useState<BillingItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);

  // Group services by category for easier selection
  const servicesByCategory = useMemo(() => {
    const grouped: Record<string, ServiceDto[]> = {};
    services.forEach(service => {
      const category = service.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(service);
    });
    return grouped;
  }, [services]);

  // Calculate totals
  const subtotal = useMemo(
    () => billingItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0),
    [billingItems]
  );
  const total = Math.max(0, subtotal - discount);

  // Initialize from existing billing data
  useEffect(() => {
    if (billingData?.payment?.billItems && billingData.payment.billItems.length > 0) {
      setBillingItems(
        billingData.payment.billItems.map(item => ({
          serviceId: item.serviceId,
          serviceName: item.serviceName,
          category: item.serviceCategory || null,
          quantity: item.quantity,
          unitCost: item.unitCost,
        }))
      );
      setDiscount(billingData.payment.discount || 0);
      setIsDirty(false);
    }
  }, [billingData]);

  // Add a service to the bill
  const handleAddService = useCallback(() => {
    if (!selectedServiceId) return;

    const service = services.find(s => s.id === parseInt(selectedServiceId));
    if (!service) return;

    // Check if already added
    const existingIndex = billingItems.findIndex(item => item.serviceId === service.id);
    if (existingIndex >= 0) {
      // Increment quantity
      const updated = [...billingItems];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + 1,
      };
      setBillingItems(updated);
    } else {
      setBillingItems(prev => [
        ...prev,
        {
          serviceId: service.id,
          serviceName: service.service_name,
          category: service.category,
          quantity: 1,
          unitCost: service.price,
        },
      ]);
    }

    setSelectedServiceId('');
    setIsDirty(true);
  }, [selectedServiceId, services, billingItems]);

  // Remove a service from the bill
  const handleRemoveItem = useCallback((serviceId: number) => {
    setBillingItems(prev => prev.filter(item => item.serviceId !== serviceId));
    setIsDirty(true);
  }, []);

  // Update item quantity
  const handleQuantityChange = useCallback((serviceId: number, quantity: number) => {
    if (quantity < 1) return;
    setBillingItems(prev =>
      prev.map(item =>
        item.serviceId === serviceId ? { ...item, quantity } : item
      )
    );
    setIsDirty(true);
  }, []);

  // Update item unit cost
  const handleUnitCostChange = useCallback((serviceId: number, unitCost: number) => {
    if (unitCost < 0) return;
    setBillingItems(prev =>
      prev.map(item =>
        item.serviceId === serviceId ? { ...item, unitCost } : item
      )
    );
    setIsDirty(true);
  }, []);

  // Save billing
  const handleSave = useCallback(async () => {
    if (!appointmentId || billingItems.length === 0) return;

    await saveBilling({
      appointmentId,
      billingItems: billingItems.map(item => ({
        serviceId: item.serviceId,
        quantity: item.quantity,
        unitCost: item.unitCost,
      })),
      discount: discount > 0 ? discount : undefined,
    });

    setIsDirty(false);
  }, [appointmentId, billingItems, discount, saveBilling]);

  // Loading state
  if (billingLoading || servicesLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto" />
          <p className="text-sm text-slate-500">Loading billing...</p>
        </div>
      </div>
    );
  }

  // Already paid state
  const isPaid = billingData?.payment?.status === 'PAID';
  const isPartiallyPaid = billingData?.payment?.status === 'PART';

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-slate-600" />
            Billing & Services
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Add services rendered during this consultation
          </p>
        </div>
        {billingData?.payment && (
          <Badge
            variant={isPaid ? 'default' : isPartiallyPaid ? 'secondary' : 'outline'}
            className={
              isPaid
                ? 'bg-emerald-100 text-emerald-700'
                : isPartiallyPaid
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-700'
            }
          >
            {isPaid ? 'Paid' : isPartiallyPaid ? 'Partially Paid' : 'Unpaid'}
          </Badge>
        )}
      </div>

      {/* Payment already completed notice */}
      {isPaid && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-medium text-emerald-800">Payment Complete</p>
                <p className="text-sm text-emerald-600">
                  This bill has been fully paid. Receipt: {billingData?.payment?.receiptNumber || 'Pending'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Service Section */}
      {!isReadOnly && !isPaid && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add Service</CardTitle>
            <CardDescription>Select a service to add to the patient&apos;s bill</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label htmlFor="service-select" className="sr-only">Service</Label>
                <Select
                  value={selectedServiceId}
                  onValueChange={setSelectedServiceId}
                >
                  <SelectTrigger id="service-select">
                    <SelectValue placeholder="Select a service..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
                      <div key={category}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {category}
                        </div>
                        {categoryServices.map(service => (
                          <SelectItem key={service.id} value={service.id.toString()}>
                            <div className="flex items-center justify-between w-full gap-4">
                              <span>{service.service_name}</span>
                              <span className="text-xs text-slate-500 ml-auto">
                                {service.price.toLocaleString()}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAddService}
                disabled={!selectedServiceId}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Items Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Services Rendered
            {billingItems.length > 0 && (
              <span className="text-slate-500 font-normal ml-2">({billingItems.length} items)</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {billingItems.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No services added yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Add services from the dropdown above to create a bill
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Service</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    {!isReadOnly && !isPaid && (
                      <TableHead className="w-[50px]"></TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingItems.map(item => (
                    <TableRow key={item.serviceId}>
                      <TableCell>
                        <div>
                          <span className="font-medium text-sm">{item.serviceName}</span>
                          {item.category && (
                            <span className="text-xs text-slate-400 block">{item.category}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {!isReadOnly && !isPaid ? (
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={e => handleQuantityChange(item.serviceId, parseInt(e.target.value) || 1)}
                            className="w-16 h-8 text-center mx-auto"
                          />
                        ) : (
                          <span>{item.quantity}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isReadOnly && !isPaid ? (
                          <Input
                            type="number"
                            min={0}
                            value={item.unitCost}
                            onChange={e => handleUnitCostChange(item.serviceId, parseFloat(e.target.value) || 0)}
                            className="w-24 h-8 text-right ml-auto"
                          />
                        ) : (
                          <span>{item.unitCost.toLocaleString()}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(item.quantity * item.unitCost).toLocaleString()}
                      </TableCell>
                      {!isReadOnly && !isPaid && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600"
                            onClick={() => handleRemoveItem(item.serviceId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="border-t mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium">{subtotal.toLocaleString()}</span>
                </div>
                
                {/* Discount */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Discount</span>
                  {!isReadOnly && !isPaid ? (
                    <Input
                      type="number"
                      min={0}
                      max={subtotal}
                      value={discount}
                      onChange={e => {
                        setDiscount(parseFloat(e.target.value) || 0);
                        setIsDirty(true);
                      }}
                      className="w-28 h-8 text-right"
                    />
                  ) : (
                    <span className="text-emerald-600">
                      {discount > 0 ? `-${discount.toLocaleString()}` : '0'}
                    </span>
                  )}
                </div>

                {/* Already paid (if partial) */}
                {isPartiallyPaid && billingData?.payment?.amountPaid && billingData.payment.amountPaid > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Amount Paid</span>
                    <span className="text-emerald-600">-{billingData.payment.amountPaid.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Total Due</span>
                  <span className="text-lg">{total.toLocaleString()}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      {!isReadOnly && !isPaid && billingItems.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {isDirty && (
              <>
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-amber-600">Unsaved billing changes</span>
              </>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Billing
              </>
            )}
          </Button>
        </div>
      )}

      {/* Info notice */}
      {!isPaid && billingItems.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong>How billing works:</strong> Once you save the billing, it will appear in the
            frontdesk billing queue. The frontdesk staff will collect the payment from the patient
            and mark it as paid.
          </div>
        </div>
      )}
    </div>
  );
}
