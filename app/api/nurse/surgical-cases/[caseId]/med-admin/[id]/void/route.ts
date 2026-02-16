import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { MedicationService } from '@/application/services/MedicationService';
import db from '@/lib/db';

const medService = new MedicationService(db);

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ caseId: string; id: string }> }
) {
    try {
        const { id } = await context.params;
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        if (authResult.user.role !== Role.NURSE && authResult.user.role !== Role.ADMIN) {
            return NextResponse.json({ success: false, error: 'Only nurses can void administrations' }, { status: 403 });
        }

        const body = await request.json();
        if (!body.reason) {
            return NextResponse.json({ success: false, error: 'Reason is required for voiding' }, { status: 400 });
        }

        const result = await medService.voidMedication(id, body.reason, authResult.user.userId);

        return NextResponse.json({
            success: true,
            data: result,
            message: 'Medication administration voided successfully',
        });
    } catch (error: any) {
        console.error('[API] POST med-admin void error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 400 });
    }
}
