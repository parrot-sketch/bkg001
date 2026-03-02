/**
 * Integration Tests: POST/GET /api/doctor/surgical-cases/[caseId]/planned-items
 *
 * Contract tests for planned items API routes.
 * Validates ApiResponse<T> structure, HTTP status codes, and error metadata.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST, GET } from '@/app/api/doctor/surgical-cases/[caseId]/planned-items/route';
import { NextRequest } from 'next/server';
import { Role } from '@/domain/enums/Role';
import { GateBlockedError } from '@/application/errors';
import { ApiErrorCode } from '@/lib/http/apiResponse';
import {
  assertSuccess200,
  assertError422,
  assertError403,
  assertError404,
  assertGateBlocked,
  assertStatusCode,
  assertErrorCode,
} from '../../helpers/apiResponseAssertions';

// Mock JWT middleware
vi.mock('@/lib/auth/middleware', () => ({
  JwtMiddleware: {
    authenticate: vi.fn(),
  },
}));

// Mock factory
vi.mock('@/lib/factories/inventoryBillingFactory', () => ({
  getInventoryConsumptionBillingService: vi.fn(),
}));

// Mock endpoint timer
vi.mock('@/lib/observability/endpointLogger', () => ({
  endpointTimer: vi.fn(() => ({
    end: vi.fn(),
  })),
}));

// Mock db
const mockTx = {
  casePlanPlannedItem: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    create: vi.fn(),
  },
};

mockTx.casePlanPlannedItem.create.mockResolvedValue({
  id: 1,
  case_plan_id: 100,
  inventory_item_id: 1,
  planned_quantity: 2,
  planned_unit_price: 10.0,
  notes: 'Test note',
});

vi.mock('@/lib/db', () => ({
  default: {
    doctor: {
      findUnique: vi.fn(),
    },
    surgicalCase: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
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
      findFirst: vi.fn(),
    },
    casePlanPlannedItem: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => Promise.resolve(callback(mockTx))),
  },
}));

import { JwtMiddleware } from '@/lib/auth/middleware';
import { getInventoryConsumptionBillingService } from '@/lib/factories/inventoryBillingFactory';
import db from '@/lib/db';

describe('POST /api/doctor/surgical-cases/[caseId]/planned-items', () => {
  let mockConsumptionService: {
    previewPlanCost: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockConsumptionService = {
      previewPlanCost: vi.fn(),
    };

    (getInventoryConsumptionBillingService as ReturnType<typeof vi.fn>).mockReturnValue(
      mockConsumptionService
    );
  });

  describe('Success (200)', () => {
    it('should return 200 with success response when replacing planned items', async () => {
      // Arrange
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
          id: 100,
          appointment_id: 1,
        },
        consultation: {
          appointment_id: 1,
        },
      });

      (db.inventoryItem.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 1,
          name: 'Test Item',
          is_active: true,
          unit_cost: 10.0,
        },
      ]);

      mockConsumptionService.previewPlanCost.mockResolvedValue({
        lines: [
          {
            inventoryItemId: 1,
            itemName: 'Test Item',
            plannedQuantity: 2,
            unitCost: 10.0,
            totalCost: 20.0,
            isBillable: true,
          },
        ],
        billableTotal: 20.0,
        nonBillableTotal: 0,
        grandTotal: 20.0,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/doctor/surgical-cases/case-1/planned-items',
        {
          method: 'POST',
          body: JSON.stringify({
            items: [
              {
                inventoryItemId: 1,
                plannedQuantity: 2,
                notes: 'Test note',
              },
            ],
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      // Act
      const response = await POST(request, { params: Promise.resolve({ caseId: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertSuccess200(response, data);
      const responseData = data.data as any;
      expect(responseData.plannedItems).toBeDefined();
      expect(responseData.costEstimate).toBeDefined();
    });
  });

  describe('Invalid Items (422)', () => {
    it('should return 422 with GATE_BLOCKED when inventory item is inactive', async () => {
      // Arrange
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
          id: 100,
          appointment_id: 1,
        },
        consultation: {
          appointment_id: 1,
        },
      });

      (db.inventoryItem.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 1,
          name: 'Test Item',
          is_active: false, // Inactive
          unit_cost: 10.0,
        },
      ]);

      const request = new NextRequest(
        'http://localhost:3000/api/doctor/surgical-cases/case-1/planned-items',
        {
          method: 'POST',
          body: JSON.stringify({
            items: [
              {
                inventoryItemId: 1,
                plannedQuantity: 2,
              },
            ],
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      // Act
      const response = await POST(request, { params: Promise.resolve({ caseId: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 422);
      assertErrorCode(data, ApiErrorCode.GATE_BLOCKED);
      expect(data.metadata?.blockingCategory).toBe('INVALID_ITEMS');
    });
  });

  describe('Forbidden (403)', () => {
    it('should return 403 when user is not DOCTOR or ADMIN', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.NURSE,
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/doctor/surgical-cases/case-1/planned-items',
        {
          method: 'POST',
          body: JSON.stringify({
            items: [
              {
                inventoryItemId: 1,
                plannedQuantity: 2,
              },
            ],
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      // Act
      const response = await POST(request, { params: Promise.resolve({ caseId: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 403);
      assertError403(data);
    });
  });

  describe('Not Found (404)', () => {
    it('should return 404 when surgical case not found', async () => {
      // Arrange
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

      const request = new NextRequest(
        'http://localhost:3000/api/doctor/surgical-cases/case-1/planned-items',
        {
          method: 'POST',
          body: JSON.stringify({
            items: [
              {
                inventoryItemId: 1,
                plannedQuantity: 2,
              },
            ],
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      // Act
      const response = await POST(request, { params: Promise.resolve({ caseId: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 404);
      assertError404(data);
    });
  });
});

describe('GET /api/doctor/surgical-cases/[caseId]/planned-items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with planned items when case plan exists', async () => {
    // Arrange
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
        id: 100,
        planned_items: [
          {
            id: 1,
            inventory_item_id: 1,
            service_id: null,
            planned_quantity: 2,
            planned_unit_price: 10.0,
            notes: 'Test note',
            inventory_item: {
              id: 1,
              name: 'Test Item',
              unit_cost: 10.0,
              is_billable: true,
            },
            service: null,
          },
        ],
      },
    });

    const request = new NextRequest(
      'http://localhost:3000/api/doctor/surgical-cases/case-1/planned-items',
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
        },
      }
    );

    // Act
    const response = await GET(request, { params: Promise.resolve({ caseId: 'case-1' }) });
    const data = await response.json();

      // Assert
      assertSuccess200(response, data);
      const responseData = data.data as any;
      expect(responseData.plannedItems).toBeDefined();
      expect(responseData.costEstimate).toBeDefined();
  });

  it('should return 200 with empty arrays when case plan does not exist', async () => {
    // Arrange
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

    const request = new NextRequest(
      'http://localhost:3000/api/doctor/surgical-cases/case-1/planned-items',
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
        },
      }
    );

    // Act
    const response = await GET(request, { params: Promise.resolve({ caseId: 'case-1' }) });
    const data = await response.json();

      // Assert
      assertSuccess200(response, data);
      const responseData = data.data as any;
      expect(responseData.plannedItems).toEqual([]);
      expect(responseData.plannedServices).toEqual([]);
      expect(responseData.costEstimate.grandTotal).toBe(0);
  });
});
