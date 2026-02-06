/**
 * API Route: POST /api/appointments/:id/checkin
 * 
 * Check-in endpoint for appointments.
 * 
 * Security:
 * - Requires authentication
 * - Only Frontdesk and Admin roles can perform check-in
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCheckInPatientUseCase } from '@/lib/use-cases';
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import { DomainException } from '@/domain/exceptions/DomainException';
import { CheckInPatientDto } from '@/application/dtos/CheckInPatientDto';

/**
 * POST /api/appointments/:id/checkin
 * 
 * Handles patient check-in for an appointment.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    try {
        // 1. Authenticate request
        const authResult = await authenticateRequest(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json(
                {
                    success: false,
                    error: authResult.error || 'Authentication required',
                },
                { status: 401 }
            );
        }

        const { userId, role } = authResult.user;

        // 2. Authorize role (Frontdesk or Admin only)
        if (role !== 'FRONTDESK' && role !== 'ADMIN') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Access denied: Only frontdesk staff can perform check-ins',
                },
                { status: 403 }
            );
        }

        // 3. Extract and validate appointment ID from params
        const resolvedParams = await params;
        const appointmentId = parseInt(resolvedParams.id, 10);
        if (isNaN(appointmentId)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid appointment ID format',
                },
                { status: 400 }
            );
        }

        // 4. Extract body for potential additional fields
        const body = await request.json().catch(() => ({}));
        const { notes } = body;

        const dto: CheckInPatientDto = {
            appointmentId,
            userId,
            notes,
        };

        // 5. Execute use case
        const checkInUseCase = getCheckInPatientUseCase();
        const result = await checkInUseCase.execute(dto);

        // 6. Return success response
        return NextResponse.json(
            {
                success: true,
                data: result,
                message: 'Patient checked in successfully',
            },
            { status: 200 }
        );
    } catch (error) {
        if (error instanceof DomainException) {
            return NextResponse.json(
                {
                    success: false,
                    error: error.message,
                },
                { status: 400 }
            );
        }

        console.error('[API] POST /api/appointments/[id]/checkin - Unexpected error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error during check-in process',
            },
            { status: 500 }
        );
    }
}
