/**
 * Notification Helper
 *
 * Utility functions for creating in-app notifications.
 * Follows existing patterns in the codebase.
 */

import { db } from '@/lib/db';
import { NotificationType, NotificationStatus, Role } from '@prisma/client';

export interface CreateNotificationParams {
    userId: string;
    type: NotificationType | string;
    subject?: string;
    message: string;
    metadata?: Record<string, any>;
    senderId?: string;
}

/**
 * Creates an in-app notification for a user
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
    try {
        await db.notification.create({
            data: {
                user_id: params.userId,
                sender_id: params.senderId || null,
                type: params.type as NotificationType,
                status: NotificationStatus.SENT,
                subject: params.subject || null,
                message: params.message,
                metadata: params.metadata ? JSON.stringify(params.metadata) : null,
                sent_at: new Date(),
            },
        });
    } catch (error) {
        console.error('[NOTIFICATION] Failed to create notification:', error);
        // Don't throw - notifications are non-critical
    }
}

/**
 * Creates notifications for all users with a specific role
 */
export async function createNotificationForRole(
    role: Role,
    params: Omit<CreateNotificationParams, 'userId'>
): Promise<void> {
    try {
        const users = await db.user.findMany({
            where: { role },
            select: { id: true },
        });

        await Promise.all(
            users.map(user =>
                createNotification({
                    ...params,
                    userId: user.id,
                })
            )
        );
    } catch (error) {
        console.error('[NOTIFICATION] Failed to create notifications for role:', error);
    }
}
