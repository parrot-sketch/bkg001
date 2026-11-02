import type { PrismaClient } from '@prisma/client';
import { InviteStatus, SurgicalCaseStatus, SurgicalRole } from '@prisma/client';

export type CreateSurgicalCaseFromPatientInput = {
  patientId: string;
  createdByUserId: string;
  primarySurgeonDoctorId?: string;
  primarySurgeonName?: string;
  appointmentId?: number;
  procedureDate?: Date;
  procedureName?: string;
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
      ...(input.primarySurgeonName && !input.primarySurgeonDoctorId ? { primary_surgeon_name: input.primarySurgeonName } : {}),
      ...(input.appointmentId !== undefined ? { appointment_id: input.appointmentId } : {}),
      ...(input.procedureDate ? { procedure_date: input.procedureDate } : {}),
      ...(input.procedureName ? { procedure_name: input.procedureName } : {}),
      status: input.status ?? SurgicalCaseStatus.DRAFT,
      created_by: input.createdByUserId,
    },
    select: { id: true, patient_id: true, primary_surgeon_id: true, primary_surgeon_name: true },
  });

  if (input.primarySurgeonDoctorId) {
    const doctor = await db.doctor.findUnique({
      where: { id: input.primarySurgeonDoctorId },
      select: { user_id: true },
    });

    if (doctor?.user_id) {
      const patientName = `${patient.first_name} ${patient.last_name}`.trim() || 'Unknown Patient';
      await recordStaffAssignment(db, {
        surgicalCaseId: surgicalCase.id,
        patientName,
        invitedUserId: doctor.user_id,
        invitedRole: SurgicalRole.SURGEON,
        assignedByUserId: input.createdByUserId,
      });
    }
  }

  return { surgicalCaseId: surgicalCase.id, alreadyExisted: false };
}

export async function recordStaffAssignment(
  db: PrismaClient,
  input: {
    surgicalCaseId: string;
    patientName: string;
    invitedUserId: string;
    invitedRole: SurgicalRole;
    assignedByUserId: string;
  },
): Promise<void> {
  const message = input.invitedRole === SurgicalRole.SURGEON
    ? `A new surgical case has been created for patient ${input.patientName} and assigned to you.`
    : `A surgical case for patient ${input.patientName} lists you as an assistant surgeon.`;

  await db.staffInvite.upsert({
    where: {
      surgical_case_id_invited_user_id_invited_role: {
        surgical_case_id: input.surgicalCaseId,
        invited_user_id: input.invitedUserId,
        invited_role: input.invitedRole,
      },
    },
    update: {
      status: InviteStatus.ACCEPTED,
      acknowledged_at: new Date(),
    },
    create: {
      surgical_case_id: input.surgicalCaseId,
      invited_user_id: input.invitedUserId,
      invited_role: input.invitedRole,
      invited_by_user_id: input.assignedByUserId,
      status: InviteStatus.ACCEPTED,
      acknowledged_at: new Date(),
    },
    select: { id: true },
  });

  await db.notification.create({
    data: {
      user_id: input.invitedUserId,
      sender_id: input.assignedByUserId,
      type: 'IN_APP',
      status: 'PENDING',
      subject: 'New Surgical Case',
      message,
      metadata: JSON.stringify({
        surgicalCaseId: input.surgicalCaseId,
        patientName: input.patientName,
        role: input.invitedRole,
        event: 'SURGICAL_CASE_ASSIGNMENT',
      }),
    },
    select: { id: true },
  });
}
