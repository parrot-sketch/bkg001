/**
 * API Route: GET /api/frontdesk/theater-scheduling
 *
 * Returns surgical cases ready for theater booking (READY_FOR_THEATER_BOOKING status).
 * Uses TheaterSchedulingUseCase for clean architecture.
 *
 * - Requires authentication (FRONTDESK or ADMIN)
 * - Returns cases with patient, surgeon, procedure details
 * - Includes pre-op checklist completion status
 * - Supports pagination with page and limit query params
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { TheaterSchedulingFactory } from '@/application/services/TheaterSchedulingFactory';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);

        // Validate pagination params
        const safePage = Math.max(1, page);
        const safeLimit = Math.min(100, Math.max(1, limit));

        // 1. Authenticate
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { role } = authResult.user;

        // 2. Check permissions (FRONTDESK or ADMIN only)
        if (role !== Role.FRONTDESK && role !== Role.ADMIN) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Access denied: Only frontdesk staff can view theater scheduling queue',
                },
                { status: 403 }
            );
        }

        // 3. Fetch cases using use case with pagination
        const useCase = TheaterSchedulingFactory.getInstance();
        const result = await useCase.getSchedulingQueue({ page: safePage, limit: safeLimit });

        return NextResponse.json({
            success: true,
            data: {
                cases: result.cases,
                count: result.cases.length,
                total: result.total,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.ceil(result.total / safeLimit),
            },
        });
    } catch (error) {
        console.error('[API] /api/frontdesk/theater-scheduling GET - Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch theater scheduling queue',
            },
            { status: 500 }
        );
    }
}
