/**
 * Integration Tests: POST /api/theater-tech/surgical-cases/[caseId]/checklist/{phase}/finalize
 *
 * Contract tests for checklist finalize API route.
 * Validates ApiResponse<T> structure, HTTP status codes, and error metadata.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as postSignInFinalize } from '@/app/api/theater-tech/surgical-cases/[caseId]/checklist/sign-in/finalize/route';
import { NextRequest } from 'next/server';
import { Role } from '@/domain/enums/Role';
import { GateBlockedError } from '@/application/errors';
import { ApiErrorCode } from '@/lib/http/apiResponse';
import {
  assertSuccess200,
  assertError422,
  assertGateBlocked,
  assertStatusCode,
  unwrapApiData,
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

describe('POST /api/theater-tech/surgical-cases/[caseId]/checklist/sign-in/finalize', () => {
  let mockTheaterTechService: {
    finalizeChecklistPhase: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockTheaterTechService = {
      finalizeChecklistPhase: vi.fn(),
    };

    (getTheaterTechService as ReturnType<typeof vi.fn>).mockReturnValue(mockTheaterTechService);
  });

  // ==========================================================================
  // A) MISSING ITEMS -> 422
  // ==========================================================================

  describe('Missing Items (422)', () => {
    it('should return 422 with GATE_BLOCKED when required items are missing', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.THEATER_TECHNICIAN,
        },
      });

      const gateError = new GateBlockedError(
        'Cannot finalize Sign-In phase: missing required items',
        'WHO_CHECKLIST',
        ['Patient identity confirmed', 'Site marked', 'Consent verified']
      );

      mockTheaterTechService.finalizeChecklistPhase.mockRejectedValue(gateError);

      const request = new NextRequest(
        'http://localhost:3000/api/theater-tech/surgical-cases/case-1/checklist/sign-in/finalize',
        {
          method: 'POST',
          body: JSON.stringify({
            items: [
              { key: 'patient_identity', label: 'Patient identity confirmed', confirmed: false },
              { key: 'site_marked', label: 'Site marked', confirmed: false },
            ],
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      // Act
      const response = await postSignInFinalize(request, {
        params: Promise.resolve({ caseId: 'case-1' }),
      });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 422);
      assertGateBlocked(data, 'WHO_CHECKLIST');
      expect(data.metadata?.missingItems).toEqual([
        'Patient identity confirmed',
        'Site marked',
        'Consent verified',
      ]);
      expect(data.code).toBe(ApiErrorCode.GATE_BLOCKED);
    });

    it('should return 422 when no items are provided', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.THEATER_TECHNICIAN,
        },
      });

      const gateError = new GateBlockedError(
        'Cannot finalize Sign-In phase: missing required items',
        'WHO_CHECKLIST',
        [
          'Patient identity confirmed',
          'Site marked',
          'Consent signed and verified',
          'Anesthesia safety check completed',
          'Pulse oximeter on patient and functioning',
          'Known allergies reviewed',
          'Difficult airway / aspiration risk assessed',
          'Risk of >500ml blood loss assessed',
        ]
      );

      mockTheaterTechService.finalizeChecklistPhase.mockRejectedValue(gateError);

      const request = new NextRequest(
        'http://localhost:3000/api/theater-tech/surgical-cases/case-1/checklist/sign-in/finalize',
        {
          method: 'POST',
          body: JSON.stringify({
            items: [],
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      // Act
      const response = await postSignInFinalize(request, {
        params: Promise.resolve({ caseId: 'case-1' }),
      });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 422);
      assertGateBlocked(data);
      expect((data.metadata?.missingItems as string[]).length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // B) SUCCESS -> 200
  // ==========================================================================

  describe('Success (200)', () => {
    it('should return 200 with success response when all items confirmed', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.THEATER_TECHNICIAN,
        },
      });

      const finalizeResult = {
        signIn: {
          completed: true,
          completedAt: '2026-02-11T10:30:00Z',
          completedByRole: 'THEATER_TECHNICIAN',
          items: [
            { key: 'patient_identity', label: 'Patient identity confirmed', confirmed: true },
            { key: 'site_marked', label: 'Site marked', confirmed: true },
            { key: 'consent_verified', label: 'Consent signed and verified', confirmed: true },
          ],
        },
        timeOut: {
          completed: false,
          completedAt: null,
          completedByRole: null,
          items: null,
        },
        signOut: {
          completed: false,
          completedAt: null,
          completedByRole: null,
          items: null,
        },
      };

      mockTheaterTechService.finalizeChecklistPhase.mockResolvedValue(finalizeResult);

      const request = new NextRequest(
        'http://localhost:3000/api/theater-tech/surgical-cases/case-1/checklist/sign-in/finalize',
        {
          method: 'POST',
          body: JSON.stringify({
            items: [
              { key: 'patient_identity', label: 'Patient identity confirmed', confirmed: true },
              { key: 'site_marked', label: 'Site marked', confirmed: true },
              { key: 'consent_verified', label: 'Consent signed and verified', confirmed: true },
              { key: 'anesthesia_check', label: 'Anesthesia safety check completed', confirmed: true },
              { key: 'pulse_oximeter', label: 'Pulse oximeter on patient and functioning', confirmed: true },
              { key: 'allergy_check', label: 'Known allergies reviewed', confirmed: true },
              { key: 'airway_risk', label: 'Difficult airway / aspiration risk assessed', confirmed: true },
              { key: 'blood_loss_risk', label: 'Risk of >500ml blood loss assessed', confirmed: true },
            ],
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      // Act
      const response = await postSignInFinalize(request, {
        params: Promise.resolve({ caseId: 'case-1' }),
      });
      const data = await response.json();

      // Assert
      assertSuccess200<{ signIn: { completed: boolean; completedAt: unknown; completedByRole: string } }>(response, data);
      const result = unwrapApiData(data);
      expect(result.signIn.completed).toBe(true);
      expect(result.signIn.completedAt).toBeTruthy();
      expect(result.signIn.completedByRole).toBe('THEATER_TECHNICIAN');
      expect(mockTheaterTechService.finalizeChecklistPhase).toHaveBeenCalledWith(
        'case-1',
        'SIGN_IN',
        expect.arrayContaining([
          expect.objectContaining({ key: 'patient_identity', confirmed: true }),
        ]),
        'user-1',
        Role.THEATER_TECHNICIAN
      );
    });
  });

  // ==========================================================================
  // C) VALIDATION ERRORS -> 400
  // ==========================================================================

  describe('Validation Errors (400)', () => {
    it('should return 400 for missing items array', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.THEATER_TECHNICIAN,
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/theater-tech/surgical-cases/case-1/checklist/sign-in/finalize',
        {
          method: 'POST',
          body: JSON.stringify({}),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      // Act
      const response = await postSignInFinalize(request, {
        params: Promise.resolve({ caseId: 'case-1' }),
      });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 400);
      expect(data.code).toBe(ApiErrorCode.VALIDATION_ERROR);
      expect(mockTheaterTechService.finalizeChecklistPhase).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid item structure', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.THEATER_TECHNICIAN,
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/theater-tech/surgical-cases/case-1/checklist/sign-in/finalize',
        {
          method: 'POST',
          body: JSON.stringify({
            items: [{ invalid: 'structure' }],
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      // Act
      const response = await postSignInFinalize(request, {
        params: Promise.resolve({ caseId: 'case-1' }),
      });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 400);
      expect(data.code).toBe(ApiErrorCode.VALIDATION_ERROR);
    });
  });
});
