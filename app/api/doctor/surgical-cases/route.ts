/**
 * API Route: GET /api/doctor/surgical-cases
 *
 * Returns all surgical cases for the authenticated doctor.
 * Includes patient, case plan, theater booking, and consultation relations.
 *
 * Security:
 * - Requires authentication
 * - Only DOCTOR role can access
 * - Scoped to the requesting doctor's cases
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { surgicalCaseService } from '@/lib/factories/theaterTechFactory';

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        // 1. Authenticate
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 },
            );
        }

        // 2. Authorize (Doctor only)
        if (authResult.user.role !== 'DOCTOR') {
            return NextResponse.json(
                { success: false, error: 'Forbidden: Doctors only' },
                { status: 403 },
            );
        }

        // 3. Resolve doctor profile from user ID
        const doctorProfile = await db.doctor.findUnique({
            where: { user_id: authResult.user.userId },
        });

        if (!doctorProfile) {
            return NextResponse.json(
                { success: false, error: 'Doctor profile not found' },
                { status: 404 },
            );
        }

        // 4. Fetch cases for this surgeon
        const cases = await surgicalCaseService.getSurgeonCases(doctorProfile.id);

        // 5. Map to response DTO
        const mapped = cases.map((sc: any) => ({
            id: sc.id,
            status: sc.status,
            urgency: sc.urgency,
            diagnosis: sc.diagnosis,
            procedureName: sc.procedure_name,
            createdAt: sc.created_at,
            updatedAt: sc.updated_at,
            patient: sc.patient
                ? {
                      id: sc.patient.id,
                      firstName: sc.patient.first_name,
                      lastName: sc.patient.last_name,
                      fileNumber: sc.patient.file_number,
                  }
                : null,
            primarySurgeon: sc.primary_surgeon
                ? {
                      id: sc.primary_surgeon.id,
                      name: sc.primary_surgeon.name,
                  }
                : null,
            casePlan: sc.case_plan
                ? {
                      id: sc.case_plan.id,
                      readinessStatus: sc.case_plan.readiness_status,
                      readyForSurgery: sc.case_plan.ready_for_surgery,
                      procedurePlan: sc.case_plan.procedure_plan,
                      appointmentId: sc.case_plan.appointment_id,
                  }
                : null,
            theaterBooking: sc.theater_booking
                ? {
                      id: sc.theater_booking.id,
                      startTime: sc.theater_booking.start_time,
                      endTime: sc.theater_booking.end_time,
                      status: sc.theater_booking.status,
                      theaterName: sc.theater_booking.theater?.name ?? null,
                  }
                : null,
            consultation: sc.consultation
                ? {
                      id: sc.consultation.id,
                      appointmentId: sc.consultation.appointment_id,
                      completedAt: sc.consultation.completed_at,
                  }
                : null,
        }));

        return NextResponse.json({ success: true, data: mapped });
    } catch (error) {
        console.error('[API] GET /api/doctor/surgical-cases - Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 },
        );
    }
}
