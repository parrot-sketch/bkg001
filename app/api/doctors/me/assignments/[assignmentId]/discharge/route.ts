/**
 * API Route: POST /api/doctors/me/assignments/{assignmentId}/discharge
 * 
 * Discharge a patient from doctor's care.
 * 
 * Formally ends the care relationship, setting status to DISCHARGED
 * and recording a discharge summary for the medical record.
 * 
 * Body:
 * {
 *   "dischargeSummary": "Clinical summary of care provided",
 *   "dischargeNotes": "Optional additional discharge instructions"
 * }
 * 
 * Response: 200 with updated assignment details
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
  { params }: { params: Promise<{ assignmentId: string }> }
): Promise<NextResponse> {
  try {
    const { assignmentId } = await params;

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

    // 3. Verify assignment belongs to this doctor
    const assignment = await db.doctorPatientAssignment.findUnique({
      where: { id: assignmentId },
      select: { doctor_id: true },
    });

    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }

    if (assignment.doctor_id !== doctor.id) {
      return NextResponse.json({ success: false, error: 'Access denied: assignment not yours' }, { status: 403 });
    }

    // 4. Parse request body
    const body = await request.json();
    const { dischargeSummary, dischargeNotes } = body;

    if (!dischargeSummary?.trim()) {
      return NextResponse.json({ success: false, error: 'Discharge summary is required' }, { status: 400 });
    }

    // 5. Call service to discharge patient
    const updated = await service.dischargePatient(assignmentId, {
      dischargeSummary,
      dischargeNotes,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Patient discharged successfully',
        data: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] POST /api/doctors/me/assignments/{assignmentId}/discharge - Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to discharge patient';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
