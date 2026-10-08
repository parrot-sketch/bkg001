/**
 * API Route: GET /api/patient/intake/validate
 * 
 * Validates intake session access before showing the form.
 * Checks:
 * - Session exists and is active
 * - Session not expired
 * - IP address is in allowed range (if configured)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    validateIntakeSessionAccess,
    getIntakeSecurityConfig,
    guardIntakeRequest,
    isValidSessionId,
} from '@/lib/middleware/intake-security';

export async function GET(request: NextRequest) {
    try {
        const blocked = guardIntakeRequest(request, 'validate');
        if (blocked) return blocked;

        const sessionId = request.nextUrl.searchParams.get('sessionId');
        
        if (!isValidSessionId(sessionId)) {
            return NextResponse.json(
                { allowed: false, code: 'SESSION_NOT_FOUND', reason: 'This link is not valid. Please scan the QR code at the front desk again.' },
                { status: 400 },
            );
        }
        
        const config = getIntakeSecurityConfig();
        const validation = await validateIntakeSessionAccess(sessionId, request, config);
        
        if (!validation.allowed) {
            return NextResponse.json(
                { allowed: false, code: validation.code, reason: validation.reason },
                { status: 403 },
            );
        }
        
        return NextResponse.json({
            allowed: true,
            session: { expiresAt: validation.session?.expiresAt },
        });
    } catch (error) {
        console.error('[IntakeValidation] Error:', error);
        return NextResponse.json(
            { allowed: false, reason: 'Internal server error' },
            { status: 500 },
        );
    }
}
