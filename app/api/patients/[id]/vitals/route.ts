/**
 * API Route: GET /api/patients/:id/vitals
 *
 * Returns vital signs for a patient, optionally filtered by appointment.
 * Used by the consultation session page to display vitals during consultation,
 * and by the nurse patient page for vitals history.
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/jwt-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: patientId } = await params;
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId');

    const where: any = { patient_id: patientId };
    if (appointmentId) {
      where.appointment_id = parseInt(appointmentId, 10);
    }

    const vitals = await db.vitalSign.findMany({
      where,
      orderBy: { recorded_at: 'desc' },
      take: appointmentId ? 1 : 50,
      include: {
        appointment: {
          select: { id: true, appointment_date: true, time: true, type: true },
        },
      },
    });

    // Resolve recorded_by user names
    const recordedByIds = [...new Set(vitals.map(v => v.recorded_by).filter(Boolean))];
    const users = recordedByIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: recordedByIds } },
          select: { id: true, first_name: true, last_name: true },
        })
      : [];
    const userMap = new Map(users.map(u => [u.id, `${u.first_name || ''} ${u.last_name || ''}`.trim()]));

    const data = vitals.map(v => ({
      id: v.id,
      bodyTemperature: v.body_temperature,
      systolic: v.systolic,
      diastolic: v.diastolic,
      heartRate: v.heart_rate,
      respiratoryRate: v.respiratory_rate,
      oxygenSaturation: v.oxygen_saturation,
      weight: v.weight,
      height: v.height,
      recordedAt: v.recorded_at.toISOString(),
      recordedBy: v.recorded_by ? userMap.get(v.recorded_by) || null : null,
      appointmentId: v.appointment_id,
      appointment: v.appointment
        ? { id: v.appointment.id, date: v.appointment.appointment_date.toISOString(), time: v.appointment.time, type: v.appointment.type }
        : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[API] GET /api/patients/[id]/vitals:', error);
    const message = error instanceof Error ? error.message : 'Failed to load vitals';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
