/**
 * Unit Tests: Inventory Planning Parsers
 */

import { describe, it, expect } from 'vitest';
import {
  parsePlannedItemsResponse,
  parseReplacePlannedItemsRequest,
  parseUsageVarianceResponse,
  parseConsumeFromPlanRequest,
  parseInventoryItemsResponse,
} from '@/features/surgical-plan/tabs/inventory-planning/inventoryPlanningParsers';
import { ValidationError } from '@/application/errors/ValidationError';
import { SourceFormKey } from '@/application/services/InventoryConsumptionBillingService';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';

describe('inventoryPlanningParsers', () => {
  describe('parsePlannedItemsResponse', () => {
    it('should parse valid response', () => {
      const data = {
        plannedItems: [
          {
            id: 1,
            inventoryItemId: 10,
            itemName: 'Test Implant',
            plannedQuantity: 2,
            plannedUnitPrice: 100.5,
            notes: 'Test notes',
            isBillable: true,
          },
        ],
        plannedServices: [],
        costEstimate: {
          billableTotal: 201,
          nonBillableTotal: 0,
          serviceTotal: 0,
          grandTotal: 201,
        },
      };
      const result = parsePlannedItemsResponse(data);
      expect(result.plannedItems).toHaveLength(1);
      expect(result.plannedItems[0].itemName).toBe('Test Implant');
    });

    it('should throw ValidationError for invalid response', () => {
      const data = { plannedItems: 'invalid' };
      expect(() => parsePlannedItemsResponse(data)).toThrow(ValidationError);
    });
  });

  describe('parseReplacePlannedItemsRequest', () => {
    it('should parse valid request', () => {
      const body = {
        items: [
          {
            inventoryItemId: 10,
            plannedQuantity: 2,
            notes: 'Test',
          },
        ],
      };
      const result = parseReplacePlannedItemsRequest(body);
      expect(result.items).toHaveLength(1);
    });

    it('should throw ValidationError for empty items and services', () => {
      const body = { items: [], services: [] };
      expect(() => parseReplacePlannedItemsRequest(body)).toThrow(ValidationError);
    });
  });

  describe('parseUsageVarianceResponse', () => {
    it('should parse valid response', () => {
      const data = {
        plannedItems: [],
        usedItems: [],
        variance: [],
        plannedTotalCost: 0,
        actualBilledCost: 0,
        varianceTotal: 0,
      };
      const result = parseUsageVarianceResponse(data);
      expect(result).toBeDefined();
    });
  });

  describe('parseConsumeFromPlanRequest', () => {
    it('should parse valid request', () => {
      const body = {
        externalRef: '123e4567-e89b-12d3-a456-426614174000',
        sourceFormKey: SourceFormKey.NURSE_MED_ADMIN,
        items: [
          {
            inventoryItemId: 10,
            quantityUsed: 1,
            notes: 'Test',
          },
        ],
      };
      const result = parseConsumeFromPlanRequest(body);
      expect(result.items).toHaveLength(1);
    });

    it('should throw ValidationError for multiple items (single-item invariant)', () => {
      const body = {
        externalRef: '123e4567-e89b-12d3-a456-426614174000',
        sourceFormKey: SourceFormKey.NURSE_MED_ADMIN,
        items: [
          { inventoryItemId: 10, quantityUsed: 1 },
          { inventoryItemId: 11, quantityUsed: 1 },
        ],
      };
      expect(() => parseConsumeFromPlanRequest(body)).toThrow(ValidationError);
    });
  });

  describe('parseInventoryItemsResponse', () => {
    it('should parse valid response', () => {
      const data = {
        data: [
          {
            id: 1,
            name: 'Test Item',
            sku: 'SKU001',
            category: InventoryCategory.IMPLANT,
            description: 'Test description',
            unitOfMeasure: 'pcs',
            unitCost: 100,
            quantityOnHand: 10,
            reorderPoint: 5,
            supplier: null,
            manufacturer: 'Test Manufacturer',
            isActive: true,
            isBillable: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 1,
          totalPages: 1,
        },
      };
      const result = parseInventoryItemsResponse(data);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.totalCount).toBe(1);
    });
  });
});
