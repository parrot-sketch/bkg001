import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { Role } from '@/domain/enums/Role';

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        // 1. Authenticate request
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { role } = authResult.user;

        // 2. Check permissions (FRONTDESK or ADMIN)
        if (role !== Role.FRONTDESK && role !== Role.ADMIN) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        // 3. Execute DB Queries
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [totalRecords, newToday, newThisMonth] = await Promise.all([
            db.patient.count(),
            db.patient.count({ where: { created_at: { gte: startOfToday } } }),
            db.patient.count({ where: { created_at: { gte: startOfMonth } } }),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                totalRecords,
                newToday,
                newThisMonth,
            },
        });

    } catch (error) {
        console.error('[API] /api/frontdesk/patients/stats GET - Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch patient stats' },
            { status: 500 }
        );
    }
}
