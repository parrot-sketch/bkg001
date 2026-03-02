/**
 * Inventory Audit Service
 * 
 * Emits audit events for all critical inventory operations.
 * Non-blocking: audit write failures do not break the main transaction.
 */

import { PrismaClient } from '@prisma/client';
import { Role } from '@/domain/enums/Role';

export enum InventoryAuditEventType {
  VENDOR_CREATED = 'VENDOR_CREATED',
  VENDOR_UPDATED = 'VENDOR_UPDATED',
  VENDOR_DELETED = 'VENDOR_DELETED',
  
  PURCHASE_ORDER_CREATED = 'PURCHASE_ORDER_CREATED',
  PURCHASE_ORDER_SUBMITTED = 'PURCHASE_ORDER_SUBMITTED',
  PURCHASE_ORDER_APPROVED = 'PURCHASE_ORDER_APPROVED',
  
  GOODS_RECEIPT_POSTED = 'GOODS_RECEIPT_POSTED',
  
  STOCK_ADJUSTED = 'STOCK_ADJUSTED',
  
  INVENTORY_USAGE_APPLIED = 'INVENTORY_USAGE_APPLIED',
  INVENTORY_USAGE_IDEMPOTENT_REPLAY = 'INVENTORY_USAGE_IDEMPOTENT_REPLAY',
  
  BILL_LINE_CREATED_FROM_USAGE = 'BILL_LINE_CREATED_FROM_USAGE',
}

export enum InventoryAuditEntityType {
  VENDOR = 'Vendor',
  PURCHASE_ORDER = 'PurchaseOrder',
  GOODS_RECEIPT = 'GoodsReceipt',
  STOCK_ADJUSTMENT = 'StockAdjustment',
  INVENTORY_USAGE = 'InventoryUsage',
  PATIENT_BILL = 'PatientBill',
}

export interface InventoryAuditMetadata {
  [key: string]: unknown;
}

export class InventoryAuditService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Emit an audit event (non-blocking)
   * If audit write fails, logs warning but does not throw
   */
  async emit(
    eventType: InventoryAuditEventType,
    actorUserId: string,
    actorRole: Role,
    entityType: InventoryAuditEntityType,
    entityId: string,
    metadata?: InventoryAuditMetadata,
    externalRef?: string
  ): Promise<void> {
    try {
      await this.db.inventoryAuditEvent.create({
        data: {
          event_type: eventType,
          actor_user_id: actorUserId,
          actor_role: actorRole,
          entity_type: entityType,
          entity_id: entityId,
          external_ref: externalRef || null,
          metadata_json: metadata ? JSON.stringify(metadata) : null,
        },
      });
    } catch (error) {
      // Audit failures should not break the operation
      // Log warning for monitoring
      console.warn('[InventoryAuditService] Failed to emit audit event:', {
        eventType,
        entityType,
        entityId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Convenience methods for common operations

  async emitVendorCreated(vendorId: string, actorUserId: string, actorRole: Role, metadata?: InventoryAuditMetadata): Promise<void> {
    await this.emit(
      InventoryAuditEventType.VENDOR_CREATED,
      actorUserId,
      actorRole,
      InventoryAuditEntityType.VENDOR,
      vendorId,
      metadata
    );
  }

  async emitVendorUpdated(vendorId: string, actorUserId: string, actorRole: Role, metadata?: InventoryAuditMetadata): Promise<void> {
    await this.emit(
      InventoryAuditEventType.VENDOR_UPDATED,
      actorUserId,
      actorRole,
      InventoryAuditEntityType.VENDOR,
      vendorId,
      metadata
    );
  }

  async emitVendorDeleted(vendorId: string, actorUserId: string, actorRole: Role, metadata?: InventoryAuditMetadata): Promise<void> {
    await this.emit(
      InventoryAuditEventType.VENDOR_DELETED,
      actorUserId,
      actorRole,
      InventoryAuditEntityType.VENDOR,
      vendorId,
      metadata
    );
  }

  async emitPurchaseOrderCreated(poId: string, actorUserId: string, actorRole: Role, metadata?: InventoryAuditMetadata): Promise<void> {
    await this.emit(
      InventoryAuditEventType.PURCHASE_ORDER_CREATED,
      actorUserId,
      actorRole,
      InventoryAuditEntityType.PURCHASE_ORDER,
      poId,
      metadata
    );
  }

  async emitPurchaseOrderSubmitted(poId: string, actorUserId: string, actorRole: Role, metadata?: InventoryAuditMetadata): Promise<void> {
    await this.emit(
      InventoryAuditEventType.PURCHASE_ORDER_SUBMITTED,
      actorUserId,
      actorRole,
      InventoryAuditEntityType.PURCHASE_ORDER,
      poId,
      metadata
    );
  }

  async emitPurchaseOrderApproved(poId: string, actorUserId: string, actorRole: Role, metadata?: InventoryAuditMetadata): Promise<void> {
    await this.emit(
      InventoryAuditEventType.PURCHASE_ORDER_APPROVED,
      actorUserId,
      actorRole,
      InventoryAuditEntityType.PURCHASE_ORDER,
      poId,
      metadata
    );
  }

  async emitGoodsReceiptPosted(receiptId: string, actorUserId: string, actorRole: Role, metadata?: InventoryAuditMetadata): Promise<void> {
    await this.emit(
      InventoryAuditEventType.GOODS_RECEIPT_POSTED,
      actorUserId,
      actorRole,
      InventoryAuditEntityType.GOODS_RECEIPT,
      receiptId,
      metadata
    );
  }

  async emitStockAdjusted(adjustmentId: number, actorUserId: string, actorRole: Role, metadata?: InventoryAuditMetadata): Promise<void> {
    await this.emit(
      InventoryAuditEventType.STOCK_ADJUSTED,
      actorUserId,
      actorRole,
      InventoryAuditEntityType.STOCK_ADJUSTMENT,
      adjustmentId.toString(),
      metadata
    );
  }

  async emitInventoryUsageApplied(
    usageId: number,
    actorUserId: string,
    actorRole: Role,
    externalRef: string,
    metadata?: InventoryAuditMetadata
  ): Promise<void> {
    await this.emit(
      InventoryAuditEventType.INVENTORY_USAGE_APPLIED,
      actorUserId,
      actorRole,
      InventoryAuditEntityType.INVENTORY_USAGE,
      usageId.toString(),
      metadata,
      externalRef
    );
  }

  async emitInventoryUsageIdempotentReplay(
    usageId: number,
    actorUserId: string,
    actorRole: Role,
    externalRef: string,
    metadata?: InventoryAuditMetadata
  ): Promise<void> {
    await this.emit(
      InventoryAuditEventType.INVENTORY_USAGE_IDEMPOTENT_REPLAY,
      actorUserId,
      actorRole,
      InventoryAuditEntityType.INVENTORY_USAGE,
      usageId.toString(),
      metadata,
      externalRef
    );
  }

  async emitBillLineCreatedFromUsage(
    billItemId: number,
    usageId: number,
    actorUserId: string,
    actorRole: Role,
    metadata?: InventoryAuditMetadata
  ): Promise<void> {
    await this.emit(
      InventoryAuditEventType.BILL_LINE_CREATED_FROM_USAGE,
      actorUserId,
      actorRole,
      InventoryAuditEntityType.PATIENT_BILL,
      billItemId.toString(),
      {
        ...metadata,
        inventoryUsageId: usageId,
      }
    );
  }
}
