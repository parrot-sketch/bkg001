/**
 * API Route: POST /api/doctors/me/patients/{patientId}/assign
 * 
 * Assign a patient to the current doctor's active care.
 * 
 * Creates an explicit assignment record if one doesn't exist.
 * If an assignment exists and is INACTIVE, reactivates it.
 * If an assignment exists and is ACTIVE, returns 204 (no change needed).
 * 
 * Body:
 * {
 *   "careNotes": "Optional initial notes about the care relationship"
 * }
 * 
 * Response: 201 (created) | 204 (no change) with assignment details
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { DoctorPatientAssignmentService } from '@/application/services/DoctorPatientAssignmentService';
import { assignmentRepository } from '@/infrastructure/repositories/DoctorPatientAssignmentRepository';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';

const service = new DoctorPatientAssignmentService(assignmentRepository);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
): Promise<NextResponse> {
  try {
    const { patientId } = await params;

    // 1. Authenticate
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { userId, role } = authResult.user;

    if (role !== Role.DOCTOR) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // 2. Get doctor profile
    const doctor = await db.doctor.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!doctor) {
      return NextResponse.json({ success: false, error: 'Doctor profile not found' }, { status: 404 });
    }

    // 3. Parse request body
    const body = await request.json();
    const { careNotes } = body;

    // 4. Call service to assign patient
    const assignment = await service.assignPatient(doctor.id, {
      patientId,
      careNotes,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Patient assigned successfully',
        data: assignment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] POST /api/doctors/me/patients/{patientId}/assign - Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to assign patient';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
