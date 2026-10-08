import { NextRequest, NextResponse, after } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { notifyFrontdeskOfIntake } from '@/lib/notifications/intakeNotifications';
import { isMinor } from '@/lib/utils/age';
import { PLACEHOLDER_ADDRESS } from '@/lib/utils/patientContact';
import { PublicIntakeSubmissionSchema } from '@/lib/schema';
import { container } from '@/lib/container';
import { IntakeError } from '@/domain/errors/IntakeErrors';
import { DomainException } from '@/domain/exceptions/DomainException';
import { getClientIp, guardIntakeRequest, isValidSessionId } from '@/lib/middleware/intake-security';

const MAX_BODY_BYTES = 32 * 1024;

const DUPLICATE_MESSAGE =
  "It looks like you're already registered with us. Please let the receptionist know and they'll find your file.";

export async function POST(request: NextRequest) {
  const blocked = guardIntakeRequest(request, 'submit');
  if (blocked) return blocked;

  try {
    if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request too large', code: 'PAYLOAD_TOO_LARGE' }, { status: 413 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const { sessionId, ...formData } = body as Record<string, unknown>;

    if (!isValidSessionId(sessionId)) {
      return NextResponse.json(
        { error: 'This link is not valid. Please scan the QR code again.', code: 'SESSION_NOT_FOUND' },
        { status: 400 },
      );
    }

    const rawData = Object.fromEntries(
      Object.entries(formData).filter(([, value]) => value !== '' && value !== null && value !== undefined),
    );

    const validationResult = PublicIntakeSubmissionSchema.safeParse(rawData);

    if (!validationResult.success) {
      const { fieldErrors } = validationResult.error.flatten();
      const firstMessage = Object.values(fieldErrors).flat()[0];
      return NextResponse.json(
        {
          error: firstMessage ?? 'Please check your details and try again.',
          fieldErrors,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 },
      );
    }

    const data = validationResult.data;

    // The Patient table requires a unique email and a phone. Minors may have
    // neither, so the guardian's number is used and a unique placeholder email
    // is generated (frontdesk can replace it later).
    const email = data.email || `intake-${uuidv4()}@placeholder.local`;
    const phone = data.phone || data.emergencyContactNumber || '+254000000000';

    const result = await container.submitIntake.execute({
      sessionId,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      email,
      phone,
      whatsappPhone: data.whatsappPhone || undefined,
      // The patient record requires an address; minors may leave it blank.
      address: data.address || PLACEHOLDER_ADDRESS,
      occupation: data.occupation || undefined,
      referralSource: data.referralSource || undefined,
      emergencyContactName: data.emergencyContactName || undefined,
      emergencyContactNumber: data.emergencyContactNumber || undefined,
      emergencyContactRelation: data.emergencyContactRelation || undefined,
      bloodGroup: data.bloodGroup || undefined,
      allergies: data.allergies || undefined,
      medicalConditions: data.medicalConditions || undefined,
      privacyConsent: data.privacyConsent,
      serviceConsent: data.serviceConsent,
      medicalConsent: data.medicalConsent,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent')?.slice(0, 500) || undefined,
    });

    after(() =>
      notifyFrontdeskOfIntake({
        patientId: result.patientId,
        fileNumber: result.fileNumber,
        firstName: result.firstName,
        lastName: result.lastName,
        isMinor: isMinor(data.dateOfBirth),
      }),
    );

    // Only return what the success screen needs; never echo back stored PII.
    return NextResponse.json(
      { fileNumber: result.fileNumber, firstName: result.firstName },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof IntakeError) {
      if (error.code === 'DUPLICATE_PATIENT') {
        return NextResponse.json({ error: DUPLICATE_MESSAGE, code: error.code }, { status: 409 });
      }
      const publicMessages: Record<string, string> = {
        SESSION_NOT_FOUND: 'This link is not valid. Please scan the QR code again.',
        SESSION_EXPIRED: 'This form has expired. Your answers are saved on this phone, so tap "Start again" to continue.',
        SESSION_ALREADY_SUBMITTED: 'This form has already been submitted.',
      };
      return NextResponse.json(
        { error: publicMessages[error.code] ?? 'Something went wrong. Please try again.', code: error.code },
        { status: error.statusCode },
      );
    }
    if (error instanceof DomainException) {
      return NextResponse.json({ error: error.message, code: 'VALIDATION_ERROR' }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ error: DUPLICATE_MESSAGE, code: 'DUPLICATE_PATIENT' }, { status: 409 });
    }
    console.error('[SubmitPatientIntake]', error);
    return NextResponse.json(
      { error: 'Something went wrong while saving your details. Please try again.', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
