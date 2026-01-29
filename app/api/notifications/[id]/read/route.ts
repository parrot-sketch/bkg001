import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/jwt-helper';

/**
 * POST /api/notifications/[id]/read
 * 
 * Marks a specific notification as read.
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        // 1. Authenticate request
        const authResult = await authenticateRequest(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json(
                { success: false, error: authResult.error || 'Authentication required' },
                { status: 401 }
            );
        }

        const userId = authResult.user.userId;
        const notificationId = parseInt(id);

        if (isNaN(notificationId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid notification ID' },
                { status: 400 }
            );
        }

        // 2. Update notification in database
        // Ensure the notification belongs to the user
        const notification = await db.notification.findUnique({
            where: { id: notificationId },
        });

        if (!notification) {
            return NextResponse.json(
                { success: false, error: 'Notification not found' },
                { status: 404 }
            );
        }

        if (notification.user_id !== userId) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        const updatedNotification = await db.notification.update({
            where: { id: notificationId },
            data: {
                status: 'READ',
                read_at: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            data: updatedNotification,
        });
    } catch (error) {
        console.error('[API] POST /api/notifications/[id]/read - Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
