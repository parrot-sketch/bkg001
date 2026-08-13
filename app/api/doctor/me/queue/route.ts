import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { Role } from '@/domain/enums/Role';

export async function GET(request: NextRequest) {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (authResult.user.role !== Role.DOCTOR) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Only doctors can access this endpoint' },
        { status: 403 }
      );
    }

    const doctor = await db.doctor.findUnique({
      where: { user_id: authResult.user.userId },
      select: { id: true },
    });

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor profile not found' },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const where: any = {
      doctor_id: doctor.id,
      status: { in: ['WAITING', 'IN_CONSULTATION'] },
    };

    if (startDate || endDate) {
      where.added_at = {};
      if (startDate) {
        where.added_at.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.added_at.lte = end;
      }
    }

    const queueEntries = await db.patientQueue.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            file_number: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointment_date: true,
            time: true,
            type: true,
          },
        },
      },
      orderBy: {
        added_at: 'asc',
      },
    });

    const result = queueEntries.map((entry) => ({
      id: entry.id,
      patientId: entry.patient_id,
      patient: {
        id: entry.patient.id,
        firstName: entry.patient.first_name,
        lastName: entry.patient.last_name,
        fileNumber: entry.patient.file_number,
      },
      appointmentId: entry.appointment_id,
      appointmentDate: entry.appointment?.appointment_date?.toISOString() || null,
      time: entry.appointment?.time || null,
      type: entry.appointment?.type || 'Walk-in',
      status: entry.status,
      addedAt: entry.added_at.toISOString(),
      waitTime: calculateWaitTime(entry.added_at.toISOString()),
      notes: entry.notes,
      isWalkIn: !entry.appointment_id,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Error fetching doctor queue:', error);
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
  }
}

function calculateWaitTime(startTime: string): string {
  if (!startTime) return 'Just now';
  
  const now = new Date();
  const start = new Date(startTime);
  const diffMs = now.getTime() - start.getTime();
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return 'Just now';
}
