/**
 * API Route: GET /api/admin/analytics/patients/intake
 * 
 * Patient Intake Statistics endpoint.
 * 
 * Returns daily patient registration counts for the specified number of days.
 * 
 * Query params:
 * - days: Number of days to look back (default: 30)
 * 
 * Security:
 * - Requires authentication
 * - Only ADMIN role can access
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { format, subDays, startOfDay } from 'date-fns';

/**
 * GET /api/admin/analytics/patients/intake
 * 
 * Returns patient intake statistics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate request
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // 2. Check permissions (only ADMIN)
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Admin access required',
        },
        { status: 403 }
      );
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid days parameter. Must be between 1 and 365',
        },
        { status: 400 }
      );
    }

    // 4. Calculate date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = subDays(endDate, days - 1);
    startDate.setHours(0, 0, 0, 0);

    // 5. Fetch patients created in date range
    const patients = await db.patient.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        created_at: true,
      },
    });

    // 6. Group patients by date
    const dateCountMap = new Map<string, number>();

    // Initialize all dates in range with 0
    for (let i = 0; i < days; i++) {
      const date = subDays(endDate, days - 1 - i);
      const dateKey = format(startOfDay(date), 'yyyy-MM-dd');
      dateCountMap.set(dateKey, 0);
    }

    // Count patients per date
    patients.forEach((patient) => {
      const dateKey = format(startOfDay(patient.created_at), 'yyyy-MM-dd');
      const currentCount = dateCountMap.get(dateKey) || 0;
      dateCountMap.set(dateKey, currentCount + 1);
    });

    // 7. Convert to array format
    const intake = Array.from(dateCountMap.entries())
      .map(([date, count]) => ({
        date,
        count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 8. Return intake data
    return NextResponse.json(
      {
        success: true,
        data: intake,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/admin/analytics/appointments/intake - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch patient intake statistics',
      },
      { status: 500 }
    );
  }
}
