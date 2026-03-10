/**
 * Unit tests for InventoryConsumptionBillingService
 * 
 * Tests:
 * - Idempotency replay returns same usage & does not decrement stock
 * - Insufficient stock throws GateBlockedError with metadata.items
 * - Billable item creates PatientBill and links bill_item_id
 * - Non-billable item does not create PatientBill but usage exists
 * - Payment total recompute works
 * - items.length > 1 throws ValidationError
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaInventoryConsumptionBillingService, SourceFormKey } from '@/application/services/InventoryConsumptionBillingService';
import { ValidationError } from '@/application/errors/ValidationError';
import { GateBlockedError } from '@/application/errors/GateBlockedError';
import { NotFoundError } from '@/application/errors/NotFoundError';
import { randomUUID } from 'crypto';

describe('InventoryConsumptionBillingService', () => {
  let service: PrismaInventoryConsumptionBillingService;
  let mockDb: any;
  let mockTx: any;

  beforeEach(() => {
    mockTx = {
      inventoryUsage: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      inventoryItem: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      surgicalCase: {
        findUnique: vi.fn(),
      },
      payment: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      patientBill: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      service: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };

    mockDb = {
      $transaction: vi.fn((callback) => callback(mockTx)),
      inventoryItem: {
        findMany: vi.fn(),
      },
    } as any;

    service = new PrismaInventoryConsumptionBillingService(mockDb);
  });

  describe('applyUsageAndBilling', () => {
    const baseParams = {
      surgicalCaseId: 'case-123',
      externalRef: randomUUID(),
      sourceFormKey: SourceFormKey.NURSE_MED_ADMIN,
      items: [
        {
          inventoryItemId: 1,
          quantityUsed: 1,
          notes: 'Test usage',
        },
      ],
      recordedBy: 'user-123',
    };

    it('should throw ValidationError if items.length > 1', async () => {
      const params = {
        ...baseParams,
        items: [
          { inventoryItemId: 1, quantityUsed: 1 },
          { inventoryItemId: 2, quantityUsed: 2 },
        ],
      };

      // Validation happens inside the transaction, so transaction will be called
      // but will throw ValidationError
      await expect(service.applyUsageAndBilling(params)).rejects.toThrow(ValidationError);
    });

    it('should return idempotent replay if externalRef exists', async () => {
      const existingUsage = {
        id: 100,
        inventory_item_id: 1,
        quantity_used: 1,
        unit_cost_at_time: 10.0,
        total_cost: 10.0,
        external_ref: baseParams.externalRef,
        source_form_key: SourceFormKey.NURSE_MED_ADMIN,
        used_at: new Date(),
        used_by_user_id: 'user-123',
        recorded_by: 'user-123',
        bill_item_id: 200,
        created_at: new Date(),
        bill_item: {
          id: 200,
          payment_id: 300,
          service_id: 400,
          service_date: new Date(),
          quantity: 1,
          unit_cost: 10.0,
          total_cost: 10.0,
          payment: {
            id: 300,
            patient_id: 'patient-123',
            surgical_case_id: 'case-123',
            total_amount: 10.0,
            discount: 0,
            status: 'UNPAID',
          },
        },
      };

      mockTx.inventoryUsage.findUnique.mockResolvedValue(existingUsage);

      const result = await service.applyUsageAndBilling(baseParams);

      expect(result.isIdempotentReplay).toBe(true);
      expect(result.usageRecord.id).toBe(100);
      expect(result.billItem?.id).toBe(200);
      expect(mockTx.inventoryItem.update).not.toHaveBeenCalled(); // Stock not decremented
    });

    it('should throw NotFoundError if surgical case not found', async () => {
      mockTx.inventoryUsage.findUnique.mockResolvedValue(null);
      mockTx.surgicalCase.findUnique.mockResolvedValue(null);

      await expect(service.applyUsageAndBilling(baseParams)).rejects.toThrow(NotFoundError);
    });

    it('should throw GateBlockedError if inventory item not found', async () => {
      mockTx.inventoryUsage.findUnique.mockResolvedValue(null);
      mockTx.surgicalCase.findUnique.mockResolvedValue({
        id: 'case-123',
        patient_id: 'patient-123',
      });
      mockTx.inventoryItem.findUnique.mockResolvedValue(null);

      await expect(service.applyUsageAndBilling(baseParams)).rejects.toThrow(GateBlockedError);
    });

    // Stock validation is now deferred to batch/transaction logic
    // The old "insufficient stock" test is no longer applicable

    it('should create usage and bill for billable item', async () => {
      const inventoryItem = {
        id: 1,
        name: 'Test Medication',
        category: 'MEDICATION',
        unit_cost: 10.0,
        is_active: true,
        is_billable: true,
      };

      const surgicalCase = {
        id: 'case-123',
        patient_id: 'patient-123',
      };

      const payment = {
        id: 300,
        patient_id: 'patient-123',
        surgical_case_id: 'case-123',
        total_amount: 0,
        discount: 0,
        status: 'UNPAID',
      };

      const serviceRecord = {
        id: 400,
        service_name: 'Medication',
        price: 10.0,
      };

      const usageRecord = {
        id: 100,
        inventory_item_id: 1,
        quantity_used: 1,
        unit_cost_at_time: 10.0,
        total_cost: 10.0,
        external_ref: baseParams.externalRef,
        source_form_key: SourceFormKey.NURSE_MED_ADMIN,
        used_at: new Date(),
        used_by_user_id: 'user-123',
        recorded_by: 'user-123',
        bill_item_id: null,
        created_at: new Date(),
      };

      const billItem = {
        id: 200,
        payment_id: 300,
        service_id: 400,
        service_date: new Date(),
        quantity: 1,
        unit_cost: 10.0,
        total_cost: 10.0,
      };

      mockTx.inventoryUsage.findUnique.mockResolvedValue(null);
      mockTx.surgicalCase.findUnique.mockResolvedValue(surgicalCase);
      mockTx.inventoryItem.findUnique.mockResolvedValue(inventoryItem);
      mockTx.payment.findUnique.mockResolvedValue(payment);
      mockTx.service.findFirst.mockResolvedValue(serviceRecord);
      // Stock is now managed via batches/transactions
      mockTx.inventoryUsage.create.mockResolvedValue(usageRecord);
      mockTx.patientBill.create.mockResolvedValue(billItem);
      mockTx.patientBill.findMany.mockResolvedValue([{ total_cost: 10.0 }]);
      mockTx.inventoryUsage.update.mockResolvedValue({ ...usageRecord, bill_item_id: 200 });
      mockTx.payment.update.mockResolvedValue({ ...payment, total_amount: 10.0 });

      const result = await service.applyUsageAndBilling(baseParams);

      expect(result.isIdempotentReplay).toBe(false);
      expect(result.usageRecord.id).toBe(100);
      expect(result.billItem?.id).toBe(200);
      expect(result.payment.totalAmount).toBe(10.0);
      // Stock is now managed via batches/transactions, not quantity_on_hand field
      // No direct inventoryItem.update call for decrement
    });

    it('should create usage but not bill for non-billable item', async () => {
      const inventoryItem = {
        id: 1,
        name: 'Test Item',
        category: 'SUPPLY',
        unit_cost: 5.0,
        quantity_on_hand: 10,
        is_active: true,
        is_billable: false, // Not billable
      };

      const surgicalCase = {
        id: 'case-123',
        patient_id: 'patient-123',
      };

      const payment = {
        id: 300,
        patient_id: 'patient-123',
        surgical_case_id: 'case-123',
        total_amount: 0,
        discount: 0,
        status: 'UNPAID',
      };

      const usageRecord = {
        id: 100,
        inventory_item_id: 1,
        quantity_used: 1,
        unit_cost_at_time: 5.0,
        total_cost: 5.0,
        external_ref: baseParams.externalRef,
        source_form_key: SourceFormKey.NURSE_MED_ADMIN,
        used_at: new Date(),
        used_by_user_id: 'user-123',
        recorded_by: 'user-123',
        bill_item_id: null,
        created_at: new Date(),
      };

      mockTx.inventoryUsage.findUnique.mockResolvedValue(null);
      mockTx.surgicalCase.findUnique.mockResolvedValue(surgicalCase);
      mockTx.inventoryItem.findUnique.mockResolvedValue(inventoryItem);
      mockTx.payment.findUnique.mockResolvedValue(payment);
      mockTx.inventoryItem.update.mockResolvedValue({ ...inventoryItem, quantity_on_hand: 9 });
      mockTx.inventoryUsage.create.mockResolvedValue(usageRecord);
      mockTx.patientBill.findMany.mockResolvedValue([]);
      mockTx.payment.update.mockResolvedValue(payment);

      const result = await service.applyUsageAndBilling(baseParams);

      expect(result.isIdempotentReplay).toBe(false);
      expect(result.usageRecord.id).toBe(100);
      expect(result.billItem).toBeNull();
      expect(mockTx.patientBill.create).not.toHaveBeenCalled();
    });

    it('should recompute payment total from all bill items', async () => {
      const inventoryItem = {
        id: 1,
        name: 'Test Item',
        category: 'MEDICATION',
        unit_cost: 10.0,
        is_active: true,
        is_billable: true,
      };

      const surgicalCase = {
        id: 'case-123',
        patient_id: 'patient-123',
      };

      const payment = {
        id: 300,
        patient_id: 'patient-123',
        surgical_case_id: 'case-123',
        total_amount: 50.0, // Existing total
        discount: 5.0,
        status: 'UNPAID',
      };

      const serviceRecord = {
        id: 400,
        service_name: 'Medication',
        price: 10.0,
      };

      const usageRecord = {
        id: 100,
        inventory_item_id: 1,
        quantity_used: 1,
        unit_cost_at_time: 10.0,
        total_cost: 10.0,
        external_ref: baseParams.externalRef,
        source_form_key: SourceFormKey.NURSE_MED_ADMIN,
        used_at: new Date(),
        used_by_user_id: 'user-123',
        recorded_by: 'user-123',
        bill_item_id: null,
        created_at: new Date(),
      };

      const billItem = {
        id: 200,
        payment_id: 300,
        service_id: 400,
        service_date: new Date(),
        quantity: 1,
        unit_cost: 10.0,
        total_cost: 10.0,
      };

      mockTx.inventoryUsage.findUnique.mockResolvedValue(null);
      mockTx.surgicalCase.findUnique.mockResolvedValue(surgicalCase);
      mockTx.inventoryItem.findUnique.mockResolvedValue(inventoryItem);
      mockTx.payment.findUnique.mockResolvedValue(payment);
      mockTx.service.findFirst.mockResolvedValue(serviceRecord);
      // Stock is now managed via batches/transactions
      mockTx.inventoryUsage.create.mockResolvedValue(usageRecord);
      mockTx.patientBill.create.mockResolvedValue(billItem);
      // Existing bill items: 20 + 30 = 50, new item: 10, total: 60, minus discount 5 = 55
      mockTx.patientBill.findMany.mockResolvedValue([
        { total_cost: 20.0 },
        { total_cost: 30.0 },
        { total_cost: 10.0 },
      ]);
      mockTx.inventoryUsage.update.mockResolvedValue({ ...usageRecord, bill_item_id: 200 });
      mockTx.payment.update.mockResolvedValue({ ...payment, total_amount: 55.0 });

      const result = await service.applyUsageAndBilling(baseParams);

      expect(result.payment.totalAmount).toBe(55.0);
      expect(mockTx.payment.update).toHaveBeenCalledWith({
        where: { id: 300 },
        data: { total_amount: 55.0 },
      });
    });
  });

  describe('previewPlanCost', () => {
    it('should return empty result for empty items', async () => {
      const result = await service.previewPlanCost({ items: [] });

      expect(result.lines).toEqual([]);
      expect(result.billableTotal).toBe(0);
      expect(result.nonBillableTotal).toBe(0);
      expect(result.grandTotal).toBe(0);
    });

    it('should calculate costs for multiple items', async () => {
      const items = [
        { inventoryItemId: 1, plannedQuantity: 2 },
        { inventoryItemId: 2, plannedQuantity: 3 },
      ];

      const inventoryItems = [
        {
          id: 1,
          name: 'Billable Item',
          unit_cost: 10.0,
          is_billable: true,
        },
        {
          id: 2,
          name: 'Non-Billable Item',
          unit_cost: 5.0,
          is_billable: false,
        },
      ];

      mockDb.inventoryItem.findMany.mockResolvedValue(inventoryItems as any);

      const result = await service.previewPlanCost({ items });

      expect(result.lines).toHaveLength(2);
      expect(result.billableTotal).toBe(20.0); // 2 * 10
      expect(result.nonBillableTotal).toBe(15.0); // 3 * 5
      expect(result.grandTotal).toBe(35.0);
    });
  });
});
