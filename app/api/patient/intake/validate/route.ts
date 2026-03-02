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
import { validateIntakeSessionAccess, getIntakeSecurityConfig } from '@/lib/middleware/intake-security';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const sessionId = searchParams.get('sessionId');
        
        if (!sessionId) {
            return NextResponse.json(
                { allowed: false, reason: 'Session ID is required' },
                { status: 400 },
            );
        }
        
        const config = getIntakeSecurityConfig();
        const validation = await validateIntakeSessionAccess(sessionId, request, config);
        
        if (!validation.allowed) {
            return NextResponse.json(
                { allowed: false, reason: validation.reason },
                { status: 403 },
            );
        }
        
        return NextResponse.json({
            allowed: true,
            session: validation.session,
        });
    } catch (error) {
        console.error('[IntakeValidation] Error:', error);
        return NextResponse.json(
            { allowed: false, reason: 'Internal server error' },
            { status: 500 },
        );
    }
}
