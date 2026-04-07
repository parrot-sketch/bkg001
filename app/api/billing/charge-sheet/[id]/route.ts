/**
 * API Route: GET /api/billing/charge-sheet/:id
 * 
 * Retrieve a specific charge sheet by its Payment ID.
 * Exposes finalized state and formal charge sheet ID.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { billingRepository } from '@/application/repositories/BillingRepository';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    try {
        const params = await context.params;

        // 1. Authenticate
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const paymentId = parseInt(params.id, 10);
        if (isNaN(paymentId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid charge sheet ID' },
                { status: 400 }
            );
        }

        // 2. Fetch charge sheet details via repository
        const chargeSheet = await billingRepository.findById(paymentId);

        if (!chargeSheet) {
            return NextResponse.json(
                { success: false, error: 'Charge sheet not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: chargeSheet
        });

    } catch (error) {
        console.error('[API] GET /api/billing/charge-sheet/:id - Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
