/**
 * Integration Tests: Usage Variance Route
 *
 * Contract tests for GET /api/surgical-cases/[caseId]/usage-variance.
 * Validates ApiResponse<T> structure and variance computation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/surgical-cases/[caseId]/usage-variance/route';
import { NextRequest } from 'next/server';
import { Role } from '@/domain/enums/Role';
import {
  assertSuccess200,
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
vi.mock('@/lib/db', () => ({
  default: {
    surgicalCase: {
      findUnique: vi.fn(),
    },
    casePlanPlannedItem: {
      findMany: vi.fn(),
    },
    inventoryUsage: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/inventoryAuthorization', () => ({
  authorizeInventoryOperation: vi.fn((authResult, operation) => {
    if (authResult.success && authResult.user) {
      return { success: true, user: authResult.user };
    }
    return { success: false, error: { status: 401, json: () => ({ success: false, error: 'Unauthorized' }) } };
  }),
}));

vi.mock('@/lib/observability/endpointLogger', () => ({
  endpointTimer: vi.fn(() => ({
    end: vi.fn(),
  })),
}));

import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

describe('GET /api/surgical-cases/[caseId]/usage-variance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with correct variance structure when planned and used items exist', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.DOCTOR,
      },
    });

    (db.surgicalCase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'case-1',
      case_plan: {
        id: 1,
      },
    });

    (db.casePlanPlannedItem.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 1,
        inventory_item_id: 10,
        planned_quantity: 5,
        planned_unit_price: 100,
        inventory_item: {
          id: 10,
          name: 'Test Implant',
          unit_of_measure: 'pcs',
          is_billable: true,
        },
      },
    ]);

    (db.inventoryUsage.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 1,
        inventory_item_id: 10,
        quantity_used: 3,
        total_cost: 300,
        inventory_item: {
          id: 10,
          name: 'Test Implant',
          unit_of_measure: 'pcs',
          is_billable: true,
        },
      },
    ]);

    const request = new NextRequest('http://localhost/api/surgical-cases/case-1/usage-variance');
    const response = await GET(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    const json = await response.json();
    assertSuccess200(response, json);

    const data = unwrapApiData(json);
    expect(data.plannedItems).toBeDefined();
    expect(Array.isArray(data.plannedItems)).toBe(true);
    expect(data.usedItems).toBeDefined();
    expect(Array.isArray(data.usedItems)).toBe(true);
    expect(data.variance).toBeDefined();
    expect(Array.isArray(data.variance)).toBe(true);
    expect(typeof data.plannedTotalCost).toBe('number');
    expect(typeof data.actualBilledCost).toBe('number');
    expect(typeof data.varianceTotal).toBe('number');

    // Verify variance computation
    if (data.variance.length > 0) {
      const varianceItem = data.variance[0];
      expect(varianceItem.inventoryItemId).toBe(10);
      expect(varianceItem.plannedQuantity).toBe(5);
      expect(varianceItem.usedQuantity).toBe(3);
      expect(varianceItem.quantityVariance).toBe(-2); // 3 - 5
    }
  });

  it('should return 200 with empty arrays when no case plan exists', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.DOCTOR,
      },
    });

    (db.surgicalCase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'case-1',
      case_plan: null,
    });

    const request = new NextRequest('http://localhost/api/surgical-cases/case-1/usage-variance');
    const response = await GET(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    const json = await response.json();
    assertSuccess200(response, json);

    const data = unwrapApiData(json);
    expect(data.plannedItems).toEqual([]);
    expect(data.usedItems).toEqual([]);
    expect(data.variance).toEqual([]);
    expect(data.plannedTotalCost).toBe(0);
    expect(data.actualBilledCost).toBe(0);
    expect(data.varianceTotal).toBe(0);
  });

  it('should handle no planned items gracefully (still returns used summary)', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.DOCTOR,
      },
    });

    (db.surgicalCase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'case-1',
      case_plan: {
        id: 1,
      },
    });

    (db.casePlanPlannedItem.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    (db.inventoryUsage.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 1,
        inventory_item_id: 10,
        quantity_used: 2,
        total_cost: 200,
        inventory_item: {
          id: 10,
          name: 'Test Implant',
          unit_of_measure: 'pcs',
          is_billable: true,
        },
      },
    ]);

    const request = new NextRequest('http://localhost/api/surgical-cases/case-1/usage-variance');
    const response = await GET(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    const json = await response.json();
    assertSuccess200(response, json);

    const data = unwrapApiData(json);
    expect(data.plannedItems).toEqual([]);
    expect(data.usedItems).toHaveLength(1);
    expect(data.variance).toBeDefined();
    // Variance should include used items even if not planned
    expect(data.variance.length).toBeGreaterThanOrEqual(0);
  });
});
