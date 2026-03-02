/**
 * Integration Tests: GET /api/nurse/surgical-cases/[caseId]/billing-summary
 *
 * Contract tests for billing summary API route.
 * Validates ApiResponse<T> structure, HTTP status codes.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/nurse/surgical-cases/[caseId]/billing-summary/route';
import { NextRequest } from 'next/server';
import { Role } from '@/domain/enums/Role';
import {
  assertSuccess200,
  assertError403,
  assertStatusCode,
} from '../../helpers/apiResponseAssertions';

// Mock JWT middleware
vi.mock('@/lib/auth/middleware', () => ({
  JwtMiddleware: {
    authenticate: vi.fn(),
  },
}));

// Mock endpoint timer
vi.mock('@/lib/observability/endpointLogger', () => ({
  endpointTimer: vi.fn(() => ({
    end: vi.fn(),
  })),
}));

// Mock db
vi.mock('@/lib/db', () => ({
  default: {
    payment: {
      findUnique: vi.fn(),
    },
    inventoryUsage: {
      findMany: vi.fn(),
    },
  },
}));

import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

describe('GET /api/nurse/surgical-cases/[caseId]/billing-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success (200)', () => {
    it('should return 200 with empty billItems when no payment exists', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.NURSE,
        },
      });

      (db.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/nurse/surgical-cases/case-1/billing-summary',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-token',
          },
        }
      );

      // Act
      const response = await GET(request, { params: Promise.resolve({ caseId: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertSuccess200(response, data);
      const responseData = data.data as any;
      expect(responseData.payment).toBeNull();
      expect(responseData.billItems).toEqual([]);
      expect(responseData.usageSummary.totalItemsUsed).toBe(0);
    });

    it('should return 200 with payment and billItems when payment exists', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.NURSE,
        },
      });

      (db.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 100,
        patient_id: 'patient-1',
        surgical_case_id: 'case-1',
        bill_date: new Date('2024-01-01'),
        payment_date: null,
        total_amount: 50.0,
        discount: 5.0,
        amount_paid: 0,
        status: 'UNPAID',
        payment_method: 'CASH',
        bill_items: [
          {
            id: 200,
            service_id: 300,
            service_date: new Date('2024-01-01'),
            quantity: 1,
            unit_cost: 50.0,
            total_cost: 50.0,
            service: {
              id: 300,
              service_name: 'Test Service',
              category: 'SURGERY',
            },
            inventory_usage: {
              id: 400,
              inventory_item_id: 500,
              quantity_used: 1,
              inventory_item: {
                id: 500,
                name: 'Test Item',
                category: 'MEDICATION',
                is_billable: true,
              },
            },
          },
        ],
      });

      (db.inventoryUsage.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 400,
          inventory_item_id: 500,
          quantity_used: 1,
          total_cost: 50.0,
          inventory_item: {
            id: 500,
            name: 'Test Item',
            category: 'MEDICATION',
            is_billable: true,
          },
        },
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/nurse/surgical-cases/case-1/billing-summary',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-token',
          },
        }
      );

      // Act
      const response = await GET(request, { params: Promise.resolve({ caseId: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertSuccess200(response, data);
      const responseData = data.data as any;
      expect(responseData.payment).toBeDefined();
      expect(responseData.payment.id).toBe(100);
      expect(responseData.billItems).toHaveLength(1);
      expect(responseData.usageSummary.totalItemsUsed).toBe(1);
      expect(responseData.usageSummary.totalBillableCost).toBe(50.0);
    });
  });

  describe('Forbidden (403)', () => {
    it('should return 403 when user is not NURSE or ADMIN', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.DOCTOR,
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/nurse/surgical-cases/case-1/billing-summary',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-token',
          },
        }
      );

      // Act
      const response = await GET(request, { params: Promise.resolve({ caseId: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 403);
      assertError403(data);
    });
  });
});
