/**
 * Integration Tests: Purchase Order Routes
 *
 * Contract tests for purchase order operations.
 * Validates ApiResponse<T> structure, HTTP status codes, and error metadata.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST, GET } from '@/app/api/stores/purchase-orders/route';
import { POST as POST_SUBMIT } from '@/app/api/stores/purchase-orders/[id]/submit/route';
import { POST as POST_APPROVE } from '@/app/api/stores/purchase-orders/[id]/approve/route';
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
vi.mock('@/lib/db', () => ({
  default: {
    vendor: {
      findUnique: vi.fn(),
    },
    purchaseOrder: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    purchaseOrderItem: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => Promise.resolve(callback({
      purchaseOrderItem: {
        createMany: vi.fn(),
      },
    }))),
  },
}));

import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

describe('POST /api/stores/purchase-orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 201 with success response for valid PO creation', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.STORES,
      },
    });

    (db.vendor.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'vendor-1',
      is_active: true,
    });

    (db.purchaseOrder.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'po-1',
      po_number: 'PO-2025-0001',
      status: PurchaseOrderStatus.DRAFT,
      total_amount: 100.0,
      vendor: { id: 'vendor-1', name: 'Test Vendor' },
      items: [],
    });

    const request = new NextRequest('http://localhost:3000/api/stores/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({
        vendorId: 'vendor-1',
        items: [
          {
            itemName: 'Test Item',
            quantityOrdered: 10,
            unitPrice: 10.0,
          },
        ],
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    assertStatusCode(response, 201);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
  });

  it('should return 422 when vendor is inactive', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.STORES,
      },
    });

    (db.vendor.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'vendor-1',
      is_active: false,
    });

    const request = new NextRequest('http://localhost:3000/api/stores/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({
        vendorId: 'vendor-1',
        items: [
          {
            itemName: 'Test Item',
            quantityOrdered: 10,
            unitPrice: 10.0,
          },
        ],
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    assertStatusCode(response, 422);
    assertError422(data);
  });
});

describe('POST /api/stores/purchase-orders/[id]/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 when PO submitted successfully', async () => {
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
      vendor: { id: 'vendor-1' },
      items: [],
    });

    (db.purchaseOrder.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'po-1',
      status: PurchaseOrderStatus.SUBMITTED,
      submitted_at: new Date(),
    });

    const request = new NextRequest('http://localhost:3000/api/stores/purchase-orders/po-1/submit', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST_SUBMIT(request, { params: Promise.resolve({ id: 'po-1' }) });
    const data = await response.json();

    assertSuccess200(response, data);
  });

  it('should return 422 when PO is not in DRAFT status', async () => {
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
      vendor: { id: 'vendor-1' },
      items: [],
    });

    const request = new NextRequest('http://localhost:3000/api/stores/purchase-orders/po-1/submit', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST_SUBMIT(request, { params: Promise.resolve({ id: 'po-1' }) });
    const data = await response.json();

    assertStatusCode(response, 422);
    assertError422(data);
  });
});

describe('POST /api/stores/purchase-orders/[id]/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 when PO approved by ADMIN', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.ADMIN,
      },
    });

    (db.purchaseOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'po-1',
      status: PurchaseOrderStatus.SUBMITTED,
      vendor: { id: 'vendor-1' },
      items: [],
    });

    (db.purchaseOrder.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'po-1',
      status: PurchaseOrderStatus.APPROVED,
      approved_at: new Date(),
    });

    const request = new NextRequest('http://localhost:3000/api/stores/purchase-orders/po-1/approve', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST_APPROVE(request, { params: Promise.resolve({ id: 'po-1' }) });
    const data = await response.json();

    assertSuccess200(response, data);
  });

  it('should return 403 when non-ADMIN tries to approve', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.STORES,
      },
    });

    const request = new NextRequest('http://localhost:3000/api/stores/purchase-orders/po-1/approve', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST_APPROVE(request, { params: Promise.resolve({ id: 'po-1' }) });
    const data = await response.json();

    assertStatusCode(response, 403);
    assertError403(data);
  });
});
