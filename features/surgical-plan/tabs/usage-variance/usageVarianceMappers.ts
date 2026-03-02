/**
 * Usage Variance Tab Mappers
 * 
 * Business logic for usage variance tab (badge computation, totals).
 * Pure functions only - no side effects, no React.
 */

import type { UsageVarianceResponseDto } from './usageVarianceParsers';

export type ConsumptionStatus = 'none' | 'partial' | 'full' | 'over';

export interface VarianceItemViewModel {
  inventoryItemId: number;
  itemName: string;
  plannedQuantity: number;
  usedQuantity: number;
  quantityVariance: number;
  plannedCost: number;
  actualCost: number;
  costVariance: number;
  isBillable: boolean;
  consumptionStatus: ConsumptionStatus;
}

export interface UsageVarianceTabViewModel {
  varianceItems: VarianceItemViewModel[];
  plannedTotalCost: number;
  actualBilledCost: number;
  varianceTotal: number;
  hasPlannedItems: boolean;
  hasUsedItems: boolean;
}

/**
 * Compute consumption status badge
 */
export function computeConsumptionStatus(
  plannedQuantity: number,
  usedQuantity: number
): ConsumptionStatus {
  if (usedQuantity === 0) return 'none';
  if (usedQuantity >= plannedQuantity) {
    return usedQuantity > plannedQuantity ? 'over' : 'full';
  }
  return 'partial';
}

/**
 * Map DTO to view model
 */
export function mapUsageVarianceDtoToViewModel(
  dto: UsageVarianceResponseDto
): UsageVarianceTabViewModel {
  const varianceItems: VarianceItemViewModel[] = dto.variance.map((item) => ({
    inventoryItemId: item.inventoryItemId,
    itemName: item.itemName,
    plannedQuantity: item.plannedQuantity,
    usedQuantity: item.usedQuantity,
    quantityVariance: item.quantityVariance,
    plannedCost: item.plannedCost,
    actualCost: item.actualCost,
    costVariance: item.costVariance,
    isBillable: item.isBillable,
    consumptionStatus: computeConsumptionStatus(item.plannedQuantity, item.usedQuantity),
  }));

  return {
    varianceItems,
    plannedTotalCost: dto.plannedTotalCost,
    actualBilledCost: dto.actualBilledCost,
    varianceTotal: dto.varianceTotal,
    hasPlannedItems: dto.plannedItems.length > 0,
    hasUsedItems: dto.usedItems.length > 0,
  };
}
