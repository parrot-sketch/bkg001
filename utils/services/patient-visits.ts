import db from '@/lib/db';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { formatDoctorName } from '@/lib/formatting/formatDoctorName';

const VISIT_OCCURRED_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.READY_FOR_CONSULTATION,
  AppointmentStatus.IN_CONSULTATION,
  AppointmentStatus.COMPLETED,
];

const UPCOMING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
];

export interface FrontdeskPatientVisit {
  id: number;
  date: Date;
  time: string;
  type: string;
  status: string;
  reason: string | null;
  note: string | null;
  source: string | null;
  doctorName: string | null;
  doctorSpecialization: string | null;
  checkedInAt: Date | null;
}

export interface FrontdeskPatientVisitSummary {
  totalVisits: number;
  completedVisits: number;
  upcomingVisits: number;
  lastVisitAt: Date | null;
  selectedDate: string | null;
  visits: FrontdeskPatientVisit[];
}

export interface GetFrontdeskPatientVisitHistoryOptions {
  /** Local calendar day as YYYY-MM-DD */
  date?: string | null;
  limit?: number;
}

function extractReasonFromQueueNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const match = notes.match(/Reason:\s*([^\n]+)/i);
  if (match?.[1]) return match[1].trim();
  return notes.trim() || null;
}

function parseDayBounds(dateStr: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(`${dateStr}T23:59:59.999`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

function compareVisitsByDateThenTime(
  a: { date: Date; time: string; id: number },
  b: { date: Date; time: string; id: number },
): number {
  const dateDiff = b.date.getTime() - a.date.getTime();
  if (dateDiff !== 0) return dateDiff;

  const timeA = a.time || '';
  const timeB = b.time || '';
  const timeDiff = timeB.localeCompare(timeA);
  if (timeDiff !== 0) return timeDiff;

  return b.id - a.id;
}

function isSameLocalDay(value: Date, day: { start: Date; end: Date }): boolean {
  return value >= day.start && value <= day.end;
}

/**
 * Loads appointment-backed visit history for the frontdesk patient profile.
 * Appointments are the durable visit record (including walk-ins from Add to Queue).
 *
 * Metrics always reflect the full history. The returned `visits` list is sorted
 * newest-first (date, then time) and optionally filtered to a single calendar day.
 */
export async function getFrontdeskPatientVisitHistory(
  patientId: string,
  options: GetFrontdeskPatientVisitHistoryOptions = {},
): Promise<FrontdeskPatientVisitSummary> {
  const limit = options.limit ?? 100;
  const selectedDate = options.date?.trim() || null;
  const dayBounds = selectedDate ? parseDayBounds(selectedDate) : null;

  const appointments = await db.appointment.findMany({
    where: { patient_id: patientId },
    orderBy: [{ appointment_date: 'desc' }, { id: 'desc' }],
    take: limit,
    select: {
      id: true,
      appointment_date: true,
      time: true,
      type: true,
      status: true,
      reason: true,
      note: true,
      source: true,
      checked_in_at: true,
      doctor: {
        select: {
          name: true,
          specialization: true,
        },
      },
      patient_queue: {
        select: { notes: true },
        orderBy: { added_at: 'desc' },
        take: 1,
      },
    },
  });

  const allVisits: FrontdeskPatientVisit[] = appointments
    .map((apt) => {
      const queueReason = extractReasonFromQueueNotes(apt.patient_queue[0]?.notes);
      return {
        id: apt.id,
        date: apt.appointment_date,
        time: apt.time,
        type: apt.type,
        status: apt.status,
        reason: apt.reason?.trim() || queueReason,
        note: apt.note,
        source: apt.source,
        doctorName: formatDoctorName(apt.doctor?.name) || null,
        doctorSpecialization: apt.doctor?.specialization ?? null,
        checkedInAt: apt.checked_in_at,
      };
    })
    .sort(compareVisitsByDateThenTime);

  const completedVisits = allVisits.filter((v) => v.status === AppointmentStatus.COMPLETED).length;
  const upcomingVisits = allVisits.filter((v) =>
    UPCOMING_STATUSES.includes(v.status as AppointmentStatus),
  ).length;

  const lastOccurred = allVisits.find((v) =>
    VISIT_OCCURRED_STATUSES.includes(v.status as AppointmentStatus),
  );

  const visits =
    dayBounds != null
      ? allVisits.filter((v) => isSameLocalDay(v.date, dayBounds))
      : allVisits;

  return {
    totalVisits: allVisits.length,
    completedVisits,
    upcomingVisits,
    lastVisitAt: lastOccurred?.date ?? null,
    selectedDate: dayBounds ? selectedDate : null,
    visits,
  };
}
