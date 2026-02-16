import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { CancelInviteUseCase } from '@/application/use-cases/CancelInviteUseCase';
import { PrismaStaffInviteRepository } from '@/infrastructure/database/repositories/PrismaStaffInviteRepository';
import { PrismaOutboxRepository } from '@/infrastructure/database/repositories/PrismaOutboxRepository';

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ caseId: string; inviteId: string }> }
): Promise<NextResponse> {
    try {
        const { caseId, inviteId } = await context.params;

        // 1. Auth
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        // 2. Instantiate dependencies
        const staffInviteRepo = new PrismaStaffInviteRepository();
        const outboxRepo = new PrismaOutboxRepository();

        const cancelInviteUseCase = new CancelInviteUseCase(staffInviteRepo, outboxRepo);

        // 3. Execute
        await cancelInviteUseCase.execute({
            inviteId,
            cancellerUserId: authResult.user.userId
        });

        return NextResponse.json({
            success: true,
            message: 'Invitation cancelled successfully'
        });

    } catch (error: any) {
        console.error('[API] DELETE /team/invite error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal server error'
        }, { status: 500 });
    }
}
