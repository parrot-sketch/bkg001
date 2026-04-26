import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';

/**
 * GET /api/theater-tech/recent-consultations
 *
 * Theater tech view of recent completed consultations across the system.
 * This intentionally does NOT depend on "consultation outcome" fields, so the
 * workflow stays open and non-blocking.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await JwtMiddleware.authenticate(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    if (auth.user.role !== Role.THEATER_TECHNICIAN && auth.user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const recent = searchParams.get('recent') === '1';

    // Privacy & performance: do not return a global "recent consultations" list unless explicitly requested.
    // - Listing pages should require an explicit search query.
    // - Dashboards can request a tiny "recent" snippet via `?recent=1`.
    if (!recent && q.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const consultations = await db.consultation.findMany({
      where: {
        completed_at: { not: null },
        surgical_case: null,
        ...(q
          ? {
              appointment: {
                patient: {
                  OR: [
                    { first_name: { contains: q, mode: 'insensitive' } },
                    { last_name: { contains: q, mode: 'insensitive' } },
                    { file_number: { contains: q, mode: 'insensitive' } },
                  ],
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        appointment_id: true,
        completed_at: true,
        updated_at: true,
        appointment: {
          select: {
            id: true,
            appointment_date: true,
            time: true,
            patient: { select: { id: true, first_name: true, last_name: true, file_number: true } },
            doctor: { select: { id: true, name: true } },
            case_plan: {
              select: {
                id: true,
                readiness_status: true,
                ready_for_surgery: true,
                updated_at: true,
                surgical_case_id: true,
              },
            },
          },
        },
      },
      orderBy: { updated_at: 'desc' },
      take: recent ? 5 : 50,
    });

    return NextResponse.json({
      success: true,
      data: consultations.map((c) => ({
        consultationId: c.id,
        appointmentId: c.appointment_id,
        completedAt: c.completed_at ? c.completed_at.toISOString() : null,
        updatedAt: c.updated_at.toISOString(),
        patient: c.appointment.patient,
        doctor: c.appointment.doctor,
        casePlan: c.appointment.case_plan
          ? {
              id: c.appointment.case_plan.id,
              readinessStatus: c.appointment.case_plan.readiness_status,
              readyForSurgery: c.appointment.case_plan.ready_for_surgery,
              updatedAt: c.appointment.case_plan.updated_at.toISOString(),
            }
          : null,
      })),
    });
  } catch (error) {
    console.error('[API] GET theater-tech recent consultations error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load consultations' }, { status: 500 });
  }
}
