import { NextRequest, NextResponse } from 'next/server';
import { UpdateEmailUseCase } from '@/application/use-cases/UpdateEmailUseCase';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import { PrismaAuditService } from '@/infrastructure/services/PrismaAuditService';
import { db } from '@/lib/db';
import { getCurrentUserFull } from '@/lib/auth/server-auth';

const userRepository = new PrismaUserRepository(db);
const auditService = new PrismaAuditService(db);
const updateEmailUseCase = new UpdateEmailUseCase(userRepository, auditService);

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
        const { newEmail, currentPassword } = body;

        if (!newEmail || !currentPassword) {
            return NextResponse.json(
                { success: false, error: 'New email and current password are required' },
                { status: 400 }
            );
        }

        await updateEmailUseCase.execute({
            userId: currentUser.id,
            newEmail,
            currentPassword,
        });

        // Also update the Doctor table email if user is a doctor
        if (currentUser.role === 'DOCTOR' && currentUser.doctor_profile?.id) {
            await db.doctor.update({
                where: { id: currentUser.doctor_profile.id },
                data: { email: newEmail },
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Email updated successfully',
        });
    } catch (error: any) {
        console.error('Error updating email:', error);

        if (error.message?.includes('incorrect') || error.message?.includes('already in use')) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Failed to update email' },
            { status: 500 }
        );
    }
}
