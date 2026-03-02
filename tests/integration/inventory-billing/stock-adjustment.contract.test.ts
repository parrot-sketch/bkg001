/**
 * Integration Tests: Stock Adjustment Route
 *
 * Contract tests for stock adjustment operations.
 * Validates ApiResponse<T> structure, HTTP status codes, and error metadata.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/stores/inventory/[id]/adjust/route';
import { NextRequest } from 'next/server';
import { Role } from '@/domain/enums/Role';
import { StockAdjustmentType, StockAdjustmentReason } from '@prisma/client';
import {
  assertSuccess200,
  assertError400,
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
const mockTx = {
  inventoryItem: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  stockAdjustment: {
    create: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({
  default: {
    inventoryItem: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((callback) => Promise.resolve(callback(mockTx))),
  },
}));

import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

describe('POST /api/stores/inventory/[id]/adjust', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 201 with success response for valid adjustment', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.ADMIN,
      },
    });

    (db.inventoryItem.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      name: 'Test Item',
      quantity_on_hand: 50,
      is_active: true,
    });

    mockTx.inventoryItem.findUnique.mockResolvedValue({
      id: 1,
      name: 'Test Item',
      quantity_on_hand: 50,
      is_active: true,
    });

    mockTx.stockAdjustment.create.mockResolvedValue({
      id: 1,
      inventory_item_id: 1,
      adjustment_type: StockAdjustmentType.INCREMENT,
      adjustment_reason: StockAdjustmentReason.COUNT_CORRECTION,
      quantity_change: 10,
      previous_quantity: 50,
      new_quantity: 60,
    });

    mockTx.inventoryItem.update.mockResolvedValue({
      id: 1,
      quantity_on_hand: 60,
    });

    const request = new NextRequest('http://localhost:3000/api/stores/inventory/1/adjust', {
      method: 'POST',
      body: JSON.stringify({
        adjustmentType: StockAdjustmentType.INCREMENT,
        adjustmentReason: StockAdjustmentReason.COUNT_CORRECTION,
        quantityChange: 10,
        notes: 'Stock count correction',
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    assertStatusCode(response, 201);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
  });

  it('should return 400 when adjustment would result in negative stock', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.ADMIN,
      },
    });

    (db.inventoryItem.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      name: 'Test Item',
      quantity_on_hand: 5,
      is_active: true,
    });

    mockTx.inventoryItem.findUnique.mockResolvedValue({
      id: 1,
      name: 'Test Item',
      quantity_on_hand: 5,
      is_active: true,
    });

    const request = new NextRequest('http://localhost:3000/api/stores/inventory/1/adjust', {
      method: 'POST',
      body: JSON.stringify({
        adjustmentType: StockAdjustmentType.DECREMENT,
        adjustmentReason: StockAdjustmentReason.COUNT_CORRECTION,
        quantityChange: 10, // Trying to decrement 10 from 5
        notes: 'Stock adjustment',
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    assertStatusCode(response, 400);
    assertError400(data);
  });

  it('should return 403 when non-ADMIN tries to adjust', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.STORES,
      },
    });

    const request = new NextRequest('http://localhost:3000/api/stores/inventory/1/adjust', {
      method: 'POST',
      body: JSON.stringify({
        adjustmentType: StockAdjustmentType.INCREMENT,
        adjustmentReason: StockAdjustmentReason.COUNT_CORRECTION,
        quantityChange: 10,
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    assertStatusCode(response, 403);
    assertError403(data);
  });

  it('should return 404 when inventory item not found', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.ADMIN,
      },
    });

    (db.inventoryItem.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/stores/inventory/999/adjust', {
      method: 'POST',
      body: JSON.stringify({
        adjustmentType: StockAdjustmentType.INCREMENT,
        adjustmentReason: StockAdjustmentReason.COUNT_CORRECTION,
        quantityChange: 10,
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST(request, { params: Promise.resolve({ id: '999' }) });
    const data = await response.json();

    assertStatusCode(response, 404);
    assertError404(data);
  });
});
