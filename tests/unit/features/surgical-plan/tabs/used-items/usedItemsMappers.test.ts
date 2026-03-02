/**
 * Unit Tests: Used Items Tab Mappers
 */

import { describe, it, expect } from 'vitest';
import { mapUsedItemsDtoToViewModel } from '@/features/surgical-plan/tabs/used-items/usedItemsMappers';

describe('usedItemsMappers', () => {
  describe('mapUsedItemsDtoToViewModel', () => {
    it('should map DTO to view model correctly', () => {
      const dto = {
        payment: null,
        billItems: [
          {
            id: 1,
            serviceId: 1,
            serviceName: 'Test Service',
            serviceDate: '2024-01-01T00:00:00Z',
            quantity: 2,
            unitCost: 100,
            totalCost: 200,
            inventoryUsage: {
              id: 1,
              inventoryItemId: 10,
              itemName: 'Test Item',
              quantityUsed: 2,
            },
          },
        ],
        usageSummary: {
          totalItemsUsed: 1,
          totalBillableCost: 200,
          totalNonBillableCost: 0,
          byCategory: {},
        },
      };
      const result = mapUsedItemsDtoToViewModel(dto);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].itemName).toBe('Test Item');
      expect(result.items[0].hasInventoryLink).toBe(true);
      expect(result.totalBillableCost).toBe(200);
    });

    it('should handle items without inventory link', () => {
      const dto = {
        payment: null,
        billItems: [
          {
            id: 1,
            serviceId: 1,
            serviceName: 'Service Only',
            serviceDate: null,
            quantity: 1,
            unitCost: 50,
            totalCost: 50,
            inventoryUsage: null,
          },
        ],
        usageSummary: {
          totalItemsUsed: 1,
          totalBillableCost: 50,
          totalNonBillableCost: 0,
          byCategory: {},
        },
      };
      const result = mapUsedItemsDtoToViewModel(dto);
      expect(result.items[0].hasInventoryLink).toBe(false);
      expect(result.items[0].itemName).toBe('Service Only');
    });
  });
});
