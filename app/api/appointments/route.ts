/**
 * API Route: GET /api/appointments
 * 
 * Get Appointments endpoint.
 * 
 * Supports querying appointments by patientId with optional status filtering.
 * Includes consultation_request_status and related workflow fields.
 * 
 * Security:
 * - Requires authentication
 * - Patients can only query their own appointments
 * - Other roles have broader access based on RBAC
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { extractConsultationRequestFields } from '@/infrastructure/mappers/ConsultationRequestMapper';
import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';
import { DomainException } from '@/domain/exceptions/DomainException';
import { AppointmentSource, isAppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel, isBookingChannel } from '@/domain/enums/BookingChannel';
import { subDays } from 'date-fns';
import { createAppointmentRequestSchema, type CreateAppointmentRequest } from '@/application/dtos/CreateAppointmentRequest';
import { handleApiSuccess, handleApiError } from '@/app/api/_utils/handleApiError';
import { ValidationError } from '@/application/errors/ValidationError';
import { ForbiddenError } from '@/application/errors/ForbiddenError';
import { NotFoundError } from '@/application/errors/NotFoundError';
import { Role } from '@/domain/enums/Role';

/**
 * GET /api/appointments
 * 
 * Query params:
 * - patientId: Filter by patient ID (required for patients, optional for others)
 * - status: Filter by appointment status (optional)
 * - consultationRequestStatus: Filter by consultation request status (optional, comma-separated)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate request
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return handleApiError(new ForbiddenError('Authentication required'));
    }

    const userId = authResult.user.userId;
    const userRole = authResult.user.role;

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const patientIdParam = searchParams.get('patientId');
    const statusParam = searchParams.get('status');
    const consultationRequestStatusParam = searchParams.get('consultationRequestStatus');
    const dateParam = searchParams.get('date'); // ISO date string (YYYY-MM-DD)
    const startDateParam = searchParams.get('startDate'); // ISO date string
    const endDateParam = searchParams.get('endDate'); // ISO date string
    const upcomingParam = searchParams.get('upcoming'); // 'true' to get future appointments
    const limitParam = searchParams.get('limit'); // Optional limit (default: 100)

    // 3. Build where clause
    const where: any = {};

    // REFACTORED: Default date range filter for safety (last 90 days)
    // Prevents unbounded queries that could return thousands of records
    // Users can override with explicit date parameters
    const DEFAULT_DATE_RANGE_DAYS = 90;
    let hasExplicitDateFilter = false;

    // Patient ID filtering
    if (userRole === 'PATIENT') {
      // Patients can only query their own appointments
      // Resolve Patient ID from User ID
      const patient = await db.patient.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });

      if (patient) {
        where.patient_id = patient.id;
      } else {
        // If no patient record found, return empty array (patient hasn't created profile yet)
        return NextResponse.json(
          {
            success: true,
            data: [],
            message: 'Appointments retrieved successfully',
          },
          { status: 200 }
        );
      }
    } else if (patientIdParam) {
      // Other roles can query by patientId if provided
      where.patient_id = patientIdParam;
    }

    // Status filtering (supports comma-separated values)
    if (statusParam) {
      const statuses = statusParam.split(',').map(s => s.trim());
      if (statuses.length === 1) {
        // Single status value
        where.status = statuses[0];
      } else {
        // Multiple status values - use 'in' operator
        where.status = {
          in: statuses,
        };
      }
    }

    // Consultation request status filtering
    if (consultationRequestStatusParam) {
      const statuses = consultationRequestStatusParam.split(',').map(s => s.trim());
      where.consultation_request_status = {
        in: statuses,
      };
    }

    // Date filtering
    if (dateParam) {
      // Filter by specific date (start and end of that day)
      // Parse date string (YYYY-MM-DD) in local timezone to avoid UTC conversion issues
      try {
        const [year, month, day] = dateParam.split('-').map(Number);
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          throw new Error('Invalid date format');
        }
        
        // Create date in local timezone (not UTC)
        const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
        const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

        where.appointment_date = {
          gte: startOfDay,
          lte: endOfDay,
        };
        hasExplicitDateFilter = true;
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid date format. Use YYYY-MM-DD format.',
          },
          { status: 400 }
        );
      }
    } else if (startDateParam || endDateParam) {
      // Filter by date range
      const dateRange: any = {};

      if (startDateParam) {
        try {
          // Parse date string (YYYY-MM-DD) in local timezone
          const [year, month, day] = startDateParam.split('-').map(Number);
          if (isNaN(year) || isNaN(month) || isNaN(day)) {
            throw new Error('Invalid date format');
          }
          const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
          dateRange.gte = startDate;
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid startDate format. Use YYYY-MM-DD format.',
            },
            { status: 400 }
          );
        }
      }

      if (endDateParam) {
        try {
          // Parse date string (YYYY-MM-DD) in local timezone
          const [year, month, day] = endDateParam.split('-').map(Number);
          if (isNaN(year) || isNaN(month) || isNaN(day)) {
            throw new Error('Invalid date format');
          }
          const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
          dateRange.lte = endDate;
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid endDate format. Use YYYY-MM-DD format.',
            },
            { status: 400 }
          );
        }
      }

      if (Object.keys(dateRange).length > 0) {
        where.appointment_date = dateRange;
        hasExplicitDateFilter = true;
      }
    } else if (upcomingParam === 'true') {
      // Filter for upcoming appointments (future dates)
      // Use start of today in local timezone
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      where.appointment_date = {
        gte: todayStart,
      };
      hasExplicitDateFilter = true;
    } else {
      // REFACTORED: Apply default date range filter if no explicit date filter provided
      // This prevents unbounded queries that could return thousands of historical records
      // Default: last 90 days (reasonable for most use cases)
      const defaultSince = subDays(new Date(), DEFAULT_DATE_RANGE_DAYS);
      // Set to start of day in local timezone
      const defaultSinceStart = new Date(defaultSince.getFullYear(), defaultSince.getMonth(), defaultSince.getDate(), 0, 0, 0, 0);
      where.appointment_date = {
        gte: defaultSinceStart,
      };
    }

    // 4. Fetch appointments
    // REFACTORED: Added take limit to prevent unbounded queries
    // Default limit: 100 records (reasonable for API responses)
    // Users can override with ?limit parameter (max 500 for safety)
    const DEFAULT_LIMIT = 100;
    const MAX_LIMIT = 500;
    const requestedLimit = limitParam ? Number(limitParam) : DEFAULT_LIMIT;
    const finalLimit = Math.min(Math.max(1, requestedLimit), MAX_LIMIT); // Clamp between 1 and MAX_LIMIT

    // REFACTORED: Use select instead of include for better performance
    // Only fetch fields actually used by the API response
    const appointments = await db.appointment.findMany({
      where,
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
        appointment_date: 'desc',
      },
      take: finalLimit, // REFACTORED: Bounded query - prevents memory issues
    });

    // 5. Map to DTO format
    const mappedAppointments: AppointmentResponseDto[] = appointments.map((appointment) => {
      const consultationFields = extractConsultationRequestFields(appointment);

      return {
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
        patient: appointment.patient ? {
          id: appointment.patient.id,
          firstName: appointment.patient.first_name,
          lastName: appointment.patient.last_name,
          email: appointment.patient.email,
          phone: appointment.patient.phone,
          img: appointment.patient.img,
        } : undefined,
        doctor: appointment.doctor ? {
          id: appointment.doctor.id,
          name: appointment.doctor.name,
          specialization: appointment.doctor.specialization,
        } : undefined,
      };
    });

    // 6. Return success response
    return NextResponse.json(
      {
        success: true,
        data: mappedAppointments,
        message: 'Appointments retrieved successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Unexpected error - log and return generic error
    console.error('[API] /api/appointments - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/appointments
 * 
 * Creates a new appointment (consultation request).
 * 
 * Request body: ScheduleAppointmentDto
 * - patientId: Patient ID (or User ID - will be resolved)
 * - doctorId: Doctor ID
 * - appointmentDate: Date
 * - time: Time string
 * - type: Appointment type
 * - note: Optional notes
 * 
 * Security:
 * - Requires authentication
 * - Patients can only create appointments for themselves
 * - Other roles can create appointments for any patient
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate request
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return handleApiError(new ForbiddenError('Authentication required'));
    }

    const userId = authResult.user.userId;
    const userRole = authResult.user.role as Role;

    // 2. Parse and validate request body with Zod
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch (error) {
      return handleApiError(new ValidationError('Invalid JSON in request body'));
    }

    const validation = createAppointmentRequestSchema.safeParse(rawBody);
    if (!validation.success) {
      return handleApiError(ValidationError.fromZodError(validation.error));
    }

    const body = validation.data;

    // 3. Resolve Patient ID from User ID if needed
    // If user role is PATIENT, find their Patient record by user_id
    let patientId = body.patientId;

    if (userRole === Role.PATIENT) {
      // For patients, ensure they're creating appointment for themselves
      const patient = await db.patient.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });

      if (patient) {
        patientId = patient.id;
      } else {
        return handleApiError(new NotFoundError('Patient profile not found. Please complete your profile first.', 'Patient'));
      }
    } else {
      // For non-patient users (frontdesk, admin), patientId should already be a Patient ID
      // But we can validate it exists
      const patient = await db.patient.findUnique({
        where: { id: body.patientId },
        select: { id: true },
      });

      if (!patient) {
        return handleApiError(new NotFoundError(`Patient with ID ${body.patientId} not found`, 'Patient', body.patientId));
      }
    }

    // 4. Validate and resolve source field
    let source: AppointmentSource = body.source || AppointmentSource.PATIENT_REQUESTED;

    // Validate source enum value (already validated by Zod, but double-check)
    if (body.source && !isAppointmentSource(body.source)) {
      return handleApiError(new ValidationError(`Invalid appointment source: ${body.source}`));
    }

    // Validate booking channel if provided
    if (body.bookingChannel && !isBookingChannel(body.bookingChannel)) {
      return handleApiError(new ValidationError(`Invalid booking channel: ${body.bookingChannel}`));
    }

    // Role-based source restrictions:
    // - Patients can only create PATIENT_REQUESTED
    // - Doctors can create DOCTOR_FOLLOW_UP or PATIENT_REQUESTED
    // - Frontdesk can create FRONTDESK_SCHEDULED or PATIENT_REQUESTED
    // - Admins can create any source
    if (userRole === Role.PATIENT && source !== AppointmentSource.PATIENT_REQUESTED) {
      return handleApiError(new ForbiddenError('Patients can only create patient-requested appointments'));
    }
    if (userRole === Role.DOCTOR && source !== AppointmentSource.DOCTOR_FOLLOW_UP && source !== AppointmentSource.PATIENT_REQUESTED) {
      return handleApiError(new ForbiddenError('Doctors can only create follow-up or patient-requested appointments'));
    }
    if (userRole === Role.FRONTDESK && source === AppointmentSource.DOCTOR_FOLLOW_UP) {
      return handleApiError(new ForbiddenError('Frontdesk cannot create doctor follow-up appointments'));
    }

    // Default source for roles when not explicitly provided
    if (!body.source) {
      if (userRole === Role.FRONTDESK) source = AppointmentSource.FRONTDESK_SCHEDULED;
      else if (userRole === Role.ADMIN) source = AppointmentSource.ADMIN_SCHEDULED;
      else if (userRole === Role.PATIENT) source = AppointmentSource.PATIENT_REQUESTED;
      // For DOCTOR, keep PATIENT_REQUESTED unless explicitly set (backward compat)
    }

    // 5. Use ScheduleAppointmentUseCase to create appointment
    const { getScheduleAppointmentUseCase } = await import('@/lib/use-cases');
    const scheduleAppointmentUseCase = getScheduleAppointmentUseCase();

    const result = await scheduleAppointmentUseCase.execute({
      patientId: patientId,
      doctorId: body.doctorId,
      appointmentDate: body.appointmentDate,
      time: body.time,
      type: body.type,
      note: body.note,
      reason: body.reason,
      durationMinutes: body.durationMinutes,
      source,
      bookingChannel: body.bookingChannel,
      parentAppointmentId: body.parentAppointmentId,
      parentConsultationId: body.parentConsultationId,
    }, userId, userRole);

    // 6. Return success response (201 Created)
    return handleApiSuccess(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
