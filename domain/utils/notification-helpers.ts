/**
 * No-Show Notification Helper
 * 
 * Handles sending notifications when appointments are marked as no-show
 * (either automatically or manually).
 */

import db from '@/lib/db';
import { NotificationType, NotificationStatus } from '@prisma/client';
import { format } from 'date-fns';

interface SendNoShowNotificationParams {
  appointmentId: number;
  patientName: string;
  patientId: string;
  patientEmail?: string | null;
  doctorId: string;
  doctorUserId: string;
  doctorName: string;
  appointmentTime: string;
  appointmentDate: Date;
  isAutomatic: boolean;
  markedByUserId?: string;
}

/**
 * Check if a NO_SHOW notification already exists for this appointment
 * to prevent duplicate notifications.
 */
async function noShowNotificationExists(appointmentId: number): Promise<boolean> {
  const existing = await db.notification.findFirst({
    where: {
      metadata: {
        contains: `"appointmentId":${appointmentId}`,
      },
      type: NotificationType.IN_APP,
      subject: {
        contains: 'no-show',
      },
      created_at: {
        gte: new Date(Date.now() - 60 * 60 * 1000), // Within last hour
      },
    },
  });
  
  return !!existing;
}

/**
 * Send no-show notifications to patient and doctor.
 */
export async function sendNoShowNotification(params: SendNoShowNotificationParams): Promise<void> {
  const {
    appointmentId,
    patientName,
    patientId,
    patientEmail,
    doctorUserId,
    doctorName,
    appointmentTime,
    appointmentDate,
    isAutomatic,
  } = params;

  // Check if notification already sent (prevent duplicates)
  const alreadyNotified = await noShowNotificationExists(appointmentId);
  if (alreadyNotified) {
    console.log(`[NO_SHOW_NOTIFICATION] Skipping - already notified for appointment ${appointmentId}`);
    return;
  }

  const formattedDate = format(appointmentDate, 'MMMM d, yyyy');
  const notificationMessage = isAutomatic
    ? `Your appointment at ${appointmentTime} on ${formattedDate} has been marked as a no-show. Please contact us to reschedule.`
    : `Your appointment at ${appointmentTime} on ${formattedDate} was marked as a no-show. Please contact us to reschedule.`;

  // 1. Notify patient (via in-app)
  try {
    await db.notification.create({
      data: {
        user_id: patientId,
        type: NotificationType.IN_APP,
        status: NotificationStatus.SENT,
        subject: 'Appointment No-Show',
        message: notificationMessage,
        metadata: JSON.stringify({
          appointmentId,
          event: 'APPOINTMENT_NO_SHOW',
          isAutomatic,
        }),
        sent_at: new Date(),
      },
    });
  } catch (error) {
    console.error('[NO_SHOW_NOTIFICATION] Failed to notify patient:', error);
  }

  // 2. Notify doctor
  try {
    await db.notification.create({
      data: {
        user_id: doctorUserId,
        type: NotificationType.IN_APP,
        status: NotificationStatus.SENT,
        subject: 'Patient No-Show',
        message: `${patientName}'s appointment at ${appointmentTime} was marked as a no-show.`,
        metadata: JSON.stringify({
          appointmentId,
          patientName,
          event: 'APPOINTMENT_NO_SHOW',
          isAutomatic,
        }),
        sent_at: new Date(),
      },
    });
  } catch (error) {
    console.error('[NO_SHOW_NOTIFICATION] Failed to notify doctor:', error);
  }
}

/**
 * Send reinstatement notifications to patient and doctor.
 */
export async function sendReinstatementNotification(params: {
  appointmentId: number;
  patientName: string;
  patientId: string;
  doctorUserId: string;
  doctorName: string;
  appointmentTime: string;
}): Promise<void> {
  const { appointmentId, patientName, patientId, doctorUserId, doctorName, appointmentTime } = params;

  // Notify patient
  try {
    await db.notification.create({
      data: {
        user_id: patientId,
        type: NotificationType.IN_APP,
        status: NotificationStatus.SENT,
        subject: 'Appointment Reinstatement',
        message: `Your appointment at ${appointmentTime} has been reinstated. Please arrive as soon as possible.`,
        metadata: JSON.stringify({
          appointmentId,
          event: 'APPOINTMENT_REINSTATED',
        }),
        sent_at: new Date(),
      },
    });
  } catch (error) {
    console.error('[REINSTATE_NOTIFICATION] Failed to notify patient:', error);
  }

  // Notify doctor
  try {
    await db.notification.create({
      data: {
        user_id: doctorUserId,
        type: NotificationType.IN_APP,
        status: NotificationStatus.SENT,
        subject: 'Patient Reinstatement',
        message: `${patientName} reinstated — running late, please expect them`,
        metadata: JSON.stringify({
          appointmentId,
          patientName,
          event: 'APPOINTMENT_REINSTATED',
        }),
        sent_at: new Date(),
      },
    });
  } catch (error) {
    console.error('[REINSTATE_NOTIFICATION] Failed to notify doctor:', error);
  }
}

export async function sendPatientQueuedNotification(params: {
  patientName: string;
  patientId: string;
  doctorUserId: string;
  doctorName: string;
  appointmentTime: string;
}): Promise<void> {
  const { patientName, patientId, doctorUserId, doctorName, appointmentTime } = params;

  try {
    await db.notification.create({
      data: {
        user_id: doctorUserId,
        type: NotificationType.IN_APP,
        status: NotificationStatus.SENT,
        subject: 'Patient Added to Queue',
        message: `${patientName} has been added to your queue${appointmentTime ? ` (${appointmentTime})` : ''}`,
        metadata: JSON.stringify({
          patientId,
          patientName,
          event: 'PATIENT_QUEUED',
        }),
        sent_at: new Date(),
      },
    });
  } catch (error) {
    console.error('[QUEUE_NOTIFICATION] Failed to notify doctor:', error);
  }
}

export async function sendPatientReassignedNotification(params: {
  patientName: string;
  oldDoctorUserId: string;
  oldDoctorName: string;
  newDoctorName: string;
}): Promise<void> {
  const { patientName, oldDoctorUserId, oldDoctorName, newDoctorName } = params;

  try {
    await db.notification.create({
      data: {
        user_id: oldDoctorUserId,
        type: NotificationType.IN_APP,
        status: NotificationStatus.SENT,
        subject: 'Patient Reassigned',
        message: `${patientName} has been reassigned from your queue to Dr. ${newDoctorName}`,
        metadata: JSON.stringify({
          patientName,
          event: 'PATIENT_REASSIGNED',
        }),
        sent_at: new Date(),
      },
    });
  } catch (error) {
    console.error('[REASSIGN_NOTIFICATION] Failed to notify old doctor:', error);
  }
}

export async function sendPatientRemovedFromQueueNotification(params: {
  patientName: string;
  doctorUserId: string;
  doctorName: string;
  reason?: string;
}): Promise<void> {
  const { patientName, doctorUserId, doctorName, reason } = params;

  try {
    await db.notification.create({
      data: {
        user_id: doctorUserId,
        type: NotificationType.IN_APP,
        status: NotificationStatus.SENT,
        subject: 'Patient Removed from Queue',
        message: `${patientName} has been removed from your queue${reason ? `: ${reason}` : ''}`,
        metadata: JSON.stringify({
          patientName,
          event: 'PATIENT_REMOVED_FROM_QUEUE',
        }),
        sent_at: new Date(),
      },
    });
  } catch (error) {
    console.error('[REMOVE_QUEUE_NOTIFICATION] Failed to notify doctor:', error);
  }
}
