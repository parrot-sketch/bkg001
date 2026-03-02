/**
 * Inventory Planning Mappers
 * 
 * DTO → ViewModel transformations for inventory planning tab.
 * Contains business logic for status computation and payload building.
 */

import type {
  PlannedItemsResponse,
  UsageVarianceResponse,
  InventoryItemsResponse,
  ConsumeFromPlanRequest,
} from './inventoryPlanningParsers';
import { SourceFormKey } from '@/application/services/InventoryConsumptionBillingService';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';

// ============================================================================
// View Models
// ============================================================================

export interface PlannedItemViewModel {
  id: number;
  inventoryItemId: number;
  itemName: string;
  plannedQuantity: number;
  plannedUnitPrice: number;
  plannedTotalCost: number;
  notes: string | null;
  isBillable: boolean;
  usedQuantity: number;
  remainingQuantity: number;
  consumptionStatus: 'none' | 'partial' | 'full' | 'over';
  stockAvailable: number;
  isLowStock: boolean;
}

export interface InventoryItemSelectorViewModel {
  id: number;
  name: string;
  sku: string | null;
  category: InventoryCategory;
  description: string | null;
  unitOfMeasure: string;
  unitCost: number;
  quantityOnHand: number;
  reorderPoint: number;
  manufacturer: string | null;
  isActive: boolean;
  isBillable: boolean;
  isLowStock: boolean;
}

export interface UsageVarianceViewModel {
  plannedItems: PlannedItemViewModel[];
  usedItems: Array<{
    id: number;
    inventoryItemId: number;
    itemName: string;
    quantityUsed: number;
    totalCost: number;
    usedAt: string;
    sourceFormKey: string;
  }>;
  variance: Array<{
    inventoryItemId: number;
    itemName: string;
    plannedQuantity: number;
    usedQuantity: number;
    quantityVariance: number;
    plannedCost: number;
    actualCost: number;
    costVariance: number;
    isBillable: boolean;
  }>;
  plannedTotalCost: number;
  actualBilledCost: number;
  varianceTotal: number;
}

export interface CostEstimateViewModel {
  billableTotal: number;
  nonBillableTotal: number;
  serviceTotal: number;
  grandTotal: number;
}

// ============================================================================
// Mappers
// ============================================================================

/**
 * Compute consumption status badge
 */
export function computePlannedConsumptionBadges(
  plannedQuantity: number,
  usedQuantity: number
): 'none' | 'partial' | 'full' | 'over' {
  if (usedQuantity === 0) {
    return 'none';
  }
  if (usedQuantity >= plannedQuantity) {
    return usedQuantity > plannedQuantity ? 'over' : 'full';
  }
  return 'partial';
}

/**
 * Map planned items DTO to view model with variance data
 */
export function mapPlannedItemsDtoToVm(
  plannedItemsDto: PlannedItemsResponse,
  varianceDto: UsageVarianceResponse | null,
  inventoryItemsMap: Map<number, { quantityOnHand: number; reorderPoint: number }>
): {
  plannedItems: PlannedItemViewModel[];
  costEstimate: CostEstimateViewModel;
} {
  const varianceMap = new Map(
    varianceDto?.variance.map((v) => [v.inventoryItemId, v]) ?? []
  );

  const plannedItems: PlannedItemViewModel[] = plannedItemsDto.plannedItems.map((item) => {
    const variance = varianceMap.get(item.inventoryItemId);
    const usedQuantity = variance?.usedQuantity ?? 0;
    const remainingQuantity = Math.max(0, item.plannedQuantity - usedQuantity);
    const inventoryItem = inventoryItemsMap.get(item.inventoryItemId);

    return {
      id: item.id,
      inventoryItemId: item.inventoryItemId,
      itemName: item.itemName,
      plannedQuantity: item.plannedQuantity,
      plannedUnitPrice: item.plannedUnitPrice,
      plannedTotalCost: item.plannedQuantity * item.plannedUnitPrice,
      notes: item.notes,
      isBillable: item.isBillable,
      usedQuantity,
      remainingQuantity,
      consumptionStatus: computePlannedConsumptionBadges(item.plannedQuantity, usedQuantity),
      stockAvailable: inventoryItem?.quantityOnHand ?? 0,
      isLowStock: inventoryItem
        ? inventoryItem.quantityOnHand <= inventoryItem.reorderPoint
        : false,
    };
  });

  return {
    plannedItems,
    costEstimate: plannedItemsDto.costEstimate,
  };
}

/**
 * Map inventory items DTO to selector view model
 */
export function mapInventoryItemsDtoToSelectorVm(
  dto: InventoryItemsResponse
): InventoryItemSelectorViewModel[] {
  return dto.data.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    category: item.category,
    description: item.description,
    unitOfMeasure: item.unitOfMeasure,
    unitCost: item.unitCost,
    quantityOnHand: item.quantityOnHand,
    reorderPoint: item.reorderPoint,
    manufacturer: item.manufacturer,
    isActive: item.isActive,
    isBillable: item.isBillable,
    isLowStock: item.quantityOnHand <= item.reorderPoint,
  }));
}

/**
 * Map usage variance DTO to view model
 */
export function mapUsageVarianceDtoToVm(
  dto: UsageVarianceResponse,
  inventoryItemsMap: Map<number, { quantityOnHand: number; reorderPoint: number }>
): UsageVarianceViewModel {
  const plannedItems: PlannedItemViewModel[] = dto.plannedItems
    .filter((p) => p.inventoryItemId !== null)
    .map((p) => {
      const variance = dto.variance.find((v) => v.inventoryItemId === p.inventoryItemId!);
      const usedQuantity = variance?.usedQuantity ?? 0;
      const inventoryItem = inventoryItemsMap.get(p.inventoryItemId!);

      return {
        id: p.id,
        inventoryItemId: p.inventoryItemId!,
        itemName: p.itemName,
        plannedQuantity: p.plannedQuantity,
        plannedUnitPrice: p.plannedUnitPrice,
        plannedTotalCost: p.plannedTotalCost,
        notes: p.notes,
        isBillable: variance?.isBillable ?? false,
        usedQuantity,
        remainingQuantity: Math.max(0, p.plannedQuantity - usedQuantity),
        consumptionStatus: computePlannedConsumptionBadges(p.plannedQuantity, usedQuantity),
        stockAvailable: inventoryItem?.quantityOnHand ?? 0,
        isLowStock: inventoryItem
          ? inventoryItem.quantityOnHand <= inventoryItem.reorderPoint
          : false,
      };
    });

  return {
    plannedItems,
    usedItems: dto.usedItems,
    variance: dto.variance,
    plannedTotalCost: dto.plannedTotalCost,
    actualBilledCost: dto.actualBilledCost,
    varianceTotal: dto.varianceTotal,
  };
}

/**
 * Build consume from plan payload
 * 
 * Generates deterministic externalRef and builds single-item usage request.
 */
export async function buildConsumeFromPlanPayload(
  plannedItem: PlannedItemViewModel,
  suggestedQuantity: number,
  caseId: string,
  actorUserId: string
): Promise<ConsumeFromPlanRequest> {
  // Generate deterministic externalRef: SHA-256(caseId + inventoryItemId + quantity + minute-timestamp)
  const timestamp = Math.floor(Date.now() / 60000); // Round to minute
  const uniqueString = `${caseId}-${plannedItem.inventoryItemId}-${suggestedQuantity}-${timestamp}`;

  let externalRef: string;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(uniqueString);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    // Format as UUID-like string
    externalRef = `${hashHex.substring(0, 8)}-${hashHex.substring(8, 12)}-4${hashHex.substring(13, 16)}-${(parseInt(hashHex[16], 16) & 0x3 | 0x8).toString(16)}${hashHex.substring(17, 20)}-${hashHex.substring(20, 32)}`;
  } else {
    // Fallback for server-side or non-crypto environments
    externalRef = uniqueString.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 36);
  }

  return {
    externalRef,
    sourceFormKey: SourceFormKey.NURSE_MED_ADMIN, // Using NURSE_MED_ADMIN as closest match for planned consumption
    items: [
      {
        inventoryItemId: plannedItem.inventoryItemId,
        quantityUsed: suggestedQuantity,
        notes: `Consumed from plan: ${plannedItem.itemName}`,
      },
    ],
    usedBy: actorUserId,
  };
}
