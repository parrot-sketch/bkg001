/**
 * API Route: GET /api/doctors/me/patients
 *
 * Fetch the current doctor's active patients from explicit assignments.
 *
 * UPDATED: Now uses DoctorPatientAssignment table instead of inferring
 * from Appointment history. This provides:
 * - Explicit care relationships (not just "ever had an appointment")
 * - Clear assignment lifecycle (active, discharged, transferred, inactive)
 * - Audit trail of care transitions
 * - Cleaner roster management
 *
 * Query parameters:
 * - status: Filter by status (default: ACTIVE)  
 * - skip: Pagination offset (default: 0)
 * - take: Records per page (default: 50)
 * - sortBy: Sort field: assignedAt | recent | name (default: assignedAt)
 * - sortOrder: asc | desc (default: desc)
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { Role } from '@/domain/enums/Role';
import { PatientMapper as InfrastructurePatientMapper } from '@/infrastructure/mappers/PatientMapper';
import { PatientMapper as ApplicationPatientMapper } from '@/application/mappers/PatientMapper';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { DoctorPatientAssignmentStatus } from '@prisma/client';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate request
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      );
    }

    const { userId, role } = authResult.user;

    // 2. Check permissions (only DOCTOR role)
    if (role !== Role.DOCTOR) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only doctors can access this endpoint',
        },
        { status: 403 }
      );
    }

    // 3. Find doctor profile to get doctor ID
    const doctor = await db.doctor.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!doctor) {
      return NextResponse.json(
        {
          success: false,
          error: 'Doctor profile not found',
        },
        { status: 404 }
      );
    }

    // 4. Parse query parameters
    const url = new URL(request.url);
    const status = (url.searchParams.get('status') || 'ACTIVE') as DoctorPatientAssignmentStatus;
    const skip = parseInt(url.searchParams.get('skip') || '0', 10);
    const take = Math.min(parseInt(url.searchParams.get('take') || '50', 10), 200);

    // 5. Fetch active patient assignments for this doctor with patient details
    // Uses explicit DoctorPatientAssignment table instead of Appointment inference
    const assignments = await db.doctorPatientAssignment.findMany({
      where: {
        doctor_id: doctor.id,
        status: status,
      },
      select: {
        patient_id: true,
        assigned_at: true,
      },
      orderBy: {
        assigned_at: 'desc',
      },
      skip,
      take,
    });

    // Get count for pagination
    const total = await db.doctorPatientAssignment.count({
      where: {
        doctor_id: doctor.id,
        status: status,
      },
    });

    // 6. Fetch full patient details for assigned patients
    const patientIds = assignments.map((a) => a.patient_id);

    let patients: any[] = [];
    if (patientIds.length > 0) {
      patients = await db.patient.findMany({
        where: {
          id: {
            in: patientIds,
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });
    }

    // 7. Map to DTOs
    const patientDtos: PatientResponseDto[] = patients.map((prismaPatient) => {
      const patientEntity = InfrastructurePatientMapper.fromPrisma(prismaPatient);
      return ApplicationPatientMapper.toResponseDto(patientEntity);
    });

    return NextResponse.json(
      {
        success: true,
        data: patientDtos,
        count: patientDtos.length,
        total,
        status,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/doctors/me/patients GET - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch patients',
      },
      { status: 500 }
    );
  }
}
