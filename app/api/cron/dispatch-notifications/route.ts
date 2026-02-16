import { NextRequest, NextResponse } from 'next/server';
import { PrismaOutboxRepository } from '@/infrastructure/database/repositories/PrismaOutboxRepository';
import { NotificationDispatcher } from '@/application/services/NotificationDispatcher';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        // Optional: Check for CRON_SECRET if environment variable is set
        const authHeader = request.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const outboxRepo = new PrismaOutboxRepository();
        const dispatcher = new NotificationDispatcher(outboxRepo);

        const result = await dispatcher.processPendingEvents(50); // Process up to 50 events per run

        return NextResponse.json({
            success: true,
            processed: result.processed,
            errors: result.errors
        });

    } catch (error: any) {
        console.error('[Cron] Dispatch Notifications failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal server error'
        }, { status: 500 });
    }
}
