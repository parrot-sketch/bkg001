import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PatientIntakeFormSchema } from '@/lib/schema';
import { SubmitPatientIntakeUseCase } from '@/application/use-cases/SubmitPatientIntakeUseCase';
import { PrismaIntakeSessionRepository } from '@/infrastructure/repositories/IntakeSessionRepository';
import { PrismaIntakeSubmissionRepository } from '@/infrastructure/repositories/IntakeSubmissionRepository';

// Initialize repositories at module level (singleton — shared across requests)
const sessionRepository = new PrismaIntakeSessionRepository(db);
const submissionRepository = new PrismaIntakeSubmissionRepository(db);
const submitIntakeUseCase = new SubmitPatientIntakeUseCase(
  sessionRepository,
  submissionRepository,
);

/**
 * POST /api/patient/intake
 *
 * Patient submits intake form (PUBLIC endpoint - no auth required)
 *
 * Request Body:
 * {
 *   sessionId: "abc123xyz",
 *   firstName: "...",
 *   lastName: "...",
 *   ... all form fields matching PatientIntakeFormSchema
 * }
 *
 * Response:
 * {
 *   submissionId: "sub-123",
 *   sessionId: "abc123xyz",
 *   message: "Your intake form has been received..."
 * }
 *
 * Errors:
 * - 400: Validation error or invalid session
 * - 409: Session expired or already submitted
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract session ID
    const { sessionId, ...formData } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 },
      );
    }

    // Clean up empty strings for optional fields before validation
    const rawData = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [
        key,
        value === '' ? undefined : value,
      ]).filter(([, value]) => value !== undefined)
    );

    // Validate form data using Zod schema
    // Zod schema handles string -> Date conversion via .pipe(z.coerce.date())
    const validationResult = PatientIntakeFormSchema.safeParse(rawData);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    // Get client IP for audit logging
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const userAgent = request.headers.get('user-agent') || undefined;

    // Clean validated data: convert empty strings to undefined for optional fields
    // This is necessary because Zod allows empty strings via .or(z.literal(""))
    // but the use case expects undefined instead
    const data = validationResult.data;
    
    // Explicitly convert empty strings to undefined for enum fields
    const bloodGroupValue = data.bloodGroup === '' ? undefined : data.bloodGroup;
    
    const requestPayload = {
      sessionId,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      email: data.email,
      phone: data.phone,
      whatsappPhone: data.whatsappPhone === '' ? undefined : data.whatsappPhone,
      address: data.address,
      maritalStatus: data.maritalStatus,
      occupation: data.occupation === '' ? undefined : data.occupation,
      emergencyContactName: data.emergencyContactName,
      emergencyContactNumber: data.emergencyContactNumber,
      emergencyContactRelation: data.emergencyContactRelation,
      bloodGroup: bloodGroupValue as 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | undefined,
      allergies: data.allergies === '' ? undefined : data.allergies,
      medicalConditions: data.medicalConditions === '' ? undefined : data.medicalConditions,
      medicalHistory: data.medicalHistory === '' ? undefined : data.medicalHistory,
      insuranceProvider: data.insuranceProvider === '' ? undefined : data.insuranceProvider,
      insuranceNumber: data.insuranceNumber === '' ? undefined : data.insuranceNumber,
      privacyConsent: data.privacyConsent,
      serviceConsent: data.serviceConsent,
      medicalConsent: data.medicalConsent,
      ipAddress,
      userAgent,
    };

    // Execute use case (module-level singleton)
    const result = await submitIntakeUseCase.execute(requestPayload);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[SubmitPatientIntake] Error:', error);
    
    if (error instanceof Error) {
      console.error('[SubmitPatientIntake] Error message:', error.message);
      console.error('[SubmitPatientIntake] Error stack:', error.stack);
      
      // Domain exceptions - client errors
      if (
        error.message.includes('expired') ||
        error.message.includes('not found') ||
        error.message.includes('not accepting')
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 },
        );
      }

      // Validation errors
      if (error.message.includes('validation') || error.message.includes('at least')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to submit patient intake',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 },
    );
  }
}
