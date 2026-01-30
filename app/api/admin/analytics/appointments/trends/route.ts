/**
 * API Route: GET /api/admin/analytics/appointments/trends
 * 
 * Appointment Trends Analytics endpoint.
 * 
 * Returns daily appointment counts for the specified number of days.
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
 * GET /api/admin/analytics/appointments/trends
 * 
 * Returns appointment trends data
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

    // 5. Fetch appointment counts grouped by date using raw SQL for performance
    // This avoids fetching thousands of rows and processing in memory
    const dailyCounts = await db.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT 
        DATE(appointment_date) as date, 
        COUNT(*) as count
      FROM "Appointment"
      WHERE appointment_date >= ${startDate} 
      AND appointment_date <= ${endDate}
      GROUP BY DATE(appointment_date)
      ORDER BY date ASC
    `;

    // 6. Map results to ensure all dates in range are represented
    const trendsMap = new Map<string, number>();

    // Fill map from DB results
    dailyCounts.forEach(row => {
      // Handle potential timezone differences by relying on the string format
      const dateKey = format(new Date(row.date), 'yyyy-MM-dd');
      trendsMap.set(dateKey, Number(row.count));
    });

    // Generate complete date range (filling gaps with 0)
    const trends: { date: string; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const date = subDays(endDate, days - 1 - i);
      const dateKey = format(startOfDay(date), 'yyyy-MM-dd');
      trends.push({
        date: dateKey,
        count: trendsMap.get(dateKey) || 0
      });
    }



    // 8. Return trends data
    return NextResponse.json(
      {
        success: true,
        data: trends,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/admin/analytics/appointments/trends - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch appointment trends',
      },
      { status: 500 }
    );
  }
}
