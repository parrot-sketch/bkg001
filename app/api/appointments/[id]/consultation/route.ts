import { NextRequest, NextResponse } from 'next/server';
import { GET as getConsultationByAppointment } from '@/app/api/consultations/[id]/route';

/**
 * GET /api/appointments/:id/consultation
 *
 * Canonical appointment-scoped consultation endpoint.
 * Internally delegates to existing consultation-by-appointment handler.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  return getConsultationByAppointment(request, {
    params: Promise.resolve({ id }),
  });
}
