/**
 * Integration Tests: Consume From Plan (Usage Route)
 *
 * Contract tests for POST /api/nurse/surgical-cases/[caseId]/usage.
 * Validates idempotency, stock validation, and single-item invariant.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/nurse/surgical-cases/[caseId]/usage/route';
import { NextRequest } from 'next/server';
import { Role } from '@/domain/enums/Role';
import { SourceFormKey } from '@/application/services/InventoryConsumptionBillingService';
import {
  assertSuccess200,
  assertError400,
  assertError403,
  assertError422,
  assertStatusCode,
  unwrapApiData,
} from '../../helpers/apiResponseAssertions';

// Mock JWT middleware
vi.mock('@/lib/auth/middleware', () => ({
  JwtMiddleware: {
    authenticate: vi.fn(),
  },
}));

// Mock db
const mockTx = {
  inventoryUsage: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  inventoryItem: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  patientBill: {
    create: vi.fn(),
  },
  payment: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({
  default: {
    inventoryUsage: {
      findFirst: vi.fn(),
    },
    inventoryItem: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((callback) => Promise.resolve(callback(mockTx))),
  },
}));

vi.mock('@/lib/factories/inventoryBillingFactory', () => ({
  getInventoryConsumptionBillingService: vi.fn(() => ({
    applyUsageAndBilling: vi.fn(),
  })),
}));

vi.mock('@/lib/factories/inventoryAuditFactory', () => ({
  getInventoryAuditService: vi.fn(() => ({
    emitInventoryUsageApplied: vi.fn(() => Promise.resolve()),
    emitInventoryUsageIdempotentReplay: vi.fn(() => Promise.resolve()),
    emitBillLineCreatedFromUsage: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock('@/lib/observability/endpointLogger', () => ({
  endpointTimer: vi.fn(() => ({
    end: vi.fn(),
  })),
}));

import { JwtMiddleware } from '@/lib/auth/middleware';
import { getInventoryConsumptionBillingService } from '@/lib/factories/inventoryBillingFactory';

describe('POST /api/nurse/surgical-cases/[caseId]/usage (Consume From Plan)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 success for valid UUID externalRef with sufficient stock', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.NURSE,
      },
    });

    const consumptionService = getInventoryConsumptionBillingService();
    (consumptionService.applyUsageAndBilling as ReturnType<typeof vi.fn>).mockResolvedValue({
      usageRecord: {
        id: 1,
        inventoryItemId: 10,
        quantityUsed: 2,
        unitCostAtTime: 100,
        totalCost: 200,
        externalRef: '123e4567-e89b-12d3-a456-426614174000',
        sourceFormKey: SourceFormKey.NURSE_MED_ADMIN,
        usedAt: new Date(),
        usedBy: 'user-1',
        billItemId: 1,
      },
      billItem: {
        id: 1,
        paymentId: 1,
        serviceId: 1,
        serviceDate: new Date(),
        quantity: 2,
        unitCost: 100,
        totalCost: 200,
      },
      payment: {
        id: 1,
        patientId: 'patient-1',
        surgicalCaseId: 'case-1',
        totalAmount: 200,
        discount: 0,
        status: 'PENDING',
      },
      isIdempotentReplay: false,
    });

    const request = new NextRequest('http://localhost/api/nurse/surgical-cases/case-1/usage', {
      method: 'POST',
      body: JSON.stringify({
        externalRef: '123e4567-e89b-12d3-a456-426614174000',
        sourceFormKey: SourceFormKey.NURSE_MED_ADMIN,
        items: [
          {
            inventoryItemId: 10,
            quantityUsed: 2,
            notes: 'Consumed from plan',
          },
        ],
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    const json = await response.json();
    assertSuccess200(response, json);

    const data = unwrapApiData(json);
    expect(data.usageRecord).toBeDefined();
    expect(data.usageRecord.inventoryItemId).toBe(10);
    expect(data.metadata).toBeDefined();
    expect(typeof data.metadata.isIdempotentReplay).toBe('boolean');
  });

  it('should return 200 with isIdempotentReplay=true for SAME externalRef', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.NURSE,
      },
    });

    const consumptionService = getInventoryConsumptionBillingService();
    (consumptionService.applyUsageAndBilling as ReturnType<typeof vi.fn>).mockResolvedValue({
      usageRecord: {
        id: 1,
        inventoryItemId: 10,
        quantityUsed: 2,
        unitCostAtTime: 100,
        totalCost: 200,
        externalRef: '123e4567-e89b-12d3-a456-426614174000',
        sourceFormKey: SourceFormKey.NURSE_MED_ADMIN,
        usedAt: new Date(),
        usedBy: 'user-1',
        billItemId: 1,
      },
      billItem: {
        id: 1,
        paymentId: 1,
        serviceId: 1,
        serviceDate: new Date(),
        quantity: 2,
        unitCost: 100,
        totalCost: 200,
      },
      payment: {
        id: 1,
        patientId: 'patient-1',
        surgicalCaseId: 'case-1',
        totalAmount: 200,
        discount: 0,
        status: 'PENDING',
      },
      isIdempotentReplay: true, // Idempotent replay
    });

    const request = new NextRequest('http://localhost/api/nurse/surgical-cases/case-1/usage', {
      method: 'POST',
      body: JSON.stringify({
        externalRef: '123e4567-e89b-12d3-a456-426614174000',
        sourceFormKey: SourceFormKey.NURSE_MED_ADMIN,
        items: [
          {
            inventoryItemId: 10,
            quantityUsed: 2,
          },
        ],
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    const json = await response.json();
    assertSuccess200(response, json);

    const data = unwrapApiData(json);
    expect(data.metadata.isIdempotentReplay).toBe(true);
  });

  it('should return 422 insufficient stock with GATE_BLOCKED code and metadata', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.NURSE,
      },
    });

    const consumptionService = getInventoryConsumptionBillingService();
    const { GateBlockedError } = await import('@/application/errors/GateBlockedError');
    const error = new GateBlockedError(
      'Insufficient stock',
      'INSUFFICIENT_STOCK',
      []
    );
    // Add metadata to error
    (error as any).metadata = {
      items: [
        {
          inventoryItemId: 10,
          requested: 10,
          available: 5,
        },
      ],
    };
    (consumptionService.applyUsageAndBilling as ReturnType<typeof vi.fn>).mockRejectedValue(error);

    const request = new NextRequest('http://localhost/api/nurse/surgical-cases/case-1/usage', {
      method: 'POST',
      body: JSON.stringify({
        externalRef: '123e4567-e89b-12d3-a456-426614174000',
        sourceFormKey: SourceFormKey.NURSE_MED_ADMIN,
        items: [
          {
            inventoryItemId: 10,
            quantityUsed: 10,
          },
        ],
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    assertStatusCode(response, 422);
    const json = await response.json();
    assertError422(json);
    expect(json.metadata).toBeDefined();
    expect(json.metadata.items).toBeDefined();
    expect(Array.isArray(json.metadata.items)).toBe(true);
  });

  it('should return 400 validation error for invalid UUID externalRef', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.NURSE,
      },
    });

    const request = new NextRequest('http://localhost/api/nurse/surgical-cases/case-1/usage', {
      method: 'POST',
      body: JSON.stringify({
        externalRef: 'invalid-uuid',
        sourceFormKey: SourceFormKey.NURSE_MED_ADMIN,
        items: [
          {
            inventoryItemId: 10,
            quantityUsed: 2,
          },
        ],
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    assertStatusCode(response, 400);
    const json = await response.json();
    assertError400(json);
  });

  it('should return 400 validation error for multiple items (single-item invariant)', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.NURSE,
      },
    });

    const request = new NextRequest('http://localhost/api/nurse/surgical-cases/case-1/usage', {
      method: 'POST',
      body: JSON.stringify({
        externalRef: '123e4567-e89b-12d3-a456-426614174000',
        sourceFormKey: SourceFormKey.NURSE_MED_ADMIN,
        items: [
          {
            inventoryItemId: 10,
            quantityUsed: 2,
          },
          {
            inventoryItemId: 11,
            quantityUsed: 1,
          },
        ],
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    assertStatusCode(response, 400);
    const json = await response.json();
    assertError400(json);
    expect(json.error).toContain('exactly one item');
  });

  it('should return 403 for forbidden role', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.PATIENT, // Not allowed
      },
    });

    const request = new NextRequest('http://localhost/api/nurse/surgical-cases/case-1/usage', {
      method: 'POST',
      body: JSON.stringify({
        externalRef: '123e4567-e89b-12d3-a456-426614174000',
        sourceFormKey: SourceFormKey.NURSE_MED_ADMIN,
        items: [
          {
            inventoryItemId: 10,
            quantityUsed: 2,
          },
        ],
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    assertStatusCode(response, 403);
    const json = await response.json();
    assertError403(json);
  });
});
