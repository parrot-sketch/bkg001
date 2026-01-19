/**
 * API Route: POST /api/patients
 * 
 * Create Patient endpoint.
 * Allows authenticated patients to create their patient profile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import { CreatePatientUseCase } from '@/application/use-cases/CreatePatientUseCase';
import { PrismaPatientRepository } from '@/infrastructure/database/repositories/PrismaPatientRepository';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import db from '@/lib/db';
import { CreatePatientDto } from '@/application/dtos/CreatePatientDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { Role } from '@/domain/enums/Role';

// Initialize dependencies
const patientRepository = new PrismaPatientRepository(db);
const auditService = new ConsoleAuditService();
const createPatientUseCase = new CreatePatientUseCase(patientRepository, auditService);

/**
 * POST /api/patients
 * 
 * Creates a new patient profile.
 * 
 * Request body: CreatePatientDto
 * 
 * Security:
 * - Requires authentication
 * - Patients can only create their own profile (id must match their userId)
 * - Other roles (admin/frontdesk) can create any patient profile
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
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
    const userRole = authResult.user.role as Role;

    // 2. Parse and validate request body
    const body = await request.json() as CreatePatientDto;

    if (!body || !body.id || !body.firstName || !body.lastName || !body.email || !body.phone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Required fields: id, firstName, lastName, email, phone, dateOfBirth, gender, address, maritalStatus, emergencyContactName, emergencyContactNumber, relation, privacyConsent, serviceConsent, medicalConsent',
        },
        { status: 400 }
      );
    }

    // 3. Security check: Patients can only create their own profile
    if (userRole === Role.PATIENT && body.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Patients can only create their own profile',
        },
        { status: 403 }
      );
    }

    // 4. Execute create patient use case
    const patientDto = await createPatientUseCase.execute(body, userId);

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        data: patientDto,
        message: 'Patient profile created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle domain exceptions
    if (error instanceof DomainException) {
      console.error('[API] POST /api/patients - DomainException:', error.message, error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    // Handle unexpected errors
    console.error('[API] POST /api/patients - Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: `Failed to create patient: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
