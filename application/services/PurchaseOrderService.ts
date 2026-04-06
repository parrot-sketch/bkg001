/**
 * Purchase Order Service
 * 
 * Manages purchase order lifecycle: DRAFT -> SUBMITTED -> APPROVED -> PARTIALLY_RECEIVED -> CLOSED
 */

import { PrismaClient, PurchaseOrderStatus } from '@prisma/client';
import { NotFoundError } from '@/application/errors/NotFoundError';
import { ValidationError } from '@/application/errors/ValidationError';
import { GateBlockedError } from '@/application/errors/GateBlockedError';

export interface CreatePurchaseOrderDto {
  vendorId: string;
  items: Array<{
    inventoryItemId?: number;
    itemName: string;
    quantityOrdered: number;
    unitPrice: number;
    notes?: string;
  }>;
  notes?: string;
}

export interface SubmitPurchaseOrderDto {
  notes?: string;
}

export class PurchaseOrderService {
  constructor(private readonly db: PrismaClient) {}

  async createPurchaseOrder(dto: CreatePurchaseOrderDto, createdByUserId: string) {
    // 1. Validate vendor exists
    const vendor = await this.db.vendor.findUnique({
      where: { id: dto.vendorId },
    });

    if (!vendor) {
      throw new NotFoundError(`Vendor with ID ${dto.vendorId} not found`, 'Vendor', dto.vendorId);
    }

    if (!vendor.is_active) {
      throw new GateBlockedError('Vendor is inactive', 'VENDOR_INACTIVE', [
        `Vendor ${dto.vendorId} is inactive`,
      ]);
    }

    if (!dto.items || dto.items.length === 0) {
      throw new ValidationError('Purchase order must have at least one item', [
        { field: 'items', message: 'At least one item is required' },
      ]);
    }

    // 2. Calculate total
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.quantityOrdered * item.unitPrice,
      0
    );

    // 3. Create PO with temporary number (since findFirst is unstable in tests/transactions)
    const tempPoNumber = `PO-TMP-${Date.now()}`;

    const po = await this.db.purchaseOrder.create({
      data: {
        vendor_id: dto.vendorId,
        po_number: tempPoNumber,
        status: PurchaseOrderStatus.DRAFT,
        subtotal: totalAmount,
        total_amount: totalAmount,
        ordered_by_user_id: createdByUserId,
        notes: dto.notes || null,
        items: {
          create: dto.items.map((item) => ({
            inventory_item_id: item.inventoryItemId || null,
            item_name: item.itemName,
            quantity_ordered: item.quantityOrdered,
            unit_price: item.unitPrice,
            line_total: item.quantityOrdered * item.unitPrice,
            notes: item.notes || null,
          })),
        },
      },
      include: {
        vendor: true,
        items: {
          include: {
            inventory_item: true,
          },
        },
      },
    });

    // 4. Update with final PO number based on internal ID
    const year = new Date().getFullYear();
    const finalPoNumber = `PO-${year}-${po.id.substring(0, 8).toUpperCase()}`;

    return this.db.purchaseOrder.update({
      where: { id: po.id },
      data: { po_number: finalPoNumber },
      include: {
        vendor: true,
        items: {
          include: {
            inventory_item: true,
          },
        },
      },
    });
  }

  async getPurchaseOrders(status?: PurchaseOrderStatus) {
    return this.db.purchaseOrder.findMany({
      where: status ? { status } : undefined,
      include: {
        vendor: true,
        items: {
          include: {
            inventory_item: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getPurchaseOrderById(id: string) {
    const po = await this.db.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        items: {
          include: {
            inventory_item: true,
          },
        },
      },
    });

    if (!po) {
      throw new NotFoundError(`Purchase order with ID ${id} not found`, 'PurchaseOrder', id);
    }

    return po;
  }

  async submitPurchaseOrder(id: string, dto: SubmitPurchaseOrderDto) {
    const po = await this.getPurchaseOrderById(id);

    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new GateBlockedError(
        `Cannot submit purchase order in status ${po.status}`,
        'INVALID_STATUS',
        [`PO ${id} is in status ${po.status}, requires DRAFT`]
      );
    }

    return this.db.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.SUBMITTED,
        notes: dto.notes || po.notes,
      },
      include: {
        vendor: true,
        items: true,
      },
    });
  }

  async approvePurchaseOrder(id: string, approvedByUserId: string) {
    const po = await this.getPurchaseOrderById(id);

    if (po.status !== PurchaseOrderStatus.SUBMITTED) {
      throw new GateBlockedError(
        `Cannot approve purchase order in status ${po.status}`,
        'INVALID_STATUS',
        [`PO ${id} is in status ${po.status}, requires SUBMITTED`]
      );
    }

    return this.db.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.APPROVED,
        approved_by_user_id: approvedByUserId,
        approved_at: new Date(),
      },
      include: {
        vendor: true,
        items: true,
      },
    });
  }
}
