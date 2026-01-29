import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/jwt-helper';

/**
 * GET /api/notifications
 * 
 * Fetches the current user's notifications.
 */
export async function GET(request: NextRequest) {
    try {
        // 1. Authenticate request
        const authResult = await authenticateRequest(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json(
                { success: false, error: authResult.error || 'Authentication required' },
                { status: 401 }
            );
        }

        const userId = authResult.user.userId;

        // 2. Fetch notifications from database
        const notifications = await db.notification.findMany({
            where: {
                user_id: userId,
            },
            orderBy: {
                created_at: 'desc',
            },
            take: 50, // Limit to recent 50
        });

        return NextResponse.json({
            success: true,
            data: notifications,
        });
    } catch (error) {
        console.error('[API] GET /api/notifications - Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
