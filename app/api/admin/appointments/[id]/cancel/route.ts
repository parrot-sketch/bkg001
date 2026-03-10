import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';

/**
 * PUT /api/admin/appointments/[id]/cancel
 * Admin cancels an appointment
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const appointmentId = parseInt(id, 10);
    if (isNaN(appointmentId)) {
      return NextResponse.json({ success: false, error: 'Invalid appointment ID' }, { status: 400 });
    }

    const appointment = await db.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) {
      return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
    }

    if (appointment.status === 'CANCELLED') {
      return NextResponse.json({ success: false, error: 'Appointment is already cancelled' }, { status: 409 });
    }

    if (appointment.status === 'COMPLETED') {
      return NextResponse.json({ success: false, error: 'Cannot cancel a completed appointment' }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = body?.reason || 'Cancelled by administrator';

    const updated = await db.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED', note: reason },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        user_id: authResult.user.userId,
        record_id: String(appointmentId),
        action: 'UPDATE',
        model: 'Appointment',
        details: `Appointment #${appointmentId} cancelled by admin. Reason: ${reason}`,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      },
    }).catch(() => {}); // Non-critical

    return NextResponse.json({ success: true, data: { id: updated.id, status: updated.status } });
  } catch (error) {
    console.error('[API] PUT /api/admin/appointments/[id]/cancel', error);
    return NextResponse.json({ success: false, error: 'Failed to cancel appointment' }, { status: 500 });
  }
}
