import type { PrismaClient, Prisma } from '@prisma/client';
import { InviteStatus, Role, SurgicalRole } from '@prisma/client';
import { isEligibleForSurgicalRole } from '@/lib/domain/policies/team-eligibility';
import bcrypt from 'bcrypt';
import {
  buildPlannedStaffAssignments,
  diffPlannedStaffAssignments,
} from '@/domain/services/SurgicalCaseTeamSelection';

export const VALID_PROCEDURE_CATEGORIES = [
  'FACIAL',
  'BODY',
  'BREAST',
  'SKIN_AND_SCAR',
  'NON_SURGICAL',
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
  customAnesthesiologistName: string | null;
  customScrubNurseName: string | null;
  customCirculatingNurseName: string | null;
  customPrimarySurgeonName: string | null;
  customAssistantSurgeonNames: string[];
  customProcedureCategory: string | null;
  customProcedureNames: string[];
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

  const customAnesthesiologistName =
    typeof body?.customAnesthesiologistName === 'string' && body.customAnesthesiologistName.trim()
      ? body.customAnesthesiologistName.trim()
      : null;
  const customScrubNurseName =
    typeof body?.customScrubNurseName === 'string' && body.customScrubNurseName.trim()
      ? body.customScrubNurseName.trim()
      : null;
  const customCirculatingNurseName =
    typeof body?.customCirculatingNurseName === 'string' && body.customCirculatingNurseName.trim()
      ? body.customCirculatingNurseName.trim()
      : null;

  const customPrimarySurgeonName =
    typeof body?.customPrimarySurgeonName === 'string' && body.customPrimarySurgeonName.trim()
      ? body.customPrimarySurgeonName.trim()
      : null;
  const customAssistantSurgeonNames: string[] = Array.isArray(body?.customAssistantSurgeonNames)
    ? body.customAssistantSurgeonNames.filter((n: any) => typeof n === 'string' && n.trim())
    : [];
  const customProcedureCategory =
    typeof body?.customProcedureCategory === 'string' && body.customProcedureCategory.trim()
      ? body.customProcedureCategory.trim()
      : null;
  const customProcedureNames: string[] = Array.isArray(body?.customProcedureNames)
    ? body.customProcedureNames.filter((n: any) => typeof n === 'string' && n.trim())
    : [];

  return {
    primarySurgeonDoctorId,
    assistantSurgeonDoctorIds,
    surgeonDoctorIds,
    anesthesiologistUserId,
    scrubNurseUserId,
    circulatingNurseUserId,
    customAnesthesiologistName,
    customScrubNurseName,
    customCirculatingNurseName,
    customPrimarySurgeonName,
    customAssistantSurgeonNames,
    customProcedureCategory,
    customProcedureNames,
  };
}

function assertEligibility(userRole: Role, surgicalRole: SurgicalRole) {
  if (!isEligibleForSurgicalRole(userRole, surgicalRole)) {
    throw new Error(`User role '${userRole}' is not eligible for surgical role '${surgicalRole}'`);
  }
}

async function resolveCustomStaffUserId(
  db: PrismaClient,
  name: string,
  role: Role,
): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Custom staff name is required');
  }

  const existing = await db.user.findFirst({
    where: {
      OR: [
        { first_name: trimmed },
        { last_name: trimmed },
        { email: trimmed },
      ],
      role,
    },
    select: { id: true },
  });

  if (existing?.id) {
    return existing.id;
  }

  const email = `external-${Date.now()}@placeholder.local`;
  const passwordHash = await bcrypt.hash('external', 10);

  const user = await db.user.create({
    data: {
      email,
      password_hash: passwordHash,
      role,
      status: 'ACTIVE',
      first_name: trimmed,
      last_name: '',
    },
    select: { id: true },
  });

  return user.id;
}

async function resolveCustomSurgeonDoctorId(db: PrismaClient, customName: string): Promise<string> {
  const trimmed = customName.trim();
  if (!trimmed) {
    throw new Error('Custom surgeon name is required');
  }

  const existing = await db.doctor.findFirst({
    where: { name: trimmed },
    select: { id: true },
  });

  if (existing?.id) {
    return existing.id;
  }

  const email = `external-${Date.now()}@placeholder.local`;
  const passwordHash = await bcrypt.hash('external', 10);
  const licenseNumber = `EXT-${Date.now().toString(36).toUpperCase()}`;

  const user = await db.user.create({
    data: {
      email,
      password_hash: passwordHash,
      role: 'DOCTOR',
      status: 'ACTIVE',
      first_name: trimmed,
      last_name: '',
    },
    select: { id: true },
  });

  const doctor = await db.doctor.create({
    data: {
      user_id: user.id,
      email,
      first_name: trimmed,
      last_name: '',
      name: trimmed,
      specialization: 'External',
      license_number: licenseNumber,
      phone: 'N/A',
      address: 'External',
      availability_status: 'AVAILABLE',
      type: 'FULL',
      onboarding_status: 'INVITED',
    },
    select: { id: true },
  });

  return doctor.id;
}

async function resolveCustomProcedureId(db: PrismaClient | Prisma.TransactionClient, name: string, category: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Custom procedure name is required');
  }

  const existing = await db.surgicalProcedureOption.findFirst({
    where: {
      name: trimmed,
      category: category as any,
    },
    select: { id: true },
  });

  if (existing?.id) {
    return existing.id;
  }

  const procedure = await db.surgicalProcedureOption.create({
    data: {
      name: trimmed,
      category: category as any,
      is_active: true,
      is_billable: true,
    },
    select: { id: true },
  });

  return procedure.id;
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

  // Resolve custom primary surgeon if provided
  let resolvedPrimarySurgeonDoctorId = team.primarySurgeonDoctorId;
  if (!resolvedPrimarySurgeonDoctorId && team.customPrimarySurgeonName) {
    resolvedPrimarySurgeonDoctorId = await resolveCustomSurgeonDoctorId(db, team.customPrimarySurgeonName);
  }

  // Resolve custom assistant surgeons if provided
  const resolvedAssistantSurgeonDoctorIds: string[] = [];
  for (const customName of team.customAssistantSurgeonNames) {
    const doctorId = await resolveCustomSurgeonDoctorId(db, customName);
    resolvedAssistantSurgeonDoctorIds.push(doctorId);
  }

  const allSurgeonDoctorIds = [
    resolvedPrimarySurgeonDoctorId,
    ...resolvedAssistantSurgeonDoctorIds,
    ...team.assistantSurgeonDoctorIds.filter((id) => id !== resolvedPrimarySurgeonDoctorId && !resolvedAssistantSurgeonDoctorIds.includes(id)),
  ].filter(Boolean);

  if (
    !procedureDate ||
    !resolvedPrimarySurgeonDoctorId ||
    !diagnosis ||
    !procedureCategory ||
    !primaryOrRevision
  ) {
    throw new Error('All required fields must be filled including a primary surgeon');
  }

  const effectiveCategory = team.customProcedureCategory || procedureCategory;
  if (!VALID_PROCEDURE_CATEGORIES.includes(effectiveCategory as any) && effectiveCategory !== team.customProcedureCategory) {
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
    where: { id: { in: allSurgeonDoctorIds } },
    select: { id: true, user_id: true },
  });

  const primaryDoctor = doctors.find((d) => d.id === resolvedPrimarySurgeonDoctorId);
  if (!primaryDoctor?.user_id) {
    throw new Error('Primary surgeon must have a linked user account');
  }

  const assistantDoctors = doctors
    .filter((d) => d.id !== resolvedPrimarySurgeonDoctorId)
    .filter((d) => allSurgeonDoctorIds.includes(d.id))
    .filter((d) => !!d.user_id);

  // Resolve custom non-surgeon staff names to user IDs
  let resolvedAnesthesiologistUserId = team.anesthesiologistUserId;
  let resolvedScrubNurseUserId = team.scrubNurseUserId;
  let resolvedCirculatingNurseUserId = team.circulatingNurseUserId;

  if (team.customAnesthesiologistName) {
    resolvedAnesthesiologistUserId = await resolveCustomStaffUserId(
      db,
      team.customAnesthesiologistName,
      Role.DOCTOR,
    );
  }
  if (team.customScrubNurseName) {
    resolvedScrubNurseUserId = await resolveCustomStaffUserId(
      db,
      team.customScrubNurseName,
      Role.NURSE,
    );
  }
  if (team.customCirculatingNurseName) {
    resolvedCirculatingNurseUserId = await resolveCustomStaffUserId(
      db,
      team.customCirculatingNurseName,
      Role.NURSE,
    );
  }

  // Validate non-surgeon staff users
  const nonSurgeonUserIds = [
    resolvedAnesthesiologistUserId,
    resolvedScrubNurseUserId,
    resolvedCirculatingNurseUserId,
  ].filter(Boolean) as string[];

  const nonSurgeonUsers = nonSurgeonUserIds.length
    ? await db.user.findMany({
        where: { id: { in: nonSurgeonUserIds } },
        select: { id: true, role: true },
      })
    : [];
  const userRoleMap = new Map(nonSurgeonUsers.map((u) => [u.id, u.role]));

  if (resolvedAnesthesiologistUserId) {
    const role = userRoleMap.get(resolvedAnesthesiologistUserId);
    if (!role) throw new Error(`User not found: ${resolvedAnesthesiologistUserId}`);
    assertEligibility(role, SurgicalRole.ANESTHESIOLOGIST);
  }
  if (resolvedScrubNurseUserId) {
    const role = userRoleMap.get(resolvedScrubNurseUserId);
    if (!role) throw new Error(`User not found: ${resolvedScrubNurseUserId}`);
    assertEligibility(role, SurgicalRole.SCRUB_NURSE);
  }
  if (resolvedCirculatingNurseUserId) {
    const role = userRoleMap.get(resolvedCirculatingNurseUserId);
    if (!role) throw new Error(`User not found: ${resolvedCirculatingNurseUserId}`);
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
    anesthesiologistUserId: resolvedAnesthesiologistUserId,
    scrubNurseUserId: resolvedScrubNurseUserId,
    circulatingNurseUserId: resolvedCirculatingNurseUserId,
  });

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    // Create custom procedures if provided
    const customProcedureIds: string[] = [];
    if (team.customProcedureNames.length > 0) {
      for (const customName of team.customProcedureNames) {
        const procedureId = await resolveCustomProcedureId(tx, customName, effectiveCategory);
        customProcedureIds.push(procedureId);
      }
    }

    const allProcedureIds = [...procedureIds, ...customProcedureIds];

    // Case update
    await tx.surgicalCase.update({
      where: { id: input.caseId },
      data: {
        procedure_date: new Date(procedureDate),
        primary_surgeon_id: resolvedPrimarySurgeonDoctorId,
        surgeon_ids: allSurgeonDoctorIds.length > 0 ? JSON.stringify(allSurgeonDoctorIds) : null,
        diagnosis,
        procedure_category: effectiveCategory,
        primary_or_revision: primaryOrRevision,
        // Never regress a case that already progressed beyond planning (e.g., READY_FOR_THEATER_BOOKING).
        ...(surgicalCase.status === 'DRAFT' ? { status: 'PLANNING' } : {}),
      },
    });

    // Procedures sync
    await tx.surgicalCaseProcedure.deleteMany({ where: { surgical_case_id: input.caseId } });
    await tx.surgicalCaseProcedure.createMany({
      data: allProcedureIds.map((procedureId: string) => ({
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
    primarySurgeonDoctorId: resolvedPrimarySurgeonDoctorId,
    surgeonDoctorIds: allSurgeonDoctorIds,
  };
}
