/**
 * Unit Tests: Usage Variance Tab Mappers
 */

import { describe, it, expect } from 'vitest';
import {
  mapUsageVarianceDtoToViewModel,
  computeConsumptionStatus,
} from '@/features/surgical-plan/tabs/usage-variance/usageVarianceMappers';

describe('usageVarianceMappers', () => {
  describe('computeConsumptionStatus', () => {
    it('should return "none" when no quantity used', () => {
      expect(computeConsumptionStatus(10, 0)).toBe('none');
    });

    it('should return "partial" when partially consumed', () => {
      expect(computeConsumptionStatus(10, 5)).toBe('partial');
    });

    it('should return "full" when fully consumed', () => {
      expect(computeConsumptionStatus(10, 10)).toBe('full');
    });

    it('should return "over" when over-consumed', () => {
      expect(computeConsumptionStatus(10, 12)).toBe('over');
    });
  });

  describe('mapUsageVarianceDtoToViewModel', () => {
    it('should map DTO to view model with correct status badges', () => {
      const dto = {
        plannedItems: [],
        usedItems: [],
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
      const result = mapUsageVarianceDtoToViewModel(dto);
      expect(result.varianceItems).toHaveLength(1);
      expect(result.varianceItems[0].consumptionStatus).toBe('partial');
      expect(result.hasPlannedItems).toBe(false);
      expect(result.hasUsedItems).toBe(false);
    });
  });
});
