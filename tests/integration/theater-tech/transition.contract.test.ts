/**
 * Integration Tests: POST /api/theater-tech/cases/[id]/transition
 *
 * Contract tests for case transition API route.
 * Validates ApiResponse<T> structure, HTTP status codes, and error metadata.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/theater-tech/cases/[id]/transition/route';
import { NextRequest } from 'next/server';
import { Role } from '@/domain/enums/Role';
import { SurgicalCaseStatus } from '@prisma/client';
import { GateBlockedError } from '@/application/errors';
import { ApiErrorCode } from '@/lib/http/apiResponse';
import {
  assertSuccess200,
  assertError422,
  assertError403,
  assertGateBlocked,
  assertStatusCode,
} from '../../helpers/apiResponseAssertions';

// Mock JWT middleware
vi.mock('@/lib/auth/middleware', () => ({
  JwtMiddleware: {
    authenticate: vi.fn(),
  },
}));

// Mock factory
vi.mock('@/lib/factories/theaterTechFactory', () => ({
  getTheaterTechService: vi.fn(),
}));

// Mock endpoint timer
vi.mock('@/lib/observability/endpointLogger', () => ({
  endpointTimer: vi.fn(() => ({
    end: vi.fn(),
  })),
}));

import { JwtMiddleware } from '@/lib/auth/middleware';
import { getTheaterTechService } from '@/lib/factories/theaterTechFactory';

describe('POST /api/theater-tech/cases/[id]/transition', () => {
  let mockTheaterTechService: {
    transitionCase: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockTheaterTechService = {
      transitionCase: vi.fn(),
    };

    (getTheaterTechService as ReturnType<typeof vi.fn>).mockReturnValue(mockTheaterTechService);
  });

  // ==========================================================================
  // A) BLOCKED GATE -> 422 + ApiResponse error contract
  // ==========================================================================

  describe('Blocked Gate (422)', () => {
    it('should return 422 with GATE_BLOCKED when Sign-In not finalized', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.THEATER_TECHNICIAN,
        },
      });

      const gateError = new GateBlockedError(
        'WHO Sign-In checklist must be finalized before moving to IN_THEATER',
        'WHO_CHECKLIST_SIGN_IN',
        ['Patient identity confirmed', 'Site marked', 'Consent verified']
      );

      mockTheaterTechService.transitionCase.mockRejectedValue(gateError);

      const request = new NextRequest('http://localhost:3000/api/theater-tech/cases/case-1/transition', {
        method: 'POST',
        body: JSON.stringify({
          action: 'IN_THEATER',
          reason: 'Test reason',
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 422);
      assertGateBlocked(data, 'WHO_CHECKLIST_SIGN_IN');
      expect(data.metadata?.missingItems).toEqual([
        'Patient identity confirmed',
        'Site marked',
        'Consent verified',
      ]);
      expect(data.code).toBe(ApiErrorCode.GATE_BLOCKED);
      expect(data.message).toContain('Sign-In checklist');
    });

    it('should return 422 when recovery record not finalized', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.THEATER_TECHNICIAN,
        },
      });

      const gateError = new GateBlockedError(
        'Recovery record must be finalized',
        'RECOVERY_RECORD',
        ['Recovery assessment incomplete']
      );

      mockTheaterTechService.transitionCase.mockRejectedValue(gateError);

      const request = new NextRequest('http://localhost:3000/api/theater-tech/cases/case-1/transition', {
        method: 'POST',
        body: JSON.stringify({
          action: 'COMPLETED',
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 422);
      assertGateBlocked(data, 'RECOVERY_RECORD');
      expect(data.code).toBe(ApiErrorCode.GATE_BLOCKED);
    });
  });

  // ==========================================================================
  // B) ALLOWED TRANSITION -> 200 + ApiResponse success
  // ==========================================================================

  describe('Allowed Transition (200)', () => {
    it('should return 200 with success response for allowed transition', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.THEATER_TECHNICIAN,
        },
      });

      const transitionResult = {
        caseId: 'case-1',
        previousStatus: SurgicalCaseStatus.IN_PREP,
        newStatus: SurgicalCaseStatus.IN_THEATER,
      };

      mockTheaterTechService.transitionCase.mockResolvedValue(transitionResult);

      const request = new NextRequest('http://localhost:3000/api/theater-tech/cases/case-1/transition', {
        method: 'POST',
        body: JSON.stringify({
          action: 'IN_THEATER',
          reason: 'Patient ready',
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertSuccess200(response, data);
      expect(data.data).toEqual(transitionResult);
      expect(data.data.newStatus).toBe(SurgicalCaseStatus.IN_THEATER);
      expect(mockTheaterTechService.transitionCase).toHaveBeenCalledWith(
        'case-1',
        'IN_THEATER',
        'user-1',
        Role.THEATER_TECHNICIAN,
        'Patient ready'
      );
    });

    it('should return 200 when reason is optional and omitted', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.ADMIN,
        },
      });

      const transitionResult = {
        caseId: 'case-2',
        previousStatus: SurgicalCaseStatus.SCHEDULED,
        newStatus: SurgicalCaseStatus.IN_PREP,
      };

      mockTheaterTechService.transitionCase.mockResolvedValue(transitionResult);

      const request = new NextRequest('http://localhost:3000/api/theater-tech/cases/case-2/transition', {
        method: 'POST',
        body: JSON.stringify({
          action: 'IN_PREP',
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'case-2' }) });
      const data = await response.json();

      // Assert
      assertSuccess200(response, data);
      expect(data.data).toEqual(transitionResult);
      expect(mockTheaterTechService.transitionCase).toHaveBeenCalledWith(
        'case-2',
        'IN_PREP',
        'user-1',
        Role.ADMIN,
        undefined
      );
    });
  });

  // ==========================================================================
  // C) FORBIDDEN ROLE -> 403
  // ==========================================================================

  describe('Forbidden Role (403)', () => {
    it('should return 403 for DOCTOR role', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.DOCTOR,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/theater-tech/cases/case-1/transition', {
        method: 'POST',
        body: JSON.stringify({
          action: 'IN_THEATER',
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 403);
      assertError403(data);
      expect(data.code).toBe(ApiErrorCode.FORBIDDEN);
      expect(data.message).toContain('Theater Technician or Admin role required');
      expect(mockTheaterTechService.transitionCase).not.toHaveBeenCalled();
    });

    it('should return 403 for NURSE role', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.NURSE,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/theater-tech/cases/case-1/transition', {
        method: 'POST',
        body: JSON.stringify({
          action: 'IN_THEATER',
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 403);
      assertError403(data);
    });

    it('should return 401 for unauthenticated request', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        user: null,
      });

      const request = new NextRequest('http://localhost:3000/api/theater-tech/cases/case-1/transition', {
        method: 'POST',
        body: JSON.stringify({
          action: 'IN_THEATER',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 403); // handleApiError maps to 403 for ForbiddenError
      expect(data.code).toBe(ApiErrorCode.FORBIDDEN);
      expect(mockTheaterTechService.transitionCase).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // D) VALIDATION ERRORS -> 400
  // ==========================================================================

  describe('Validation Errors (400)', () => {
    it('should return 400 for missing action', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.THEATER_TECHNICIAN,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/theater-tech/cases/case-1/transition', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 400);
      expect(data.code).toBe(ApiErrorCode.VALIDATION_ERROR);
      expect(data.metadata).toHaveProperty('errors');
      expect(mockTheaterTechService.transitionCase).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid action value', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.THEATER_TECHNICIAN,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/theater-tech/cases/case-1/transition', {
        method: 'POST',
        body: JSON.stringify({
          action: 'INVALID_ACTION',
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'case-1' }) });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 400);
      expect(data.code).toBe(ApiErrorCode.VALIDATION_ERROR);
    });
  });
});
