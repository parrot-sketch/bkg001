/**
 * API Route: POST /api/consultations/frontdesk/create
 * 
 * Consultation Creation endpoint for Frontdesk staff.
 * 
 * Allows frontdesk staff to create consultation requests directly for patients
 * from the patient listing/profile pages.
 * 
 * Security:
 * - Requires authentication (frontdesk staff must be logged in)
 * - Validates frontdesk user role (enforced via middleware)
 * - Cannot create consultation for non-existent patient
 * - Audit logging for all creations
 */

import { NextRequest, NextResponse } from 'next/server';
import { CreateConsultationFromFrontdeskUseCase } from '@/application/use-cases/CreateConsultationFromFrontdeskUseCase';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { PrismaPatientRepository } from '@/infrastructure/database/repositories/PrismaPatientRepository';
import { emailNotificationService } from '@/infrastructure/services/EmailNotificationService';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import { SystemTimeService } from '@/infrastructure/services/SystemTimeService';
import db from '@/lib/db';
import { CreateConsultationFromFrontdeskDto } from '@/application/dtos/CreateConsultationFromFrontdeskDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';

// Initialize dependencies (singleton pattern)
const appointmentRepository = new PrismaAppointmentRepository(db);
const patientRepository = new PrismaPatientRepository(db);
const notificationService = emailNotificationService;
const auditService = new ConsoleAuditService();
const timeService = new SystemTimeService();

// Initialize use case
const createConsultationFromFrontdeskUseCase = new CreateConsultationFromFrontdeskUseCase(
  appointmentRepository,
  patientRepository,
  notificationService,
  auditService,
  timeService,
);

/**
 * POST /api/consultations/frontdesk/create
 * 
 * Handles consultation creation by frontdesk staff.
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
    let body: CreateConsultationFromFrontdeskDto;
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
      !body.doctorId ||
      !body.serviceId ||
      !body.appointmentDate ||
      !body.appointmentTime ||
      !body.concernDescription
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: patientId, doctorId, serviceId, appointmentDate, appointmentTime, concernDescription',
        },
        { status: 400 }
      );
    }

    // 4. Parse and validate appointment date
    let appointmentDate: Date;
    try {
      appointmentDate = typeof body.appointmentDate === 'string' 
        ? new Date(body.appointmentDate) 
        : body.appointmentDate;
      
      if (isNaN(appointmentDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid appointment date format',
        },
        { status: 400 }
      );
    }

    // 5. Create DTO for use case
    const dto: CreateConsultationFromFrontdeskDto = {
      patientId: body.patientId,
      doctorId: body.doctorId,
      serviceId: body.serviceId,
      appointmentDate,
      appointmentTime: body.appointmentTime,
      concernDescription: body.concernDescription,
      notes: body.notes,
    };

    // 6. Execute create consultation use case
    const response = await createConsultationFromFrontdeskUseCase.execute(dto, userId);

    // 7. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: 'Consultation request created successfully',
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

    // Handle unexpected errors
    console.error('Unexpected error in create consultation endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
