/**
 * Integration Tests: POST /api/nurse/surgical-cases/[caseId]/usage
 *
 * Contract tests for inventory usage API route.
 * Validates ApiResponse<T> structure, HTTP status codes, and error metadata.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/nurse/surgical-cases/[caseId]/usage/route';
import { NextRequest } from 'next/server';
import { Role } from '@/domain/enums/Role';
import { GateBlockedError } from '@/application/errors';
import { ApiErrorCode } from '@/lib/http/apiResponse';
import { SourceFormKey } from '@/application/services/InventoryConsumptionBillingService';
import {
  assertSuccess200,
  assertError422,
  assertError403,
  assertError400,
  assertGateBlocked,
  assertValidationError,
  assertStatusCode,
} from '../../helpers/apiResponseAssertions';

// Mock JWT middleware
vi.mock('@/lib/auth/middleware', () => ({
  JwtMiddleware: {
    authenticate: vi.fn(),
  },
}));

// Mock factory
vi.mock('@/lib/factories/inventoryBillingFactory', () => ({
  getInventoryConsumptionBillingService: vi.fn(),
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
    inventoryItem: {
      findUnique: vi.fn(),
    },
    service: {
      findUnique: vi.fn(),
    },
  },
}));

import { JwtMiddleware } from '@/lib/auth/middleware';
import { getInventoryConsumptionBillingService } from '@/lib/factories/inventoryBillingFactory';
import db from '@/lib/db';

describe('POST /api/nurse/surgical-cases/[caseId]/usage', () => {
  let mockConsumptionService: {
    applyUsageAndBilling: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockConsumptionService = {
      applyUsageAndBilling: vi.fn(),
    };

    (getInventoryConsumptionBillingService as ReturnType<typeof vi.fn>).mockReturnValue(
      mockConsumptionService
    );
  });

  describe('Success (200)', () => {
    it('should return 200 with success response for valid usage', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.NURSE,
        },
      });

      const usageResult = {
        usageRecord: {
          id: 100,
          inventoryItemId: 1,
          quantityUsed: 1,
          unitCostAtTime: 10.0,
          totalCost: 10.0,
          externalRef: 'ext-ref-123',
          sourceFormKey: SourceFormKey.NURSE_MED_ADMIN,
          usedAt: new Date(),
          usedBy: 'user-1',
          billItemId: 200,
        },
        billItem: {
          id: 200,
          paymentId: 300,
          serviceId: 400,
          serviceDate: new Date(),
          quantity: 1,
          unitCost: 10.0,
          totalCost: 10.0,
        },
        payment: {
          id: 300,
          patientId: 'patient-1',
          surgicalCaseId: 'case-1',
          totalAmount: 10.0,
          discount: 0,
          status: 'UNPAID',
        },
        isIdempotentReplay: false,
      };

      mockConsumptionService.applyUsageAndBilling.mockResolvedValue(usageResult);

      (db.inventoryItem.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        name: 'Test Medication',
        quantity_on_hand: 10,
        reorder_point: 5,
      });

      (db.service.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        service_name: 'Medication Service',
      });

      const request = new NextRequest('http://localhost:3000/api/nurse/surgical-cases/case-1/usage', {
        method: 'POST',
        body: JSON.stringify({
          externalRef: '550e8400-e29b-41d4-a716-446655440000',
          sourceFormKey: 'NURSE_MED_ADMIN',
          items: [
            {
              inventoryItemId: 1,
              quantityUsed: 1,
              notes: 'Test usage',
            },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ caseId: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertSuccess200(response, data);
      const responseData = data.data as any;
      expect(responseData.usageRecord).toBeDefined();
      expect(responseData.billItem).toBeDefined();
      expect(responseData.payment).toBeDefined();
      expect(responseData.metadata.isIdempotentReplay).toBe(false);
    });

    it('should return 200 with idempotent replay flag when externalRef exists', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.NURSE,
        },
      });

      const usageResult = {
        usageRecord: {
          id: 100,
          inventoryItemId: 1,
          quantityUsed: 1,
          unitCostAtTime: 10.0,
          totalCost: 10.0,
          externalRef: 'ext-ref-123',
          sourceFormKey: SourceFormKey.NURSE_MED_ADMIN,
          usedAt: new Date(),
          usedBy: 'user-1',
          billItemId: 200,
        },
        billItem: {
          id: 200,
          paymentId: 300,
          serviceId: 400,
          serviceDate: new Date(),
          quantity: 1,
          unitCost: 10.0,
          totalCost: 10.0,
        },
        payment: {
          id: 300,
          patientId: 'patient-1',
          surgicalCaseId: 'case-1',
          totalAmount: 10.0,
          discount: 0,
          status: 'UNPAID',
        },
        isIdempotentReplay: true,
      };

      mockConsumptionService.applyUsageAndBilling.mockResolvedValue(usageResult);

      (db.inventoryItem.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        name: 'Test Medication',
        quantity_on_hand: 10,
        reorder_point: 5,
      });

      (db.service.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        service_name: 'Medication Service',
      });

      const request = new NextRequest('http://localhost:3000/api/nurse/surgical-cases/case-1/usage', {
        method: 'POST',
        body: JSON.stringify({
          externalRef: '550e8400-e29b-41d4-a716-446655440001',
          sourceFormKey: 'NURSE_MED_ADMIN',
          items: [
            {
              inventoryItemId: 1,
              quantityUsed: 1,
            },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ caseId: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertSuccess200(response, data);
      const responseData = data.data as any;
      expect(responseData.metadata.isIdempotentReplay).toBe(true);
    });
  });

  describe('Insufficient Stock (422)', () => {
    it('should return 422 with GATE_BLOCKED when stock is insufficient', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.NURSE,
        },
      });

      const gateError = new GateBlockedError(
        'Insufficient stock for Test Medication. Requested: 5, Available: 2',
        'INSUFFICIENT_STOCK',
        ['Requested: 5, Available: 2']
      );

      mockConsumptionService.applyUsageAndBilling.mockRejectedValue(gateError);

      const request = new NextRequest('http://localhost:3000/api/nurse/surgical-cases/case-1/usage', {
        method: 'POST',
        body: JSON.stringify({
          externalRef: '550e8400-e29b-41d4-a716-446655440002',
          sourceFormKey: 'NURSE_MED_ADMIN',
          items: [
            {
              inventoryItemId: 1,
              quantityUsed: 5,
            },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ caseId: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 422);
      assertGateBlocked(data, 'INSUFFICIENT_STOCK');
      expect(data.code).toBe(ApiErrorCode.GATE_BLOCKED);
    });
  });

  describe('Validation Errors (400)', () => {
    it('should return 400 with VALIDATION_ERROR when items.length > 1', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.NURSE,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/nurse/surgical-cases/case-1/usage', {
        method: 'POST',
        body: JSON.stringify({
          externalRef: '550e8400-e29b-41d4-a716-446655440003',
          sourceFormKey: 'NURSE_MED_ADMIN',
          items: [
            { inventoryItemId: 1, quantityUsed: 1 },
            { inventoryItemId: 2, quantityUsed: 2 },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ caseId: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 400);
      assertValidationError(data);
      expect(data.code).toBe(ApiErrorCode.VALIDATION_ERROR);
    });

    it('should return 400 with VALIDATION_ERROR when externalRef is invalid UUID', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.NURSE,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/nurse/surgical-cases/case-1/usage', {
        method: 'POST',
        body: JSON.stringify({
          externalRef: 'invalid-uuid',
          sourceFormKey: 'NURSE_MED_ADMIN',
          items: [
            { inventoryItemId: 1, quantityUsed: 1 },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ caseId: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 400);
      assertValidationError(data);
    });
  });

  describe('Forbidden (403)', () => {
    it('should return 403 when user is not NURSE, DOCTOR, or ADMIN', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.PATIENT,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/nurse/surgical-cases/case-1/usage', {
        method: 'POST',
        body: JSON.stringify({
          externalRef: '550e8400-e29b-41d4-a716-446655440004',
          sourceFormKey: 'NURSE_MED_ADMIN',
          items: [
            { inventoryItemId: 1, quantityUsed: 1 },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ caseId: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 403);
      assertError403(data);
    });
  });
});
