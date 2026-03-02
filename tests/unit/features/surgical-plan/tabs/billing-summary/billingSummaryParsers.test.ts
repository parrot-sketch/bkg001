/**
 * Unit Tests: Billing Summary Tab Parsers
 */

import { describe, it, expect } from 'vitest';
import { parseBillingSummaryResponse } from '@/features/surgical-plan/tabs/billing-summary/billingSummaryParsers';
import { ValidationError } from '@/application/errors/ValidationError';

describe('billingSummaryParsers', () => {
  describe('parseBillingSummaryResponse', () => {
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
        billItems: [],
        usageSummary: {
          totalItemsUsed: 0,
          totalBillableCost: 0,
          totalNonBillableCost: 0,
          byCategory: {},
        },
      };
      const result = parseBillingSummaryResponse(data);
      expect(result.payment).toBeDefined();
      expect(result.payment?.totalAmount).toBe(1000);
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
      const result = parseBillingSummaryResponse(data);
      expect(result.payment).toBeNull();
    });

    it('should throw ValidationError for invalid response', () => {
      const data = { payment: { id: 'invalid' } };
      expect(() => parseBillingSummaryResponse(data)).toThrow(ValidationError);
    });
  });
});
