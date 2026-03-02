/**
 * Integration Tests: Reporting Routes
 *
 * Contract tests for consumption and stock reporting endpoints.
 * Validates ApiResponse<T> structure, HTTP status codes, and role-based field visibility.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as GET_CONSUMPTION } from '@/app/api/admin/inventory/report/consumption/route';
import { GET as GET_STOCK } from '@/app/api/admin/inventory/report/stock/route';
import { NextRequest } from 'next/server';
import { Role } from '@/domain/enums/Role';
import {
  assertSuccess200,
  assertError400,
  assertError403,
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
    inventoryUsage: {
      findMany: vi.fn(),
    },
    inventoryItem: {
      findMany: vi.fn(),
    },
  },
}));

import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

describe('GET /api/admin/inventory/report/consumption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with consumption data for ADMIN', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.ADMIN,
      },
    });

    (db.inventoryUsage.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 1,
        inventory_item_id: 1,
        quantity_used: 5,
        unit_cost_at_time: 10.0,
        total_cost: 50.0,
        used_at: new Date(),
        source_form_key: 'NURSE_INTRAOP_RECORD',
        used_by_user_id: 'user-2',
        recorded_by: 'user-2',
        inventory_item: {
          id: 1,
          name: 'Test Item',
          category: 'MEDICATION',
          is_billable: true,
        },
        bill_item: {
          id: 1,
          total_cost: 50.0,
        },
        used_by_user: {
          id: 'user-2',
          email: 'nurse@test.com',
          first_name: 'Jane',
          last_name: 'Doe',
        },
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/admin/inventory/report/consumption', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const response = await GET_CONSUMPTION(request);
    const data = await response.json();

    assertSuccess200(response, data);
    if (data.success && 'data' in data) {
      const responseData = data.data as { totals: unknown; grouped: unknown };
      expect(responseData.totals).toBeDefined();
      expect(responseData.grouped).toBeDefined();
    }
  });

  it('should return 403 when non-ADMIN tries to access', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.NURSE,
      },
    });

    const request = new NextRequest('http://localhost:3000/api/admin/inventory/report/consumption', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const response = await GET_CONSUMPTION(request);
    const data = await response.json();

    assertStatusCode(response, 403);
    assertError403(data);
  });
});

describe('GET /api/admin/inventory/report/stock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with stock data for ADMIN (includes unit_cost)', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.ADMIN,
      },
    });

    (db.inventoryItem.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 1,
        name: 'Test Item',
        sku: 'SKU-001',
        category: 'MEDICATION',
        unit_of_measure: 'unit',
        quantity_on_hand: 10,
        reorder_point: 20,
        is_active: true,
        unit_cost: 5.0,
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/admin/inventory/report/stock', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const response = await GET_STOCK(request);
    const data = await response.json();

    assertSuccess200<{ items: Array<{ unitCost?: number; stockValue?: number }> }>(response, data);
    const result = unwrapApiData(data);
    expect(result.items).toBeDefined();
    expect(result.items[0]?.unitCost).toBeDefined();
    expect(result.items[0]?.stockValue).toBeDefined();
  });

  it('should return 200 with stock data for STORES (omits unit_cost)', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.STORES,
      },
    });

    (db.inventoryItem.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 1,
        name: 'Test Item',
        sku: 'SKU-001',
        category: 'MEDICATION',
        unit_of_measure: 'unit',
        quantity_on_hand: 10,
        reorder_point: 20,
        is_active: true,
        unit_cost: 5.0,
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/admin/inventory/report/stock', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const response = await GET_STOCK(request);
    const data = await response.json();

    assertSuccess200<{ items: Array<{ unitCost?: number; stockValue?: number }> }>(response, data);
    const result = unwrapApiData(data);
    expect(result.items).toBeDefined();
    expect(result.items[0]?.unitCost).toBeUndefined();
    expect(result.items[0]?.stockValue).toBeUndefined();
  });

  it('should return 403 when unauthorized role tries to access', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.NURSE,
      },
    });

    const request = new NextRequest('http://localhost:3000/api/admin/inventory/report/stock', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const response = await GET_STOCK(request);
    const data = await response.json();

    assertStatusCode(response, 403);
    assertError403(data);
  });
});
