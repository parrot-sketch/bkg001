import { db } from '@/lib/db';
import { NotificationStatus, NotificationType, Role, Status } from '@prisma/client';

export const PATIENT_INTAKE_SUBMITTED = 'PATIENT_INTAKE_SUBMITTED';

export interface IntakeNotificationInput {
  patientId: string;
  fileNumber: string;
  firstName: string;
  lastName: string;
  isMinor: boolean;
}

/**
 * Tells every active front desk user that a patient has just registered via the
 * desk QR form. Clicking the notification opens the patient's profile, where the
 * next steps (queue, appointment) live.
 */
export async function notifyFrontdeskOfIntake(input: IntakeNotificationInput): Promise<void> {
  try {
    const recipients = await db.user.findMany({
      where: { role: Role.FRONTDESK, status: Status.ACTIVE },
      select: { id: true },
    });
    if (recipients.length === 0) return;

    const fullName = `${input.firstName} ${input.lastName}`.trim();
    const metadata = JSON.stringify({
      event: PATIENT_INTAKE_SUBMITTED,
      patientId: input.patientId,
      fileNumber: input.fileNumber,
      resourceType: 'patient',
      resourceId: input.patientId,
      navigateTo: `/frontdesk/patient/${input.patientId}?from=intake`,
    });
    const now = new Date();

    await db.notification.createMany({
      data: recipients.map((user) => ({
        user_id: user.id,
        type: NotificationType.IN_APP,
        status: NotificationStatus.SENT,
        subject: 'New patient registered',
        message: `${fullName} (${input.fileNumber}) has completed the intake form${input.isMinor ? ' (minor, guardian details provided)' : ''}. Open their profile to add them to a queue.`,
        metadata,
        sent_at: now,
      })),
    });
  } catch (error) {
    console.error('[IntakeNotification] Failed to notify front desk:', error);
  }
}
