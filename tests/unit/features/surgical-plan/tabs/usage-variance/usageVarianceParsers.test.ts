/**
 * Unit Tests: Usage Variance Tab Parsers
 */

import { describe, it, expect } from 'vitest';
import { parseUsageVarianceResponse } from '@/features/surgical-plan/tabs/usage-variance/usageVarianceParsers';
import { ValidationError } from '@/application/errors/ValidationError';
import { SourceFormKey } from '@/application/services/InventoryConsumptionBillingService';

describe('usageVarianceParsers', () => {
  describe('parseUsageVarianceResponse', () => {
    it('should parse valid response with variance', () => {
      const data = {
        plannedItems: [
          {
            id: 1,
            inventoryItemId: 10,
            itemName: 'Test Item',
            plannedQuantity: 5,
            plannedUnitPrice: 100,
            plannedTotalCost: 500,
            notes: null,
          },
        ],
        usedItems: [
          {
            id: 1,
            inventoryItemId: 10,
            itemName: 'Test Item',
            quantityUsed: 3,
            unitCostAtTime: 100,
            totalCost: 300,
            usedAt: '2024-01-01T00:00:00Z',
            sourceFormKey: SourceFormKey.NURSE_INTRAOP_RECORD,
          },
        ],
        variance: [
          {
            inventoryItemId: 10,
            itemName: 'Test Item',
            plannedQuantity: 5,
            usedQuantity: 3,
            quantityVariance: -2,
            plannedCost: 500,
            actualCost: 300,
            costVariance: -200,
            isBillable: true,
          },
        ],
        plannedTotalCost: 500,
        actualBilledCost: 300,
        varianceTotal: -200,
      };
      const result = parseUsageVarianceResponse(data);
      expect(result.variance).toHaveLength(1);
      expect(result.variance[0].quantityVariance).toBe(-2);
    });

    it('should parse empty response', () => {
      const data = {
        plannedItems: [],
        usedItems: [],
        variance: [],
        plannedTotalCost: 0,
        actualBilledCost: 0,
        varianceTotal: 0,
      };
      const result = parseUsageVarianceResponse(data);
      expect(result.variance).toEqual([]);
    });

    it('should throw ValidationError for invalid response', () => {
      const data = { variance: [{ inventoryItemId: 'invalid' }] };
      expect(() => parseUsageVarianceResponse(data)).toThrow(ValidationError);
    });
  });
});
