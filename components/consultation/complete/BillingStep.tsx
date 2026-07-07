'use client';

import type { BillItem } from '@/hooks/billing/useChargeSheet';
import { ChargeSheetEditor } from '@/components/billing/ChargeSheetEditor';

interface BillingStepProps {
  appointmentId: number;
  existingBilling: any;
  onChange: (items: any[]) => void;
  onTotalChange: (total: number) => void;
  onDiscountChange: (discount: number) => void;
}

export function BillingStep({ appointmentId, existingBilling, onChange, onTotalChange, onDiscountChange }: BillingStepProps) {
  const existingItems = existingBilling?.payment?.billItems?.map((item: any) => ({
    id: item.id,
    serviceId: item.serviceId,
    inventoryItemId: item.inventoryItemId,
    serviceName: item.serviceName || 'Service',
    quantity: item.quantity,
    unitCost: item.unitCost,
    isInventory: !!item.inventoryItemId,
  })) || [];

  const handleEditorChange = (items: BillItem[], total: number, discount: number) => {
    onChange(items);
    onTotalChange(total);
    onDiscountChange(discount);
  };

  return (
    <div className="space-y-4">
      <ChargeSheetEditor
        appointmentId={appointmentId}
        existingItems={existingItems}
        onChange={handleEditorChange}
      />
    </div>
  );
}
