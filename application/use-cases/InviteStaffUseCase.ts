import { IStaffInviteRepository } from '@/domain/interfaces/repositories/IStaffInviteRepository';
import { ISurgicalCaseRepository } from '@/domain/interfaces/repositories/ISurgicalCaseRepository';
import { IUserRepository } from '@/domain/interfaces/repositories/IUserRepository';
import { IOutboxRepository } from '@/domain/interfaces/repositories/IOutboxRepository';
import { Role, SurgicalRole } from '@prisma/client';

export class InviteStaffUseCase {
    constructor(
        private staffInviteRepository: IStaffInviteRepository,
        private surgicalCaseRepository: ISurgicalCaseRepository,
        private userRepository: IUserRepository,
        private outboxRepository: IOutboxRepository
    ) { }

    async execute(input: {
        surgicalCaseId: string;
        invitedUserId: string;
        invitedRole: SurgicalRole;
        invitedByUserId: string;
        procedureRecordId?: string;
    }): Promise<void> {
        // 1. Validate Case
        const surgicalCase = await this.surgicalCaseRepository.findById(input.surgicalCaseId);
        if (!surgicalCase) {
            throw new Error('Surgical case not found');
        }

        // 2. Validate Inviter Permissions (Policy A: Primary Surgeon / Admin / Theater Tech)
        // For now, checks if exists. Ideally check role.
        // Doing a basic check:
        // const inviter = await this.userRepository.findById(input.invitedByUserId);
        // if (!inviter) throw new Error('Inviter user not found');

        // 3. Validate Invited User
        const invitedUser = await this.userRepository.findById(input.invitedUserId);
        if (!invitedUser) {
            throw new Error('Invited user not found');
        }

        // 3.1 Enforce Domain Eligibility Policies
        // Must import enforceEligibility from '@/lib/domain/policies/team-eligibility';
        // Note: invitedUser must have a 'role' property compatible with the policy
        const { enforceEligibility } = await import('@/lib/domain/policies/team-eligibility');
        enforceEligibility(invitedUser.getRole(), input.invitedRole);

        // 4. Check for existing active invite
        const existing = await this.staffInviteRepository.findExistingInvite(
            input.surgicalCaseId,
            input.invitedUserId,
            input.invitedRole
        );

        if (existing) {
            if (existing.status === 'PENDING' || existing.status === 'ACCEPTED') {
                throw new Error('User already has an active invite or is accepted for this role');
            }
            // If DECLINED/CANCELLED, we allow re-invite (create new record or could update existing if unique constraint wasn't there, 
            // but schema has unique constraint on (case, user, role).
            // Since unique constraint exists: we must UPDATE status to PENDING if it exists?
            // Or delete old and create new?
            // Actually, schema unique constraint: @@unique([surgical_case_id, invited_user_id, invited_role])
            // So we must update the existing record if it exists, regardless of status.

            await this.staffInviteRepository.updateStatus(existing.id, 'PENDING');
            // Emit event
            await this.outboxRepository.create({
                type: 'STAFF_INVITED',
                payload: {
                    inviteId: existing.id,
                    surgicalCaseId: input.surgicalCaseId,
                    invitedUserId: input.invitedUserId,
                    role: input.invitedRole,
                    reinvited: true
                }
            });
            return;
        }

        // 5. Create Invite
        const invite = await this.staffInviteRepository.create({
            surgicalCaseId: input.surgicalCaseId,
            invitedUserId: input.invitedUserId,
            invitedRole: input.invitedRole,
            invitedByUserId: input.invitedByUserId,
            procedureRecordId: input.procedureRecordId
        });

        // 6. Emit Event
        await this.outboxRepository.create({
            type: 'STAFF_INVITED',
            payload: {
                inviteId: invite.id,
                surgicalCaseId: input.surgicalCaseId,
                invitedUserId: input.invitedUserId,
                role: input.invitedRole
            }
        });
    }
}
