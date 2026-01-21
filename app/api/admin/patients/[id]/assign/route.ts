/**
 * API Route: POST /api/admin/patients/:id/assign
 * 
 * Assign Patient endpoint.
 * 
 * Assigns a patient to a staff member (doctor).
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
 * POST /api/admin/patients/:id/assign
 * 
 * Assigns a patient to staff
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

    const { assignedToUserId, assignedBy, notes } = body;

    if (!assignedToUserId || typeof assignedToUserId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'assignedToUserId is required',
        },
        { status: 400 }
      );
    }

    // 4. Verify assigned user exists and is a doctor
    const assignedUser = await db.user.findUnique({
      where: { id: assignedToUserId },
      include: {
        doctor_profile: true,
      },
    });

    if (!assignedUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Assigned user not found',
        },
        { status: 404 }
      );
    }

    if (assignedUser.role !== 'DOCTOR') {
      return NextResponse.json(
        {
          success: false,
          error: 'Can only assign patients to doctors',
        },
        { status: 400 }
      );
    }

    // 5. Find patient
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

    // 6. Update patient assignment
    const updatedPatient = await db.patient.update({
      where: { id },
      data: {
        assigned_to_user_id: assignedToUserId,
      },
    });

    // 7. Create audit log entry
    try {
      await db.auditLog.create({
        data: {
          user_id: assignedBy || authResult.user.userId,
          record_id: id,
          action: 'ASSIGN',
          model: 'Patient',
          details: `Patient assigned to ${assignedUser.email}. ${notes ? `Notes: ${notes}` : ''}`,
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
        },
      });
    } catch (auditError) {
      console.error('[API] Failed to create audit log:', auditError);
      // Don't fail the request if audit logging fails
    }

    // 8. Map to DTO
    try {
      const domainPatient = InfrastructurePatientMapper.fromPrisma(updatedPatient);
      const patientDto = ApplicationPatientMapper.toResponseDto(domainPatient);

      return NextResponse.json(
        {
          success: true,
          data: patientDto,
          message: 'Patient assigned successfully',
        },
        { status: 200 }
      );
    } catch (mapperError) {
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
          },
          message: 'Patient assigned successfully',
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('[API] /api/admin/patients/[id]/assign - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to assign patient',
      },
      { status: 500 }
    );
  }
}
