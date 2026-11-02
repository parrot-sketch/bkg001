import { NotificationType, Role, Status } from '@prisma/client';
import db from '@/lib/db';
import { createNotification } from './createNotification';

export const PATIENT_CALLED_IN = 'PATIENT_CALLED_IN';

/**
 * Tell reception the doctor is ready for a waiting patient so they can
 * show them into the consultation room. Failures are logged and swallowed.
 */
export async function notifyFrontdeskPatientCalled(params: {
  patientId: string;
  patientName: string;
  fileNumber?: string | null;
  doctorName?: string | null;
  senderId?: string;
}): Promise<void> {
  try {
    const users = await db.user.findMany({
      where: { role: Role.FRONTDESK, status: Status.ACTIVE },
      select: { id: true },
    });
    if (users.length === 0) return;

    const who = params.patientName.trim() || 'A patient';
    const file = params.fileNumber?.trim();
    const doctor = params.doctorName?.trim();
    const subject = file ? `${who} (${file}) is called in` : `${who} is called in`;
    const message = doctor
      ? `${doctor} is ready for ${who}. Please show them into the consultation room.`
      : `${who} has been called in. Please show them into the consultation room.`;

    await Promise.all(
      users.map((user) =>
        createNotification({
          userId: user.id,
          senderId: params.senderId,
          type: NotificationType.IN_APP,
          subject,
          message,
          metadata: {
            event: PATIENT_CALLED_IN,
            patientId: params.patientId,
            navigateTo: `/frontdesk/patient/${params.patientId}`,
          },
        }),
      ),
    );
  } catch (error) {
    console.error('[notifyFrontdeskPatientCalled]', error);
  }
}
