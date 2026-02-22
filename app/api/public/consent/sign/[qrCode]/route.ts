import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { ConsentSigningService } from '@/application/services/ConsentSigningService';
import { handleApiSuccess, handleApiError } from '@/app/api/_utils/handleApiError';
import { z } from 'zod';

const consentSigningService = new ConsentSigningService(db);

/**
 * GET /api/public/consent/sign/[qrCode]
 * 
 * Public endpoint (no authentication) to get consent form by QR code.
 * Used by the signing page to display consent content.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qrCode: string }> }
): Promise<NextResponse> {
  try {
    const { qrCode } = await params;

    const result = await consentSigningService.getConsentByQrCode(qrCode);

    return handleApiSuccess({
      consentForm: {
        id: result.consentForm.id,
        title: result.consentForm.title,
        type: result.consentForm.type,
        content: result.consentForm.content_snapshot,
        version: result.consentForm.version,
      },
      session: {
        id: result.session.id,
        status: result.session.status,
        requiresStaffVerify: result.session.requires_staff_verify,
        verifiedByStaff: !!result.session.verified_by_staff_id,
        expiresAt: result.session.expires_at.toISOString(),
      },
      patientName: result.patientName,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/public/consent/sign/[qrCode]
 * 
 * Public endpoint (no authentication) to submit consent signature.
 * Requires identity verification and OTP validation (if applicable).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ qrCode: string }> }
): Promise<NextResponse> {
  try {
    const { qrCode } = await params;
    const body = await request.json();

    // Validate request body
    const schema = z.object({
      patientSignature: z.string().min(1, 'Patient signature is required'),
      patientName: z.string().optional(),
      dateOfBirth: z.string().optional(),
      otp: z.string().optional(),
    });

    const validation = schema.safeParse(body);
    if (!validation.success) {
      return handleApiError(validation.error);
    }

    const { patientSignature, patientName, dateOfBirth, otp } = validation.data;

    // Get IP address and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // If name and DOB provided, verify identity first
    if (patientName && dateOfBirth) {
      await consentSigningService.verifyIdentity(qrCode, patientName, new Date(dateOfBirth));
    }

    // If OTP provided, validate it
    if (otp) {
      const isValid = await consentSigningService.validateOTP(qrCode, otp);
      if (!isValid) {
        return handleApiError(new Error('Invalid OTP code'));
      }
    }

    // Submit signature
    const result = await consentSigningService.submitSignature(
      qrCode,
      patientSignature,
      ipAddress,
      userAgent
    );

    return handleApiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
