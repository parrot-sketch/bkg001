/**
 * API Route: GET /api/consultations/pending
 * 
 * Get Pending Consultation Requests endpoint.
 * 
 * Returns consultation requests with SUBMITTED or PENDING_REVIEW status
 * for Frontdesk to review and triage.
 * 
 * Security:
 * - Requires authentication (Frontdesk/Admin must be logged in)
 * - Only FRONTDESK or ADMIN roles can view pending requests
 * - Sorted by oldest first (created_at ascending)
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { extractConsultationRequestFields } from '@/infrastructure/mappers/ConsultationRequestMapper';
import { subDays } from 'date-fns';

/**
 * GET /api/consultations/pending
 * 
 * Handles fetching pending consultation requests for Frontdesk review.
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

    const userRole = authResult.user.role;

    // 2. Check permissions (only FRONTDESK or ADMIN can view pending requests)
    if (userRole !== Role.FRONTDESK && userRole !== Role.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only Frontdesk or Admin can view pending consultation requests',
        },
        { status: 403 }
      );
    }

    // 3. Fetch pending consultation requests
    // REFACTORED: Added date filter (last 90 days) and take limit
    // Prevents fetching thousands of old pending requests
    // REFACTORED: Use select instead of include for better performance
    const since = subDays(new Date(), 90); // Last 90 days
    const MAX_PENDING_REQUESTS = 100; // Reasonable limit for frontdesk review
    
    const pendingRequests = await db.appointment.findMany({
      where: {
        consultation_request_status: {
          in: [
            ConsultationRequestStatus.SUBMITTED,
            ConsultationRequestStatus.PENDING_REVIEW,
          ],
        },
        created_at: {
          gte: since, // REFACTORED: Only recent requests (last 90 days)
        },
      },
      select: {
        id: true,
        patient_id: true,
        doctor_id: true,
        appointment_date: true,
        time: true,
        status: true,
        type: true,
        note: true,
        reason: true,
        consultation_request_status: true,
        reviewed_by: true,
        reviewed_at: true,
        review_notes: true,
        created_at: true,
        updated_at: true,
        patient: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            date_of_birth: true,
            gender: true,
            img: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
            img: true,
          },
        },
      },
      orderBy: {
        created_at: 'asc', // Oldest first
      },
      take: MAX_PENDING_REQUESTS, // REFACTORED: Bounded query
    });

    // 4. Map Prisma models to DTO format
    const mappedRequests: (AppointmentResponseDto & { daysSinceSubmission: number })[] = pendingRequests.map((appointment) => {
      const consultationFields = extractConsultationRequestFields(appointment);
      const createdAt = appointment.created_at || new Date();
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - createdAt.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const dto: AppointmentResponseDto = {
        id: appointment.id,
        patientId: appointment.patient_id,
        doctorId: appointment.doctor_id,
        appointmentDate: appointment.appointment_date,
        time: appointment.time,
        status: appointment.status,
        type: appointment.type,
        note: appointment.note ?? undefined,
        reason: appointment.reason ?? undefined,
        consultationRequestStatus: consultationFields.consultationRequestStatus ?? undefined,
        reviewedBy: consultationFields.reviewedBy ?? undefined,
        reviewedAt: consultationFields.reviewedAt ?? undefined,
        reviewNotes: consultationFields.reviewNotes ?? undefined,
        createdAt: appointment.created_at,
        updatedAt: appointment.updated_at,
      };

      return {
        ...dto,
        daysSinceSubmission: diffDays,
      };
    });

    // 5. Rename variable for consistency
    const requestsWithMetadata = mappedRequests;

    // 6. Return success response
    return NextResponse.json(
      {
        success: true,
        data: requestsWithMetadata,
        message: 'Pending consultation requests retrieved successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Unexpected error - log and return generic error
    console.error('[API] /api/consultations/pending - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
