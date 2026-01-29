/**
 * API Route: GET /api/patients/:id/case-plans
 * 
 * Get all case plans for a specific patient.
 * 
 * Security:
 * - Requires authentication
 * - Doctors can only view case plans for their own patients
 * - Frontdesk and Admin can view any patient's case plans
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import { withRetry } from '@/lib/db';
import { CaseReadinessStatus } from '@/domain/enums/CaseReadinessStatus';

export interface CasePlanResponseDto {
  id: number;
  appointmentId: number;
  patientId: string;
  doctorId: string;
  procedurePlan?: string;
  riskFactors?: string;
  preOpNotes?: string;
  implantDetails?: string;
  markingDiagram?: string;
  consentChecklist?: string;
  plannedAnesthesia?: string;
  specialInstructions?: string;
  readinessStatus: CaseReadinessStatus;
  readyForSurgery: boolean;
  createdAt: Date;
  updatedAt: Date;
  appointment?: {
    id: number;
    appointmentDate: Date;
    time: string;
    type: string;
    status: string;
  };
  doctor?: {
    id: string;
    name: string;
    specialization: string;
  };
}

/**
 * GET /api/patients/:id/case-plans
 * 
 * Get all case plans for a patient.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

    // 2. Extract patient ID from params
    const params = await context.params;
    const patientId = params.id;

    if (!patientId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Patient ID is required',
        },
        { status: 400 }
      );
    }

    // 3. Check permissions
    if (userRole === 'DOCTOR') {
      // Doctors can only view case plans for their own patients
      const doctor = await db.doctor.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });

      if (!doctor) {
        return NextResponse.json(
          {
            success: false,
            error: 'Doctor profile not found',
          },
          { status: 404 }
        );
      }

      // Verify the patient has appointments with this doctor
      const hasAppointments = await db.appointment.findFirst({
        where: {
          patient_id: patientId,
          doctor_id: doctor.id,
        },
        select: { id: true },
      });

      if (!hasAppointments) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied: You can only view case plans for your own patients',
          },
          { status: 403 }
        );
      }
    }
    // FRONTDESK and ADMIN can view any patient's case plans (no additional check needed)

    // 4. Fetch case plans with retry
    const casePlans = await withRetry(async () => {
      return db.casePlan.findMany({
        where: {
          patient_id: patientId,
        },
        include: {
          appointment: {
            select: {
              id: true,
              appointment_date: true,
              time: true,
              type: true,
              status: true,
            },
          },
          doctor: {
            select: {
              id: true,
              name: true,
              specialization: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });
    });

    // 5. Map to DTO format
    const mappedCasePlans: CasePlanResponseDto[] = casePlans.map((casePlan) => ({
      id: casePlan.id,
      appointmentId: casePlan.appointment_id,
      patientId: casePlan.patient_id,
      doctorId: casePlan.doctor_id,
      procedurePlan: casePlan.procedure_plan ?? undefined,
      riskFactors: casePlan.risk_factors ?? undefined,
      preOpNotes: casePlan.pre_op_notes ?? undefined,
      implantDetails: casePlan.implant_details ?? undefined,
      markingDiagram: casePlan.marking_diagram ?? undefined,
      consentChecklist: casePlan.consent_checklist ?? undefined,
      plannedAnesthesia: casePlan.planned_anesthesia ?? undefined,
      specialInstructions: casePlan.special_instructions ?? undefined,
      readinessStatus: casePlan.readiness_status as CaseReadinessStatus,
      readyForSurgery: casePlan.ready_for_surgery,
      createdAt: casePlan.created_at,
      updatedAt: casePlan.updated_at,
      appointment: casePlan.appointment
        ? {
            id: casePlan.appointment.id,
            appointmentDate: casePlan.appointment.appointment_date,
            time: casePlan.appointment.time,
            type: casePlan.appointment.type,
            status: casePlan.appointment.status,
          }
        : undefined,
      doctor: casePlan.doctor
        ? {
            id: casePlan.doctor.id,
            name: casePlan.doctor.name,
            specialization: casePlan.doctor.specialization,
          }
        : undefined,
    }));

    // 6. Return success response
    return NextResponse.json(
      {
        success: true,
        data: mappedCasePlans,
        message: 'Case plans retrieved successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle database connection errors
    if (error instanceof Error && error.message.includes("Can't reach database server")) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection error. Please try again.',
        },
        { status: 503 }
      );
    }

    // Unexpected error - log and return generic error
    console.error('[API] GET /api/patients/[id]/case-plans - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
