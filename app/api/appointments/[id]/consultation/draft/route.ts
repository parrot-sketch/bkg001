import { NextRequest, NextResponse } from 'next/server';
import { PUT as saveConsultationDraftByAppointment } from '@/app/api/consultations/[id]/draft/route';

/**
 * PUT /api/appointments/:id/consultation/draft
 *
 * Canonical appointment-scoped consultation draft endpoint.
 * Internally delegates to existing draft handler.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  return saveConsultationDraftByAppointment(request, {
    params: Promise.resolve({ id }),
  });
}
