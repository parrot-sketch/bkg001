/**
 * Billing Summary Tab Mappers
 * 
 * Business logic for billing summary tab (status badges, totals).
 * Pure functions only - no side effects, no React.
 */

import type { BillingSummaryResponseDto } from './billingSummaryParsers';

export interface BillItemViewModel {
  id: number;
  serviceName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  serviceDate: string | null;
  hasInventoryLink: boolean;
  inventoryItemName?: string;
}

export interface PaymentViewModel {
  id: number;
  totalAmount: number;
  amountPaid: number;
  discount: number;
  status: string;
  billDate: string | null;
  paymentDate: string | null;
  paymentMethod: string | null;
}

export interface BillingSummaryTabViewModel {
  payment: PaymentViewModel | null;
  billItems: BillItemViewModel[];
  usageSummary: {
    totalItemsUsed: number;
    totalBillableCost: number;
    totalNonBillableCost: number;
  };
}

/**
 * Map DTO to view model
 */
export function mapBillingSummaryDtoToViewModel(
  dto: BillingSummaryResponseDto
): BillingSummaryTabViewModel {
  const payment: PaymentViewModel | null = dto.payment
    ? {
        id: dto.payment.id,
        totalAmount: dto.payment.totalAmount,
        amountPaid: dto.payment.amountPaid,
        discount: dto.payment.discount,
        status: dto.payment.status,
        billDate: dto.payment.billDate,
        paymentDate: dto.payment.paymentDate,
        paymentMethod: dto.payment.paymentMethod,
      }
    : null;

  const billItems: BillItemViewModel[] = dto.billItems.map((item) => ({
    id: item.id,
    serviceName: item.inventoryUsage?.itemName || item.serviceName,
    quantity: item.quantity,
    unitCost: item.unitCost,
    totalCost: item.totalCost,
    serviceDate: item.serviceDate,
    hasInventoryLink: !!item.inventoryUsage,
    inventoryItemName: item.inventoryUsage?.itemName,
  }));

  return {
    payment,
    billItems,
    usageSummary: {
      totalItemsUsed: dto.usageSummary.totalItemsUsed,
      totalBillableCost: dto.usageSummary.totalBillableCost,
      totalNonBillableCost: dto.usageSummary.totalNonBillableCost,
    },
  };
}
