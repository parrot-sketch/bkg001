import { IOutboxRepository } from '@/domain/interfaces/repositories/IOutboxRepository';
import db from '@/lib/db';
import { NotificationType, NotificationStatus } from '@prisma/client';

export class NotificationDispatcher {
    constructor(private outboxRepository: IOutboxRepository) { }

    async processPendingEvents(limit: number = 20): Promise<{ processed: number; errors: number }> {
        const events = await this.outboxRepository.findPending(limit);
        let processedCount = 0;
        let errorCount = 0;

        for (const event of events) {
            try {
                await this.processEvent(event);
                await this.outboxRepository.markProcessed(event.id);
                processedCount++;
            } catch (error: any) {
                console.error(`Failed to process event ${event.id}:`, error);
                await this.outboxRepository.markFailed(event.id, error.message || 'Unknown error');
                errorCount++;
            }
        }

        return { processed: processedCount, errors: errorCount };
    }

    private async processEvent(event: any) {
        const payload = JSON.parse(event.payload);

        switch (event.type) {
            case 'STAFF_INVITED':
                await this.handleStaffInvited(payload);
                break;
            case 'STAFF_INVITE_ACCEPTED':
                await this.handleInviteResponse(payload, 'ACCEPTED');
                break;
            case 'STAFF_INVITE_DECLINED':
                await this.handleInviteResponse(payload, 'DECLINED');
                break;
            case 'STAFF_INVITE_CANCELLED':
                await this.handleInviteCancelled(payload);
                break;
            default:
                console.warn(`Unknown event type: ${event.type}`);
        }
    }

    private async handleStaffInvited(payload: any) {
        // payload: { inviteId, surgicalCaseId, invitedUserId, role, reinvited? }
        // Notify the invited user
        await db.notification.create({
            data: {
                user_id: payload.invitedUserId,
                type: NotificationType.IN_APP,
                status: NotificationStatus.PENDING,
                subject: 'Surgical Team Invitation',
                message: `You have been invited to join a surgical case as ${payload.role}.`,
                metadata: JSON.stringify({
                    inviteId: payload.inviteId,
                    caseId: payload.surgicalCaseId,
                    role: payload.role,
                    link: '/staff/invites'
                })
            }
        });
    }

    private async handleInviteResponse(payload: any, response: 'ACCEPTED' | 'DECLINED') {
        // payload: { inviteId, surgicalCaseId, userId, role, reason? }
        // Notify the inviter. Need to look up the invite to find the inviter.
        const invite = await db.staffInvite.findUnique({
            where: { id: payload.inviteId },
            include: { invited_user: true }
        });

        if (!invite) {
            console.warn(`Invite ${payload.inviteId} not found during notification processing`);
            return;
        }

        const responderName = `${invite.invited_user.first_name} ${invite.invited_user.last_name}`;
        const message = response === 'ACCEPTED'
            ? `${responderName} accepted your invitation for ${payload.role}.`
            : `${responderName} declined your invitation for ${payload.role}. Reason: ${payload.reason || 'None'}`;

        await db.notification.create({
            data: {
                user_id: invite.invited_by_user_id,
                type: NotificationType.IN_APP,
                status: NotificationStatus.PENDING, // Pending delivery/read
                subject: `Staff Invitation ${response === 'ACCEPTED' ? 'Accepted' : 'Declined'}`,
                message: message,
                metadata: JSON.stringify({
                    inviteId: payload.inviteId,
                    caseId: payload.surgicalCaseId,
                    link: `#` // TODO: Link to case plan
                })
            }
        });
    }

    private async handleInviteCancelled(payload: any) {
        // payload: { inviteId, surgicalCaseId, userId, role }
        // Notify the assignee that invite is cancelled
        await db.notification.create({
            data: {
                user_id: payload.userId,
                type: NotificationType.IN_APP,
                status: NotificationStatus.PENDING,
                subject: 'Invitation Cancelled',
                message: `The invitation for ${payload.role} on a surgical case has been cancelled.`,
                metadata: JSON.stringify({
                    caseId: payload.surgicalCaseId
                })
            }
        });
    }
}
