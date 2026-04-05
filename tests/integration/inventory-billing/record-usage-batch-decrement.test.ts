/**
 * Integration Tests: recordUsage() with batch decrement
 *
 * Tests that:
 * 1. Batch quantity_remaining decrements correctly
 * 2. Usage exceeding available quantity throws InsufficientBatchQuantityError
 * 3. FIFO batch selection works across multiple batches
 * 4. InventoryAuditEvent is emitted after successful usage
 * 5. Transactions are atomic (no partial states)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDatabase } from '../setup/test-database';
import { PrismaInventoryRepository } from '@/infrastructure/database/repositories/PrismaInventoryRepository';
import { InsufficientBatchQuantityError } from '@/application/errors';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';

describe('PrismaInventoryRepository.recordUsage() - Batch Decrement', () => {
  let db = getTestDatabase();
  let repository: PrismaInventoryRepository;

  beforeEach(async () => {
    repository = new PrismaInventoryRepository(db);
  });

  describe('Successful Usage with Specific Batch', () => {
    it('should decrement quantity_remaining on specified batch', async () => {
      // Arrange: Create inventory item and batch
      const item = await db.inventoryItem.create({
        data: {
          name: 'Test Medication',
          category: InventoryCategory.MEDICATION,
          unit_of_measure: 'ml',
          unit_cost: 10.0,
          is_active: true,
          is_billable: true,
          sku: 'TEST-001',
        },
      });

      const batch = await db.inventoryBatch.create({
        data: {
          inventory_item_id: item.id,
          batch_number: 'BATCH-001',
          expiry_date: new Date('2025-12-31'),
          quantity_remaining: 100,
          cost_per_unit: 10.0,
        },
      });

      const user = await db.user.create({
        data: {
          email: 'nurse@test.com',
          role: 'NURSE',
        },
      });

      // Act: Record usage from specific batch
      await repository.recordUsage({
        inventoryItemId: item.id,
        quantityUsed: 25,
        recordedBy: user.id,
        batchId: batch.id,
      });

      // Assert: Batch quantity decreased
      const updatedBatch = await db.inventoryBatch.findUnique({
        where: { id: batch.id },
      });

      expect(updatedBatch?.quantity_remaining).toBe(75);
    });

    it('should create InventoryUsage record with correct values', async () => {
      // Arrange
      const item = await db.inventoryItem.create({
        data: {
          name: 'Test Item',
          category: InventoryCategory.MEDICATION,
          unit_of_measure: 'unit',
          unit_cost: 50.0,
          is_active: true,
          is_billable: true,
          sku: 'TEST-002',
        },
      });

      const batch = await db.inventoryBatch.create({
        data: {
          inventory_item_id: item.id,
          batch_number: 'BATCH-002',
          expiry_date: new Date('2025-12-31'),
          quantity_remaining: 100,
          cost_per_unit: 50.0,
        },
      });

      const user = await db.user.create({
        data: {
          email: 'nurse2@test.com',
          role: 'NURSE',
        },
      });

      // Act
      const usage = (await repository.recordUsage({
        inventoryItemId: item.id,
        quantityUsed: 10,
        recordedBy: user.id,
        batchId: batch.id,
        notes: 'Test usage',
      })) as any;

      // Assert
      expect(usage.quantity_used).toBe(10);
      expect(usage.unit_cost_at_time).toBe(50.0);
      expect(usage.total_cost).toBe(500.0); // 10 * 50
      expect(usage.notes).toBe('Test usage');
    });

    it('should create InventoryAuditEvent after successful usage', async () => {
      // Arrange
      const item = await db.inventoryItem.create({
        data: {
          name: 'Audit Test Item',
          category: InventoryCategory.MEDICATION,
          unit_of_measure: 'unit',
          unit_cost: 20.0,
          is_active: true,
          is_billable: true,
          sku: 'TEST-003',
        },
      });

      const batch = await db.inventoryBatch.create({
        data: {
          inventory_item_id: item.id,
          batch_number: 'BATCH-003',
          expiry_date: new Date('2025-12-31'),
          quantity_remaining: 50,
          cost_per_unit: 20.0,
        },
      });

      const user = await db.user.create({
        data: {
          email: 'nurse3@test.com',
          role: 'NURSE',
        },
      });

      // Act
      await repository.recordUsage({
        inventoryItemId: item.id,
        quantityUsed: 5,
        recordedBy: user.id,
        batchId: batch.id,
      });

      // Assert
      const auditEvents = await db.inventoryAuditEvent.findMany({
        where: {
          event_type: 'INVENTORY_USAGE_RECORDED',
          actor_user_id: user.id,
        },
      });

      expect(auditEvents).toHaveLength(1);
      expect(auditEvents[0].entity_type).toBe('InventoryUsage');
      expect(auditEvents[0].metadata_json).toContain(`"inventoryItemId":${item.id}`);
    });
  });

  describe('Error Cases - Insufficient Batch Quantity', () => {
    it('should throw InsufficientBatchQuantityError when batch has insufficient quantity', async () => {
      // Arrange
      const item = await db.inventoryItem.create({
        data: {
          name: 'Limited Item',
          category: InventoryCategory.MEDICATION,
          unit_of_measure: 'unit',
          unit_cost: 15.0,
          is_active: true,
          is_billable: true,
          sku: 'TEST-004',
        },
      });

      const batch = await db.inventoryBatch.create({
        data: {
          inventory_item_id: item.id,
          batch_number: 'BATCH-004',
          expiry_date: new Date('2025-12-31'),
          quantity_remaining: 10,
          cost_per_unit: 15.0,
        },
      });

      const user = await db.user.create({
        data: {
          email: 'nurse4@test.com',
          role: 'NURSE',
        },
      });

      // Act & Assert
      await expect(
        repository.recordUsage({
          inventoryItemId: item.id,
          quantityUsed: 25,
          recordedBy: user.id,
          batchId: batch.id,
        })
      ).rejects.toThrow(InsufficientBatchQuantityError);

      // Verify batch was NOT decremented
      const unchangedBatch = await db.inventoryBatch.findUnique({
        where: { id: batch.id },
      });
      expect(unchangedBatch?.quantity_remaining).toBe(10);
    });

    it('should not create InventoryUsage or InventoryAuditEvent on insufficient quantity error', async () => {
      // Arrange
      const item = await db.inventoryItem.create({
        data: {
          name: 'Error Test Item',
          category: InventoryCategory.MEDICATION,
          unit_of_measure: 'unit',
          unit_cost: 12.0,
          is_active: true,
          is_billable: true,
          sku: 'TEST-005',
        },
      });

      const batch = await db.inventoryBatch.create({
        data: {
          inventory_item_id: item.id,
          batch_number: 'BATCH-005',
          expiry_date: new Date('2025-12-31'),
          quantity_remaining: 5,
          cost_per_unit: 12.0,
        },
      });

      const user = await db.user.create({
        data: {
          email: 'nurse5@test.com',
          role: 'NURSE',
        },
      });

      const usageBefore = await db.inventoryUsage.count();
      const auditBefore = await db.inventoryAuditEvent.count();

      // Act
      try {
        await repository.recordUsage({
          inventoryItemId: item.id,
          quantityUsed: 100,
          recordedBy: user.id,
          batchId: batch.id,
        });
      } catch (e) {
        // Expected to throw
      }

      // Assert: No records created
      const usageAfter = await db.inventoryUsage.count();
      const auditAfter = await db.inventoryAuditEvent.count();

      expect(usageAfter).toBe(usageBefore);
      expect(auditAfter).toBe(auditBefore);
    });
  });

  describe('FIFO Batch Selection (Legacy - No Batch ID)', () => {
    it('should deduct from earliest expiry batch when no batchId specified', async () => {
      // Arrange: Create item with two batches
      const item = await db.inventoryItem.create({
        data: {
          name: 'FIFO Test Item',
          category: InventoryCategory.MEDICATION,
          unit_of_measure: 'unit',
          unit_cost: 5.0,
          is_active: true,
          is_billable: true,
          sku: 'TEST-006',
        },
      });

      // Batch 2: Expires later
      const batch2 = await db.inventoryBatch.create({
        data: {
          inventory_item_id: item.id,
          batch_number: 'BATCH-LATER',
          expiry_date: new Date('2026-12-31'),
          quantity_remaining: 50,
          cost_per_unit: 5.0,
        },
      });

      // Batch 1: Expires earlier (should be used first)
      const batch1 = await db.inventoryBatch.create({
        data: {
          inventory_item_id: item.id,
          batch_number: 'BATCH-EARLY',
          expiry_date: new Date('2025-06-30'),
          quantity_remaining: 50,
          cost_per_unit: 5.0,
        },
      });

      const user = await db.user.create({
        data: {
          email: 'nurse6@test.com',
          role: 'NURSE',
        },
      });

      // Act: Record usage without specifying batchId (should use FIFO)
      await repository.recordUsage({
        inventoryItemId: item.id,
        quantityUsed: 20,
        recordedBy: user.id,
        // No batchId - should trigger FIFO
      });

      // Assert: Batch 1 (earliest expiry) was decremented
      const updatedBatch1 = await db.inventoryBatch.findUnique({
        where: { id: batch1.id },
      });
      const updatedBatch2 = await db.inventoryBatch.findUnique({
        where: { id: batch2.id },
      });

      expect(updatedBatch1?.quantity_remaining).toBe(30); // 50 - 20
      expect(updatedBatch2?.quantity_remaining).toBe(50); // Unchanged
    });

    it('should deduct from multiple batches if single batch insufficient in FIFO', async () => {
      // Arrange
      const item = await db.inventoryItem.create({
        data: {
          name: 'Multi-Batch Item',
          category: InventoryCategory.MEDICATION,
          unit_of_measure: 'unit',
          unit_cost: 8.0,
          is_active: true,
          is_billable: true,
          sku: 'TEST-007',
        },
      });

      const batch1 = await db.inventoryBatch.create({
        data: {
          inventory_item_id: item.id,
          batch_number: 'BATCH-1',
          expiry_date: new Date('2025-03-31'),
          quantity_remaining: 15,
          cost_per_unit: 8.0,
        },
      });

      const batch2 = await db.inventoryBatch.create({
        data: {
          inventory_item_id: item.id,
          batch_number: 'BATCH-2',
          expiry_date: new Date('2025-06-30'),
          quantity_remaining: 20,
          cost_per_unit: 8.0,
        },
      });

      const user = await db.user.create({
        data: {
          email: 'nurse7@test.com',
          role: 'NURSE',
        },
      });

      // Act: Use 35 units (15 from batch1 + 20 from batch2)
      await repository.recordUsage({
        inventoryItemId: item.id,
        quantityUsed: 35,
        recordedBy: user.id,
      });

      // Assert: Both batches depleted
      const updatedBatch1 = await db.inventoryBatch.findUnique({
        where: { id: batch1.id },
      });
      const updatedBatch2 = await db.inventoryBatch.findUnique({
        where: { id: batch2.id },
      });

      expect(updatedBatch1?.quantity_remaining).toBe(0);
      expect(updatedBatch2?.quantity_remaining).toBe(0);
    });

    it('should throw InsufficientBatchQuantityError when total FIFO quantity insufficient', async () => {
      // Arrange
      const item = await db.inventoryItem.create({
        data: {
          name: 'Insufficient Total Item',
          category: InventoryCategory.MEDICATION,
          unit_of_measure: 'unit',
          unit_cost: 3.0,
          is_active: true,
          is_billable: true,
          sku: 'TEST-008',
        },
      });

      const batch1 = await db.inventoryBatch.create({
        data: {
          inventory_item_id: item.id,
          batch_number: 'BATCH-A',
          expiry_date: new Date('2025-03-31'),
          quantity_remaining: 10,
          cost_per_unit: 3.0,
        },
      });

      const batch2 = await db.inventoryBatch.create({
        data: {
          inventory_item_id: item.id,
          batch_number: 'BATCH-B',
          expiry_date: new Date('2025-06-30'),
          quantity_remaining: 15,
          cost_per_unit: 3.0,
        },
      });

      const user = await db.user.create({
        data: {
          email: 'nurse8@test.com',
          role: 'NURSE',
        },
      });

      // Act & Assert: Request more than total available (10 + 15 = 25)
      await expect(
        repository.recordUsage({
          inventoryItemId: item.id,
          quantityUsed: 50,
          recordedBy: user.id,
        })
      ).rejects.toThrow(InsufficientBatchQuantityError);

      // Verify batches were NOT decremented (transaction rolled back)
      const unchangedBatch1 = await db.inventoryBatch.findUnique({
        where: { id: batch1.id },
      });
      const unchangedBatch2 = await db.inventoryBatch.findUnique({
        where: { id: batch2.id },
      });

      expect(unchangedBatch1?.quantity_remaining).toBe(10);
      expect(unchangedBatch2?.quantity_remaining).toBe(15);
    });

    it('should skip depleted batches in FIFO selection', async () => {
      // Arrange
      const item = await db.inventoryItem.create({
        data: {
          name: 'Skip Depleted Item',
          category: InventoryCategory.MEDICATION,
          unit_of_measure: 'unit',
          unit_cost: 7.0,
          is_active: true,
          is_billable: true,
          sku: 'TEST-009',
        },
      });

      // Depleted batch (should be skipped)
      await db.inventoryBatch.create({
        data: {
          inventory_item_id: item.id,
          batch_number: 'BATCH-EMPTY',
          expiry_date: new Date('2025-01-31'),
          quantity_remaining: 0,
          cost_per_unit: 7.0,
        },
      });

      // Active batch (should be used)
      const activeBatch = await db.inventoryBatch.create({
        data: {
          inventory_item_id: item.id,
          batch_number: 'BATCH-ACTIVE',
          expiry_date: new Date('2025-06-30'),
          quantity_remaining: 30,
          cost_per_unit: 7.0,
        },
      });

      const user = await db.user.create({
        data: {
          email: 'nurse9@test.com',
          role: 'NURSE',
        },
      });

      // Act
      await repository.recordUsage({
        inventoryItemId: item.id,
        quantityUsed: 10,
        recordedBy: user.id,
      });

      // Assert: Active batch was used
      const updated = await db.inventoryBatch.findUnique({
        where: { id: activeBatch.id },
      });

      expect(updated?.quantity_remaining).toBe(20);
    });
  });

  describe('Atomicity and State Management', () => {
    it('should maintain atomicity: all-or-nothing for multi-batch deduction', async () => {
      // Arrange
      const item = await db.inventoryItem.create({
        data: {
          name: 'Atomicity Test Item',
          category: InventoryCategory.MEDICATION,
          unit_of_measure: 'unit',
          unit_cost: 6.0,
          is_active: true,
          is_billable: true,
          sku: 'TEST-010',
        },
      });

      const batch1 = await db.inventoryBatch.create({
        data: {
          inventory_item_id: item.id,
          batch_number: 'BATCH-ATOM-1',
          expiry_date: new Date('2025-02-28'),
          quantity_remaining: 10,
          cost_per_unit: 6.0,
        },
      });

      const batch2 = await db.inventoryBatch.create({
        data: {
          inventory_item_id: item.id,
          batch_number: 'BATCH-ATOM-2',
          expiry_date: new Date('2025-06-30'),
          quantity_remaining: 20,
          cost_per_unit: 6.0,
        },
      });

      const user = await db.user.create({
        data: {
          email: 'nurse10@test.com',
          role: 'NURSE',
        },
      });

      // Act: Request more than available (should fail)
      try {
        await repository.recordUsage({
          inventoryItemId: item.id,
          quantityUsed: 100,
          recordedBy: user.id,
        });
      } catch (e) {
        // Expected
      }

      // Assert: Neither batch was modified (all-or-nothing)
      const final1 = await db.inventoryBatch.findUnique({
        where: { id: batch1.id },
      });
      const final2 = await db.inventoryBatch.findUnique({
        where: { id: batch2.id },
      });

      expect(final1?.quantity_remaining).toBe(10);
      expect(final2?.quantity_remaining).toBe(20);

      // And no usage record was created
      const usageRecords = await db.inventoryUsage.count();
      expect(usageRecords).toBe(0);
    });
  });

  describe('Surgical Case and Appointment Context', () => {
    it('should record usage associated with surgical case', async () => {
      // Arrange
      const item = await db.inventoryItem.create({
        data: {
          name: 'Surgical Context Item',
          category: InventoryCategory.MEDICATION,
          unit_of_measure: 'unit',
          unit_cost: 25.0,
          is_active: true,
          is_billable: true,
          sku: 'TEST-011',
        },
      });

      const batch = await db.inventoryBatch.create({
        data: {
          inventory_item_id: item.id,
          batch_number: 'BATCH-SURG',
          expiry_date: new Date('2025-12-31'),
          quantity_remaining: 100,
          cost_per_unit: 25.0,
        },
      });

      const user = await db.user.create({
        data: {
          email: 'nurse11@test.com',
          role: 'NURSE',
        },
      });

      const surgicalCase = await (db as any).surgicalCase.create({
        data: {
          case_number: 'CASE-001',
          status: 'SCHEDULED',
        },
      });

      // Act
      const usage = (await repository.recordUsage({
        inventoryItemId: item.id,
        quantityUsed: 5,
        recordedBy: user.id,
        batchId: batch.id,
        surgicalCaseId: surgicalCase.id,
      })) as any;

      // Assert
      expect(usage.surgical_case_id).toBe(surgicalCase.id);
    });
  });
});
