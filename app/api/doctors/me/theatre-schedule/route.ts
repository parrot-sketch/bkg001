/**
 * API Route: GET /api/doctors/me/theatre-schedule
 * 
 * Get theater schedule for a doctor with CasePlan data.
 * 
 * Security:
 * - Requires authentication
 * - Only DOCTOR role can access
 * - Doctors can only view their own theater schedule
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { AppointmentStatus } from '@prisma/client';
import { format } from 'date-fns';

/**
 * GET /api/doctors/me/theatre-schedule
 * 
 * Query params:
 * - startDate: Date (YYYY-MM-DD) - optional, defaults to today
 * - endDate: Date (YYYY-MM-DD) - optional, defaults to 7 days from today
 * 
 * Returns appointments with CasePlan data for theater schedule.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (authResult.user.role !== Role.DOCTOR) {
      return NextResponse.json(
        { success: false, error: 'Only doctors can view their theater schedule' },
        { status: 403 }
      );
    }

    // 2. Get doctor ID
    const doctor = await db.doctor.findUnique({
      where: { user_id: authResult.user.userId },
      select: { id: true },
    });

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor profile not found' },
        { status: 404 }
      );
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      try {
        startDate = new Date(startDateParam);
        endDate = new Date(endDateParam);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error('Invalid date format');
        }
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid date format. Use YYYY-MM-DD format.' },
          { status: 400 }
        );
      }
    } else {
      // Default: today to 7 days ahead
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      endDate.setHours(23, 59, 59, 999);
    }

    // 4. Fetch appointments with CasePlan data
    const appointments = await db.appointment.findMany({
      where: {
        doctor_id: doctor.id,
        OR: [
          // 1. Appointments explicitly SCHEDULED (Booking confirmed)
          {
            appointment_date: {
              gte: startDate,
              lte: endDate,
            },
            status: AppointmentStatus.SCHEDULED,
          },
          // 2. OR Completed Consultations that need procedure (Waiting List)
          // These might be in the past (appointment_date), but we want to see them to schedule them.
          // Note: Ideally, we should ignore dates for waiting list, or check recent ones.
          // For now, let's include those within the window OR just all waiting list items?
          // User said "retrieved" -> implied waiting list.
          // Let's broaden the date range for Waiting List or remove date constraint for them?
          // To keep it simple and performant for now: we'll check recently completed consults in this window
          // OR we remove date constraint for Waiting List. Let's try OR logic.
          {
            status: AppointmentStatus.COMPLETED,
            consultation: {
              outcome_type: 'PROCEDURE_RECOMMENDED',
            },
            // Filter out if they already have a "future" scheduled appointment? 
            // Too complex for single query. Let's just retrieve them.
          }
        ]
      },
      include: {
        patient: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            file_number: true,
          },
        },
        case_plan: {
          select: {
            id: true,
            procedure_plan: true,
            readiness_status: true,
            ready_for_surgery: true,
            risk_factors: true,
            pre_op_notes: true,
            special_instructions: true,
            planned_anesthesia: true,
          },
        },
      },
      orderBy: {
        appointment_date: 'asc',
      },
    });

    // 5. Map to theater schedule format
    const theatreCases = appointments.map((apt) => ({
      appointment: {
        id: apt.id,
        patientId: apt.patient_id,
        doctorId: apt.doctor_id,
        appointmentDate: apt.appointment_date,
        time: apt.time,
        type: apt.type,
        status: apt.status,
      },
      patientName: `${apt.patient.first_name} ${apt.patient.last_name}`,
      procedure: apt.case_plan?.procedure_plan || apt.type || 'Consultation',
      casePlan: apt.case_plan
        ? {
          id: apt.case_plan.id,
          appointment_id: apt.id,
          procedure_plan: apt.case_plan.procedure_plan,
          readiness_status: apt.case_plan.readiness_status,
          ready_for_surgery: apt.case_plan.ready_for_surgery,
          risk_factors: apt.case_plan.risk_factors,
          pre_op_notes: apt.case_plan.pre_op_notes,
          special_instructions: apt.case_plan.special_instructions,
        }
        : undefined,
    }));

    // 6. Return response
    return NextResponse.json(
      {
        success: true,
        data: theatreCases,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/doctors/me/theatre-schedule GET - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch theater schedule' },
      { status: 500 }
    );
  }
}
