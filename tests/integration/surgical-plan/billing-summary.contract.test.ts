/**
 * Integration Tests: Billing Summary Route
 *
 * Contract tests for GET /api/nurse/surgical-cases/[caseId]/billing-summary.
 * Validates ApiResponse<T> structure, HTTP status codes, and empty response handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/nurse/surgical-cases/[caseId]/billing-summary/route';
import { NextRequest } from 'next/server';
import { Role } from '@/domain/enums/Role';
import {
  assertSuccess200,
  assertError403,
  assertError404,
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
    payment: {
      findUnique: vi.fn(),
    },
    inventoryUsage: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/observability/endpointLogger', () => ({
  endpointTimer: vi.fn(() => ({
    end: vi.fn(),
  })),
}));

import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

describe('GET /api/nurse/surgical-cases/[caseId]/billing-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with empty response when no payment exists', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.NURSE,
      },
    });

    (db.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.inventoryUsage.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/nurse/surgical-cases/case-1/billing-summary');
    const response = await GET(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    const json = await response.json();
    assertSuccess200(response, json);

    const data = unwrapApiData(json);
    expect(data.payment).toBeNull();
    expect(data.billItems).toEqual([]);
    expect(data.usageSummary.totalItemsUsed).toBe(0);
  });

  it('should return 200 with payment and bill items', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.NURSE,
      },
    });

    (db.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      patient_id: 'patient-1',
      surgical_case_id: 'case-1',
      bill_date: new Date('2024-01-01'),
      payment_date: null,
      total_amount: 1000,
      discount: 0,
      amount_paid: 0,
      status: 'PENDING',
      payment_method: null,
      bill_items: [
        {
          id: 1,
          service_id: 1,
          service: {
            id: 1,
            service_name: 'Test Service',
            category: 'SURGERY',
          },
          service_date: new Date('2024-01-01'),
          quantity: 1,
          unit_cost: 1000,
          total_cost: 1000,
          inventory_usage: null,
        },
      ],
    });

    (db.inventoryUsage.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/nurse/surgical-cases/case-1/billing-summary');
    const response = await GET(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    const json = await response.json();
    assertSuccess200(response, json);

    const data = unwrapApiData(json);
    expect(data.payment).toBeDefined();
    expect(data.payment?.totalAmount).toBe(1000);
    expect(data.billItems).toHaveLength(1);
  });

  it('should return 403 for forbidden role', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.PATIENT, // Not allowed
      },
    });

    const request = new NextRequest('http://localhost/api/nurse/surgical-cases/case-1/billing-summary');
    const response = await GET(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    assertStatusCode(response, 403);
    const json = await response.json();
    assertError403(json);
  });
});
