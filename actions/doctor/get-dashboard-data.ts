'use server';

import { unstable_cache } from 'next/cache';
import { revalidateTag } from 'next/cache';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';

export interface DoctorDashboardData {
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    title: string | null;
    specialization: string;
    email: string;
    phone: string;
    profileImage: string | null;
    availabilityStatus: string | null;
  } | null;
  appointments: {
    id: number;
    patientId: string;
    patientName: string;
    patientFileNumber: string;
    appointmentDate: string;
    time: string;
    type: string;
    status: string;
  }[];
  surgicalCases: {
    id: string;
    status: string;
    urgency: string;
    diagnosis: string | null;
    procedureName: string | null;
    side: string | null;
    createdAt: Date;
    updatedAt: Date;
    patient: {
      id: string;
      firstName: string;
      lastName: string;
      fileNumber: string;
    } | null;
    casePlan: {
      id: number;
      readinessStatus: string;
      readyForSurgery: boolean;
    } | null;
    theaterBooking: {
      id: string;
      startTime: Date;
      endTime: Date;
      status: string;
      theaterName: string | null;
    } | null;
  }[];
  queue: {
    id: number;
    patientId: string;
    patientName: string;
    patientFileNumber: string;
    appointmentId: number | null;
    type: string;
    status: string;
    addedAt: string;
    waitTime: string;
    isWalkIn: boolean;
  }[];
  notifications: {
    id: string;
    subject: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: Date;
  }[];
  stats: {
    queueLength: number;
    completedConsultationsToday: number;
    activeSurgicalCases: number;
    recoveryCases: number;
  };
}

import { getCurrentUser } from '@/lib/auth/server-auth';

async function getAuthenticatedDoctor() {
  const authUser = await getCurrentUser();
  
  if (!authUser) {
    throw new Error('Unauthorized - no session');
  }
  
  const doctor = await db.doctor.findUnique({
    where: { user_id: authUser.userId }
  });
  
  if (!doctor) {
    throw new Error('Doctor profile not found');
  }
  
  return doctor;
}

async function fetchDashboardDataInternal(doctor: any): Promise<DoctorDashboardData> {
  const doctorId = doctor.id;
  const userId = doctor.user_id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const [appointments, surgicalCases, queue, notifications] = await Promise.all([
    db.appointment.findMany({
      where: {
        doctor_id: doctorId,
        appointment_date: {
          gte: today,
          lt: tomorrow,
        },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'READY_FOR_CONSULTATION', 'IN_CONSULTATION', 'COMPLETED'] },
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
      },
      orderBy: { appointment_date: 'asc' },
    }),
    db.surgicalCase.findMany({
      where: {
        primary_surgeon_id: doctorId,
        status: { notIn: ['DRAFT', 'CANCELLED'] },
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
        case_plan: {
          select: {
            id: true,
            readiness_status: true,
            ready_for_surgery: true,
          },
        },
        theater_booking: {
          include: {
            theater: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { updated_at: 'desc' },
      take: 100,
    }),
    db.patientQueue.findMany({
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
            type: true,
          },
        },
      },
      orderBy: { added_at: 'asc' },
    }),
    db.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 20,
    }),
  ]);
  
  const completedToday = appointments.filter(a => a.status === 'COMPLETED').length;
  const activeCases = surgicalCases.filter(s => s.status !== 'COMPLETED' && s.status !== 'CANCELLED' && s.status !== 'DRAFT').length;
  const recoveryCases = surgicalCases.filter(s => s.status === 'RECOVERY').length;
  
  return {
    doctor: {
      id: doctor.id,
      firstName: doctor.first_name,
      lastName: doctor.last_name,
      name: doctor.name,
      title: doctor.title,
      specialization: doctor.specialization,
      email: doctor.email,
      phone: doctor.phone,
      profileImage: doctor.profile_image,
      availabilityStatus: doctor.availability_status,
    },
    appointments: appointments.map(a => ({
      id: a.id,
      patientId: a.patient_id,
      patientName: `${a.patient.first_name} ${a.patient.last_name}`,
      patientFileNumber: a.patient.file_number,
      appointmentDate: a.appointment_date.toISOString(),
      time: a.time || '',
      type: a.type,
      status: a.status,
    })),
    surgicalCases: surgicalCases.map(sc => ({
      id: sc.id,
      status: sc.status,
      urgency: sc.urgency,
      diagnosis: sc.diagnosis,
      procedureName: sc.procedure_name,
      side: sc.side,
      createdAt: sc.created_at,
      updatedAt: sc.updated_at,
      patient: sc.patient ? {
        id: sc.patient.id,
        firstName: sc.patient.first_name,
        lastName: sc.patient.last_name,
        fileNumber: sc.patient.file_number,
      } : null,
      casePlan: sc.case_plan ? {
        id: sc.case_plan.id,
        readinessStatus: sc.case_plan.readiness_status,
        readyForSurgery: sc.case_plan.ready_for_surgery,
      } : null,
      theaterBooking: sc.theater_booking ? {
        id: sc.theater_booking.id,
        startTime: sc.theater_booking.start_time,
        endTime: sc.theater_booking.end_time,
        status: sc.theater_booking.status,
        theaterName: sc.theater_booking.theater?.name || null,
      } : null,
    })),
    queue: queue.map(q => {
      const now = new Date();
      const added = new Date(q.added_at);
      const diffMs = now.getTime() - added.getTime();
      const minutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(minutes / 60);
      const waitTime = hours > 0 ? `${hours}h ${minutes % 60}m` : minutes > 0 ? `${minutes}m` : 'Just now';
      
      return {
        id: q.id,
        patientId: q.patient_id,
        patientName: `${q.patient.first_name} ${q.patient.last_name}`,
        patientFileNumber: q.patient.file_number,
        appointmentId: q.appointment_id,
        type: q.appointment?.type || 'Walk-in',
        status: q.status,
        addedAt: q.added_at.toISOString(),
        waitTime,
        isWalkIn: !q.appointment_id,
      };
    }),
    notifications: notifications.map(n => ({
      id: String(n.id),
      subject: n.subject || '',
      message: n.message || '',
      type: n.type,
      isRead: !!n.read_at,
      createdAt: n.created_at,
    })),
    stats: {
      queueLength: queue.length,
      completedConsultationsToday: completedToday,
      activeSurgicalCases: activeCases,
      recoveryCases: recoveryCases,
    },
  };
}

/**
 * Per-doctor cached dashboard data.
 *
 * We wrap `fetchDashboardDataInternal` so the cache key includes the
 * doctor's ID, preventing different doctors from sharing a single cache
 * entry (the previous bug).  The tag `doctor-dashboard-{doctorId}` lets us
 * surgically invalidate just this doctor's cache when their queue changes.
 */
export async function getDoctorDashboardData(): Promise<DoctorDashboardData> {
  // Resolve the doctor first (outside the cache) so we have their ID.
  const doctor = await getAuthenticatedDoctor();
  const doctorId = doctor.id;

  // Build a per-doctor cached fetcher on the fly.
  const cachedFetch = unstable_cache(
    () => fetchDashboardDataInternal(doctor),
    [`doctor-dashboard-${doctorId}`],
    {
      revalidate: 30,
      tags: [`doctor-dashboard-${doctorId}`],
    }
  );

  return cachedFetch();
}

export async function revalidateDoctorDashboard(doctorId: string) {
  revalidateTag(`doctor-dashboard-${doctorId}`, 'max');
}