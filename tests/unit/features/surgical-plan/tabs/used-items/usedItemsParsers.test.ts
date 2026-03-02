/**
 * Unit Tests: Used Items Tab Parsers
 */

import { describe, it, expect } from 'vitest';
import { parseUsedItemsResponse } from '@/features/surgical-plan/tabs/used-items/usedItemsParsers';
import { ValidationError } from '@/application/errors/ValidationError';

describe('usedItemsParsers', () => {
  describe('parseUsedItemsResponse', () => {
    it('should parse valid response with payment', () => {
      const data = {
        payment: {
          id: 1,
          patientId: 'patient-1',
          surgicalCaseId: 'case-1',
          billDate: '2024-01-01T00:00:00Z',
          paymentDate: null,
          totalAmount: 1000,
          discount: 0,
          amountPaid: 0,
          status: 'PENDING',
          paymentMethod: null,
        },
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
      const result = parseUsedItemsResponse(data);
      expect(result.payment).toBeDefined();
      expect(result.billItems).toHaveLength(1);
    });

    it('should parse valid response without payment', () => {
      const data = {
        payment: null,
        billItems: [],
        usageSummary: {
          totalItemsUsed: 0,
          totalBillableCost: 0,
          totalNonBillableCost: 0,
          byCategory: {},
        },
      };
      const result = parseUsedItemsResponse(data);
      expect(result.payment).toBeNull();
      expect(result.billItems).toEqual([]);
    });

    it('should throw ValidationError for invalid response', () => {
      const data = { payment: { id: 'invalid' } };
      expect(() => parseUsedItemsResponse(data)).toThrow(ValidationError);
    });
  });
});
