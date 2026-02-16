import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { MedicationService } from '@/application/services/MedicationService';
import db from '@/lib/db';

const medService = new MedicationService(db);

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> }
) {
    try {
        const { caseId } = await context.params;
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        // Authorization: NURSE or DOCTOR
        if (![Role.NURSE, Role.DOCTOR, Role.ADMIN].includes(authResult.user.role as Role)) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';

        const medications = await medService.listEligibleMedications(query);

        return NextResponse.json({
            success: true,
            data: medications,
        });
    } catch (error) {
        console.error('[API] GET medications error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
