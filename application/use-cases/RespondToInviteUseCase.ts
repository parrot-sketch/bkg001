import { IStaffInviteRepository } from '@/domain/interfaces/repositories/IStaffInviteRepository';
import { IOutboxRepository } from '@/domain/interfaces/repositories/IOutboxRepository';
import { ISurgicalCaseRepository } from '@/domain/interfaces/repositories/ISurgicalCaseRepository';
import { InviteStatus } from '@prisma/client';

export class RespondToInviteUseCase {
    constructor(
        private staffInviteRepository: IStaffInviteRepository,
        private outboxRepository: IOutboxRepository,
        private surgicalCaseRepository: ISurgicalCaseRepository
    ) { }

    async execute(input: {
        inviteId: string;
        response: 'ACCEPT' | 'DECLINE';
        responderUserId: string;
        declinedReason?: string;
    }): Promise<void> {
        const invite = await this.staffInviteRepository.findById(input.inviteId);
        if (!invite) {
            throw new Error('Invite not found');
        }

        if (invite.invited_user_id !== input.responderUserId) {
            throw new Error('Unauthorized to respond to this invite');
        }

        if (invite.status !== 'PENDING') {
            throw new Error(`Invite is already ${invite.status}`);
        }

        const newStatus = input.response === 'ACCEPT' ? InviteStatus.ACCEPTED : InviteStatus.DECLINED;

        // Update status
        await this.staffInviteRepository.updateStatus(input.inviteId, newStatus, {
            declinedReason: input.declinedReason,
            acknowledgedAt: input.response === 'ACCEPT' ? new Date() : undefined
        });

        // Emit event
        await this.outboxRepository.create({
            type: input.response === 'ACCEPT' ? 'STAFF_INVITE_ACCEPTED' : 'STAFF_INVITE_DECLINED',
            payload: {
                inviteId: invite.id,
                surgicalCaseId: invite.surgical_case_id,
                userId: input.responderUserId,
                role: invite.invited_role,
                reason: input.declinedReason
            }
        });

        // If accepted, add to surgical staff
        if (input.response === 'ACCEPT') {
            let procedureRecordId = invite.procedure_record_id;

            // If invite doesn't have a record ID, try to find one on the case
            if (!procedureRecordId) {
                const surgicalCase = await this.surgicalCaseRepository.findById(invite.surgical_case_id) as any;
                if (surgicalCase?.procedure_record?.id) {
                    procedureRecordId = surgicalCase.procedure_record.id;
                }
            }

            if (procedureRecordId) {
                await this.surgicalCaseRepository.addStaff({
                    procedureRecordId,
                    userId: input.responderUserId,
                    role: invite.invited_role
                });
            } else {
                // If no procedure record exists, we can't add them yet.
                // They remain "Accepted" as an invite, but not on the team.
                // The expectation is that when Procedure Record IS initialized, 
                // it should pull accepted invites. (This logic might be missing too, but for now this covers existing records).
                console.warn(`[RespondToInvite] Accepted invite ${invite.id} but no procedure record found for case ${invite.surgical_case_id}`);
            }
        }
    }
}
