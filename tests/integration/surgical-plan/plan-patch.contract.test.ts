/**
 * Integration Tests: Plan PATCH Route
 *
 * Contract tests for PATCH /api/doctor/surgical-cases/[caseId]/plan.
 * Validates ApiResponse<T> structure, HTTP status codes, and field updates.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PATCH } from '@/app/api/doctor/surgical-cases/[caseId]/plan/route';
import { NextRequest } from 'next/server';
import { Role } from '@/domain/enums/Role';
import { AnesthesiaType, CaseReadinessStatus, SurgicalCaseStatus } from '@prisma/client';
import {
  assertSuccess200,
  assertError400,
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
const mockTx = {
  casePlan: {
    upsert: vi.fn(),
    update: vi.fn(),
  },
  surgicalCase: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  auditLog: {
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
      update: vi.fn(),
    },
    casePlan: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((callback) => Promise.resolve(callback(mockTx))),
  },
}));

vi.mock('@/lib/observability/endpointLogger', () => ({
  endpointTimer: vi.fn(() => ({
    end: vi.fn(),
  })),
}));

import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

describe('PATCH /api/doctor/surgical-cases/[caseId]/plan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 when updating procedure fields and reflect on GET', async () => {
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

    (db.surgicalCase.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        id: 'case-1',
        status: SurgicalCaseStatus.PLANNING,
        primary_surgeon_id: 'doctor-1',
        patient_id: 'patient-1',
        case_plan: {
          id: 1,
          appointment_id: 1,
        },
        consultation: null,
      })
      .mockResolvedValueOnce({
        id: 'case-1',
        status: SurgicalCaseStatus.PLANNING,
        procedure_name: 'Updated Procedure',
        patient: {
          id: 'patient-1',
          first_name: 'John',
          last_name: 'Doe',
          file_number: 'F001',
          gender: 'M',
          date_of_birth: '1990-01-01',
          allergies: null,
        },
        primary_surgeon: {
          id: 'doctor-1',
          name: 'Dr. Smith',
        },
        consultation: {
          id: 'consult-1',
          appointment_id: 1,
        },
        theater_booking: null,
        staff_invites: [],
        case_plan: {
          id: 1,
          appointment_id: 1,
          procedure_plan: '<p>Updated plan</p>',
          risk_factors: null,
          pre_op_notes: null,
          implant_details: null,
          planned_anesthesia: null,
          special_instructions: null,
          estimated_duration_minutes: null,
          readiness_status: CaseReadinessStatus.IN_PROGRESS,
          ready_for_surgery: false,
          consents: [],
          images: [],
          procedure_record: null,
        },
      });

    (mockTx.casePlan.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      appointment_id: 1,
      procedure_plan: '<p>Updated plan</p>',
    });

    const request = new NextRequest('http://localhost/api/doctor/surgical-cases/case-1/plan', {
      method: 'PATCH',
      body: JSON.stringify({
        procedureName: 'Updated Procedure',
        procedurePlan: '<p>Updated plan</p>',
      }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    const json = await response.json();
    assertSuccess200(response, json);

    const data = unwrapApiData(json);
    expect(data.casePlan?.procedurePlan).toBe('<p>Updated plan</p>');
    expect(data.procedureName).toBe('Updated Procedure');
  });

  it('should return 200 when updating risk factors fields', async () => {
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

    (db.surgicalCase.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        id: 'case-1',
        status: SurgicalCaseStatus.PLANNING,
        primary_surgeon_id: 'doctor-1',
        patient_id: 'patient-1',
        case_plan: {
          id: 1,
          appointment_id: 1,
        },
        consultation: null,
      })
      .mockResolvedValueOnce({
        id: 'case-1',
        status: SurgicalCaseStatus.PLANNING,
        procedure_name: null,
        patient: {
          id: 'patient-1',
          first_name: 'John',
          last_name: 'Doe',
          file_number: 'F001',
          gender: 'M',
          date_of_birth: '1990-01-01',
          allergies: null,
        },
        primary_surgeon: {
          id: 'doctor-1',
          name: 'Dr. Smith',
        },
        consultation: {
          id: 'consult-1',
          appointment_id: 1,
        },
        theater_booking: null,
        staff_invites: [],
        case_plan: {
          id: 1,
          appointment_id: 1,
          procedure_plan: null,
          risk_factors: '<p>Updated risk factors</p>',
          pre_op_notes: '<p>Updated pre-op notes</p>',
          implant_details: null,
          planned_anesthesia: null,
          special_instructions: null,
          estimated_duration_minutes: null,
          readiness_status: CaseReadinessStatus.IN_PROGRESS,
          ready_for_surgery: false,
          consents: [],
          images: [],
          procedure_record: null,
        },
      });

    (mockTx.casePlan.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      appointment_id: 1,
      risk_factors: '<p>Updated risk factors</p>',
      pre_op_notes: '<p>Updated pre-op notes</p>',
    });

    const request = new NextRequest('http://localhost/api/doctor/surgical-cases/case-1/plan', {
      method: 'PATCH',
      body: JSON.stringify({
        riskFactors: '<p>Updated risk factors</p>',
        preOpNotes: '<p>Updated pre-op notes</p>',
      }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    const json = await response.json();
    assertSuccess200(response, json);

    const data = unwrapApiData(json);
    expect(data.casePlan?.riskFactors).toBe('<p>Updated risk factors</p>');
    expect(data.casePlan?.preOpNotes).toBe('<p>Updated pre-op notes</p>');
  });

  it('should return 200 when updating anesthesia fields', async () => {
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

    (db.surgicalCase.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        id: 'case-1',
        status: SurgicalCaseStatus.PLANNING,
        primary_surgeon_id: 'doctor-1',
        patient_id: 'patient-1',
        case_plan: {
          id: 1,
          appointment_id: 1,
        },
        consultation: null,
      })
      .mockResolvedValueOnce({
        id: 'case-1',
        status: SurgicalCaseStatus.PLANNING,
        procedure_name: null,
        patient: {
          id: 'patient-1',
          first_name: 'John',
          last_name: 'Doe',
          file_number: 'F001',
          gender: 'M',
          date_of_birth: '1990-01-01',
          allergies: null,
        },
        primary_surgeon: {
          id: 'doctor-1',
          name: 'Dr. Smith',
        },
        consultation: {
          id: 'consult-1',
          appointment_id: 1,
        },
        theater_booking: null,
        staff_invites: [],
        case_plan: {
          id: 1,
          appointment_id: 1,
          procedure_plan: null,
          risk_factors: null,
          pre_op_notes: null,
          implant_details: null,
          planned_anesthesia: AnesthesiaType.GENERAL,
          special_instructions: '<p>Updated instructions</p>',
          estimated_duration_minutes: 120,
          readiness_status: CaseReadinessStatus.IN_PROGRESS,
          ready_for_surgery: false,
          consents: [],
          images: [],
          procedure_record: null,
        },
      });

    (mockTx.casePlan.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      appointment_id: 1,
      planned_anesthesia: AnesthesiaType.GENERAL,
      special_instructions: '<p>Updated instructions</p>',
      estimated_duration_minutes: 120,
    });

    const request = new NextRequest('http://localhost/api/doctor/surgical-cases/case-1/plan', {
      method: 'PATCH',
      body: JSON.stringify({
        anesthesiaPlan: AnesthesiaType.GENERAL,
        specialInstructions: '<p>Updated instructions</p>',
        estimatedDurationMinutes: 120,
      }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    const json = await response.json();
    assertSuccess200(response, json);

    const data = unwrapApiData(json);
    expect(data.casePlan?.anesthesiaPlan).toBe(AnesthesiaType.GENERAL);
    expect(data.casePlan?.specialInstructions).toBe('<p>Updated instructions</p>');
    expect(data.casePlan?.estimatedDurationMinutes).toBe(120);
  });

  it('should return 400 for invalid duration (below minimum)', async () => {
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

    const request = new NextRequest('http://localhost/api/doctor/surgical-cases/case-1/plan', {
      method: 'PATCH',
      body: JSON.stringify({
        estimatedDurationMinutes: 10, // Below minimum
      }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    assertStatusCode(response, 400);
    const json = await response.json();
    assertError400(json);
  });

  it('should return 403 for forbidden role (non-primary surgeon)', async () => {
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
      status: SurgicalCaseStatus.PLANNING,
      primary_surgeon_id: 'doctor-1', // Different doctor
      patient_id: 'patient-1',
      case_plan: {
        id: 1,
        appointment_id: 1,
      },
      consultation: null,
    });

    const request = new NextRequest('http://localhost/api/doctor/surgical-cases/case-1/plan', {
      method: 'PATCH',
      body: JSON.stringify({
        procedurePlan: '<p>Test</p>',
      }),
    });

    const response = await PATCH(request, {
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

    const request = new NextRequest('http://localhost/api/doctor/surgical-cases/non-existent/plan', {
      method: 'PATCH',
      body: JSON.stringify({
        procedurePlan: '<p>Test</p>',
      }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ caseId: 'non-existent' }),
    });

    assertStatusCode(response, 404);
    const json = await response.json();
    assertError404(json);
  });
});
