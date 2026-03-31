import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import { CreatePatientUseCase } from '@/application/use-cases/CreatePatientUseCase';
import { PrismaPatientRepository } from '@/infrastructure/database/repositories/PrismaPatientRepository';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import db from '@/lib/db';
import { CreatePatientDto } from '@/application/dtos/CreatePatientDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { Role } from '@/domain/enums/Role';
import { PatientIntakeFormSchema } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';

const patientRepository = new PrismaPatientRepository(db);
const auditService = new ConsoleAuditService();
const createPatientUseCase = new CreatePatientUseCase(patientRepository, auditService);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication required' },
        { status: 401 },
      );
    }

    const userId = authResult.user.userId;
    const userRole = authResult.user.role as Role;
    const body = await request.json();

    // Validate using the same schema as the patient intake form
    const validationResult = PatientIntakeFormSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 },
      );
    }

    const data = validationResult.data;

    // Auto-generate patient ID (frontdesk never provides one)
    const patientId = body.id || uuidv4();

    // Security check: Patients can only create their own profile
    if (userRole === Role.PATIENT && body.id && body.id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Patients can only create their own profile' },
        { status: 403 },
      );
    }

    // Map intake form data → CreatePatientDto
    const dto: CreatePatientDto = {
      id: patientId,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      email: data.email,
      phone: data.phone,
      whatsappPhone: data.whatsappPhone || undefined,
      address: data.address || undefined,
      maritalStatus: data.maritalStatus || undefined,
      occupation: data.occupation || undefined,
      emergencyContactName: data.emergencyContactName || undefined,
      emergencyContactNumber: data.emergencyContactNumber || undefined,
      relation: data.emergencyContactRelation || undefined,
      privacyConsent: data.privacyConsent ?? true,
      serviceConsent: data.serviceConsent ?? true,
      medicalConsent: data.medicalConsent ?? true,
      bloodGroup: data.bloodGroup || undefined,
      allergies: data.allergies || undefined,
      medicalConditions: data.medicalConditions || undefined,
    };

    const patientDto = await createPatientUseCase.execute(dto, userId);

    return NextResponse.json(
      { success: true, data: patientDto, message: 'Patient registered successfully' },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof DomainException) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('[POST /api/patients]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create patient' },
      { status: 500 },
    );
  }
}
