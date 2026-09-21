/**
 * Shared auth helpers for doctor surgical-case clinical documents.
 * Keeps nurse forms out of the doctor write path.
 */

import db from '@/lib/db';
import { InviteStatus, SurgicalRole } from '@prisma/client';

const EDIT_ROLES: SurgicalRole[] = [
  SurgicalRole.SURGEON,
  SurgicalRole.ASSISTANT_SURGEON,
];

export type DoctorCaseAccess = {
  doctorId: string;
  userId: string;
  caseId: string;
  patientId: string;
  primarySurgeonId: string | null;
  canView: boolean;
  canEdit: boolean;
  isPrimary: boolean;
};

export async function resolveDoctorCaseAccess(
  userId: string,
  caseId: string,
): Promise<DoctorCaseAccess | null> {
  const doctor = await db.doctor.findFirst({
    where: { user_id: userId },
    select: { id: true },
  });
  if (!doctor) return null;

  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      patient_id: true,
      primary_surgeon_id: true,
    },
  });
  if (!surgicalCase) return null;

  const isPrimary = surgicalCase.primary_surgeon_id === doctor.id;

  const invite = await db.staffInvite.findFirst({
    where: {
      surgical_case_id: caseId,
      invited_user_id: userId,
      status: InviteStatus.ACCEPTED,
    },
    select: { invited_role: true },
  });

  const invitedAsSurgeon = !!invite && EDIT_ROLES.includes(invite.invited_role);
  const canView = isPrimary || !!invite;
  const canEdit = isPrimary || invitedAsSurgeon;

  return {
    doctorId: doctor.id,
    userId,
    caseId: surgicalCase.id,
    patientId: surgicalCase.patient_id,
    primarySurgeonId: surgicalCase.primary_surgeon_id,
    canView,
    canEdit,
    isPrimary,
  };
}

/**
 * Ensure a CasePlan row exists for doctor clinical docs (notes, consents, photos).
 * Schedule-created cases often have SurgicalCase without CasePlan.
 */
export async function ensureCasePlanForDoctor(params: {
  caseId: string;
  patientId: string;
  doctorId: string;
}): Promise<{ id: number }> {
  const existing = await db.casePlan.findFirst({
    where: { surgical_case_id: params.caseId },
    select: { id: true },
  });
  if (existing) return existing;

  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: params.caseId },
    select: {
      consultation: { select: { appointment_id: true } },
    },
  });

  let appointmentId = surgicalCase?.consultation?.appointment_id ?? undefined;

  if (appointmentId) {
    const taken = await db.casePlan.findUnique({
      where: { appointment_id: appointmentId },
      select: { id: true, surgical_case_id: true },
    });
    if (taken && taken.surgical_case_id !== params.caseId) {
      appointmentId = undefined;
    }
  }

  if (!appointmentId) {
    const available = await db.appointment.findFirst({
      where: { patient_id: params.patientId, case_plan: null },
      orderBy: { created_at: 'desc' },
      select: { id: true },
    });
    if (available) {
      appointmentId = available.id;
    } else {
      const proxy = await db.appointment.create({
        data: {
          patient_id: params.patientId,
          doctor_id: params.doctorId,
          appointment_date: new Date(),
          time: '00:00',
          type: 'SURGICAL_NOTES_PROXY',
          status: 'COMPLETED',
          reason: 'Auto-generated to anchor doctor clinical documents',
        },
        select: { id: true },
      });
      appointmentId = proxy.id;
    }
  }

  return db.casePlan.create({
    data: {
      surgical_case_id: params.caseId,
      patient_id: params.patientId,
      doctor_id: params.doctorId,
      appointment_id: appointmentId,
    },
    select: { id: true },
  });
}
