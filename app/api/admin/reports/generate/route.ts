/**
 * API Route: POST /api/admin/reports/generate
 * 
 * Generate Report endpoint.
 * 
 * Generates system reports based on specified criteria.
 * 
 * Security:
 * - Requires authentication
 * - Only ADMIN role can access
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';

/**
 * POST /api/admin/reports/generate
 * 
 * Generates a report
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
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

    // 3. Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    const { reportType, startDate, endDate, includePatients, includeStaff, includeAppointments } = body;

    // 4. Validate report type
    if (!reportType || !['DAILY', 'WEEKLY', 'MONTHLY'].includes(reportType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid reportType. Must be DAILY, WEEKLY, or MONTHLY',
        },
        { status: 400 }
      );
    }

    // 5. Calculate date range based on report type
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    let start: Date;
    if (startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
    } else {
      start = new Date(end);
      switch (reportType) {
        case 'DAILY':
          start.setDate(start.getDate() - 1);
          break;
        case 'WEEKLY':
          start.setDate(start.getDate() - 7);
          break;
        case 'MONTHLY':
          start.setMonth(start.getMonth() - 1);
          break;
      }
      start.setHours(0, 0, 0, 0);
    }

    // 6. Build report data
    const report: any = {
      reportType,
      startDate: start,
      endDate: end,
      generatedAt: new Date(),
      generatedBy: authResult.user.userId,
    };

    // 7. Include requested data
    if (includePatients !== false) {
      const patients = await db.patient.count({
        where: {
          created_at: {
            gte: start,
            lte: end,
          },
        },
      });
      report.patients = {
        total: patients,
      };
    }

    if (includeStaff !== false) {
      const [doctors, nurses, frontdesk] = await Promise.all([
        db.doctor.count({
          where: {
            created_at: {
              gte: start,
              lte: end,
            },
          },
        }),
        db.user.count({
          where: {
            role: 'NURSE',
            created_at: {
              gte: start,
              lte: end,
            },
          },
        }),
        db.user.count({
          where: {
            role: 'FRONTDESK',
            created_at: {
              gte: start,
              lte: end,
            },
          },
        }),
      ]);
      report.staff = {
        doctors,
        nurses,
        frontdesk,
        total: doctors + nurses + frontdesk,
      };
    }

    if (includeAppointments !== false) {
      const appointments = await db.appointment.count({
        where: {
          appointment_date: {
            gte: start,
            lte: end,
          },
        },
      });
      report.appointments = {
        total: appointments,
      };
    }

    // 8. Return report
    return NextResponse.json(
      {
        success: true,
        data: report,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/admin/reports/generate - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate report',
      },
      { status: 500 }
    );
  }
}
