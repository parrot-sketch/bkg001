import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const queueEntries = await db.patientQueue.findMany({
      where: {
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
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        added_at: 'asc',
      },
    });

    // Group by doctor
    const groupedByDoctor: Record<string, typeof queueEntries> = {};
    
    for (const entry of queueEntries) {
      const doctorId = entry.doctor_id;
      if (!groupedByDoctor[doctorId]) {
        groupedByDoctor[doctorId] = [];
      }
      groupedByDoctor[doctorId].push(entry);
    }

    const result = Object.entries(groupedByDoctor).map(([doctorId, patients]) => ({
      doctorId,
      doctorName: patients[0]?.doctor.name || 'Unknown',
      patients: patients.map((entry) => ({
        id: entry.id,
        patientId: entry.patient_id,
        patient: {
          id: entry.patient.id,
          firstName: entry.patient.first_name,
          lastName: entry.patient.last_name,
          fileNumber: entry.patient.file_number,
        },
        doctorId: entry.doctor_id,
        doctorName: entry.doctor.name,
        appointmentId: entry.appointment_id,
        status: entry.status as 'WAITING' | 'IN_CONSULTATION',
        addedAt: entry.added_at.toISOString(),
        waitTime: calculateWaitTime(entry.added_at.toISOString()),
        notes: entry.notes,
        isWalkIn: !entry.appointment_id,
      })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Error fetching live queue:', error);
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
