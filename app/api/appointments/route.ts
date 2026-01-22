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
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { extractConsultationRequestFields } from '@/infrastructure/mappers/ConsultationRequestMapper';
import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';
import { DomainException } from '@/domain/exceptions/DomainException';
import { subDays } from 'date-fns';
import type { CreateAppointmentRequest } from '@/types/api-requests';

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
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || 'Authentication required',
        },
        { status: 401 }
      );
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

    // Status filtering
    if (statusParam) {
      where.status = statusParam;
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
      try {
        const targetDate = new Date(dateParam);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        
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
          const startDate = new Date(startDateParam);
          startDate.setHours(0, 0, 0, 0);
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
          const endDate = new Date(endDateParam);
          endDate.setHours(23, 59, 59, 999);
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
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      where.appointment_date = {
        gte: now,
      };
      hasExplicitDateFilter = true;
    } else {
      // REFACTORED: Apply default date range filter if no explicit date filter provided
      // This prevents unbounded queries that could return thousands of historical records
      // Default: last 90 days (reasonable for most use cases)
      const defaultSince = subDays(new Date(), DEFAULT_DATE_RANGE_DAYS);
      where.appointment_date = {
        gte: defaultSince,
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
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || 'Authentication required',
        },
        { status: 401 }
      );
    }

    const userId = authResult.user.userId;
    const userRole = authResult.user.role;

    // 2. Parse request body
    let body: CreateAppointmentRequest;
    try {
      body = await request.json() as CreateAppointmentRequest;
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    // 3. Validate required fields
    if (!body || !body.patientId || !body.doctorId || !body.appointmentDate || !body.time || !body.type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Required fields: patientId, doctorId, appointmentDate, time, type',
        },
        { status: 400 }
      );
    }

    // 4. Resolve Patient ID from User ID if needed
    // If user role is PATIENT, find their Patient record by user_id
    let patientId = body.patientId;
    
    if (userRole === 'PATIENT') {
      // For patients, ensure they're creating appointment for themselves
      const patient = await db.patient.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });
      
      if (patient) {
        patientId = patient.id;
      } else {
        // If no patient record found, return error
        return NextResponse.json(
          {
            success: false,
            error: 'Patient profile not found. Please complete your profile first.',
          },
          { status: 404 }
        );
      }
    } else {
      // For non-patient users (frontdesk, admin), patientId should already be a Patient ID
      // But we can validate it exists
      const patient = await db.patient.findUnique({
        where: { id: body.patientId },
        select: { id: true },
      });
      
      if (!patient) {
        return NextResponse.json(
          {
            success: false,
            error: `Patient with ID ${body.patientId} not found`,
          },
          { status: 404 }
        );
      }
    }

    // 5. Use ScheduleAppointmentUseCase to create appointment
    const { getScheduleAppointmentUseCase } = await import('@/lib/use-cases');
    const scheduleAppointmentUseCase = getScheduleAppointmentUseCase();
    
    const result = await scheduleAppointmentUseCase.execute({
      patientId: patientId,
      doctorId: body.doctorId,
      appointmentDate: typeof body.appointmentDate === 'string' 
        ? new Date(body.appointmentDate) 
        : body.appointmentDate,
      time: body.time,
      type: body.type,
      note: body.note,
    }, userId);

    // 6. Map to response DTO format
    const responseDto: AppointmentResponseDto = {
      id: result.id,
      patientId: result.patientId,
      doctorId: result.doctorId,
      appointmentDate: result.appointmentDate,
      time: result.time,
      status: result.status,
      type: result.type,
      note: result.note,
      reason: result.reason,
      consultationRequestStatus: result.consultationRequestStatus,
      reviewedBy: result.reviewedBy,
      reviewedAt: result.reviewedAt,
      reviewNotes: result.reviewNotes,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };

    // 7. Return success response
    return NextResponse.json(
      {
        success: true,
        data: responseDto,
        message: 'Appointment created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle domain exceptions
    if (error instanceof DomainException) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    // Unexpected error - log and return generic error
    console.error('[API] POST /api/appointments - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
