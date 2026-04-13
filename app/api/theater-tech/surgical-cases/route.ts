import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

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
        procedure_name: c.procedure_name,
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

    const patient = await db.patient.findUnique({
      where: { id: patientId },
      select: { id: true, first_name: true, last_name: true },
    });

    if (!patient) {
      return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }

    const primarySurgeonId: string | undefined = surgeonId || undefined;

    // Create the surgical case
    const surgicalCase = await db.surgicalCase.create({
      data: {
        patient_id: patientId,
        primary_surgeon_id: primarySurgeonId,
        status: 'DRAFT',
        created_by: authResult.user.userId,
      },
    });

    // ── If a surgeon was specified at creation time, bootstrap the invite ────
    if (primarySurgeonId) {
      const doctor = await db.doctor.findUnique({
        where: { id: primarySurgeonId },
        select: { user_id: true, name: true },
      });

      if (doctor?.user_id) {
        const patientName = `${patient.first_name} ${patient.last_name}`;
        const invitorUserId = authResult.user.userId;

        // Create ACCEPTED StaffInvite so the case surfaces on the doctor's list
        await db.staffInvite.create({
          data: {
            surgical_case_id: surgicalCase.id,
            invited_user_id: doctor.user_id,
            invited_role: 'SURGEON' as any,
            invited_by_user_id: invitorUserId,
            status: 'ACCEPTED' as any,
            acknowledged_at: new Date(),
          },
        });

        // Send an IN_APP notification
        await db.notification.create({
          data: {
            user_id: doctor.user_id,
            sender_id: invitorUserId,
            type: 'IN_APP',
            status: 'PENDING',
            subject: 'New Surgical Case',
            message: `A new surgical case has been created for patient ${patientName} and assigned to you.`,
            metadata: JSON.stringify({
              surgicalCaseId: surgicalCase.id,
              patientName,
              role: 'SURGEON',
            }),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      surgicalCaseId: surgicalCase.id,
    });
  } catch (error) {
    console.error('Error creating surgical case:', error);
    return NextResponse.json({ success: false, error: 'Failed to create case' }, { status: 500 });
  }
}