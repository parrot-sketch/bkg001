/**
 * Integration Tests: Planned Items Route
 *
 * Contract tests for GET/POST /api/doctor/surgical-cases/[caseId]/planned-items.
 * Validates ApiResponse<T> structure, HTTP status codes, and business logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/doctor/surgical-cases/[caseId]/planned-items/route';
import { NextRequest } from 'next/server';
import { Role } from '@/domain/enums/Role';
import {
  assertSuccess200,
  assertError403,
  assertError404,
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
  casePlanPlannedItem: {
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({
  default: {
    doctor: {
      findUnique: vi.fn(),
    },
    surgicalCase: {
      findUnique: vi.fn(),
    },
    inventoryItem: {
      findMany: vi.fn(),
    },
    service: {
      findMany: vi.fn(),
    },
    casePlan: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => Promise.resolve(callback(mockTx))),
  },
}));

vi.mock('@/lib/factories/inventoryBillingFactory', () => ({
  getInventoryConsumptionBillingService: vi.fn(() => ({
    previewPlanCost: vi.fn(() => Promise.resolve({
      billableTotal: 100,
      nonBillableTotal: 0,
      grandTotal: 100,
    })),
  })),
}));

vi.mock('@/lib/observability/endpointLogger', () => ({
  endpointTimer: vi.fn(() => ({
    end: vi.fn(),
  })),
}));

import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

describe('GET /api/doctor/surgical-cases/[caseId]/planned-items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with success response and empty arrays when no case plan exists', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.DOCTOR,
      },
    });

    (db.doctor.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'doctor-1',
    });

    (db.surgicalCase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'case-1',
      primary_surgeon_id: 'doctor-1',
      staff_invites: [],
      case_plan: null,
    });

    const request = new NextRequest('http://localhost/api/doctor/surgical-cases/case-1/planned-items');
    const response = await GET(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    const json = await response.json();
    assertSuccess200(response, json);

    const data = unwrapApiData(json);
    expect(data.plannedItems).toEqual([]);
    expect(data.plannedServices).toEqual([]);
    expect(data.costEstimate).toBeDefined();
    expect(typeof data.costEstimate.grandTotal).toBe('number');
  });

  it('should return 200 with planned items when case plan exists', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.DOCTOR,
      },
    });

    (db.doctor.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'doctor-1',
    });

    (db.surgicalCase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'case-1',
      primary_surgeon_id: 'doctor-1',
      staff_invites: [],
      case_plan: {
        id: 1,
        planned_items: [
          {
            id: 1,
            inventory_item_id: 10,
            service_id: null,
            planned_quantity: 2,
            planned_unit_price: 100,
            notes: 'Test notes',
            inventory_item: {
              id: 10,
              name: 'Test Implant',
              unit_cost: 100,
              is_billable: true,
            },
            service: null,
          },
        ],
      },
    });

    const request = new NextRequest('http://localhost/api/doctor/surgical-cases/case-1/planned-items');
    const response = await GET(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    const json = await response.json();
    assertSuccess200(response, json);

    const data = unwrapApiData(json);
    expect(data.plannedItems).toHaveLength(1);
    expect(data.plannedItems[0].inventoryItemId).toBe(10);
    expect(data.plannedItems[0].itemName).toBe('Test Implant');
    expect(data.costEstimate).toBeDefined();
    expect(typeof data.costEstimate.billableTotal).toBe('number');
  });

  it('should return 403 for non-DOCTOR role', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.NURSE,
      },
    });

    const request = new NextRequest('http://localhost/api/doctor/surgical-cases/case-1/planned-items');
    const response = await GET(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    assertStatusCode(response, 403);
    const json = await response.json();
    assertError403(json);
  });

  it('should return 404 for non-existent case', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.DOCTOR,
      },
    });

    (db.doctor.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'doctor-1',
    });

    (db.surgicalCase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/doctor/surgical-cases/non-existent/planned-items');
    const response = await GET(request, {
      params: Promise.resolve({ caseId: 'non-existent' }),
    });

    assertStatusCode(response, 404);
    const json = await response.json();
    assertError404(json);
  });
});

describe('POST /api/doctor/surgical-cases/[caseId]/planned-items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with replace behavior (existing deleted, new inserted)', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.DOCTOR,
      },
    });

    (db.doctor.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'doctor-1',
    });

    (db.surgicalCase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'case-1',
      primary_surgeon_id: 'doctor-1',
      staff_invites: [],
      case_plan: {
        id: 1,
        appointment_id: 1,
      },
      patient_id: 'patient-1',
    });

    (db.inventoryItem.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 10,
        name: 'Test Implant',
        is_active: true,
        unit_cost: 100,
      },
    ]);

    (db.service.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    (mockTx.casePlanPlannedItem.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

    (mockTx.casePlanPlannedItem.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 2,
      inventory_item_id: 10,
      planned_quantity: 2,
      planned_unit_price: 100,
      notes: 'Test notes',
    });

    const request = new NextRequest('http://localhost/api/doctor/surgical-cases/case-1/planned-items', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          {
            inventoryItemId: 10,
            plannedQuantity: 2,
            notes: 'Test notes',
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
    expect(data.plannedItems).toHaveLength(1);
    expect(data.plannedItems[0].inventoryItemId).toBe(10);
    expect(data.costEstimate).toBeDefined();
    expect(typeof data.costEstimate.grandTotal).toBe('number');

    // Verify replace behavior: deleteMany was called
    expect(mockTx.casePlanPlannedItem.deleteMany).toHaveBeenCalled();
    expect(mockTx.casePlanPlannedItem.create).toHaveBeenCalled();
  });

  it('should return 422 for invalid item (inactive)', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.DOCTOR,
      },
    });

    (db.doctor.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'doctor-1',
    });

    (db.surgicalCase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'case-1',
      primary_surgeon_id: 'doctor-1',
      staff_invites: [],
      case_plan: {
        id: 1,
        appointment_id: 1,
      },
      patient_id: 'patient-1',
    });

    (db.inventoryItem.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 10,
        name: 'Test Implant',
        is_active: false, // Inactive
        unit_cost: 100,
      },
    ]);

    const request = new NextRequest('http://localhost/api/doctor/surgical-cases/case-1/planned-items', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          {
            inventoryItemId: 10,
            plannedQuantity: 2,
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

  it('should return 403 for non-primary surgeon doctor', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-2',
        role: Role.DOCTOR,
      },
    });

    (db.doctor.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'doctor-2',
    });

    (db.surgicalCase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'case-1',
      primary_surgeon_id: 'doctor-1', // Different doctor
      staff_invites: [], // No accepted invite
    });

    const request = new NextRequest('http://localhost/api/doctor/surgical-cases/case-1/planned-items', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          {
            inventoryItemId: 10,
            plannedQuantity: 2,
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

  it('should return 404 for non-existent case', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.DOCTOR,
      },
    });

    (db.doctor.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'doctor-1',
    });

    (db.surgicalCase.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/doctor/surgical-cases/non-existent/planned-items', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          {
            inventoryItemId: 10,
            plannedQuantity: 2,
          },
        ],
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ caseId: 'non-existent' }),
    });

    assertStatusCode(response, 404);
    const json = await response.json();
    assertError404(json);
  });
});
