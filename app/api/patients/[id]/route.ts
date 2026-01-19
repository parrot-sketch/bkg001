/**
 * API Route: GET /api/patients/:id
 * 
 * Get Patient by ID endpoint.
 * 
 * Supports finding patient by:
 * - Patient ID (for admin/doctor/nurse roles)
 * - User ID (for patients accessing their own profile via user_id)
 * 
 * Security:
 * - Requires authentication
 * - Patients can only access their own profile (via user_id)
 * - Other roles can access any patient profile
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { PatientMapper as InfrastructurePatientMapper } from '@/infrastructure/mappers/PatientMapper';
import { PatientMapper as ApplicationPatientMapper } from '@/application/mappers/PatientMapper';

/**
 * GET /api/patients/:id
 * 
 * Query params:
 * - id: Patient ID or User ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // 1. Authenticate request
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || 'Authentication required',
        },
        { status: 401 }
      );
    }

    const userId = authResult.user.userId;
    const userRole = authResult.user.role;
    const { id } = await params;

    // 2. Build where clause - try to find by patient ID or user_id
    let patient;
    
    if (userRole === 'PATIENT') {
      // Patients can only access their own profile - find by user_id or id
      // First check if they're trying to access someone else's profile
      if (id !== userId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied: Patients can only view their own profile',
          },
          { status: 403 }
        );
      }

      // Find patient by user_id OR id (fallback for patients created before user_id was set)
      // In this system, patient id equals the Clerk user ID when patient has an account
      patient = await db.patient.findFirst({
        where: {
          OR: [
            { user_id: userId },
            { id: userId }, // Fallback: if user_id is null, check by id
          ],
        },
      });
    } else {
      // Other roles can find by patient ID or user_id
      patient = await db.patient.findFirst({
        where: {
          OR: [
            { id },
            { user_id: id },
          ],
        },
      });
    }

    // 3. Check if patient exists
    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          error: 'Patient not found',
        },
        { status: 404 }
      );
    }

    // 4. Map Prisma model to domain entity, then to DTO
    const domainPatient = InfrastructurePatientMapper.fromPrisma(patient);
    const patientDto: PatientResponseDto = ApplicationPatientMapper.toResponseDto(domainPatient);

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        data: patientDto,
        message: 'Patient retrieved successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Unexpected error - log and return generic error
    console.error('[API] /api/patients/[id] - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
