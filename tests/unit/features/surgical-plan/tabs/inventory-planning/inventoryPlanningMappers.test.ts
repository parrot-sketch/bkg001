/**
 * Unit Tests: Inventory Planning Mappers
 */

import { describe, it, expect } from 'vitest';
import {
  computePlannedConsumptionBadges,
  mapPlannedItemsDtoToVm,
  mapUsageVarianceDtoToVm,
} from '@/features/surgical-plan/tabs/inventory-planning/inventoryPlanningMappers';
import type {
  PlannedItemsResponse,
  UsageVarianceResponse,
} from '@/features/surgical-plan/tabs/inventory-planning/inventoryPlanningParsers';

describe('inventoryPlanningMappers', () => {
  describe('computePlannedConsumptionBadges', () => {
    it('should return "none" when no quantity used', () => {
      expect(computePlannedConsumptionBadges(10, 0)).toBe('none');
    });

    it('should return "partial" when partially consumed', () => {
      expect(computePlannedConsumptionBadges(10, 5)).toBe('partial');
    });

    it('should return "full" when fully consumed', () => {
      expect(computePlannedConsumptionBadges(10, 10)).toBe('full');
    });

    it('should return "over" when over-consumed', () => {
      expect(computePlannedConsumptionBadges(10, 15)).toBe('over');
    });
  });

  describe('mapPlannedItemsDtoToVm', () => {
    it('should map DTO to view model with variance', () => {
      const plannedItemsDto: PlannedItemsResponse = {
        plannedItems: [
          {
            id: 1,
            inventoryItemId: 10,
            itemName: 'Test Item',
            plannedQuantity: 5,
            plannedUnitPrice: 100,
            notes: 'Test notes',
            isBillable: true,
          },
        ],
        plannedServices: [],
        costEstimate: {
          billableTotal: 500,
          nonBillableTotal: 0,
          serviceTotal: 0,
          grandTotal: 500,
        },
      };

      const varianceDto: UsageVarianceResponse = {
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

      const inventoryItemsMap = new Map([
        [10, { quantityOnHand: 20, reorderPoint: 5 }],
      ]);

      const result = mapPlannedItemsDtoToVm(plannedItemsDto, varianceDto, inventoryItemsMap);
      expect(result.plannedItems).toHaveLength(1);
      expect(result.plannedItems[0].usedQuantity).toBe(3);
      expect(result.plannedItems[0].remainingQuantity).toBe(2);
      expect(result.plannedItems[0].consumptionStatus).toBe('partial');
    });
  });

  describe('mapUsageVarianceDtoToVm', () => {
    it('should map variance DTO to view model', () => {
      const dto: UsageVarianceResponse = {
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
        usedItems: [],
        variance: [],
        plannedTotalCost: 500,
        actualBilledCost: 0,
        varianceTotal: -500,
      };

      const inventoryItemsMap = new Map([
        [10, { quantityOnHand: 20, reorderPoint: 5 }],
      ]);

      const result = mapUsageVarianceDtoToVm(dto, inventoryItemsMap);
      expect(result.plannedItems).toHaveLength(1);
      expect(result.variance).toHaveLength(0);
    });
  });
});
