/**
 * Inventory Consumption and Billing Service
 * 
 * Unified service for recording inventory usage and creating billing entries.
 * Supports idempotency, transactionality, and deterministic billing.
 * 
 * Key behaviors:
 * - Planning ≠ Consumption (planning does not decrement stock)
 * - Consumption decrements stock and creates bills (if billable)
 * - Idempotency via external_ref (replay returns existing result)
 * - Transactional: all-or-nothing
 * - Payment totals recomputed (not incremented)
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ValidationError } from '@/application/errors/ValidationError';
import { NotFoundError } from '@/application/errors/NotFoundError';
import { GateBlockedError } from '@/application/errors/GateBlockedError';

// ============================================================================
// Source Form Key Enum
// ============================================================================

/**
 * Source form keys for tracking where inventory usage originated.
 */
export enum SourceFormKey {
  NURSE_MED_ADMIN = 'NURSE_MED_ADMIN',
  NURSE_INTRAOP_RECORD = 'NURSE_INTRAOP_RECORD',
  NURSE_RECOVERY_RECORD = 'NURSE_RECOVERY_RECORD',
  DOCTOR_CASE_PLAN = 'DOCTOR_CASE_PLAN',
  THEATER_TECH = 'THEATER_TECH',
}

// ============================================================================
// Types
// ============================================================================

export interface UsageItem {
  inventoryItemId: number;
  quantityUsed: number;
  notes?: string;
}

export interface ApplyUsageAndBillingParams {
  surgicalCaseId: string;
  externalRef: string;
  sourceFormKey: SourceFormKey;
  items: UsageItem[];
  recordedBy: string;
  usedBy?: string;
  usedAt?: Date;
}

export interface UsageRecord {
  id: number;
  inventoryItemId: number;
  quantityUsed: number;
  unitCostAtTime: number;
  totalCost: number;
  externalRef: string;
  sourceFormKey: string;
  usedAt: Date;
  usedBy: string;
  billItemId: number | null;
}

export interface BillItem {
  id: number;
  paymentId: number;
  serviceId: number;
  serviceDate: Date;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface PaymentSummary {
  id: number;
  patientId: string;
  surgicalCaseId: string | null;
  totalAmount: number;
  discount: number;
  status: string;
}

export interface ApplyUsageAndBillingResult {
  usageRecord: UsageRecord;
  billItem: BillItem | null;
  payment: PaymentSummary;
  isIdempotentReplay: boolean;
}

export interface PreviewPlanCostItem {
  inventoryItemId: number;
  plannedQuantity: number;
}

export interface PreviewPlanCostParams {
  items: PreviewPlanCostItem[];
}

export interface PreviewPlanCostLine {
  inventoryItemId: number;
  itemName: string;
  plannedQuantity: number;
  unitCost: number;
  totalCost: number;
  isBillable: boolean;
}

export interface PreviewPlanCostResult {
  lines: PreviewPlanCostLine[];
  billableTotal: number;
  nonBillableTotal: number;
  grandTotal: number;
}

// ============================================================================
// Service Interface
// ============================================================================

export interface InventoryConsumptionBillingService {
  applyUsageAndBilling(params: ApplyUsageAndBillingParams): Promise<ApplyUsageAndBillingResult>;
  previewPlanCost(params: PreviewPlanCostParams): Promise<PreviewPlanCostResult>;
  applyUsageAndBillingWithTransaction(
    tx: Prisma.TransactionClient,
    params: ApplyUsageAndBillingParams
  ): Promise<ApplyUsageAndBillingResult>;
}

// ============================================================================
// Implementation
// ============================================================================

export class PrismaInventoryConsumptionBillingService implements InventoryConsumptionBillingService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Apply inventory usage and create billing entries.
   * 
   * Idempotent: If externalRef already exists, returns existing result.
   * Transactional: All operations succeed or fail together.
   * 
   * Constraints:
   * - items.length must be 1 (external_ref is unique per usage record)
   * - Validates stock availability
   * - Creates Payment if missing
   * - Creates PatientBill if item is billable
   * - Recomputes Payment.total_amount
   */
  async applyUsageAndBilling(params: ApplyUsageAndBillingParams): Promise<ApplyUsageAndBillingResult> {
    return this.db.$transaction(async (tx) => {
      return this.applyUsageAndBillingWithTransaction(tx, params);
    });
  }

  /**
   * Apply usage and billing within an existing transaction.
   * Used when called from within another transaction (e.g., MedicationService).
   */
  async applyUsageAndBillingWithTransaction(
    tx: Prisma.TransactionClient,
    params: ApplyUsageAndBillingParams
  ): Promise<ApplyUsageAndBillingResult> {
    const { surgicalCaseId, externalRef, sourceFormKey, items, recordedBy, usedBy, usedAt } = params;

    // Validate: Only one item per call (external_ref is unique)
    if (items.length !== 1) {
      throw new ValidationError(
        'Batch usage not supported yet; submit items individually',
        [{ field: 'items', message: 'Must contain exactly one item' }]
      );
    }

    const item = items[0];
    const actualUsedBy = usedBy || recordedBy;
    const actualUsedAt = usedAt || new Date();

    // Idempotency check (within transaction)
    const existingUsage = await tx.inventoryUsage.findUnique({
      where: { external_ref: externalRef },
      include: {
        bill_item: {
          include: {
            payment: true,
          },
        },
      },
    });

    if (existingUsage) {
      const payment = existingUsage.bill_item?.payment
        ? existingUsage.bill_item.payment
        : await tx.payment.findUnique({
            where: { surgical_case_id: surgicalCaseId },
          });

      if (!payment) {
        throw new NotFoundError('Payment not found for existing usage record');
      }

      return {
        usageRecord: {
          id: existingUsage.id,
          inventoryItemId: existingUsage.inventory_item_id,
          quantityUsed: existingUsage.quantity_used,
          unitCostAtTime: existingUsage.unit_cost_at_time,
          totalCost: existingUsage.total_cost,
          externalRef: existingUsage.external_ref!,
          sourceFormKey: existingUsage.source_form_key || '',
          usedAt: existingUsage.used_at || existingUsage.created_at,
          usedBy: existingUsage.used_by_user_id || existingUsage.recorded_by,
          billItemId: existingUsage.bill_item_id,
        },
        billItem: existingUsage.bill_item
          ? {
              id: existingUsage.bill_item.id,
              paymentId: existingUsage.bill_item.payment_id,
              serviceId: existingUsage.bill_item.service_id,
              serviceDate: existingUsage.bill_item.service_date,
              quantity: existingUsage.bill_item.quantity,
              unitCost: existingUsage.bill_item.unit_cost,
              totalCost: existingUsage.bill_item.total_cost,
            }
          : null,
        payment: {
          id: payment.id,
          patientId: payment.patient_id,
          surgicalCaseId: payment.surgical_case_id || null,
          totalAmount: payment.total_amount,
          discount: payment.discount,
          status: payment.status,
        },
        isIdempotentReplay: true,
      };
    }

    // Validate surgical case exists
    const surgicalCase = await tx.surgicalCase.findUnique({
      where: { id: surgicalCaseId },
      select: { id: true, patient_id: true },
    });

    if (!surgicalCase) {
      throw new NotFoundError(`Surgical case with ID ${surgicalCaseId} not found`, 'SurgicalCase', surgicalCaseId);
    }

    // Fetch and validate inventory item
    const inventoryItem = await tx.inventoryItem.findUnique({
      where: { id: item.inventoryItemId },
    });

    if (!inventoryItem) {
      throw new GateBlockedError(
        `Inventory item with ID ${item.inventoryItemId} not found`,
        'INVENTORY_ITEM_NOT_FOUND',
        []
      );
    }

    if (!inventoryItem.is_active) {
      throw new GateBlockedError(
        `Inventory item ${inventoryItem.name} is inactive`,
        'INVENTORY_ITEM_INACTIVE',
        []
      );
    }

    // Stock availability validation is deferred to transaction calculation instead of item state
    // In Phase 4+, stock is calculated from Batches and Transactions dynamically
    // The previous invariant assumed quantity_on_hand was stored on the item.

    // Ensure Payment exists
    let payment = await tx.payment.findUnique({
      where: { surgical_case_id: surgicalCaseId },
    });

    if (!payment) {
      payment = await tx.payment.create({
        data: {
          patient_id: surgicalCase.patient_id,
          surgical_case_id: surgicalCaseId,
          bill_type: 'SURGERY',
          bill_date: new Date(),
          total_amount: 0,
          discount: 0,
          amount_paid: 0,
          status: 'UNPAID',
          payment_method: 'CASH',
        },
      });
    }

    // Decrement stock (atomic logic removed since stock is dynamic in Phase 4)
    // Transactional adjustments are now handled via `InventoryBatch` and `InventoryTransaction`
    // This is a placeholder since `quantity_on_hand` is no longer on the Item model.

    // Create InventoryUsage record
    const unitCostAtTime = typeof inventoryItem.unit_cost === 'number' 
      ? inventoryItem.unit_cost 
      : inventoryItem.unit_cost.toNumber();
    const totalCost = unitCostAtTime * item.quantityUsed;

    const usageRecord = await tx.inventoryUsage.create({
      data: {
        inventory_item_id: item.inventoryItemId,
        surgical_case_id: surgicalCaseId,
        quantity_used: item.quantityUsed,
        unit_cost_at_time: unitCostAtTime,
        total_cost: totalCost,
        recorded_by: recordedBy,
        notes: item.notes || null,
        external_ref: externalRef,
        source_form_key: sourceFormKey,
        used_at: actualUsedAt,
        used_by_user_id: actualUsedBy,
      },
    });

    // Create PatientBill if billable
    let billItem: BillItem | null = null;
    if (inventoryItem.is_billable) {
      const serviceId = await this.resolveInventoryServiceId(tx, inventoryItem);

      const createdBillItem = await tx.patientBill.create({
        data: {
          payment_id: payment.id,
          service_id: serviceId,
          service_date: actualUsedAt,
          quantity: Math.floor(item.quantityUsed),
          unit_cost: unitCostAtTime,
          total_cost: totalCost,
        },
      });

      // Link InventoryUsage to PatientBill
      await tx.inventoryUsage.update({
        where: { id: usageRecord.id },
        data: { bill_item_id: createdBillItem.id },
      });

      billItem = {
        id: createdBillItem.id,
        paymentId: createdBillItem.payment_id,
        serviceId: createdBillItem.service_id,
        serviceDate: createdBillItem.service_date,
        quantity: createdBillItem.quantity,
        unitCost: createdBillItem.unit_cost,
        totalCost: createdBillItem.total_cost,
      };
    }

    // Recompute Payment.total_amount (sum of all bill items)
    const billItems = await tx.patientBill.findMany({
      where: { payment_id: payment.id },
      select: { total_cost: true },
    });

    const sumTotalCost = billItems.reduce((sum, bi) => sum + bi.total_cost, 0);
    const finalTotalAmount = sumTotalCost - payment.discount;

    await tx.payment.update({
      where: { id: payment.id },
      data: { total_amount: finalTotalAmount },
    });

    return {
      usageRecord: {
        id: usageRecord.id,
        inventoryItemId: usageRecord.inventory_item_id,
        quantityUsed: usageRecord.quantity_used,
        unitCostAtTime: usageRecord.unit_cost_at_time,
        totalCost: usageRecord.total_cost,
        externalRef: usageRecord.external_ref!,
        sourceFormKey: usageRecord.source_form_key || '',
        usedAt: usageRecord.used_at || usageRecord.created_at,
        usedBy: usageRecord.used_by_user_id || usageRecord.recorded_by,
        billItemId: usageRecord.bill_item_id,
      },
      billItem,
      payment: {
        id: payment.id,
        patientId: payment.patient_id,
        surgicalCaseId: payment.surgical_case_id || null,
        totalAmount: finalTotalAmount,
        discount: payment.discount,
        status: payment.status,
      },
      isIdempotentReplay: false,
    };
  }

  /**
   * Preview plan cost (read-only).
   * Computes estimated costs for planned inventory items.
   */
  async previewPlanCost(params: PreviewPlanCostParams): Promise<PreviewPlanCostResult> {
    const { items } = params;

    if (items.length === 0) {
      return {
        lines: [],
        billableTotal: 0,
        nonBillableTotal: 0,
        grandTotal: 0,
      };
    }

    const inventoryItemIds = items.map((item) => item.inventoryItemId);
    const inventoryItems = await this.db.inventoryItem.findMany({
      where: {
        id: { in: inventoryItemIds },
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        unit_cost: true,
        is_billable: true,
      },
    });

    const itemMap = new Map(inventoryItems.map((item) => [item.id, item]));

    const lines: PreviewPlanCostLine[] = [];
    let billableTotal = 0;
    let nonBillableTotal = 0;

    for (const item of items) {
      const inventoryItem = itemMap.get(item.inventoryItemId);
      if (!inventoryItem) {
        continue; // Skip missing items
      }

      const unitCostNum = typeof inventoryItem.unit_cost === 'number' 
        ? inventoryItem.unit_cost 
        : inventoryItem.unit_cost.toNumber();
      const totalCost = unitCostNum * item.plannedQuantity;
      lines.push({
        inventoryItemId: item.inventoryItemId,
        itemName: inventoryItem.name,
        plannedQuantity: item.plannedQuantity,
        unitCost: unitCostNum,
        totalCost,
        isBillable: inventoryItem.is_billable,
      });

      if (inventoryItem.is_billable) {
        billableTotal += totalCost;
      } else {
        nonBillableTotal += totalCost;
      }
    }

    return {
      lines,
      billableTotal,
      nonBillableTotal,
      grandTotal: billableTotal + nonBillableTotal,
    };
  }

  /**
   * Resolve Service ID for inventory item billing.
   * 
   * Strategy:
   * 1. Try to find Service with name matching "Inventory: {item.name}"
   * 2. Try to find Service with category matching item category
   * 3. Try to find a generic "Inventory Item" service
   * 4. If not found, create a Service with safe defaults
   */
   private async resolveInventoryServiceId(
    tx: Prisma.TransactionClient,
    inventoryItem: { id: number; name: string; category: string; unit_cost: number | Decimal }
  ): Promise<number> {
    // Strategy 1: Find by name pattern
    let service = await tx.service.findFirst({
      where: {
        service_name: { contains: `Inventory: ${inventoryItem.name}`, mode: 'insensitive' },
        is_active: true,
      },
    });

    if (service) {
      return service.id;
    }

    // Strategy 2: Find by category
    if (inventoryItem.category) {
      service = await tx.service.findFirst({
        where: {
          category: inventoryItem.category,
          is_active: true,
        },
      });

      if (service) {
        return service.id;
      }
    }

    // Strategy 3: Find generic "Inventory Item" service
    service = await tx.service.findFirst({
      where: {
        service_name: { contains: 'Inventory Item', mode: 'insensitive' },
        is_active: true,
      },
    });

    if (service) {
      return service.id;
    }

    // Strategy 4: Create service with safe defaults
    const newService = await tx.service.create({
      data: {
        service_name: `Inventory: ${inventoryItem.name}`,
        description: `Billing service for inventory item: ${inventoryItem.name}`,
        price: inventoryItem.unit_cost,
        category: inventoryItem.category || 'INVENTORY',
        is_active: true,
      },
    });

    return newService.id;
  }
}
