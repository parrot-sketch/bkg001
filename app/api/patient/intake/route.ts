import { NextRequest, NextResponse } from 'next/server';
import { PatientIntakeFormSchema } from '@/lib/schema';
import { container } from '@/lib/container';
import { IntakeError } from '@/domain/errors/IntakeErrors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, ...formData } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    // Clean empty strings for optional fields
    const rawData = Object.fromEntries(
      Object.entries(formData)
        .map(([key, value]) => [key, value === '' ? undefined : value])
        .filter(([, value]) => value !== undefined),
    );

    // Validate with Zod
    const validationResult = PatientIntakeFormSchema.safeParse(rawData);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.flatten(), code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    // Get client IP for audit
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    const data = validationResult.data;

    const result = await container.submitIntake.execute({
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
      bloodGroup: (data.bloodGroup === '' ? undefined : data.bloodGroup) as any,
      allergies: data.allergies === '' ? undefined : data.allergies,
      medicalConditions: data.medicalConditions === '' ? undefined : data.medicalConditions,
      privacyConsent: data.privacyConsent,
      serviceConsent: data.serviceConsent,
      medicalConsent: data.medicalConsent,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof IntakeError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('[SubmitPatientIntake]', error);
    return NextResponse.json(
      { error: 'Failed to submit patient intake', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
