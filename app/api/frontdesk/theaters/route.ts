import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Only allow FRONTDESK or ADMIN roles
        if (user.role !== 'FRONTDESK' && user.role !== 'ADMIN') {
             return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const theaters = await db.theater.findMany({
            where: {
                is_active: true,
                status: 'ACTIVE'
            },
            select: {
                id: true,
                name: true,
                type: true,
            },
            orderBy: {
                name: 'asc'
            }
        });

        return NextResponse.json({ success: true, data: theaters });
    } catch (error: any) {
        console.error('Fetch Theaters Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
