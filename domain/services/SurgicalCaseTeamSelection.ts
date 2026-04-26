import { SurgicalRole } from '@prisma/client';

export interface PlannedTeamSelectionUserIds {
  primarySurgeonUserId: string;
  assistantSurgeonUserIds?: string[];
  anesthesiologistUserId?: string | null;
  scrubNurseUserId?: string | null;
  circulatingNurseUserId?: string | null;
}

export interface PlannedStaffAssignment {
  invitedUserId: string;
  invitedRole: SurgicalRole;
}

function uniqueNonEmpty(ids: Array<string | null | undefined>) {
  const out: string[] = [];
  for (const id of ids) {
    const trimmed = (id ?? '').trim();
    if (!trimmed) continue;
    if (!out.includes(trimmed)) out.push(trimmed);
  }
  return out;
}

/**
 * Build the desired staff assignments for a surgical case from a planned team selection.
 *
 * Notes:
 * - Primary surgeon is always included as SurgicalRole.SURGEON.
 * - Assistants are included as SurgicalRole.ASSISTANT_SURGEON.
 * - Optional roles are only included when user ids are provided.
 * - Duplicate user ids across roles are allowed (e.g. a user could be both SCRUB_NURSE and CIRCULATING_NURSE),
 *   but duplicates within the same role are removed.
 */
export function buildPlannedStaffAssignments(
  selection: PlannedTeamSelectionUserIds,
): PlannedStaffAssignment[] {
  const primarySurgeonUserId = (selection.primarySurgeonUserId || '').trim();
  if (!primarySurgeonUserId) {
    throw new Error('primarySurgeonUserId is required');
  }

  const assistantIds = uniqueNonEmpty(selection.assistantSurgeonUserIds ?? []).filter(
    (id) => id !== primarySurgeonUserId,
  );

  const assignments: PlannedStaffAssignment[] = [
    { invitedUserId: primarySurgeonUserId, invitedRole: SurgicalRole.SURGEON },
    ...assistantIds.map((id) => ({
      invitedUserId: id,
      invitedRole: SurgicalRole.ASSISTANT_SURGEON,
    })),
  ];

  const anesthId = (selection.anesthesiologistUserId ?? '').trim();
  if (anesthId) {
    assignments.push({ invitedUserId: anesthId, invitedRole: SurgicalRole.ANESTHESIOLOGIST });
  }

  const scrubId = (selection.scrubNurseUserId ?? '').trim();
  if (scrubId) {
    assignments.push({ invitedUserId: scrubId, invitedRole: SurgicalRole.SCRUB_NURSE });
  }

  const circId = (selection.circulatingNurseUserId ?? '').trim();
  if (circId) {
    assignments.push({ invitedUserId: circId, invitedRole: SurgicalRole.CIRCULATING_NURSE });
  }

  return assignments;
}

export interface ExistingInviteKey {
  invited_user_id: string;
  invited_role: SurgicalRole;
}

export interface InviteDiff {
  toUpsert: PlannedStaffAssignment[];
  toRemove: ExistingInviteKey[];
}

export function diffPlannedStaffAssignments(args: {
  desired: PlannedStaffAssignment[];
  existing: ExistingInviteKey[];
  managedRoles: SurgicalRole[];
}): InviteDiff {
  const desiredKeys = new Set(args.desired.map((d) => `${d.invitedUserId}::${d.invitedRole}`));

  const existingManaged = args.existing.filter((e) => args.managedRoles.includes(e.invited_role));
  const existingKeys = new Set(existingManaged.map((e) => `${e.invited_user_id}::${e.invited_role}`));

  const toUpsert = args.desired.filter((d) => !existingKeys.has(`${d.invitedUserId}::${d.invitedRole}`));
  const toRemove = existingManaged
    .filter((e) => !desiredKeys.has(`${e.invited_user_id}::${e.invited_role}`))
    .map((e) => ({ invited_user_id: e.invited_user_id, invited_role: e.invited_role }));

  return { toUpsert, toRemove };
}

