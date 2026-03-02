/**
 * Integration Tests: Surgical Plan Detail Route
 *
 * Contract tests for GET /api/doctor/surgical-cases/[caseId]/plan endpoint.
 * Validates ApiResponse<T> structure, HTTP status codes, and authorization.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/doctor/surgical-cases/[caseId]/plan/route';
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
const mockSurgicalCase = {
  id: 'case-1',
  status: 'PLANNING',
  urgency: 'ROUTINE',
  diagnosis: 'Osteoarthritis',
  procedure_name: 'Total Knee Replacement',
  side: 'LEFT',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  primary_surgeon_id: 'doctor-1',
  patient_id: 'patient-1',
  patient: {
    id: 'patient-1',
    first_name: 'John',
    last_name: 'Doe',
    file_number: 'NS001',
    gender: 'MALE',
    date_of_birth: new Date('1980-01-01'),
    allergies: 'Penicillin',
  },
  primary_surgeon: {
    id: 'doctor-1',
    name: 'Dr. Smith',
  },
  consultation: {
    id: 1,
    appointment_id: 1,
  },
  theater_booking: null,
  case_plan: {
    id: 1,
    appointment_id: 1,
    procedure_plan: 'Surgical plan details',
    risk_factors: 'Patient has diabetes',
    pre_op_notes: null,
    implant_details: null,
    planned_anesthesia: 'GENERAL',
    special_instructions: null,
    estimated_duration_minutes: 120,
    readiness_status: 'IN_PROGRESS',
    ready_for_surgery: false,
    updated_at: new Date('2024-01-01'),
    consents: [],
    images: [],
    procedure_record: null,
  },
  staff_invites: [],
};

vi.mock('@/lib/db', () => ({
  default: {
    surgicalCase: {
      findUnique: vi.fn(),
    },
    doctor: {
      findUnique: vi.fn(),
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

describe('GET /api/doctor/surgical-cases/[caseId]/plan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with success response for valid case (primary surgeon)', async () => {
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
      ...mockSurgicalCase,
      primary_surgeon_id: 'doctor-1',
    });

    const request = new NextRequest('http://localhost/api/doctor/surgical-cases/case-1/plan');
    const response = await GET(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    const json = await response.json();
    assertSuccess200(response, json);

    const data = unwrapApiData(json);
    expect(data.id).toBe('case-1');
    expect(data.patient?.firstName).toBe('John');
    expect(data.casePlan?.id).toBe(1);
    expect(data.readinessChecklist).toBeDefined();
    expect(Array.isArray(data.readinessChecklist)).toBe(true);
  });

  it('should return 401 for unauthenticated request', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
    });

    const request = new NextRequest('http://localhost/api/doctor/surgical-cases/case-1/plan');
    const response = await GET(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    assertStatusCode(response, 401);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('Authentication required');
  });

  it('should return 403 for non-DOCTOR role', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.NURSE,
      },
    });

    const request = new NextRequest('http://localhost/api/doctor/surgical-cases/case-1/plan');
    const response = await GET(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    assertStatusCode(response, 403);
    const json = await response.json();
    assertError403(json);
    expect(json.error).toContain('Doctors only');
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

    const request = new NextRequest('http://localhost/api/doctor/surgical-cases/non-existent/plan');
    const response = await GET(request, {
      params: Promise.resolve({ caseId: 'non-existent' }),
    });

    assertStatusCode(response, 404);
    const json = await response.json();
    assertError404(json);
    expect(json.error).toContain('not found');
  });

  it('should return 403 for doctor who is not primary surgeon and has no accepted invite', async () => {
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
      ...mockSurgicalCase,
      primary_surgeon_id: 'doctor-1', // Different doctor
      staff_invites: [], // No accepted invites
    });

    const request = new NextRequest('http://localhost/api/doctor/surgical-cases/case-1/plan');
    const response = await GET(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    assertStatusCode(response, 403);
    const json = await response.json();
    assertError403(json);
    expect(json.error).toContain('not authorized');
  });

  it('should return 404 for doctor profile not found', async () => {
    (JwtMiddleware.authenticate as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      user: {
        userId: 'user-1',
        role: Role.DOCTOR,
      },
    });

    (db.doctor.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/doctor/surgical-cases/case-1/plan');
    const response = await GET(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    assertStatusCode(response, 404);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('Doctor profile not found');
  });
});
