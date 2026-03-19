/**
 * Appointment Expiry Utility
 * 
 * Handles automatic expiration of appointments that have passed their
 * scheduled time beyond the grace period.
 * 
 * This implements "Option C" - triggered on frontdesk dashboard load.
 * No cron infrastructure exists in this project, so this pragmatic
 * approach ensures appointments are expired when viewed.
 */

import db from '@/lib/db';
import { AppointmentStatus } from '@prisma/client';
import { APPOINTMENT_NO_SHOW_GRACE_MINUTES } from '../constants/appointment-expiry';
import { sendNoShowNotification } from './notification-helpers';

export interface ExpireAppointmentsResult {
  expiredCount: number;
  expiredIds: number[];
  errors: string[];
}

/**
 * Find and expire all overdue CONFIRMED appointments for today.
 * 
 * Logic:
 * - Find appointments where status = CONFIRMED (or SCHEDULED)
 * - And scheduled time < (now - grace period)
 * - And appointment date = today (no historical expiry)
 * 
 * @returns Object with count of expired appointments and any errors
 */
export async function expireOverdueAppointments(): Promise<ExpireAppointmentsResult> {
  const now = new Date();
  const graceCutoff = new Date(now.getTime() - APPOINTMENT_NO_SHOW_GRACE_MINUTES * 60 * 1000);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Parse the grace cutoff time into hours and minutes for comparison
  const cutoffHours = graceCutoff.getHours().toString().padStart(2, '0');
  const cutoffMinutes = graceCutoff.getMinutes().toString().padStart(2, '0');
  const cutoffTime = `${cutoffHours}:${cutoffMinutes}`;

  // Find overdue appointments
  const overdueAppointments = await db.appointment.findMany({
    where: {
      status: {
        in: [AppointmentStatus.CONFIRMED, AppointmentStatus.SCHEDULED],
      },
      appointment_date: {
        gte: today,
        lt: tomorrow,
      },
      time: {
        lt: cutoffTime,
      },
      no_show: false,
    },
    include: {
      patient: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
        },
      },
      doctor: {
        select: {
          id: true,
          user_id: true,
          name: true,
        },
      },
    },
  });

  if (overdueAppointments.length === 0) {
    return {
      expiredCount: 0,
      expiredIds: [],
      errors: [],
    };
  }

  const expiredIds: number[] = [];
  const errors: string[] = [];

  // Process each appointment - update to NO_SHOW and send notifications
  for (const appointment of overdueAppointments) {
    try {
      // Update the appointment to NO_SHOW
      await db.appointment.update({
        where: { id: appointment.id },
        data: {
          status: AppointmentStatus.NO_SHOW,
          no_show: true,
          no_show_at: now,
          marked_no_show_at: now,
          no_show_notes: 'Automatically marked as no-show: appointment time passed grace period',
        },
      });

      expiredIds.push(appointment.id);

      // Send notifications to patient and doctor
      await sendNoShowNotification({
        appointmentId: appointment.id,
        patientName: `${appointment.patient.first_name} ${appointment.patient.last_name}`,
        patientId: appointment.patient.id,
        patientEmail: appointment.patient.email,
        doctorId: appointment.doctor.id,
        doctorUserId: appointment.doctor.user_id,
        doctorName: appointment.doctor.name,
        appointmentTime: appointment.time,
        appointmentDate: appointment.appointment_date,
        isAutomatic: true,
      });

    } catch (error) {
      const errorMsg = `Failed to expire appointment ${appointment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('[APPOINTMENT_EXPIRY]', errorMsg);
      errors.push(errorMsg);
    }
  }

  console.log(`[APPOINTMENT_EXPIRY] Expired ${expiredIds.length} appointments`);

  return {
    expiredCount: expiredIds.length,
    expiredIds,
    errors,
  };
}

/**
 * Check if an appointment is past the grace period (for display purposes).
 * This is a read-only helper for the UI.
 */
export function isAppointmentPastGracePeriod(appointmentTime: string, appointmentDate: Date): boolean {
  const now = new Date();
  
  // Parse the appointment time
  const [hours, minutes] = appointmentTime.split(':').map(Number);
  const appointmentDateTime = new Date(appointmentDate);
  appointmentDateTime.setHours(hours, minutes, 0, 0);
  
  const graceCutoff = new Date(appointmentDateTime.getTime() + APPOINTMENT_NO_SHOW_GRACE_MINUTES * 60 * 1000);
  
  return now > graceCutoff;
}

/**
 * Can an appointment be checked in? (enhanced to check time)
 * 
 * This extends the domain canCheckIn to also check if the
 * appointment time has passed the grace period.
 */
export function canCheckInWithTimeCheck(status: AppointmentStatus, appointmentTime: string, appointmentDate: Date): {
  canCheckIn: boolean;
  reason?: string;
  isPastGracePeriod?: boolean;
} {
  // First check the basic status
  if (status !== AppointmentStatus.SCHEDULED && status !== AppointmentStatus.CONFIRMED) {
    return {
      canCheckIn: false,
      reason: `Appointment status is ${status}`,
    };
  }
  
  // Then check if past grace period
  const isPast = isAppointmentPastGracePeriod(appointmentTime, appointmentDate);
  
  if (isPast) {
    return {
      canCheckIn: false,
      reason: 'Appointment time has passed',
      isPastGracePeriod: true,
    };
  }
  
  return {
    canCheckIn: true,
    isPastGracePeriod: false,
  };
}
