import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { ConsentSigningService } from '@/application/services/ConsentSigningService';
import { handleApiSuccess, handleApiError } from '@/app/api/_utils/handleApiError';
import { z } from 'zod';

const consentSigningService = new ConsentSigningService(db);

/**
 * POST /api/public/consent/sign/[qrCode]/verify
 * 
 * Public endpoint to verify patient identity (name + DOB).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ qrCode: string }> }
): Promise<NextResponse> {
  try {
    const { qrCode } = await params;
    const body = await request.json();

    const schema = z.object({
      patientName: z.string().min(1, 'Patient name is required'),
      dateOfBirth: z.string().min(1, 'Date of birth is required'),
    });

    const validation = schema.safeParse(body);
    if (!validation.success) {
      return handleApiError(validation.error);
    }

    const { patientName, dateOfBirth } = validation.data;

    const result = await consentSigningService.verifyIdentity(
      qrCode,
      patientName,
      new Date(dateOfBirth)
    );

    return handleApiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
