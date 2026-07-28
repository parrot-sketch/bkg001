/**
 * API Route: POST /api/doctor/patients/:id/start-consultation
 *
 * Doctor-initiated direct consultation from patient profile.
 * Creates a walk-in appointment and immediately starts the consultation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { StartConsultationUseCase } from '@/application/use-cases/StartConsultationUseCase';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { PrismaConsultationRepository } from '@/infrastructure/database/repositories/PrismaConsultationRepository';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import db from '@/lib/db';
import { StartConsultationDto } from '@/application/dtos/StartConsultationDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { revalidateDoctorDashboard } from '@/actions/doctor/get-dashboard-data';
import { revalidateFrontdeskDashboard } from '@/actions/frontdesk/get-dashboard-data';

const appointmentRepository = new PrismaAppointmentRepository(db);
const consultationRepository = new PrismaConsultationRepository(db);
const auditService = new ConsoleAuditService();
const startConsultationUseCase = new StartConsultationUseCase(
  appointmentRepository,
  consultationRepository,
  auditService,
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const userRole = authResult.user.role;
    const isDoctor = String(userRole).toUpperCase() === Role.DOCTOR;
    if (!isDoctor) {
      return NextResponse.json(
        { success: false, error: `Access denied: Only doctors can start consultations (Your role: ${userRole})` },
        { status: 403 }
      );
    }

    const { id: patientId } = await params;
    const body = await request.json().catch(() => ({}));
    const notes = body.notes as string | undefined;

    const doctor = await db.doctor.findUnique({
      where: { user_id: authResult.user.userId },
      select: { id: true, user_id: true },
    });

    if (!doctor) {
      return NextResponse.json({ success: false, error: 'Doctor profile not found' }, { status: 404 });
    }

    const doctorId = doctor.id;
    const now = new Date();

    const appointment = await db.appointment.create({
      data: {
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_date: now,
        time: now.toTimeString().slice(0, 5),
        type: 'Consultation',
        status: 'CHECKED_IN',
        source: 'DOCTOR_FOLLOW_UP',
        checked_in_at: now,
        checked_in_by: authResult.user.userId,
        status_changed_at: now,
        status_changed_by: authResult.user.userId,
        created_at: now,
        updated_at: now,
      },
    });

    await db.patientQueue.create({
      data: {
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_id: appointment.id,
        status: 'WAITING',
        added_by: authResult.user.userId,
        notes: notes || 'Doctor-initiated consultation',
      },
    });

    const dto: StartConsultationDto = {
      appointmentId: appointment.id,
      doctorId: doctorId,
      userId: doctor.user_id,
      doctorNotes: notes || undefined,
    };

    const result = await startConsultationUseCase.execute(dto);

    try {
      await revalidateDoctorDashboard(doctorId);
      await revalidateFrontdeskDashboard();
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      success: true,
      appointmentId: appointment.id,
      data: result,
      message: 'Consultation started successfully',
    });
  } catch (error: any) {
    console.error('[API] /api/doctor/patients/:id/start-consultation:', error);
    if (error instanceof DomainException) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: process.env.NODE_ENV === 'development' ? `Internal server error: ${error.message}` : 'Internal server error' },
      { status: 500 }
    );
  }
}
