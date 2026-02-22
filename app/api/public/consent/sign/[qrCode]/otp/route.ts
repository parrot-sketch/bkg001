import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { ConsentSigningService } from '@/application/services/ConsentSigningService';
import { handleApiSuccess, handleApiError } from '@/app/api/_utils/handleApiError';

const consentSigningService = new ConsentSigningService(db);

/**
 * POST /api/public/consent/sign/[qrCode]/otp
 * 
 * Public endpoint to request OTP code (sends SMS to patient's phone).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ qrCode: string }> }
): Promise<NextResponse> {
  try {
    const { qrCode } = await params;

    await consentSigningService.sendOTP(qrCode);

    return handleApiSuccess({ message: 'OTP sent successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/public/consent/sign/[qrCode]/otp/validate
 * 
 * Public endpoint to validate OTP code.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ qrCode: string }> }
): Promise<NextResponse> {
  try {
    const { qrCode } = await params;
    const body = await request.json();

    if (!body.otp || typeof body.otp !== 'string') {
      return handleApiError(new Error('OTP code is required'));
    }

    const isValid = await consentSigningService.validateOTP(qrCode, body.otp);

    if (!isValid) {
      return handleApiError(new Error('Invalid OTP code'));
    }

    return handleApiSuccess({ valid: true });
  } catch (error) {
    return handleApiError(error);
  }
}
