/**
 * Integration Tests: Usage Variance Route
 *
 * Contract tests for usage variance endpoint.
 * Validates ApiResponse<T> structure, HTTP status codes, and error metadata.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/surgical-cases/[caseId]/usage-variance/route';
import { NextRequest } from 'next/server';
import { Role } from '@/domain/enums/Role';
import {
  assertSuccess200,
  assertError403,
  assertError404,
  assertStatusCode,
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

import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

describe('GET /api/surgical-cases/[caseId]/usage-variance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with variance data when case plan exists', async () => {
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
        id: 100,
      },
    });

    (db.casePlanPlannedItem.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 1,
        case_plan_id: 100,
        inventory_item_id: 1,
        planned_quantity: 5,
        planned_unit_price: 10.0,
        notes: 'Planned item',
        inventory_item: {
          id: 1,
          name: 'Test Item',
          unit_of_measure: 'unit',
          is_billable: true,
        },
      },
    ]);

    (db.inventoryUsage.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 1,
        inventory_item_id: 1,
        quantity_used: 3,
        unit_cost_at_time: 10.0,
        total_cost: 30.0,
        used_at: new Date(),
        source_form_key: 'NURSE_INTRAOP_RECORD',
        inventory_item: {
          id: 1,
          name: 'Test Item',
          unit_of_measure: 'unit',
          is_billable: true,
        },
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/surgical-cases/case-1/usage-variance', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const response = await GET(request, { params: Promise.resolve({ caseId: 'case-1' }) });
    const data = await response.json();

    assertSuccess200(response, data);
    if (data.success && 'data' in data) {
      const responseData = data.data as {
        variance: unknown;
        plannedTotalCost: unknown;
        actualBilledCost: unknown;
      };
      expect(responseData).toBeDefined();
      expect(responseData.variance).toBeDefined();
      expect(responseData.plannedTotalCost).toBeDefined();
      expect(responseData.actualBilledCost).toBeDefined();
    }
  });

  it('should return 200 with empty data when case plan does not exist', async () => {
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

    const request = new NextRequest('http://localhost:3000/api/surgical-cases/case-1/usage-variance', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const response = await GET(request, { params: Promise.resolve({ caseId: 'case-1' }) });
    const data = await response.json();

    assertSuccess200(response, data);
    if (data.success && 'data' in data) {
      const responseData = data.data as {
        plannedItems: unknown[];
        usedItems: unknown[];
        variance: unknown[];
      };
      expect(responseData.plannedItems).toEqual([]);
      expect(responseData.usedItems).toEqual([]);
      expect(responseData.variance).toEqual([]);
    }
  });

  it('should return 404 when surgical case not found', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.DOCTOR,
      },
    });

    (db.surgicalCase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/surgical-cases/invalid-case/usage-variance', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const response = await GET(request, { params: Promise.resolve({ caseId: 'invalid-case' }) });
    const data = await response.json();

    assertStatusCode(response, 404);
    assertError404(data);
  });

  it('should return 403 when user lacks permission', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.PATIENT,
      },
    });

    const request = new NextRequest('http://localhost:3000/api/surgical-cases/case-1/usage-variance', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const response = await GET(request, { params: Promise.resolve({ caseId: 'case-1' }) });
    const data = await response.json();

    assertStatusCode(response, 403);
    assertError403(data);
  });
});
