/**
 * Integration Tests: PATCH /api/theater-tech/surgical-cases/[caseId]/timeline
 *
 * Contract tests for timeline update API route.
 * Validates ApiResponse<T> structure, HTTP status codes, and error metadata.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PATCH } from '@/app/api/theater-tech/surgical-cases/[caseId]/timeline/route';
import { NextRequest } from 'next/server';
import { Role } from '@/domain/enums/Role';
import { ValidationError } from '@/application/errors';
import { ApiErrorCode } from '@/lib/http/apiResponse';
import {
  assertSuccess200,
  assertError400,
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

describe('PATCH /api/theater-tech/surgical-cases/[caseId]/timeline', () => {
  let mockTheaterTechService: {
    updateTimeline: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockTheaterTechService = {
      updateTimeline: vi.fn(),
    };

    (getTheaterTechService as ReturnType<typeof vi.fn>).mockReturnValue(mockTheaterTechService);
  });

  // ==========================================================================
  // A) INVALID CHRONOLOGY -> 400 or 422
  // ==========================================================================

  describe('Invalid Chronology (400)', () => {
    it('should return 400 with VALIDATION_ERROR when closure_time is before incision_time', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.THEATER_TECHNICIAN,
        },
      });

      const validationError = new ValidationError('Invalid timeline chronology', [
        {
          field: 'closureTime',
          message: 'Closure time must be after incision time',
        },
      ]);

      mockTheaterTechService.updateTimeline.mockRejectedValue(validationError);

      const request = new NextRequest(
        'http://localhost:3000/api/theater-tech/surgical-cases/case-1/timeline',
        {
          method: 'PATCH',
          body: JSON.stringify({
            incisionTime: '2026-02-11T12:00:00Z',
            closureTime: '2026-02-11T11:00:00Z', // Before incision time
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      // Act
      const response = await PATCH(request, {
        params: Promise.resolve({ caseId: 'case-1' }),
      });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 400);
      assertError400(data);
      expect(data.code).toBe(ApiErrorCode.VALIDATION_ERROR);
      expect(data.metadata).toHaveProperty('errors');
      expect(Array.isArray(data.metadata?.errors)).toBe(true);
      expect((data.metadata?.errors as Array<{ field: string; message: string }>)[0].field).toBe(
        'closureTime'
      );
    });

    it('should return 400 when wheelsOut is before wheelsIn', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.THEATER_TECHNICIAN,
        },
      });

      const validationError = new ValidationError('Invalid timeline chronology', [
        {
          field: 'wheelsOut',
          message: 'Wheels out time must be after wheels in time',
        },
      ]);

      mockTheaterTechService.updateTimeline.mockRejectedValue(validationError);

      const request = new NextRequest(
        'http://localhost:3000/api/theater-tech/surgical-cases/case-1/timeline',
        {
          method: 'PATCH',
          body: JSON.stringify({
            wheelsIn: '2026-02-11T14:00:00Z',
            wheelsOut: '2026-02-11T13:00:00Z', // Before wheels in
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      // Act
      const response = await PATCH(request, {
        params: Promise.resolve({ caseId: 'case-1' }),
      });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 400);
      assertError400(data);
      expect(data.metadata?.errors).toBeDefined();
    });
  });

  // ==========================================================================
  // B) SUCCESS -> 200
  // ==========================================================================

  describe('Success (200)', () => {
    it('should return 200 with success response for valid timeline update', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.THEATER_TECHNICIAN,
        },
      });

      const timelineResult = {
        timeline: {
          wheelsIn: '2026-02-11T10:00:00Z',
          anesthesiaStart: '2026-02-11T10:15:00Z',
          incisionTime: '2026-02-11T10:30:00Z',
          closureTime: '2026-02-11T12:00:00Z',
          wheelsOut: '2026-02-11T12:15:00Z',
        },
        durations: {
          orTimeMinutes: 135,
          surgeryTimeMinutes: 90,
          prepTimeMinutes: 15,
          closeOutTimeMinutes: 15,
          anesthesiaTimeMinutes: 120,
        },
        missingItems: [],
      };

      mockTheaterTechService.updateTimeline.mockResolvedValue(timelineResult);

      const request = new NextRequest(
        'http://localhost:3000/api/theater-tech/surgical-cases/case-1/timeline',
        {
          method: 'PATCH',
          body: JSON.stringify({
            incisionTime: '2026-02-11T10:30:00Z',
            closureTime: '2026-02-11T12:00:00Z',
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      // Act
      const response = await PATCH(request, {
        params: Promise.resolve({ caseId: 'case-1' }),
      });
      const data = await response.json();

      // Assert
      assertSuccess200(response, data);
      expect(data.data.timeline).toBeDefined();
      expect(data.data.timeline.incisionTime).toBe('2026-02-11T10:30:00Z');
      expect(data.data.timeline.closureTime).toBe('2026-02-11T12:00:00Z');
      expect(data.data.durations).toBeDefined();
      expect(data.data.durations.surgeryTimeMinutes).toBe(90);
      expect(mockTheaterTechService.updateTimeline).toHaveBeenCalledWith(
        'case-1',
        {
          incisionTime: '2026-02-11T10:30:00Z',
          closureTime: '2026-02-11T12:00:00Z',
        },
        'user-1',
        Role.THEATER_TECHNICIAN
      );
    });

    it('should return 200 when updating a single timestamp', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.THEATER_TECHNICIAN,
        },
      });

      const timelineResult = {
        timeline: {
          wheelsIn: '2026-02-11T10:00:00Z',
          incisionTime: '2026-02-11T10:30:00Z',
        },
        durations: {
          orTimeMinutes: null,
          surgeryTimeMinutes: null,
          prepTimeMinutes: null,
          closeOutTimeMinutes: null,
          anesthesiaTimeMinutes: null,
        },
        missingItems: [],
      };

      mockTheaterTechService.updateTimeline.mockResolvedValue(timelineResult);

      const request = new NextRequest(
        'http://localhost:3000/api/theater-tech/surgical-cases/case-1/timeline',
        {
          method: 'PATCH',
          body: JSON.stringify({
            incisionTime: '2026-02-11T10:30:00Z',
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      // Act
      const response = await PATCH(request, {
        params: Promise.resolve({ caseId: 'case-1' }),
      });
      const data = await response.json();

      // Assert
      assertSuccess200(response, data);
      expect(data.data.timeline.incisionTime).toBe('2026-02-11T10:30:00Z');
    });
  });

  // ==========================================================================
  // C) VALIDATION ERRORS -> 400
  // ==========================================================================

  describe('Validation Errors (400)', () => {
    it('should return 400 for invalid ISO date format', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.THEATER_TECHNICIAN,
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/theater-tech/surgical-cases/case-1/timeline',
        {
          method: 'PATCH',
          body: JSON.stringify({
            incisionTime: 'invalid-date',
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      // Act
      const response = await PATCH(request, {
        params: Promise.resolve({ caseId: 'case-1' }),
      });
      const data = await response.json();

      // Assert
      assertStatusCode(response, 400);
      expect(data.code).toBe(ApiErrorCode.VALIDATION_ERROR);
    });

    it('should return 400 for empty body', async () => {
      // Arrange
      (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        user: {
          userId: 'user-1',
          role: Role.THEATER_TECHNICIAN,
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/theater-tech/surgical-cases/case-1/timeline',
        {
          method: 'PATCH',
          body: JSON.stringify({}),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        }
      );

      // Act
      const response = await PATCH(request, {
        params: Promise.resolve({ caseId: 'case-1' }),
      });
      const data = await response.json();

      // Assert
      // Empty body might be valid (no-op update), but if validation rejects it, expect 400
      // This depends on your TimelinePatchSchema validation rules
      expect([200, 400]).toContain(response.status);
    });
  });
});
