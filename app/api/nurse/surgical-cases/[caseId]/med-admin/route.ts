import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { MedicationService } from '@/application/services/MedicationService';
import db from '@/lib/db';

const medService = new MedicationService(db);

/**
 * GET: List all administrations for this case
 * POST: Record a new administration (Draft or Given)
 */
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

        const administrations = await medService.getCaseAdministrations(caseId);

        return NextResponse.json({
            success: true,
            data: administrations,
        });
    } catch (error) {
        console.error('[API] GET med-admin error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> }
) {
    try {
        const { caseId } = await context.params;
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        if (authResult.user.role !== Role.NURSE && authResult.user.role !== Role.ADMIN) {
            return NextResponse.json({ success: false, error: 'Only nurses can administer medications' }, { status: 403 });
        }

        const body = await request.json();
        // Basic validation (In production, use Zod)
        if (!body.name || !body.doseValue || !body.doseUnit || !body.route) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // Optional: Link to form response if provided
        const formResponseId = body.formResponseId;

        const result = await medService.administerMedication(
            caseId,
            formResponseId,
            {
                inventoryItemId: body.inventoryItemId,
                name: body.name,
                doseValue: body.doseValue,
                doseUnit: body.doseUnit,
                route: body.route,
                notes: body.notes,
                administerNow: body.administerNow,
                administeredAt: body.administeredAt,
            },
            authResult.user.userId
        );

        return NextResponse.json({
            success: true,
            data: result,
            message: body.administerNow ? 'Medication administered successfully' : 'Medication draft saved',
        });
    } catch (error: any) {
        console.error('[API] POST med-admin error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 400 });
    }
}
