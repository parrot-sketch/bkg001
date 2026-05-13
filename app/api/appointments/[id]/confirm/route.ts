/**
 * API Route: POST /api/appointments/:id/confirm
 * 
 * Appointment Confirmation endpoint for Doctors.
 * 
 * Allows doctors to confirm or reject appointments that are pending their confirmation.
 * 
 * Security:
 * - Requires authentication (doctor must be logged in)
 * - Doctor confirms their own pending appointments
 * - Audit logging for all confirmations/rejections
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConfirmAppointmentUseCase } from '@/application/use-cases/ConfirmAppointmentUseCase';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { PrismaPatientRepository } from '@/infrastructure/database/repositories/PrismaPatientRepository';
import { emailNotificationService } from '@/infrastructure/services/EmailNotificationService';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import { SystemTimeService } from '@/infrastructure/services/SystemTimeService';
import db from '@/lib/db';
import { ConfirmAppointmentDto } from '@/application/dtos/ConfirmAppointmentDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { revalidateFrontdeskDashboard } from '@/actions/frontdesk/get-dashboard-data';
import { createSurgicalCaseFromPatient } from '@/application/services/theater-tech/CreateSurgicalCaseFromPatientService';
import { SurgicalCaseStatus } from '@prisma/client';

// Initialize dependencies (singleton pattern)
const appointmentRepository = new PrismaAppointmentRepository(db);
const patientRepository = new PrismaPatientRepository(db);
const notificationService = emailNotificationService;
const auditService = new ConsoleAuditService();
const timeService = new SystemTimeService();

// Initialize use case
const confirmAppointmentUseCase = new ConfirmAppointmentUseCase(
  appointmentRepository,
  patientRepository,
  notificationService,
  auditService,
  timeService,
);

/**
 * POST /api/appointments/:id/confirm
 * 
 * Handles appointment confirmation/rejection by doctor.
 */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { id } = await props.params;
    const appointmentId = parseInt(id, 10);

    if (isNaN(appointmentId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid appointment ID',
        },
        { status: 400 }
      );
    }

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
    let body: ConfirmAppointmentDto;
    try {
      const json = await request.json();
      body = {
        appointmentId,
        action: json.action,
        rejectionReason: json.rejectionReason,
        notes: json.notes,
      };
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
    if (!body.action || !['confirm', 'reject'].includes(body.action)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Action must be "confirm" or "reject"',
        },
        { status: 400 }
      );
    }

    if (body.action === 'reject' && (!body.rejectionReason || body.rejectionReason.trim().length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rejection reason is required when rejecting appointment',
        },
        { status: 400 }
      );
    }

    // 4. Execute confirm appointment use case
    const response = await confirmAppointmentUseCase.execute(body, userId);

    // 4.5 Surgical workflow: auto-create SurgicalCase for doctor-confirmed procedure appointments
    // This removes the Theater Tech "create case" gate for the Nurse ward-prep checklist.
    if (body.action === 'confirm') {
      try {
        const appointment = await db.appointment.findUnique({
          where: { id: appointmentId },
          select: {
            id: true,
            type: true,
            reason: true,
            note: true,
            patient_id: true,
            doctor_id: true,
            appointment_date: true,
            surgical_case: { select: { id: true } },
          },
        });

        const isProcedureType = (appointment?.type ?? '').trim().toLowerCase() === 'procedure';
        if (appointment && isProcedureType && !appointment.surgical_case?.id) {
          await createSurgicalCaseFromPatient(db, {
            patientId: appointment.patient_id,
            createdByUserId: userId,
            primarySurgeonDoctorId: appointment.doctor_id,
            appointmentId: appointment.id,
            procedureDate: appointment.appointment_date,
            procedureName: (appointment.reason ?? appointment.note ?? '').trim() || undefined,
            status: SurgicalCaseStatus.READY_FOR_WARD_PREP,
          });
        }
      } catch (error) {
        // Best-effort: never fail appointment confirmation due to surgical case creation.
        console.error('[appointments/confirm] Failed to auto-create SurgicalCase:', error);
      }
    }

    // 5. Invalidate frontdesk dashboard cache so status change is visible
    try { await revalidateFrontdeskDashboard(); } catch (_) { /* non-critical */ }

    // 6. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: body.action === 'confirm' 
          ? 'Appointment confirmed successfully'
          : 'Appointment rejected successfully',
      },
      { status: 200 }
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

    // Handle unexpected errors
    console.error('Unexpected error in confirm appointment endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
