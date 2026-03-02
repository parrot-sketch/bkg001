/**
 * Stock Adjustment Service
 * 
 * Handles manual stock adjustments (increment/decrement) with audit trail.
 * ADMIN only.
 */

import { PrismaClient, StockAdjustmentType, StockAdjustmentReason } from '@prisma/client';
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
    const previousQuantity = inventoryItem.quantity_on_hand;
    let newQuantity: number;
    if (dto.adjustmentType === 'INCREMENT') {
      newQuantity = previousQuantity + dto.quantityChange;
    } else {
      newQuantity = previousQuantity - dto.quantityChange;
      if (newQuantity < 0) {
        throw new ValidationError(
          `Cannot decrement ${dto.quantityChange} from ${previousQuantity}. Would result in negative stock.`,
          [
            {
              field: 'quantityChange',
              message: `Maximum decrement is ${previousQuantity}`,
            },
          ]
        );
      }
    }

    // Transaction: create adjustment record + update stock
    return this.db.$transaction(async (tx) => {
      // Create adjustment record
      const adjustment = await tx.stockAdjustment.create({
        data: {
          inventory_item_id: inventoryItemId,
          adjustment_type: dto.adjustmentType,
          adjustment_reason: dto.adjustmentReason,
          quantity_change: dto.quantityChange,
          previous_quantity: previousQuantity,
          new_quantity: newQuantity,
          adjusted_by_user_id: adjustedByUserId,
          notes: dto.notes || null,
        },
      });

      // Update inventory stock
      await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
          quantity_on_hand: newQuantity,
        },
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
