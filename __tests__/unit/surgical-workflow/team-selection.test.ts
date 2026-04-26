import { describe, it, expect } from 'vitest';
import { SurgicalRole } from '@prisma/client';
import {
  buildPlannedStaffAssignments,
  diffPlannedStaffAssignments,
} from '@/domain/services/SurgicalCaseTeamSelection';

describe('SurgicalCaseTeamSelection', () => {
  describe('buildPlannedStaffAssignments', () => {
    it('requires a primary surgeon user id', () => {
      expect(() =>
        buildPlannedStaffAssignments({
          primarySurgeonUserId: '',
        }),
      ).toThrow(/primarySurgeonUserId is required/i);
    });

    it('builds assignments and removes duplicate assistant ids and excludes primary from assistants', () => {
      const assignments = buildPlannedStaffAssignments({
        primarySurgeonUserId: 'user-surgeon',
        assistantSurgeonUserIds: [
          'user-assistant-1',
          'user-assistant-1',
          'user-surgeon', // should be excluded
          '  user-assistant-2  ',
          '',
        ],
        anesthesiologistUserId: 'user-anesth',
        scrubNurseUserId: 'user-scrub',
        circulatingNurseUserId: 'user-circ',
      });

      expect(assignments).toEqual([
        { invitedUserId: 'user-surgeon', invitedRole: SurgicalRole.SURGEON },
        { invitedUserId: 'user-assistant-1', invitedRole: SurgicalRole.ASSISTANT_SURGEON },
        { invitedUserId: 'user-assistant-2', invitedRole: SurgicalRole.ASSISTANT_SURGEON },
        { invitedUserId: 'user-anesth', invitedRole: SurgicalRole.ANESTHESIOLOGIST },
        { invitedUserId: 'user-scrub', invitedRole: SurgicalRole.SCRUB_NURSE },
        { invitedUserId: 'user-circ', invitedRole: SurgicalRole.CIRCULATING_NURSE },
      ]);
    });
  });

  describe('diffPlannedStaffAssignments', () => {
    it('returns managed-role removals for invites not in desired set', () => {
      const desired = buildPlannedStaffAssignments({
        primarySurgeonUserId: 'u1',
        assistantSurgeonUserIds: ['u2'],
      });

      const diff = diffPlannedStaffAssignments({
        desired,
        existing: [
          { invited_user_id: 'u1', invited_role: SurgicalRole.SURGEON },
          { invited_user_id: 'u2', invited_role: SurgicalRole.ASSISTANT_SURGEON },
          { invited_user_id: 'u3', invited_role: SurgicalRole.ASSISTANT_SURGEON }, // should be removed
          { invited_user_id: 'u4', invited_role: SurgicalRole.THEATER_TECHNICIAN }, // unmanaged, ignored
        ],
        managedRoles: [
          SurgicalRole.SURGEON,
          SurgicalRole.ASSISTANT_SURGEON,
          SurgicalRole.ANESTHESIOLOGIST,
          SurgicalRole.SCRUB_NURSE,
          SurgicalRole.CIRCULATING_NURSE,
        ],
      });

      expect(diff.toRemove).toEqual([
        { invited_user_id: 'u3', invited_role: SurgicalRole.ASSISTANT_SURGEON },
      ]);
    });
  });
});

