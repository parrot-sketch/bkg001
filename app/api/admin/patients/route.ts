/**
 * API Route: GET /api/admin/patients
 * 
 * Admin Patients endpoint.
 * 
 * Returns all patients for admin management.
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
 * GET /api/admin/patients
 * 
 * Returns all patients
 */
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

    // 3. Fetch all patients
    const patients = await db.patient.findMany({
      orderBy: {
        created_at: 'desc',
      },
    });

    // 4. Map to DTOs
    const patientDtos = patients.map((patient) => {
      try {
        const domainPatient = InfrastructurePatientMapper.fromPrisma(patient);
        const dto = ApplicationPatientMapper.toResponseDto(domainPatient);
        // Add approved status for admin UI
        return {
          ...dto,
          approved: patient.approved,
        };
      } catch (error) {
        console.error(`[API] Error mapping patient ${patient.id}:`, error);
        // Return a basic DTO for patients that fail mapping (e.g., invalid phone numbers)
        return {
          id: patient.id,
          fileNumber: patient.file_number,
          firstName: patient.first_name,
          lastName: patient.last_name,
          fullName: `${patient.first_name} ${patient.last_name}`,
          email: patient.email,
          phone: patient.phone || '',
          dateOfBirth: patient.date_of_birth,
          age: patient.date_of_birth ? Math.floor((new Date().getTime() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0,
          gender: patient.gender,
          address: patient.address,
          maritalStatus: patient.marital_status || '',
          emergencyContactName: patient.emergency_contact_name || '',
          emergencyContactNumber: patient.emergency_contact_number || '',
          relation: patient.relation || '',
          hasPrivacyConsent: patient.privacy_consent || false,
          hasServiceConsent: patient.service_consent || false,
          hasMedicalConsent: patient.medical_consent || false,
          approved: patient.approved,
          createdAt: patient.created_at,
          updatedAt: patient.updated_at,
        };
      }
    });

    // 5. Return patients
    return NextResponse.json(
      {
        success: true,
        data: patientDtos,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/admin/patients - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch patients',
      },
      { status: 500 }
    );
  }
}
