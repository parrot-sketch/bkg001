import type { PrismaClient, Prisma } from '@prisma/client';
import { InviteStatus, Role, SurgicalRole } from '@prisma/client';
import { isEligibleForSurgicalRole } from '@/lib/domain/policies/team-eligibility';
import {
  buildPlannedStaffAssignments,
  diffPlannedStaffAssignments,
} from '@/domain/services/SurgicalCaseTeamSelection';

export const VALID_PROCEDURE_CATEGORIES = [
  'FACE',
  'BREAST',
  'BODY',
  'RECONSTRUCTIVE',
  'FACE_AND_NECK',
  'BODY_CONTOURING',
  'INTIMATE_AESTHETIC',
  'HAIR_RESTORATION',
  'NON_SURGICAL',
  'POST_WEIGHT_LOSS',
  'OTHER',
] as const;

export const VALID_CASE_PLAN_TYPES = ['PRIMARY', 'REVISION'] as const;

export interface SavePage1Input {
  caseId: string;
  invitorUserId: string;
  invitorRole: Role;
  body: any;
}

export interface SavePage1Result {
  primarySurgeonDoctorId: string;
  surgeonDoctorIds: string[];
}

export function normalizePage1TeamInput(body: any): {
  primarySurgeonDoctorId: string;
  assistantSurgeonDoctorIds: string[];
  surgeonDoctorIds: string[];
  anesthesiologistUserId: string | null;
  scrubNurseUserId: string | null;
  circulatingNurseUserId: string | null;
} {
  const legacySurgeonIds: string[] = Array.isArray(body?.surgeonIds) ? body.surgeonIds : [];
  const primarySurgeonDoctorId: string =
    (typeof body?.primarySurgeonId === 'string' ? body.primarySurgeonId : '') ||
    legacySurgeonIds[0] ||
    '';

  const assistantSurgeonDoctorIds: string[] = Array.isArray(body?.assistantSurgeonIds)
    ? body.assistantSurgeonIds
    : legacySurgeonIds.slice(1);

  const surgeonDoctorIds = [primarySurgeonDoctorId, ...assistantSurgeonDoctorIds]
    .map((s) => (s ?? '').toString().trim())
    .filter(Boolean);

  const anesthesiologistUserId =
    typeof body?.anesthesiologistUserId === 'string' && body.anesthesiologistUserId.trim()
      ? body.anesthesiologistUserId.trim()
      : null;
  const scrubNurseUserId =
    typeof body?.scrubNurseUserId === 'string' && body.scrubNurseUserId.trim()
      ? body.scrubNurseUserId.trim()
      : null;
  const circulatingNurseUserId =
    typeof body?.circulatingNurseUserId === 'string' && body.circulatingNurseUserId.trim()
      ? body.circulatingNurseUserId.trim()
      : null;

  return {
    primarySurgeonDoctorId,
    assistantSurgeonDoctorIds,
    surgeonDoctorIds,
    anesthesiologistUserId,
    scrubNurseUserId,
    circulatingNurseUserId,
  };
}

function assertEligibility(userRole: Role, surgicalRole: SurgicalRole) {
  if (!isEligibleForSurgicalRole(userRole, surgicalRole)) {
    throw new Error(`User role '${userRole}' is not eligible for surgical role '${surgicalRole}'`);
  }
}

export async function saveSurgicalCasePlanPage1(
  db: PrismaClient,
  input: SavePage1Input,
): Promise<SavePage1Result> {
  const body = input.body ?? {};

  const {
    procedureDate,
    diagnosis,
    procedureCategory,
    primaryOrRevision,
    procedureIds,
  } = body;

  const team = normalizePage1TeamInput(body);

  if (
    !procedureDate ||
    !team.primarySurgeonDoctorId ||
    !diagnosis ||
    !procedureCategory ||
    !primaryOrRevision
  ) {
    throw new Error('All required fields must be filled including a primary surgeon');
  }

  if (!VALID_PROCEDURE_CATEGORIES.includes(procedureCategory)) {
    throw new Error('Invalid procedure category');
  }

  if (!VALID_CASE_PLAN_TYPES.includes(primaryOrRevision)) {
    throw new Error('Invalid primary/revision value');
  }

  if (!procedureIds || !Array.isArray(procedureIds) || procedureIds.length === 0) {
    throw new Error('Select at least one procedure');
  }

  // Fetch case for patient context
  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: input.caseId },
    select: {
      id: true,
      status: true,
      patient: { select: { first_name: true, last_name: true } },
    },
  });
  if (!surgicalCase) {
    throw new Error('Surgical case not found');
  }

  const patientName = surgicalCase.patient
    ? `${surgicalCase.patient.first_name} ${surgicalCase.patient.last_name}`
    : 'Unknown Patient';

  const formattedDate = new Date(procedureDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Resolve surgeons (doctor ids) → user_ids
  const doctors = await db.doctor.findMany({
    where: { id: { in: team.surgeonDoctorIds } },
    select: { id: true, user_id: true },
  });

  const primaryDoctor = doctors.find((d) => d.id === team.primarySurgeonDoctorId);
  if (!primaryDoctor?.user_id) {
    throw new Error('Primary surgeon must have a linked user account');
  }

  const assistantDoctors = doctors
    .filter((d) => d.id !== team.primarySurgeonDoctorId)
    .filter((d) => team.assistantSurgeonDoctorIds.includes(d.id))
    .filter((d) => !!d.user_id);

  // Validate non-surgeon staff users
  const nonSurgeonUserIds = [
    team.anesthesiologistUserId,
    team.scrubNurseUserId,
    team.circulatingNurseUserId,
  ].filter(Boolean) as string[];

  const nonSurgeonUsers = nonSurgeonUserIds.length
    ? await db.user.findMany({
        where: { id: { in: nonSurgeonUserIds } },
        select: { id: true, role: true },
      })
    : [];
  const userRoleMap = new Map(nonSurgeonUsers.map((u) => [u.id, u.role]));

  if (team.anesthesiologistUserId) {
    const role = userRoleMap.get(team.anesthesiologistUserId);
    if (!role) throw new Error(`User not found: ${team.anesthesiologistUserId}`);
    assertEligibility(role, SurgicalRole.ANESTHESIOLOGIST);
  }
  if (team.scrubNurseUserId) {
    const role = userRoleMap.get(team.scrubNurseUserId);
    if (!role) throw new Error(`User not found: ${team.scrubNurseUserId}`);
    assertEligibility(role, SurgicalRole.SCRUB_NURSE);
  }
  if (team.circulatingNurseUserId) {
    const role = userRoleMap.get(team.circulatingNurseUserId);
    if (!role) throw new Error(`User not found: ${team.circulatingNurseUserId}`);
    assertEligibility(role, SurgicalRole.CIRCULATING_NURSE);
  }

  const managedRoles: SurgicalRole[] = [
    SurgicalRole.SURGEON,
    SurgicalRole.ASSISTANT_SURGEON,
    SurgicalRole.ANESTHESIOLOGIST,
    SurgicalRole.SCRUB_NURSE,
    SurgicalRole.CIRCULATING_NURSE,
  ];

  const desiredAssignments = buildPlannedStaffAssignments({
    primarySurgeonUserId: primaryDoctor.user_id,
    assistantSurgeonUserIds: assistantDoctors.map((d) => d.user_id!).filter(Boolean),
    anesthesiologistUserId: team.anesthesiologistUserId,
    scrubNurseUserId: team.scrubNurseUserId,
    circulatingNurseUserId: team.circulatingNurseUserId,
  });

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    // Case update
    await tx.surgicalCase.update({
      where: { id: input.caseId },
      data: {
        procedure_date: new Date(procedureDate),
        primary_surgeon_id: team.primarySurgeonDoctorId,
        surgeon_ids: team.surgeonDoctorIds.length > 0 ? JSON.stringify(team.surgeonDoctorIds) : null,
        diagnosis,
        procedure_category: procedureCategory,
        primary_or_revision: primaryOrRevision,
        // Never regress a case that already progressed beyond planning (e.g., READY_FOR_THEATER_BOOKING).
        ...(surgicalCase.status === 'DRAFT' ? { status: 'PLANNING' } : {}),
      },
    });

    // Procedures sync
    await tx.surgicalCaseProcedure.deleteMany({ where: { surgical_case_id: input.caseId } });
    await tx.surgicalCaseProcedure.createMany({
      data: procedureIds.map((procedureId: string) => ({
        surgical_case_id: input.caseId,
        procedure_id: procedureId,
      })),
    });

    // Team invites sync (managed roles only)
    const existingInvites = await tx.staffInvite.findMany({
      where: { surgical_case_id: input.caseId, invited_role: { in: managedRoles } },
      select: { id: true, invited_user_id: true, invited_role: true, status: true },
    });

    const { toRemove } = diffPlannedStaffAssignments({
      desired: desiredAssignments,
      existing: existingInvites.map((i) => ({
        invited_user_id: i.invited_user_id,
        invited_role: i.invited_role,
      })),
      managedRoles,
    });

    if (toRemove.length > 0) {
      await tx.staffInvite.deleteMany({
        where: {
          surgical_case_id: input.caseId,
          OR: toRemove.map((r) => ({
            invited_user_id: r.invited_user_id,
            invited_role: r.invited_role,
          })),
        },
      });
    }

    for (const a of desiredAssignments) {
      const existing = existingInvites.find(
        (i) => i.invited_user_id === a.invitedUserId && i.invited_role === a.invitedRole,
      );

      if (!existing) {
        await tx.staffInvite.create({
          data: {
            surgical_case_id: input.caseId,
            invited_user_id: a.invitedUserId,
            invited_role: a.invitedRole,
            invited_by_user_id: input.invitorUserId,
            status: InviteStatus.ACCEPTED,
            acknowledged_at: new Date(),
          },
        });

        await tx.notification.create({
          data: {
            user_id: a.invitedUserId,
            sender_id: input.invitorUserId || null,
            type: 'IN_APP',
            status: 'PENDING',
            subject: 'Surgical Case Assignment',
            message: `You have been assigned to a surgical case for ${patientName} on ${formattedDate}.`,
            metadata: JSON.stringify({
              surgicalCaseId: input.caseId,
              patientName,
              procedureDate,
              role: a.invitedRole,
              event: 'SURGICAL_CASE_ASSIGNMENT',
            }),
          },
        });
      } else if (existing.status !== InviteStatus.ACCEPTED) {
        await tx.staffInvite.update({
          where: { id: existing.id },
          data: { status: InviteStatus.ACCEPTED, acknowledged_at: new Date() },
        });
      }
    }
  });

  return {
    primarySurgeonDoctorId: team.primarySurgeonDoctorId,
    surgeonDoctorIds: team.surgeonDoctorIds,
  };
}
