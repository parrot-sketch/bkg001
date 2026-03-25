'use server';

import { unstable_cache } from 'next/cache';
import { revalidateTag } from 'next/cache';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server-auth';

export interface FrontdeskDashboardStats {
  expectedPatients: number;
  checkedInPatients: number;
  pendingCheckIns: number;
  inConsultation: number;
  completedToday: number;
  pendingIntakeCount: number;
}

export interface FrontdeskAppointment {
  id: number;
  patientId: string;
  patientName: string;
  patientFileNumber: string | null;
  patientPhone: string | null;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  time: string;
  type: string;
  status: string;
}

export interface FrontdeskCheckedInPatient {
  id: number;
  patientId: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    fileNumber: string;
    phone: string;
  };
  appointmentDate: string;
  time: string | null;
  type: string;
  checkedInAt: string;
  waitTime: string;
  isWalkIn: boolean;
}

export interface FrontdeskQueueEntry {
  id: number;
  patientId: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    fileNumber: string;
  };
  doctorId: string;
  doctorName: string;
  appointmentId: number | null;
  status: 'WAITING' | 'IN_CONSULTATION';
  addedAt: string;
  waitTime: string;
  notes: string | null;
  isWalkIn: boolean;
}

export interface FrontdeskDashboardData {
  stats: FrontdeskDashboardStats;
  todaysSchedule: {
    scheduled: FrontdeskAppointment[];
    checkedIn: FrontdeskAppointment[];
    inConsultation: FrontdeskAppointment[];
    completed: FrontdeskAppointment[];
  };
  queue: {
    checkedInAwaitingAssignment: FrontdeskCheckedInPatient[];
    liveQueue: FrontdeskQueueEntry[];
  };
  timestamp: string;
}

function calculateWaitTime(addedAt: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - addedAt.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return 'Just now';
}

async function fetchDashboardDataInternal(): Promise<FrontdeskDashboardData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    statsByStatus,
    appointments,
    pendingIntakes,
    checkedInAwaiting,
    liveQueue,
  ] = await Promise.all([
    db.appointment.groupBy({
      by: ['status'],
      where: {
        appointment_date: {
          gte: today,
          lt: tomorrow,
        },
      },
      _count: {
        status: true,
      },
    }),
    db.appointment.findMany({
      where: {
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
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { appointment_date: 'asc' },
    }),
    db.intakeSubmission.count({
      where: { status: 'PENDING' },
    }),
    db.appointment.findMany({
      where: {
        appointment_date: {
          gte: today,
          lt: tomorrow,
        },
        status: 'CHECKED_IN',
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
    }),
    db.patientQueue.findMany({
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
        appointment: {
          select: {
            id: true,
            type: true,
          },
        },
      },
      orderBy: { added_at: 'asc' },
    }),
  ]);

  const mappedAppointments: FrontdeskAppointment[] = appointments.map(a => ({
    id: a.id,
    patientId: a.patient_id,
    patientName: `${a.patient.first_name} ${a.patient.last_name}`,
    patientFileNumber: a.patient.file_number,
    patientPhone: a.patient.phone,
    doctorId: a.doctor_id,
    doctorName: a.doctor.name,
    appointmentDate: a.appointment_date.toISOString(),
    time: a.time || '',
    type: a.type,
    status: a.status,
  }));

  const scheduled = mappedAppointments.filter(
    a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED'
  );
  const checkedIn = mappedAppointments.filter(
    a => a.status === 'CHECKED_IN' || a.status === 'READY_FOR_CONSULTATION'
  );
  const inConsultation = mappedAppointments.filter(
    a => a.status === 'IN_CONSULTATION'
  );
  const completed = mappedAppointments.filter(a => a.status === 'COMPLETED');

  const checkedInAwaitingMapped: FrontdeskCheckedInPatient[] = checkedInAwaiting.map(a => ({
    id: a.id,
    patientId: a.patient_id,
    patient: {
      id: a.patient.id,
      firstName: a.patient.first_name,
      lastName: a.patient.last_name,
      fileNumber: a.patient.file_number || '',
      phone: a.patient.phone || '',
    },
    appointmentDate: a.appointment_date.toISOString(),
    time: a.time,
    type: a.type,
    checkedInAt: a.checked_in_at?.toISOString() || a.updated_at.toISOString(),
    waitTime: calculateWaitTime(a.checked_in_at || a.updated_at),
    isWalkIn: false,
  }));

  const queueMap = new Map<string, FrontdeskQueueEntry[]>();
  
  liveQueue.forEach(q => {
    const doctorId = q.doctor_id;
    if (!queueMap.has(doctorId)) {
      queueMap.set(doctorId, []);
    }
    queueMap.get(doctorId)!.push({
      id: q.id,
      patientId: q.patient_id,
      patient: {
        id: q.patient.id,
        firstName: q.patient.first_name,
        lastName: q.patient.last_name,
        fileNumber: q.patient.file_number || '',
      },
      doctorId: q.doctor_id,
      doctorName: q.doctor.name,
      appointmentId: q.appointment_id,
      status: q.status as 'WAITING' | 'IN_CONSULTATION',
      addedAt: q.added_at.toISOString(),
      waitTime: calculateWaitTime(q.added_at),
      notes: q.notes,
      isWalkIn: !q.appointment_id,
    });
  });

  const statsMap = Object.fromEntries(
    statsByStatus.map(s => [s.status, s._count.status])
  );

  const stats: FrontdeskDashboardStats = {
    expectedPatients: appointments.length,
    checkedInPatients: (statsMap['CHECKED_IN'] || 0) + (statsMap['READY_FOR_CONSULTATION'] || 0),
    pendingCheckIns: (statsMap['SCHEDULED'] || 0) + (statsMap['CONFIRMED'] || 0),
    inConsultation: statsMap['IN_CONSULTATION'] || 0,
    completedToday: statsMap['COMPLETED'] || 0,
    pendingIntakeCount: pendingIntakes,
  };

  return {
    stats,
    todaysSchedule: {
      scheduled,
      checkedIn,
      inConsultation,
      completed,
    },
    queue: {
      checkedInAwaitingAssignment: checkedInAwaitingMapped,
      liveQueue: liveQueue.map(q => ({
        id: q.id,
        patientId: q.patient_id,
        patient: {
          id: q.patient.id,
          firstName: q.patient.first_name,
          lastName: q.patient.last_name,
          fileNumber: q.patient.file_number || '',
        },
        doctorId: q.doctor_id,
        doctorName: q.doctor.name,
        appointmentId: q.appointment_id,
        status: q.status as 'WAITING' | 'IN_CONSULTATION',
        addedAt: q.added_at.toISOString(),
        waitTime: calculateWaitTime(q.added_at),
        notes: q.notes,
        isWalkIn: !q.appointment_id,
      })),
    },
    timestamp: new Date().toISOString(),
  };
}

export async function getFrontdeskDashboardData(): Promise<FrontdeskDashboardData> {
  const authUser = await getCurrentUser();
  
  if (!authUser) {
    throw new Error('Unauthorized - no session');
  }

  const cachedFetch = unstable_cache(
    () => fetchDashboardDataInternal(),
    ['frontdesk-dashboard'],
    {
      revalidate: 30,
      tags: ['frontdesk-dashboard'],
    }
  );

  return cachedFetch();
}

export async function revalidateFrontdeskDashboard() {
  revalidateTag('frontdesk-dashboard', 'frontdesk-dashboard');
}