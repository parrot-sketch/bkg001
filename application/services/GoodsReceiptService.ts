/**
 * Goods Receipt Service
 * 
 * Handles receiving goods from purchase orders and incrementing inventory stock.
 * Transactional: Creates receipt records + increments stock + creates batches.
 */

import { PrismaClient, Prisma, PurchaseOrderStatus } from '@prisma/client';
import { NotFoundError } from '@/application/errors/NotFoundError';
import { ValidationError } from '@/application/errors/ValidationError';
import { GateBlockedError } from '@/application/errors/GateBlockedError';

export interface ReceiveGoodsDto {
  receiptItems: Array<{
    poItemId: number;
    quantityReceived: number;
    unitCost: number;
    batchNumber?: string;
    expiryDate?: string;
    notes?: string;
  }>;
  notes?: string;
}

export class GoodsReceiptService {
  constructor(private readonly db: PrismaClient) {}

  async receiveGoods(
    purchaseOrderId: string,
    dto: ReceiveGoodsDto,
    receivedByUserId: string
  ) {
    return this.db.$transaction(async (tx) => {
      // Validate PO exists and is APPROVED
      const po = await tx.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        include: {
          items: true,
        },
      });

      if (!po) {
        throw new NotFoundError(
          `Purchase order with ID ${purchaseOrderId} not found`,
          'PurchaseOrder',
          purchaseOrderId
        );
      }

      if (po.status !== 'APPROVED' && po.status !== 'PARTIALLY_RECEIVED') {
        throw new GateBlockedError(
          `Cannot receive goods for purchase order in status ${po.status}`,
          'INVALID_STATUS',
          [`PO ${purchaseOrderId} is in status ${po.status}, requires APPROVED or PARTIALLY_RECEIVED`]
        );
      }

      // Generate receipt number
      const receiptNumber = await this.generateReceiptNumber(tx);

      // Validate receipt items
      for (const receiptItem of dto.receiptItems) {
        const poItem = po.items.find((item) => item.id === receiptItem.poItemId);
        if (!poItem) {
          throw new NotFoundError(
            `Purchase order item with ID ${receiptItem.poItemId} not found`,
            'PurchaseOrderItem',
            receiptItem.poItemId.toString()
          );
        }

        const remaining = poItem.quantity_ordered - poItem.quantity_received;
        if (receiptItem.quantityReceived > remaining) {
          throw new ValidationError(
            `Cannot receive ${receiptItem.quantityReceived} items. Only ${remaining} remaining for item ${poItem.item_name}`,
            [
              {
                field: 'receiptItems',
                message: `Over-receipt for item ${poItem.item_name}`,
              },
            ]
          );
        }
      }

      // Create goods receipt
      const goodsReceipt = await tx.goodsReceipt.create({
        data: {
          purchase_order_id: purchaseOrderId,
          receipt_number: receiptNumber,
          received_by_user_id: receivedByUserId,
          notes: dto.notes || null,
          receipt_items: {
            create: dto.receiptItems.map((item) => ({
              po_item_id: item.poItemId,
              inventory_item_id: po.items.find((pi) => pi.id === item.poItemId)
                ?.inventory_item_id || null,
              quantity_received: item.quantityReceived,
              unit_cost: item.unitCost,
              batch_number: item.batchNumber || null,
              expiry_date: item.expiryDate ? new Date(item.expiryDate) : null,
              notes: item.notes || null,
            })),
          },
        },
        include: {
          receipt_items: {
            include: {
              purchase_order_item: true,
              inventory_item: true,
            },
          },
        },
      });

      // Update inventory and PO items
      for (const receiptItem of goodsReceipt.receipt_items) {
        const poItem = receiptItem.purchase_order_item;

        // Update PO item quantity received
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: {
            quantity_received: poItem.quantity_received + receiptItem.quantity_received,
          },
        });

        // If linked to inventory item, increment stock
        if (receiptItem.inventory_item_id && receiptItem.inventory_item) {
          await tx.inventoryItem.update({
            where: { id: receiptItem.inventory_item_id },
            data: {
              quantity_on_hand: {
                increment: receiptItem.quantity_received,
              },
            },
          });

          // Create batch if batch number provided
          if (receiptItem.batch_number) {
            await tx.inventoryBatch.create({
              data: {
                inventory_item_id: receiptItem.inventory_item_id,
                batch_number: receiptItem.batch_number,
                expiry_date: receiptItem.expiry_date || new Date('2099-12-31'),
                quantity_remaining: receiptItem.quantity_received,
                cost_per_unit: receiptItem.unit_cost,
                received_at: new Date(),
                supplier: po.vendor_id,
                goods_receipt_id: goodsReceipt.id,
              },
            });
          }
        }
      }

      // Update PO status
      const allItemsReceived = po.items.every(
        (item) => item.quantity_received >= item.quantity_ordered
      );
      const someItemsReceived = po.items.some((item) => item.quantity_received > 0);

      let newStatus: PurchaseOrderStatus = po.status;
      if (allItemsReceived) {
        newStatus = PurchaseOrderStatus.CLOSED;
      } else if (someItemsReceived || po.status === PurchaseOrderStatus.PARTIALLY_RECEIVED) {
        newStatus = PurchaseOrderStatus.PARTIALLY_RECEIVED;
      }

      await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: newStatus },
      });

      return goodsReceipt;
    });
  }

  private async generateReceiptNumber(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `GRN-${year}-`;

    const lastReceipt = await tx.goodsReceipt.findFirst({
      where: {
        receipt_number: {
          startsWith: prefix,
        },
      },
      orderBy: {
        receipt_number: 'desc',
      },
    });

    if (!lastReceipt) {
      return `${prefix}0001`;
    }

    const lastNumber = parseInt(lastReceipt.receipt_number.replace(prefix, ''), 10);
    const nextNumber = (lastNumber + 1).toString().padStart(4, '0');

    return `${prefix}${nextNumber}`;
  }
}
