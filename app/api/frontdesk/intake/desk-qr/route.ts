import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import QRCode from 'qrcode';

/**
 * GET /api/frontdesk/intake/desk-qr
 *
 * Returns a non-expiring QR code that points to `/intake` (no sessionId).
 * Patients scanning it will be issued a fresh session on-device.
 *
 * Protected: FRONTDESK / ADMIN.
 */
export async function GET(request: NextRequest) {
  await requireAuth(request, ['FRONTDESK', 'ADMIN']);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const intakeFormUrl = `${baseUrl.replace(/\/$/, '')}/intake`;

  const qrCodeUrl = await QRCode.toDataURL(intakeFormUrl, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 300,
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  return NextResponse.json(
    { qrCodeUrl, intakeFormUrl },
    { status: 200 },
  );
}

