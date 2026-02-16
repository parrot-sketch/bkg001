import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { PrismaStaffInviteRepository } from '@/infrastructure/database/repositories/PrismaStaffInviteRepository';
import { InviteStatus } from '@prisma/client';

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') as InviteStatus | null;

        const repo = new PrismaStaffInviteRepository();
        const invites = await repo.findByUser(authResult.user.userId, status || undefined);

        return NextResponse.json({
            success: true,
            data: invites
        });

    } catch (error: any) {
        console.error('[API] GET /staff/invites error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
