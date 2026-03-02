/**
 * Used Items Tab Mappers
 * 
 * Business logic for used items tab (badge computation, view model building).
 * Pure functions only - no side effects, no React.
 */

import type { UsedItemsResponseDto } from './usedItemsParsers';

export interface UsedItemViewModel {
  id: number;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  isBillable: boolean;
  hasInventoryLink: boolean;
  inventoryItemId?: number;
  usedAt?: string;
  sourceFormKey?: string;
}

export interface UsedItemsTabViewModel {
  items: UsedItemViewModel[];
  totalItems: number;
  totalBillableCost: number;
  totalNonBillableCost: number;
}

/**
 * Map DTO to view model
 */
export function mapUsedItemsDtoToViewModel(dto: UsedItemsResponseDto): UsedItemsTabViewModel {
  const items: UsedItemViewModel[] = dto.billItems.map((item) => ({
    id: item.id,
    itemName: item.inventoryUsage?.itemName || item.serviceName,
    quantity: item.quantity,
    unitCost: item.unitCost,
    totalCost: item.totalCost,
    isBillable: item.inventoryUsage ? true : false, // Simplified - should check actual billable flag
    hasInventoryLink: !!item.inventoryUsage,
    inventoryItemId: item.inventoryUsage?.inventoryItemId,
  }));

  return {
    items,
    totalItems: dto.usageSummary.totalItemsUsed,
    totalBillableCost: dto.usageSummary.totalBillableCost,
    totalNonBillableCost: dto.usageSummary.totalNonBillableCost,
  };
}
