/**
 * API Route: GET /api/admin/patients/:id
 * 
 * Get Patient by ID endpoint (Admin).
 * 
 * Returns a specific patient's details for admin management.
 * 
 * Security:
 * - Requires authentication
 * - Only ADMIN role can access
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { PatientMapper as InfrastructurePatientMapper } from '@/infrastructure/mappers/PatientMapper';
import { PatientMapper as ApplicationPatientMapper } from '@/application/mappers/PatientMapper';

/**
 * GET /api/admin/patients/:id
 * 
 * Returns a specific patient
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

    // 2. Check permissions (only ADMIN)
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Admin access required',
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    // 3. Find patient
    const patient = await db.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          error: 'Patient not found',
        },
        { status: 404 }
      );
    }

    // 4. Map to DTO
    try {
      const domainPatient = InfrastructurePatientMapper.fromPrisma(patient);
      const patientDto = ApplicationPatientMapper.toResponseDto(domainPatient);

      return NextResponse.json(
        {
          success: true,
          data: patientDto,
        },
        { status: 200 }
      );
    } catch (mapperError) {
      console.error('[API] Error mapping patient:', mapperError);
      // Return basic data if mapping fails
      return NextResponse.json(
        {
          success: true,
          data: {
            id: patient.id,
            fileNumber: patient.file_number,
            firstName: patient.first_name,
            lastName: patient.last_name,
            email: patient.email,
            phone: patient.phone || '',
            dateOfBirth: patient.date_of_birth,
            gender: patient.gender,
            address: patient.address,
            createdAt: patient.created_at,
            updatedAt: patient.updated_at,
          },
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('[API] /api/admin/patients/[id] - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch patient',
      },
      { status: 500 }
    );
  }
}
