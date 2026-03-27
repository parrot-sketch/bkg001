/**
 * Appointment Card Helpers — Pure business logic for appointment card rendering
 *
 * Extracted from FrontdeskAppointmentCard to separate concerns:
 * - Status configuration/mapping
 * - Overdue detection
 * - Check-in eligibility rules
 */

import { AppointmentStatus, canCheckIn } from '@/domain/enums/AppointmentStatus';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { format, isAfter, startOfDay } from 'date-fns';
import { APPOINTMENT_NO_SHOW_GRACE_MINUTES } from '@/domain/constants/appointment-expiry';
import {
  Clock,
  CalendarClock,
  CheckCircle,
  CheckCheck,
  XCircle,
  AlertTriangle,
  UserCheck,
  Stethoscope,
} from 'lucide-react';
import type { ComponentType } from 'react';

// ─── Types ────────────────────────────────────────────────────

export interface StatusConfig {
  bar: string;
  text: string;
  bg: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export interface CheckInEligibility {
  canCheckIn: boolean;
  reason?: string;
  daysUntil?: number;
  isPastGracePeriod?: boolean;
}

// ─── Status Configuration ─────────────────────────────────────

export const STATUS_CONFIG: Record<AppointmentStatus, StatusConfig> = {
  [AppointmentStatus.PENDING]: {
    bar: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50', label: 'Pending', icon: Clock,
  },
  [AppointmentStatus.PENDING_DOCTOR_CONFIRMATION]: {
    bar: 'bg-indigo-400', text: 'text-indigo-700', bg: 'bg-indigo-50', label: 'Awaiting MD', icon: CalendarClock,
  },
  [AppointmentStatus.SCHEDULED]: {
    bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Scheduled', icon: CheckCircle,
  },
  [AppointmentStatus.CONFIRMED]: {
    bar: 'bg-emerald-600', text: 'text-emerald-800', bg: 'bg-emerald-100', label: 'Confirmed', icon: CheckCircle,
  },
  [AppointmentStatus.COMPLETED]: {
    bar: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', label: 'Completed', icon: CheckCheck,
  },
  [AppointmentStatus.CANCELLED]: {
    bar: 'bg-slate-300', text: 'text-slate-500', bg: 'bg-slate-50', label: 'Cancelled', icon: XCircle,
  },
  [AppointmentStatus.NO_SHOW]: {
    bar: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50', label: 'No Show', icon: AlertTriangle,
  },
  [AppointmentStatus.CHECKED_IN]: {
    bar: 'bg-sky-500', text: 'text-sky-700', bg: 'bg-sky-50', label: 'Checked In', icon: UserCheck,
  },
  [AppointmentStatus.READY_FOR_CONSULTATION]: {
    bar: 'bg-teal-500', text: 'text-teal-700', bg: 'bg-teal-50', label: 'Ready', icon: Stethoscope,
  },
  [AppointmentStatus.IN_CONSULTATION]: {
    bar: 'bg-violet-500', text: 'text-violet-700', bg: 'bg-violet-50', label: 'In Consultation', icon: Stethoscope,
  },
};

// ─── Business Logic ───────────────────────────────────────────

export function isAppointmentOverdue(appointment: AppointmentResponseDto): boolean {
  if (
    appointment.status === AppointmentStatus.COMPLETED ||
    appointment.status === AppointmentStatus.CANCELLED ||
    appointment.status === AppointmentStatus.NO_SHOW
  ) {
    return false;
  }
  const now = new Date();
  const appointmentDate = new Date(appointment.appointmentDate);
  const [hours, minutes] = appointment.time.split(':').map(Number);
  appointmentDate.setHours(hours, minutes, 0, 0);
  const gracePeriodMs = APPOINTMENT_NO_SHOW_GRACE_MINUTES * 60 * 1000;
  const overdueThreshold = new Date(appointmentDate.getTime() + gracePeriodMs);
  return now > overdueThreshold;
}

export function getCheckInEligibility(appointment: AppointmentResponseDto): CheckInEligibility {
  if (appointment.status === AppointmentStatus.NO_SHOW) {
    return { canCheckIn: false, reason: 'Patient was marked as no-show' };
  }

  if (!canCheckIn(appointment.status as AppointmentStatus)) {
    return {
      canCheckIn: false,
      reason:
        appointment.status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION
          ? 'Awaiting doctor confirmation'
          : 'Appointment not confirmed',
    };
  }

  const now = new Date();
  const appointmentDate = new Date(appointment.appointmentDate);
  const appointmentDateOnly = startOfDay(appointmentDate);
  const todayOnly = startOfDay(now);

  if (isAfter(appointmentDateOnly, todayOnly)) {
    const daysUntil = Math.ceil(
      (appointmentDateOnly.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24),
    );
    return {
      canCheckIn: false,
      reason: `Scheduled for ${format(appointmentDate, 'MMM d, yyyy')} (${daysUntil} day${daysUntil !== 1 ? 's' : ''} away)`,
      daysUntil,
    };
  }

  const [hours, minutes] = appointment.time.split(':').map(Number);
  const appointmentDateTime = new Date(appointmentDate);
  appointmentDateTime.setHours(hours, minutes, 0, 0);
  const graceCutoff = new Date(appointmentDateTime.getTime() + APPOINTMENT_NO_SHOW_GRACE_MINUTES * 60 * 1000);

  if (now > graceCutoff) {
    return { canCheckIn: false, reason: 'Appointment time has passed', isPastGracePeriod: true };
  }

  return { canCheckIn: true, isPastGracePeriod: false };
}

export function getPatientDisplay(appointment: AppointmentResponseDto) {
  const name = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : appointment.patientId || 'Unknown Patient';
  const initials = appointment.patient
    ? `${appointment.patient.firstName?.[0] || ''}${appointment.patient.lastName?.[0] || ''}`.toUpperCase()
    : '??';
  return { name, initials };
}

export function isTerminalStatus(status: string): boolean {
  return (
    status === AppointmentStatus.COMPLETED ||
    status === AppointmentStatus.CANCELLED ||
    status === AppointmentStatus.NO_SHOW
  );
}
