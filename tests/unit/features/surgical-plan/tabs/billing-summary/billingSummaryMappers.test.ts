/**
 * Unit Tests: Billing Summary Tab Mappers
 */

import { describe, it, expect } from 'vitest';
import { mapBillingSummaryDtoToViewModel } from '@/features/surgical-plan/tabs/billing-summary/billingSummaryMappers';

describe('billingSummaryMappers', () => {
  describe('mapBillingSummaryDtoToViewModel', () => {
    it('should map DTO to view model correctly', () => {
      const dto = {
        payment: {
          id: 1,
          patientId: 'patient-1',
          surgicalCaseId: 'case-1',
          billDate: '2024-01-01T00:00:00Z',
          paymentDate: null,
          totalAmount: 1000,
          discount: 100,
          amountPaid: 900,
          status: 'PAID',
          paymentMethod: 'CASH',
        },
        billItems: [
          {
            id: 1,
            serviceId: 1,
            serviceName: 'Test Service',
            serviceDate: '2024-01-01T00:00:00Z',
            quantity: 1,
            unitCost: 1000,
            totalCost: 1000,
            inventoryUsage: null,
          },
        ],
        usageSummary: {
          totalItemsUsed: 1,
          totalBillableCost: 1000,
          totalNonBillableCost: 0,
          byCategory: {},
        },
      };
      const result = mapBillingSummaryDtoToViewModel(dto);
      expect(result.payment).toBeDefined();
      expect(result.payment?.status).toBe('PAID');
      expect(result.billItems).toHaveLength(1);
      expect(result.usageSummary.totalBillableCost).toBe(1000);
    });

    it('should handle null payment', () => {
      const dto = {
        payment: null,
        billItems: [],
        usageSummary: {
          totalItemsUsed: 0,
          totalBillableCost: 0,
          totalNonBillableCost: 0,
          byCategory: {},
        },
      };
      const result = mapBillingSummaryDtoToViewModel(dto);
      expect(result.payment).toBeNull();
    });
  });
});
