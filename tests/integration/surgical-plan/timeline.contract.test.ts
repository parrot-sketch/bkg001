/**
 * Integration Tests: Timeline Route
 *
 * Contract tests for GET /api/theater-tech/surgical-cases/[caseId]/timeline.
 * Validates ApiResponse<T> structure, HTTP status codes, and response shape.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/theater-tech/surgical-cases/[caseId]/timeline/route';
import { NextRequest } from 'next/server';
import { Role } from '@/domain/enums/Role';
import {
  assertSuccess200,
  assertError403,
  assertStatusCode,
  unwrapApiData,
} from '../../helpers/apiResponseAssertions';

// Mock JWT middleware
vi.mock('@/lib/auth/middleware', () => ({
  JwtMiddleware: {
    authenticate: vi.fn(),
  },
}));

// Mock theater tech service
vi.mock('@/lib/factories/theaterTechFactory', () => ({
  getTheaterTechService: vi.fn(() => ({
    getTimeline: vi.fn(),
  })),
}));

vi.mock('@/lib/observability/endpointLogger', () => ({
  endpointTimer: vi.fn(() => ({
    end: vi.fn(),
  })),
}));

import { JwtMiddleware } from '@/lib/auth/middleware';
import { getTheaterTechService } from '@/lib/factories/theaterTechFactory';

describe('GET /api/theater-tech/surgical-cases/[caseId]/timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with timeline data', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.DOCTOR,
      },
    });

    const theaterTechService = getTheaterTechService();
    (theaterTechService.getTimeline as ReturnType<typeof vi.fn>).mockResolvedValue({
      caseId: 'case-1',
      caseStatus: 'IN_THEATER',
      timeline: {
        wheelsIn: '2024-01-01T08:00:00Z',
        anesthesiaStart: '2024-01-01T08:15:00Z',
        anesthesiaEnd: null,
        incisionTime: '2024-01-01T08:30:00Z',
        closureTime: null,
        wheelsOut: null,
      },
      durations: {
        orTimeMinutes: 120,
        surgeryTimeMinutes: 90,
        prepTimeMinutes: 30,
        closeOutTimeMinutes: null,
        anesthesiaTimeMinutes: null,
      },
      missingItems: [
        { field: 'anesthesiaEnd', label: 'Anesthesia End' },
      ],
    });

    const request = new NextRequest('http://localhost/api/theater-tech/surgical-cases/case-1/timeline');
    const response = await GET(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    const json = await response.json();
    assertSuccess200(response, json);

    const data = unwrapApiData(json);
    expect(data.caseId).toBe('case-1');
    expect(data.timeline).toBeDefined();
    expect(data.durations).toBeDefined();
    expect(Array.isArray(data.missingItems)).toBe(true);
  });

  it('should return 403 for forbidden role', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.PATIENT, // Not allowed
      },
    });

    const request = new NextRequest('http://localhost/api/theater-tech/surgical-cases/case-1/timeline');
    const response = await GET(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    assertStatusCode(response, 403);
    const json = await response.json();
    assertError403(json);
  });
});
