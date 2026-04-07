'use server';

import { unstable_cache } from 'next/cache';
import { revalidateTag } from 'next/cache';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { SurgicalCaseStatus, AppointmentStatus } from '@prisma/client';

export interface NurseDashboardStats {
  waitingPatients: number;
  wardPrepCases: number;
  inTheatreCases: number;
  inRecovery: number;
}

export interface NurseDashboardData {
  stats: NurseDashboardStats;
  todaysTheatre: {
    id: string;
    status: SurgicalCaseStatus;
    procedureName: string;
    patientName: string;
    theaterName: string;
    startTime: Date;
  }[];
  recentNotifications: {
    id: number;
    subject: string;
    message: string;
    created_at: Date;
  }[];
  timestamp: string;
}

async function fetchDashboardDataInternal(): Promise<NurseDashboardData> {
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const [
    waitingPatientsCount,
    wardPrepCount,
    todaysTheatreCases,
    recoveryCount,
    recentNotifications,
  ] = await Promise.all([
    db.appointment.count({
      where: {
        appointment_date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: [AppointmentStatus.CHECKED_IN, AppointmentStatus.READY_FOR_CONSULTATION],
        },
      },
    }),
    db.surgicalCase.count({
      where: {
        status: {
          in: [
            SurgicalCaseStatus.DRAFT,
            SurgicalCaseStatus.PLANNING,
            SurgicalCaseStatus.READY_FOR_SCHEDULING,
            SurgicalCaseStatus.READY_FOR_THEATER_PREP,
          ],
        },
      },
    }),
    db.surgicalCase.findMany({
      where: {
        status: SurgicalCaseStatus.IN_THEATER,
        theater_booking: {
          start_time: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      },
      include: {
        patient: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
        theater_booking: {
          select: {
            start_time: true,
            theater: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ theater_booking: { start_time: 'asc' } }],
      take: 5,
    }),
    db.surgicalCase.count({
      where: {
        status: SurgicalCaseStatus.RECOVERY,
      },
    }),
    db.notification.findMany({
      where: {
        read_at: null,
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    }),
  ]);

  return {
    stats: {
      waitingPatients: waitingPatientsCount,
      wardPrepCases: wardPrepCount,
      inTheatreCases: todaysTheatreCases.length,
      inRecovery: recoveryCount,
    },
    todaysTheatre: todaysTheatreCases.map((c) => ({
      id: c.id,
      status: c.status,
      procedureName: c.procedure_name || 'Unspecified',
      patientName: c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : 'Unknown',
      theaterName: c.theater_booking?.theater?.name || 'Main OR',
      startTime: c.theater_booking?.start_time || c.updated_at,
    })),
    recentNotifications: recentNotifications.map((n) => ({
      id: n.id,
      subject: n.subject || '',
      message: n.message,
      created_at: n.created_at,
    })),
    timestamp: new Date().toISOString(),
  };
}

export async function getNurseDashboardData(): Promise<NurseDashboardData> {
  const authUser = await getCurrentUser();

  if (!authUser) {
    throw new Error('Unauthorized - no session');
  }

  const cachedFetch = unstable_cache(
    () => fetchDashboardDataInternal(),
    ['nurse-dashboard'],
    {
      revalidate: 30,
      tags: ['nurse-dashboard'],
    }
  );

  return cachedFetch();
}

export async function revalidateNurseDashboard() {
  revalidateTag('nurse-dashboard');
}