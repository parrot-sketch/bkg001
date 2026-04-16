/**
 * API Route: GET /api/theater-tech/theater-scheduling
 *
 * Returns surgical cases ready for theater booking (READY_FOR_THEATER_BOOKING status).
 * Uses TheaterSchedulingUseCase for clean architecture.
 *
 * - Requires authentication (THEATER_TECHNICIAN or ADMIN)
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

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));

    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { role } = authResult.user;
    if (role !== Role.THEATER_TECHNICIAN && role !== Role.ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Only theater tech can view scheduling queue' },
        { status: 403 },
      );
    }

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
    console.error('[API] /api/theater-tech/theater-scheduling GET - Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch scheduling queue' },
      { status: 500 },
    );
  }
}

