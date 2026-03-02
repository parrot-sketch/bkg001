/**
 * Integration Tests: Goods Receipt Route
 *
 * Contract tests for goods receipt operations.
 * Validates ApiResponse<T> structure, HTTP status codes, and error metadata.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/stores/purchase-orders/[id]/receive/route';
import { NextRequest } from 'next/server';
import { Role } from '@/domain/enums/Role';
import { PurchaseOrderStatus } from '@prisma/client';
import {
  assertSuccess200,
  assertError400,
  assertError403,
  assertError404,
  assertError422,
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
  purchaseOrder: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  purchaseOrderItem: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  goodsReceipt: {
    create: vi.fn(),
  },
  goodsReceiptItem: {
    create: vi.fn(),
  },
  inventoryItem: {
    update: vi.fn(),
  },
  inventoryBatch: {
    create: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({
  default: {
    purchaseOrder: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((callback) => Promise.resolve(callback(mockTx))),
  },
}));

import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

describe('POST /api/stores/purchase-orders/[id]/receive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 201 with success response for valid receipt', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.STORES,
      },
    });

    (db.purchaseOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'po-1',
      status: PurchaseOrderStatus.APPROVED,
      vendor_id: 'vendor-1',
      items: [
        {
          id: 1,
          quantity_ordered: 10,
          quantity_received: 0,
          item_name: 'Test Item',
          inventory_item_id: 100,
        },
      ],
    });

    mockTx.purchaseOrder.findUnique.mockResolvedValue({
      id: 'po-1',
      status: PurchaseOrderStatus.APPROVED,
      vendor_id: 'vendor-1',
      items: [
        {
          id: 1,
          quantity_ordered: 10,
          quantity_received: 0,
          item_name: 'Test Item',
          inventory_item_id: 100,
        },
      ],
    });

    mockTx.goodsReceipt.create.mockResolvedValue({
      id: 'receipt-1',
      receipt_number: 'GRN-2025-0001',
      receipt_items: [
        {
          id: 1,
          quantity_received: 5,
          inventory_item_id: 100,
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/stores/purchase-orders/po-1/receive', {
      method: 'POST',
      body: JSON.stringify({
        receiptItems: [
          {
            poItemId: 1,
            quantityReceived: 5,
            unitCost: 10.0,
          },
        ],
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'po-1' }) });
    const data = await response.json();

    assertStatusCode(response, 201);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
  });

  it('should return 422 when over-receipt attempted', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.STORES,
      },
    });

    (db.purchaseOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'po-1',
      status: PurchaseOrderStatus.APPROVED,
      vendor_id: 'vendor-1',
      items: [
        {
          id: 1,
          quantity_ordered: 10,
          quantity_received: 8,
          item_name: 'Test Item',
        },
      ],
    });

    mockTx.purchaseOrder.findUnique.mockResolvedValue({
      id: 'po-1',
      status: PurchaseOrderStatus.APPROVED,
      vendor_id: 'vendor-1',
      items: [
        {
          id: 1,
          quantity_ordered: 10,
          quantity_received: 8,
          item_name: 'Test Item',
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/stores/purchase-orders/po-1/receive', {
      method: 'POST',
      body: JSON.stringify({
        receiptItems: [
          {
            poItemId: 1,
            quantityReceived: 5, // Only 2 remaining, but trying to receive 5
            unitCost: 10.0,
          },
        ],
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'po-1' }) });
    const data = await response.json();

    assertStatusCode(response, 422);
    assertError422(data);
  });

  it('should return 422 when PO is not APPROVED', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.STORES,
      },
    });

    (db.purchaseOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'po-1',
      status: PurchaseOrderStatus.DRAFT,
      vendor_id: 'vendor-1',
      items: [],
    });

    mockTx.purchaseOrder.findUnique.mockResolvedValue({
      id: 'po-1',
      status: PurchaseOrderStatus.DRAFT,
      vendor_id: 'vendor-1',
      items: [],
    });

    const request = new NextRequest('http://localhost:3000/api/stores/purchase-orders/po-1/receive', {
      method: 'POST',
      body: JSON.stringify({
        receiptItems: [
          {
            poItemId: 1,
            quantityReceived: 5,
            unitCost: 10.0,
          },
        ],
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'po-1' }) });
    const data = await response.json();

    assertStatusCode(response, 422);
    assertError422(data);
  });
});
