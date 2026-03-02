/**
 * Integration Tests: Vendor Management Routes
 *
 * Contract tests for vendor CRUD operations.
 * Validates ApiResponse<T> structure, HTTP status codes, and error metadata.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST, GET } from '@/app/api/stores/vendors/route';
import { PATCH, DELETE } from '@/app/api/stores/vendors/[id]/route';
import { NextRequest } from 'next/server';
import { Role } from '@/domain/enums/Role';
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
vi.mock('@/lib/db', () => ({
  default: {
    vendor: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

describe('POST /api/stores/vendors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 201 with success response for valid vendor creation', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.STORES,
      },
    });

    (db.vendor.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'vendor-1',
      name: 'Test Vendor',
      contact_person: 'John Doe',
      email: 'vendor@test.com',
      phone: '1234567890',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const request = new NextRequest('http://localhost:3000/api/stores/vendors', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Vendor',
        contactPerson: 'John Doe',
        email: 'vendor@test.com',
        phone: '1234567890',
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
    expect(data.data.name).toBe('Test Vendor');
  });

  it('should return 400 with VALIDATION_ERROR when name is missing', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.STORES,
      },
    });

    const request = new NextRequest('http://localhost:3000/api/stores/vendors', {
      method: 'POST',
      body: JSON.stringify({
        contactPerson: 'John Doe',
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    assertStatusCode(response, 400);
    assertError400(data);
  });

  it('should return 403 when user is not STORES or ADMIN', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.NURSE,
      },
    });

    const request = new NextRequest('http://localhost:3000/api/stores/vendors', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Vendor',
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    assertStatusCode(response, 403);
    assertError403(data);
  });
});

describe('GET /api/stores/vendors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with vendor list', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.STORES,
      },
    });

    (db.vendor.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'vendor-1',
        name: 'Vendor 1',
        is_active: true,
      },
      {
        id: 'vendor-2',
        name: 'Vendor 2',
        is_active: true,
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/stores/vendors', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    assertSuccess200(response, data);
    if (data.success && 'data' in data) {
      const responseData = data.data as unknown[];
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData.length).toBe(2);
    }
  });
});

describe('PATCH /api/stores/vendors/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with updated vendor', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.STORES,
      },
    });

    (db.vendor.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'vendor-1',
      name: 'Old Name',
    });

    (db.vendor.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'vendor-1',
      name: 'New Name',
      updated_at: new Date(),
    });

    const request = new NextRequest('http://localhost:3000/api/stores/vendors/vendor-1', {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'New Name',
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'vendor-1' }) });
    const data = await response.json();

    assertSuccess200(response, data);
    if (data.success && 'data' in data) {
      const responseData = data.data as { name: string };
      expect(responseData.name).toBe('New Name');
    }
  });

  it('should return 404 when vendor not found', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.STORES,
      },
    });

    (db.vendor.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/stores/vendors/invalid-id', {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'New Name',
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'invalid-id' }) });
    const data = await response.json();

    assertStatusCode(response, 404);
    assertError404(data);
  });
});

describe('DELETE /api/stores/vendors/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 when vendor deleted successfully', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.ADMIN,
      },
    });

    (db.vendor.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'vendor-1',
      name: 'Test Vendor',
    });

    (db.purchaseOrder.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (db.vendor.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'vendor-1',
    });

    const request = new NextRequest('http://localhost:3000/api/stores/vendors/vendor-1', {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'vendor-1' }) });
    const data = await response.json();

    assertSuccess200(response, data);
  });

  it('should return 400 when vendor has purchase orders', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.ADMIN,
      },
    });

    (db.vendor.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'vendor-1',
      name: 'Test Vendor',
    });

    (db.purchaseOrder.count as ReturnType<typeof vi.fn>).mockResolvedValue(2);

    const request = new NextRequest('http://localhost:3000/api/stores/vendors/vendor-1', {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'vendor-1' }) });
    const data = await response.json();

    assertStatusCode(response, 400);
    assertError400(data);
  });
});
