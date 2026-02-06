import { NextRequest, NextResponse } from 'next/server';
import { UpdatePasswordUseCase } from '@/application/use-cases/UpdatePasswordUseCase';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import { PrismaAuditService } from '@/infrastructure/services/PrismaAuditService';
import { db } from '@/lib/db';
import { getCurrentUserFull } from '@/lib/auth/server-auth';

const userRepository = new PrismaUserRepository(db);
const auditService = new PrismaAuditService(db);
const updatePasswordUseCase = new UpdatePasswordUseCase(userRepository, auditService);

export async function PUT(request: NextRequest) {
    try {
        const currentUser = await getCurrentUserFull();

        if (!currentUser) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { success: false, error: 'Current password and new password are required' },
                { status: 400 }
            );
        }

        await updatePasswordUseCase.execute({
            userId: currentUser.id,
            currentPassword,
            newPassword,
        });

        return NextResponse.json({
            success: true,
            message: 'Password updated successfully',
        });
    } catch (error: any) {
        console.error('Error updating password:', error);

        if (error.message?.includes('incorrect') || error.message?.includes('at least')) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Failed to update password' },
            { status: 500 }
        );
    }
}
