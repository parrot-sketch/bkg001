/**
 * API Route: GET /api/admin/dashboard/stats
 * 
 * Admin Dashboard Statistics endpoint.
 * 
 * Returns aggregated statistics for the admin dashboard:
 * - Total patients, staff (doctors, nurses, frontdesk)
 * - Today's and upcoming appointments
 * - Pending tasks (pre-op, post-op, approvals)
 * 
 * Security:
 * - Requires authentication
 * - Only ADMIN role can access
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { AppointmentStatus } from '@prisma/client';

/**
 * GET /api/admin/dashboard/stats
 * 
 * Returns dashboard statistics for admin
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

    // 3. Calculate statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get counts in parallel
    const [
      totalPatients,
      totalDoctors,
      totalNurses,
      totalFrontdesk,
      appointmentsToday,
      appointmentsUpcoming,
      pendingApprovals,
    ] = await Promise.all([
      // Total patients
      db.patient.count({
        where: {
          approved: true, // Only approved patients
        },
      }),

      // Total doctors
      db.doctor.count({
        where: {
          onboarding_status: 'ACTIVE',
        },
      }),

      // Total nurses
      db.user.count({
        where: {
          role: 'NURSE',
          status: 'ACTIVE',
        },
      }),

      // Total frontdesk
      db.user.count({
        where: {
          role: 'FRONTDESK',
          status: 'ACTIVE',
        },
      }),

      // Today's appointments
      // Note: AppointmentStatus enum only has: PENDING, SCHEDULED, CANCELLED, COMPLETED
      // There is no CONFIRMED status - using SCHEDULED and PENDING instead
      db.appointment.count({
        where: {
          appointment_date: {
            gte: today,
            lt: tomorrow,
          },
          status: {
            in: [AppointmentStatus.SCHEDULED, AppointmentStatus.PENDING],
          },
        },
      }),

      // Upcoming appointments (after today)
      db.appointment.count({
        where: {
          appointment_date: {
            gte: tomorrow,
          },
          status: {
            in: [AppointmentStatus.SCHEDULED, AppointmentStatus.PENDING],
          },
        },
      }),

      // Pending patient approvals
      db.patient.count({
        where: {
          approved: false,
        },
      }),
    ]);

    // Calculate pre-op and post-op pending tasks
    // Pre-op: Appointments with status SCHEDULED or PENDING that are upcoming
    const pendingPreOp = await db.appointment.count({
      where: {
        appointment_date: {
          gte: today,
        },
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.PENDING],
        },
        // Check if there's a pre-op care note
        // This is a simplified check - you may want to join with care_notes table
      },
    });

    // Post-op: Completed appointments that might need follow-up
    // This is a simplified check - you may want to check for post-op care notes
    const pendingPostOp = await db.appointment.count({
      where: {
        status: AppointmentStatus.COMPLETED,
        appointment_date: {
          gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    // 4. Return statistics
    return NextResponse.json(
      {
        success: true,
        data: {
          totalPatients,
          totalStaff: totalDoctors + totalNurses + totalFrontdesk,
          totalDoctors,
          totalNurses,
          totalFrontdesk,
          appointmentsToday,
          appointmentsUpcoming,
          pendingPreOp,
          pendingPostOp,
          pendingApprovals,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/admin/dashboard/stats - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard statistics',
      },
      { status: 500 }
    );
  }
}
