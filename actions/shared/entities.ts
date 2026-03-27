'use server';

import { unstable_cache } from 'next/cache';
import { revalidateTag } from 'next/cache';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { SurgicalCaseStatus } from '@prisma/client';

export interface SharedPatient {
  id: string;
  firstName: string;
  lastName: string;
  fileNumber: string;
  dateOfBirth: Date;
  gender: string;
  phone: string;
  email: string;
}

export interface SharedPatientFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface SharedPatientsResponse {
  patients: SharedPatient[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SharedAppointment {
  id: number;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: Date;
  time: string;
  type: string;
  status: string;
}

export interface SharedAppointmentFilters {
  date?: string;
  doctorId?: string;
  status?: string;
  patientId?: string;
}

export interface SharedSurgicalCase {
  id: string;
  status: string;
  urgency: string;
  procedureName: string;
  patientId: string;
  patientName: string;
  patientFileNumber: string;
  surgeonId: string;
  surgeonName: string;
  createdAt: Date;
}

export interface SharedSurgicalCaseFilters {
  status?: SurgicalCaseStatus;
  surgeonId?: string;
  page?: number;
  limit?: number;
}

export interface SharedSurgicalCasesResponse {
  cases: SharedSurgicalCase[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function fetchPatientsInternal(filters: SharedPatientFilters): Promise<SharedPatientsResponse> {
  const { page = 1, limit = 12, search } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};
  
  if (search) {
    where.OR = [
      { first_name: { contains: search, mode: 'insensitive' } },
      { last_name: { contains: search, mode: 'insensitive' } },
      { file_number: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [patients, total] = await Promise.all([
    db.patient.findMany({
      where,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        file_number: true,
        date_of_birth: true,
        gender: true,
        phone: true,
        email: true,
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    db.patient.count({ where }),
  ]);

  return {
    patients: patients.map(p => ({
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      fileNumber: p.file_number || '',
      dateOfBirth: p.date_of_birth,
      gender: p.gender || 'UNKNOWN',
      phone: p.phone || '',
      email: p.email || '',
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function fetchAppointmentsInternal(filters: SharedAppointmentFilters): Promise<SharedAppointment[]> {
  const { date, doctorId, status, patientId } = filters;
  
  const where: any = {};

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    where.appointment_date = { gte: startOfDay, lt: endOfDay };
  }

  if (doctorId) {
    where.doctor_id = doctorId;
  }

  if (status) {
    where.status = status;
  }

  if (patientId) {
    where.patient_id = patientId;
  }

  const appointments = await db.appointment.findMany({
    where,
    include: {
      patient: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
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
  });

  return appointments.map(a => ({
    id: a.id,
    patientId: a.patient_id,
    patientName: `${a.patient.first_name} ${a.patient.last_name}`,
    doctorId: a.doctor_id,
    doctorName: a.doctor.name,
    appointmentDate: a.appointment_date,
    time: a.time || '',
    type: a.type,
    status: a.status,
  }));
}

async function fetchSurgicalCasesInternal(filters: SharedSurgicalCaseFilters): Promise<SharedSurgicalCasesResponse> {
  const { page = 1, limit = 20, status, surgeonId } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (surgeonId) {
    where.primary_surgeon_id = surgeonId;
  }

  const [cases, total] = await Promise.all([
    db.surgicalCase.findMany({
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
        primary_surgeon: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    db.surgicalCase.count({ where }),
  ]);

  return {
    cases: cases.map(c => ({
      id: c.id,
      status: c.status,
      urgency: c.urgency || 'ELECTIVE',
      procedureName: c.procedure_name || 'Unspecified',
      patientId: c.patient_id,
      patientName: `${c.patient.first_name} ${c.patient.last_name}`,
      patientFileNumber: c.patient.file_number || '',
      surgeonId: c.primary_surgeon_id || '',
      surgeonName: c.primary_surgeon?.name || 'Unassigned',
      createdAt: c.created_at,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getSharedPatients(filters: SharedPatientFilters = {}): Promise<SharedPatientsResponse> {
  const authUser = await getCurrentUser();
  
  if (!authUser) {
    throw new Error('Unauthorized - no session');
  }

  const cachedFetch = unstable_cache(
    () => fetchPatientsInternal(filters),
    ['shared-patients', JSON.stringify(filters)],
    {
      revalidate: 60,
      tags: ['shared-patients'],
    }
  );

  return cachedFetch();
}

export async function getSharedAppointments(filters: SharedAppointmentFilters = {}): Promise<SharedAppointment[]> {
  const authUser = await getCurrentUser();
  
  if (!authUser) {
    throw new Error('Unauthorized - no session');
  }

  const cachedFetch = unstable_cache(
    () => fetchAppointmentsInternal(filters),
    ['shared-appointments', JSON.stringify(filters)],
    {
      revalidate: 30,
      tags: ['shared-appointments'],
    }
  );

  return cachedFetch();
}

export async function getSharedSurgicalCases(filters: SharedSurgicalCaseFilters = {}): Promise<SharedSurgicalCasesResponse> {
  const authUser = await getCurrentUser();
  
  if (!authUser) {
    throw new Error('Unauthorized - no session');
  }

  const cachedFetch = unstable_cache(
    () => fetchSurgicalCasesInternal(filters),
    ['shared-surgical-cases', JSON.stringify(filters)],
    {
      revalidate: 60,
      tags: ['shared-surgical-cases'],
    }
  );

  return cachedFetch();
}

export async function revalidateSharedPatients() {
  revalidateTag('shared-patients', 'max');
}

export async function revalidateSharedAppointments() {
  revalidateTag('shared-appointments', 'max');
}

export async function revalidateSharedSurgicalCases() {
  revalidateTag('shared-surgical-cases', 'max');
}