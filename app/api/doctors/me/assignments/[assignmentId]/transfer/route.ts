/**
 * API Route: POST /api/doctors/me/assignments/{assignmentId}/transfer
 * 
 * Transfer a patient to another doctor.
 * 
 * Moves care responsibility from current doctor to new doctor.
 * Creates TRANSFERRED record for old doctor and new ACTIVE record for new doctor.
 * 
 * Body:
 * {
 *   "transferToDoctorId": "UUID of target doctor",
 *   "transferReason": "Why is patient being transferred?",
 *   "transferNotes": "Optional additional notes"
 * }
 * 
 * Response: 200 with both old and new assignment details
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
    const { transferToDoctorId, transferReason, transferNotes } = body;

    if (!transferToDoctorId?.trim()) {
      return NextResponse.json({ success: false, error: 'Target doctor ID is required' }, { status: 400 });
    }

    if (!transferReason?.trim()) {
      return NextResponse.json({ success: false, error: 'Transfer reason is required' }, { status: 400 });
    }

    // 5. Call service to transfer patient
    const result = await service.transferPatient(assignmentId, {
      transferToDoctorId,
      transferReason,
      transferNotes,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Patient transferred successfully',
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] POST /api/doctors/me/assignments/{assignmentId}/transfer - Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to transfer patient';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
