import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * GET /api/services
 * 
 * Returns all active services for consultation booking
 * Public endpoint - no authentication required
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Fetch active services from database
    const services = await db.service.findMany({
      where: {
        is_active: true,
      },
      orderBy: {
        service_name: 'asc',
      },
      select: {
        id: true,
        service_name: true,
        description: true,
        price: true,
        category: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: services,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/services - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch services',
      },
      { status: 500 }
    );
  }
}
