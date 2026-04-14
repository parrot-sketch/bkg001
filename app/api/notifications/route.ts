import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import db, { withRetry } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/jwt-helper';

/**
 * GET /api/notifications
 *
 * Fetches the current user's notifications.
 *
 * Query params:
 *   - maxAge: number of days to look back (default 7, max 30)
 *   - includeRead: "true" to include read notifications older than 1 day (default false)
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
        const { searchParams } = new URL(request.url);

        // 2. Parse query params
        const maxAgeDays = Math.min(
            Math.max(parseInt(searchParams.get('maxAge') || '7', 10) || 7, 1),
            30
        );
        const includeRead = searchParams.get('includeRead') === 'true';

        const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);

        // 3. Build where clause
        const where: Prisma.NotificationWhereInput = {
            user_id: userId,
            created_at: { gte: cutoffDate },
        };

        if (!includeRead) {
            // Show all unread + read notifications from last 24 hours only
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            where.OR = [
                { status: { not: 'READ' } },           // All unread regardless of age (within maxAge)
                {                                        // Read but recent
                    status: 'READ',
                    created_at: { gte: oneDayAgo },
                },
            ];
            // Remove the top-level created_at filter when using OR
            delete where.created_at;
            where.AND = [
                { user_id: userId },
                { created_at: { gte: cutoffDate } },
                {
                    OR: [
                        { status: { not: 'READ' } },
                        {
                            status: 'READ',
                            created_at: { gte: oneDayAgo },
                        },
                    ],
                },
            ];
            delete where.OR;
            delete where.created_at;
        }

        // 4. Fetch notifications from database (with retry for pool exhaustion resilience)
        const notifications = await withRetry(() => db.notification.findMany({
            where,
            orderBy: {
                created_at: 'desc',
            },
            take: 50,
        }));

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
