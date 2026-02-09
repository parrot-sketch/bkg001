/**
 * API Route: GET /api/case-plans/:id
 * 
 * Get a case plan by its ID.
 * 
 * Security:
 * - Requires authentication
 * - Doctors can only view their own case plans
 * - Frontdesk and Admin can view any case plan
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { userId, role } = authResult.user;

    // 2. Parse case plan ID
    const params = await context.params;
    const casePlanId = parseInt(params.id, 10);
    if (isNaN(casePlanId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid case plan ID' },
        { status: 400 }
      );
    }

    // 3. Fetch case plan with relations
    const casePlan = await db.casePlan.findUnique({
      where: { id: casePlanId },
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
        patient: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            gender: true,
            date_of_birth: true,
            file_number: true,
            allergies: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
            user_id: true,
          },
        },
        consents: {
          orderBy: { created_at: 'desc' },
        },
        images: {
          orderBy: { taken_at: 'desc' },
        },
        procedure_record: {
          include: {
            staff: {
              include: {
                user: {
                  select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!casePlan) {
      return NextResponse.json(
        { success: false, error: 'Case plan not found' },
        { status: 404 }
      );
    }

    // 4. Authorization: doctors can only view their own case plans
    if (role === 'DOCTOR') {
      const doctor = await db.doctor.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });

      if (!doctor || doctor.id !== casePlan.doctor_id) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // 5. Map to response DTO
    const response = {
      id: casePlan.id,
      appointmentId: casePlan.appointment_id,
      patientId: casePlan.patient_id,
      doctorId: casePlan.doctor_id,
      procedurePlan: casePlan.procedure_plan,
      riskFactors: casePlan.risk_factors,
      preOpNotes: casePlan.pre_op_notes,
      implantDetails: casePlan.implant_details,
      markingDiagram: casePlan.marking_diagram,
      consentChecklist: casePlan.consent_checklist,
      plannedAnesthesia: casePlan.planned_anesthesia,
      specialInstructions: casePlan.special_instructions,
      readinessStatus: casePlan.readiness_status,
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
      patient: casePlan.patient
        ? {
            id: casePlan.patient.id,
            firstName: casePlan.patient.first_name,
            lastName: casePlan.patient.last_name,
            gender: casePlan.patient.gender,
            dateOfBirth: casePlan.patient.date_of_birth,
            fileNumber: casePlan.patient.file_number,
            allergies: casePlan.patient.allergies,
          }
        : undefined,
      doctor: casePlan.doctor
        ? {
            id: casePlan.doctor.id,
            name: casePlan.doctor.name,
            specialization: casePlan.doctor.specialization,
          }
        : undefined,
      consents: casePlan.consents?.map((c) => ({
        id: c.id,
        title: c.title,
        type: c.type,
        status: c.status,
        createdAt: c.created_at,
      })),
      images: casePlan.images?.map((img) => ({
        id: img.id,
        imageUrl: img.image_url,
        timepoint: img.timepoint,
        description: img.description,
      })),
      procedureRecord: casePlan.procedure_record
        ? {
            urgency: casePlan.procedure_record.urgency,
            anesthesiaType: casePlan.procedure_record.anesthesia_type,
            staff: casePlan.procedure_record.staff?.map((s) => ({
              role: s.role,
              user: s.user
                ? {
                    firstName: s.user.first_name,
                    lastName: s.user.last_name,
                    role: s.user.role,
                  }
                : undefined,
            })),
          }
        : undefined,
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('[API] GET /api/case-plans/[id] - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
