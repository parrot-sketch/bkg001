/**
 * Stock Adjustment Service
 * 
 * Handles manual stock adjustments (increment/decrement) with audit trail.
 * ADMIN only.
 */

import { PrismaClient, StockAdjustmentType, StockAdjustmentReason } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { NotFoundError } from '@/application/errors/NotFoundError';
import { ValidationError } from '@/application/errors/ValidationError';

export interface CreateStockAdjustmentDto {
  adjustmentType: StockAdjustmentType;
  adjustmentReason: StockAdjustmentReason;
  quantityChange: number;
  notes?: string;
}

export class StockAdjustmentService {
  constructor(private readonly db: PrismaClient) {}

  async createStockAdjustment(
    inventoryItemId: number,
    dto: CreateStockAdjustmentDto,
    adjustedByUserId: string
  ) {
    // Get current inventory item
    const inventoryItem = await this.db.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    });

    if (!inventoryItem) {
      throw new NotFoundError(
        `Inventory item with ID ${inventoryItemId} not found`,
        'InventoryItem',
        inventoryItemId.toString()
      );
    }

    if (!inventoryItem.is_active) {
      throw new ValidationError('Cannot adjust stock for inactive inventory item', [
        { field: 'inventoryItemId', message: 'Item is inactive' },
      ]);
    }

    // Validate quantity change
    if (dto.quantityChange <= 0) {
      throw new ValidationError('Quantity change must be positive', [
        { field: 'quantityChange', message: 'Must be greater than 0' },
      ]);
    }

    // Calculate new quantity
    // Stock is now dynamically calculated. Instead of preventing negative stock here based on
    // a cached `quantity_on_hand` property, the transaction handles it.
    // For legacy auditing we specify 0.
    const previousQuantity = 0;
    let newQuantity: number;
    if (dto.adjustmentType === 'INCREMENT') {
      newQuantity = previousQuantity + dto.quantityChange;
    } else {
    }

    // Transaction: create adjustment record + record inventory transaction
    return this.db.$transaction(async (tx) => {
      // Create adjustment record (legacy audit trail)
      const adjustment = await tx.stockAdjustment.create({
        data: {
          inventory_item_id: inventoryItemId,
          adjustment_type: dto.adjustmentType,
          adjustment_reason: dto.adjustmentReason,
          quantity_change: dto.quantityChange,
          previous_quantity: 0, // Legacy field, setting to 0 as balance is now derived
          new_quantity: 0,      // Legacy field
          adjusted_by_user_id: adjustedByUserId,
          notes: dto.notes || null,
        },
      });

      // Record actual Stock Movement Transaction
      const multiplier = dto.adjustmentType === 'INCREMENT' ? 1 : -1;
      const unitCostNum = typeof inventoryItem.unit_cost === 'number' 
        ? inventoryItem.unit_cost 
        : inventoryItem.unit_cost.toNumber();
      await tx.inventoryTransaction.create({
        data: {
          inventory_item_id: inventoryItemId,
          type: 'ADJUSTMENT',
          quantity: dto.quantityChange * multiplier,
          unit_price: unitCostNum,
          total_value: (dto.quantityChange * multiplier) * unitCostNum,
          reference: `ADJ-${adjustment.id.toString().slice(-4)}`,
          notes: `Manual adjustment: ${dto.adjustmentReason}. ${dto.notes || ''}`,
          created_by_user_id: adjustedByUserId,
        }
      });

      return adjustment;
    });
  }

  async getAdjustmentsForItem(inventoryItemId: number) {
    return this.db.stockAdjustment.findMany({
      where: { inventory_item_id: inventoryItemId },
      include: {
        adjusted_by: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
