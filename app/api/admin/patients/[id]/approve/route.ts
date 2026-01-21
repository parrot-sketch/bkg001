/**
 * API Route: POST /api/admin/patients/:id/approve
 * 
 * Approve Patient endpoint.
 * 
 * Approves a patient registration.
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
 * POST /api/admin/patients/:id/approve
 * 
 * Approves a patient
 */
export async function POST(
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

    // 3. Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    // 4. Find patient
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

    // 5. Update patient approval status
    const updatedPatient = await db.patient.update({
      where: { id },
      data: {
        approved: true,
        approved_by: body.approvedBy || authResult.user.userId,
        approved_at: new Date(),
      },
    });

    // 6. Map to DTO
    try {
      const domainPatient = InfrastructurePatientMapper.fromPrisma(updatedPatient);
      const patientDto = ApplicationPatientMapper.toResponseDto(domainPatient);

      return NextResponse.json(
        {
          success: true,
          data: patientDto,
          message: 'Patient approved successfully',
        },
        { status: 200 }
      );
    } catch (mapperError) {
      // If mapping fails, return basic data
      console.error('[API] Error mapping patient:', mapperError);
      return NextResponse.json(
        {
          success: true,
          data: {
            id: updatedPatient.id,
            fileNumber: updatedPatient.file_number,
            firstName: updatedPatient.first_name,
            lastName: updatedPatient.last_name,
            email: updatedPatient.email,
            phone: updatedPatient.phone || '',
            approved: updatedPatient.approved,
          },
          message: 'Patient approved successfully',
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('[API] /api/admin/patients/[id]/approve - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to approve patient',
      },
      { status: 500 }
    );
  }
}
