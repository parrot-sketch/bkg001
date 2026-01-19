/**
 * API Route: POST /api/consultations/submit
 * 
 * Consultation Request Submission endpoint.
 * 
 * Allows patients to submit a consultation request for review by Frontdesk.
 * 
 * Security:
 * - Requires authentication (patient must be logged in)
 * - Patients can only submit requests for themselves
 * - Validation of required fields
 * - Audit logging for all submissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { SubmitConsultationRequestUseCase } from '@/application/use-cases/SubmitConsultationRequestUseCase';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { PrismaPatientRepository } from '@/infrastructure/database/repositories/PrismaPatientRepository';
import { MockNotificationService } from '@/infrastructure/services/MockNotificationService';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import { SystemTimeService } from '@/infrastructure/services/SystemTimeService';
import db from '@/lib/db';
import { SubmitConsultationRequestDto } from '@/application/dtos/SubmitConsultationRequestDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';

// Initialize dependencies (singleton pattern)
const appointmentRepository = new PrismaAppointmentRepository(db);
const patientRepository = new PrismaPatientRepository(db);
const notificationService = new MockNotificationService();
const auditService = new ConsoleAuditService();
const timeService = new SystemTimeService();

// Initialize use case
const submitConsultationRequestUseCase = new SubmitConsultationRequestUseCase(
  appointmentRepository,
  patientRepository,
  notificationService,
  auditService,
  timeService,
);

/**
 * POST /api/consultations/submit
 * 
 * Handles consultation request submission.
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

    const userId = authResult.user.userId;

    // 2. Parse request body
    let body: SubmitConsultationRequestDto;
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

    // 3. Validate required fields
    if (
      !body ||
      !body.patientId ||
      !body.serviceId ||
      !body.concernDescription ||
      !body.preferredDate ||
      !body.timePreference ||
      body.isOver18 === undefined ||
      !body.contactConsent ||
      !body.privacyConsent ||
      !body.acknowledgmentConsent
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Required fields: patientId, serviceId, concernDescription, preferredDate, timePreference, isOver18, contactConsent, privacyConsent, acknowledgmentConsent',
        },
        { status: 400 }
      );
    }

    // 4. Resolve Patient ID from User ID if needed
    // If patientId is a User ID (when patient is logged in), find the Patient record
    let patientId = body.patientId;
    
    // Check if patientId is actually a User ID by trying to find a Patient by user_id
    const patient = await db.patient.findUnique({
      where: { user_id: body.patientId },
      select: { id: true },
    });
    
    if (patient) {
      // Found patient by user_id - use the Patient ID
      patientId = patient.id;
    } else {
      // Try to find patient by ID (might already be a Patient ID)
      const patientById = await db.patient.findUnique({
        where: { id: body.patientId },
        select: { id: true },
      });
      
      if (!patientById) {
        // Patient not found - return error
        return NextResponse.json(
          {
            success: false,
            error: 'Patient profile not found. Please complete your profile first.',
          },
          { status: 404 }
        );
      }
      
      // patientId is already a Patient ID, use it as-is
      patientId = body.patientId;
    }

    // 5. Validate doctor ID is provided
    // For consultation requests, we require a doctor to be selected
    // This ensures proper workflow management - frontdesk can reassign during review if needed
    // If patient selected "No preference", we need to inform them to select a doctor
    if (!body.doctorId || body.doctorId.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please select a surgeon. Our team will confirm availability and may suggest alternatives during review.',
        },
        { status: 400 }
      );
    }
    
    const doctorId = body.doctorId;

    // 6. Convert preferredDate to Date object if it's a string
    const dto: SubmitConsultationRequestDto = {
      ...body,
      patientId: patientId, // Use resolved Patient ID
      doctorId: doctorId, // Required - patient must select a doctor
      preferredDate: typeof body.preferredDate === 'string' 
        ? new Date(body.preferredDate) 
        : body.preferredDate,
    };

    // 7. Execute submit consultation request use case
    // Note: The use case expects patientId to be a Patient ID, not User ID
    const response = await submitConsultationRequestUseCase.execute(dto, userId);

    // 6. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: 'Consultation request submitted successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle domain exceptions (e.g., validation errors)
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
    console.error('[API] /api/consultations/submit - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
