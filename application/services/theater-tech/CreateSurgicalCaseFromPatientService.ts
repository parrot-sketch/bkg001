import type { PrismaClient } from '@prisma/client';
import { InviteStatus, SurgicalCaseStatus, SurgicalRole } from '@prisma/client';

export type CreateSurgicalCaseFromPatientInput = {
  patientId: string;
  createdByUserId: string;
  primarySurgeonDoctorId?: string;
  appointmentId?: number;
  procedureDate?: Date;
  status?: SurgicalCaseStatus;
};

export type CreateSurgicalCaseFromPatientResult = {
  surgicalCaseId: string;
  alreadyExisted: boolean;
};

export async function createSurgicalCaseFromPatient(
  db: PrismaClient,
  input: CreateSurgicalCaseFromPatientInput,
): Promise<CreateSurgicalCaseFromPatientResult> {
  if (!input.patientId) {
    throw new Error('Patient ID required');
  }

  if (input.appointmentId !== undefined && !Number.isFinite(input.appointmentId)) {
    throw new Error('Invalid appointment ID');
  }

  if (input.appointmentId !== undefined) {
    const existing = await db.surgicalCase.findUnique({
      where: { appointment_id: input.appointmentId },
      select: { id: true },
    });
    if (existing) {
      return { surgicalCaseId: existing.id, alreadyExisted: true };
    }
  }

  const patient = await db.patient.findUnique({
    where: { id: input.patientId },
    select: { id: true, first_name: true, last_name: true },
  });
  if (!patient) {
    throw new Error('Patient not found');
  }

  const surgicalCase = await db.surgicalCase.create({
    data: {
      patient_id: input.patientId,
      ...(input.primarySurgeonDoctorId ? { primary_surgeon_id: input.primarySurgeonDoctorId } : {}),
      ...(input.appointmentId !== undefined ? { appointment_id: input.appointmentId } : {}),
      ...(input.procedureDate ? { procedure_date: input.procedureDate } : {}),
      status: input.status ?? SurgicalCaseStatus.DRAFT,
      created_by: input.createdByUserId,
    },
    select: { id: true, patient_id: true, primary_surgeon_id: true },
  });

  if (input.primarySurgeonDoctorId) {
    const doctor = await db.doctor.findUnique({
      where: { id: input.primarySurgeonDoctorId },
      select: { user_id: true },
    });

    if (doctor?.user_id) {
      const patientName = `${patient.first_name} ${patient.last_name}`.trim() || 'Unknown Patient';

      await db.staffInvite.upsert({
        where: {
          surgical_case_id_invited_user_id_invited_role: {
            surgical_case_id: surgicalCase.id,
            invited_user_id: doctor.user_id,
            invited_role: SurgicalRole.SURGEON,
          },
        },
        update: {
          status: InviteStatus.ACCEPTED,
          acknowledged_at: new Date(),
        },
        create: {
          surgical_case_id: surgicalCase.id,
          invited_user_id: doctor.user_id,
          invited_role: SurgicalRole.SURGEON,
          invited_by_user_id: input.createdByUserId,
          status: InviteStatus.ACCEPTED,
          acknowledged_at: new Date(),
        },
        select: { id: true },
      });

      await db.notification.create({
        data: {
          user_id: doctor.user_id,
          sender_id: input.createdByUserId,
          type: 'IN_APP',
          status: 'PENDING',
          subject: 'New Surgical Case',
          message: `A new surgical case has been created for patient ${patientName} and assigned to you.`,
          metadata: JSON.stringify({
            surgicalCaseId: surgicalCase.id,
            patientName,
            role: 'SURGEON',
            event: 'SURGICAL_CASE_ASSIGNMENT',
          }),
        },
        select: { id: true },
      });
    }
  }

  return { surgicalCaseId: surgicalCase.id, alreadyExisted: false };
}
