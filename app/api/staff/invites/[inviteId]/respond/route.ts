import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { RespondToInviteUseCase } from '@/application/use-cases/RespondToInviteUseCase';
import { PrismaStaffInviteRepository } from '@/infrastructure/database/repositories/PrismaStaffInviteRepository';
import { PrismaSurgicalCaseRepository } from '@/infrastructure/database/repositories/PrismaSurgicalCaseRepository';
import { PrismaOutboxRepository } from '@/infrastructure/database/repositories/PrismaOutboxRepository';
import db from '@/lib/db';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ inviteId: string }> }
): Promise<NextResponse> {
    try {
        const { inviteId } = await context.params;
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        const { response, declinedReason } = body;

        if (!response || !['ACCEPT', 'DECLINE'].includes(response)) {
            return NextResponse.json({ success: false, error: 'Invalid response action' }, { status: 400 });
        }

        if (response === 'DECLINE' && !declinedReason) {
            return NextResponse.json({ success: false, error: 'Reason required for declining' }, { status: 400 });
        }

        const staffInviteRepo = new PrismaStaffInviteRepository();
        const outboxRepo = new PrismaOutboxRepository();
        const surgicalCaseRepo = new PrismaSurgicalCaseRepository(db);

        const respondUseCase = new RespondToInviteUseCase(staffInviteRepo, outboxRepo, surgicalCaseRepo);

        await respondUseCase.execute({
            inviteId,
            response,
            responderUserId: authResult.user.userId,
            declinedReason
        });

        return NextResponse.json({
            success: true,
            message: `Invite ${response === 'ACCEPT' ? 'accepted' : 'declined'}`
        });

    } catch (error: any) {
        console.error('[API] POST /staff/invites/respond error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal server error'
        }, { status: 500 });
    }
}
