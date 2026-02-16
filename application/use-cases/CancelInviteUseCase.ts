import { IStaffInviteRepository } from '@/domain/interfaces/repositories/IStaffInviteRepository';
import { IOutboxRepository } from '@/domain/interfaces/repositories/IOutboxRepository';
import { InviteStatus } from '@prisma/client';

export class CancelInviteUseCase {
    constructor(
        private staffInviteRepository: IStaffInviteRepository,
        private outboxRepository: IOutboxRepository
    ) { }

    async execute(input: {
        inviteId: string;
        cancellerUserId: string;
    }): Promise<void> {
        const invite = await this.staffInviteRepository.findById(input.inviteId);
        if (!invite) {
            throw new Error('Invite not found');
        }

        // Ideally check if canceller is the one who invited OR is an admin/primary surgeon
        // Simple check: is inviter
        if (invite.invited_by_user_id !== input.cancellerUserId) {
            // TODO: Allow Admin override
            throw new Error('Unauthorized to cancel this invite');
        }

        if (invite.status !== 'PENDING') {
            throw new Error(`Cannot cancel invite that is ${invite.status}`);
        }

        // Update status
        await this.staffInviteRepository.updateStatus(input.inviteId, InviteStatus.CANCELLED);

        // Emit event
        await this.outboxRepository.create({
            type: 'STAFF_INVITE_CANCELLED',
            payload: {
                inviteId: invite.id,
                surgicalCaseId: invite.surgical_case_id,
                userId: invite.invited_user_id,
                role: invite.invited_role
            }
        });
    }
}
