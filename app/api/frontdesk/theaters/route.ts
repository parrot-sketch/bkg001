import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { authorizeApiRequest } from '@/lib/auth/require-role';
import { Role } from '@/domain/enums/Role';

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        if (!authorizeApiRequest({ success: true, user }, [Role.FRONTDESK, Role.NURSE, Role.ADMIN])) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
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
                hourly_rate: true,
            },
            orderBy: {
                name: 'asc'
            }
        });

        // Map to include hourlyRate for frontend
        const mappedTheaters = theaters.map(t => ({
            id: t.id,
            name: t.name,
            type: t.type,
            hourlyRate: t.hourly_rate || 0,
        }));

        return NextResponse.json({ success: true, data: mappedTheaters });
    } catch (error: any) {
        console.error('Fetch Theaters Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
