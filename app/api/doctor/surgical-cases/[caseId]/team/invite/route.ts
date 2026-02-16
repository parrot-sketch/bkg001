import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { InviteStaffUseCase } from '@/application/use-cases/InviteStaffUseCase';
import { PrismaStaffInviteRepository } from '@/infrastructure/database/repositories/PrismaStaffInviteRepository';
import { PrismaSurgicalCaseRepository } from '@/infrastructure/database/repositories/PrismaSurgicalCaseRepository';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import { PrismaOutboxRepository } from '@/infrastructure/database/repositories/PrismaOutboxRepository';
import { SurgicalRole } from '@prisma/client';

import { db } from '@/lib/db';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> }
) {
    try {
        const { caseId } = await context.params;

        // 1. Auth
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        // Allow Doctor, Admin, TheaterTech (as per policy)
        const allowedRoles = ['DOCTOR', 'ADMIN', 'THEATER_TECHNICIAN'];
        if (!allowedRoles.includes(authResult.user.role)) {
            return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
        }

        const body = await request.json();
        const { invitedUserId, invitedRole, procedureRecordId } = body;

        if (!invitedUserId || !invitedRole) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // Validate role enum
        if (!Object.values(SurgicalRole).includes(invitedRole)) {
            return NextResponse.json({ success: false, error: 'Invalid surgical role' }, { status: 400 });
        }

        // 2. Instantiate dependencies
        const staffInviteRepo = new PrismaStaffInviteRepository();
        const surgicalCaseRepo = new PrismaSurgicalCaseRepository(db);
        const userRepo = new PrismaUserRepository(db);
        const outboxRepo = new PrismaOutboxRepository();

        const inviteStaffUseCase = new InviteStaffUseCase(
            staffInviteRepo,
            surgicalCaseRepo,
            userRepo,
            outboxRepo
        );

        // 3. Execute Use Case
        await inviteStaffUseCase.execute({
            surgicalCaseId: caseId,
            invitedUserId,
            invitedRole: invitedRole as SurgicalRole,
            invitedByUserId: authResult.user.userId,
            procedureRecordId
        });

        return NextResponse.json({
            success: true,
            message: 'Invitation sent successfully'
        });

    } catch (error: any) {
        console.error('[API] POST /team/invite error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal server error'
        }, { status: 500 }); // Or map specific errors to 400/404
    }
}
