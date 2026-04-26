import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { createSurgicalCaseFromPatient } from '@/application/services/theater-tech/CreateSurgicalCaseFromPatientService';

/**
 * GET /api/theater-tech/surgical-cases
 *
 * Returns all non-cancelled surgical cases for the theater tech dashboard.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const surgicalCases = await db.surgicalCase.findMany({
      where: {
        status: {
          not: 'CANCELLED',
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            file_number: true,
          },
        },
        primary_surgeon: {
          select: {
            name: true,
          },
        },
        team_members: {
          select: {
            id: true,
          },
        },
        case_procedures: {
          include: { procedure: true },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: surgicalCases.map((c) => ({
        id: c.id,
        status: c.status,
        procedure_name: c.case_procedures?.length > 0
          ? c.case_procedures.map((cp) => cp.procedure.name).join(', ')
          : c.procedure_name,
        patient: c.patient,
        primary_surgeon: c.primary_surgeon,
        created_at: c.created_at.toISOString(),
        team_members_count: c.team_members.length,
      })),
    });
  } catch (error) {
    console.error('Error fetching surgical cases:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch cases' }, { status: 500 });
  }
}

/**
 * POST /api/theater-tech/surgical-cases
 *
 * Creates a new surgical case for a patient (without consultation).
 * If a surgeonId is supplied, creates an ACCEPTED StaffInvite and an
 * IN_APP Notification so the doctor sees the case immediately.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { patientId, surgeonId } = await request.json();

    if (!patientId) {
      return NextResponse.json({ success: false, error: 'Patient ID required' }, { status: 400 });
    }
    const primarySurgeonDoctorId: string | undefined = typeof surgeonId === 'string' && surgeonId.trim() ? surgeonId.trim() : undefined;
    const created = await createSurgicalCaseFromPatient(db, {
      patientId,
      createdByUserId: authResult.user.userId,
      primarySurgeonDoctorId,
    });

    return NextResponse.json({
      success: true,
      surgicalCaseId: created.surgicalCaseId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create case';
    if (message === 'Patient not found') {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    if (message === 'Patient ID required' || message === 'Invalid appointment ID') {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    console.error('Error creating surgical case:', error);
    return NextResponse.json({ success: false, error: 'Failed to create case' }, { status: 500 });
  }
}
