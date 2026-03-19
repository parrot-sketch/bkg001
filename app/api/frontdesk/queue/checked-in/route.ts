import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get checked-in appointments that don't have active queue entries
    const checkedInAppointments = await db.appointment.findMany({
      where: {
        status: 'CHECKED_IN',
        appointment_date: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            file_number: true,
            phone: true,
          },
        },
      },
      orderBy: {
        checked_in_at: 'asc',
      },
    });

    // Get appointments with active queue entries
    const appointmentsWithQueue = await db.patientQueue.findMany({
      where: {
        status: { in: ['WAITING', 'IN_CONSULTATION'] },
        appointment_id: { not: null },
      },
      select: {
        appointment_id: true,
      },
    });

    const queuedAppointmentIds = new Set(
      appointmentsWithQueue
        .filter((q) => q.appointment_id !== null)
        .map((q) => q.appointment_id!)
    );

    const result = checkedInAppointments
      .filter((apt) => !queuedAppointmentIds.has(apt.id))
      .map((apt) => ({
        id: apt.id,
        patientId: apt.patient_id,
        patient: {
          id: apt.patient.id,
          firstName: apt.patient.first_name,
          lastName: apt.patient.last_name,
          fileNumber: apt.patient.file_number,
          phone: apt.patient.phone,
        },
        appointmentDate: apt.appointment_date.toISOString(),
        time: apt.time,
        type: apt.type,
        checkedInAt: apt.checked_in_at?.toISOString() || apt.updated_at.toISOString(),
        waitTime: calculateWaitTime(apt.checked_in_at?.toISOString() || apt.updated_at.toISOString()),
        isWalkIn: false,
      }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Error fetching checked-in patients:', error);
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
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
