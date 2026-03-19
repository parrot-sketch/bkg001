import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: doctorId } = await params;

    const queueEntries = await db.patientQueue.findMany({
      where: {
        doctor_id: doctorId,
        status: { in: ['WAITING', 'IN_CONSULTATION'] },
      },
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
