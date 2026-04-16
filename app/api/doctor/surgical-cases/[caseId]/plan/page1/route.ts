/**
 * API Route: PATCH /api/doctor/surgical-cases/[caseId]/plan/page1
 *
 * Saves Case Identification data (Page 1):
 * - Procedure date, diagnosis, category, case type, procedures
 * - Surgeon assignments → creates/upserts StaffInvite rows so cases
 *   surface on the doctor's /doctor/surgical-cases list
 * - Fires IN_APP Notification for each newly assigned surgeon
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { syncDoctorCalendarEventsForSurgicalCase } from '@/application/services/SurgicalCaseCalendarSyncService';

const VALID_PROCEDURE_CATEGORIES = ['FACE', 'BREAST', 'BODY', 'RECONSTRUCTIVE'];
const VALID_CASE_PLAN_TYPES = ['PRIMARY', 'REVISION'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;

  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      procedureDate,
      surgeonIds,
      diagnosis,
      procedureCategory,
      primaryOrRevision,
      procedureIds
    } = body;

    // Validation
    if (!procedureDate || !surgeonIds || surgeonIds.length === 0 || !diagnosis || !procedureCategory || !primaryOrRevision) {
      return NextResponse.json(
        { success: false, error: 'All required fields must be filled including at least one surgeon' },
        { status: 400 }
      );
    }

    if (!VALID_PROCEDURE_CATEGORIES.includes(procedureCategory)) {
      return NextResponse.json(
        { success: false, error: 'Invalid procedure category' },
        { status: 400 }
      );
    }

    if (!VALID_CASE_PLAN_TYPES.includes(primaryOrRevision)) {
      return NextResponse.json(
        { success: false, error: 'Invalid primary/revision value' },
        { status: 400 }
      );
    }

    if (!procedureIds || procedureIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Select at least one procedure' },
        { status: 400 }
      );
    }

    // ── 1. Fetch the case + patient for notification messages ────────────────
    const surgicalCase = await db.surgicalCase.findUnique({
      where: { id: caseId },
      select: {
        patient: { select: { first_name: true, last_name: true } },
      },
    });

    if (!surgicalCase) {
      return NextResponse.json(
        { success: false, error: 'Surgical case not found' },
        { status: 404 }
      );
    }

    const patientName = surgicalCase.patient
      ? `${surgicalCase.patient.first_name} ${surgicalCase.patient.last_name}`
      : 'Unknown Patient';

    const formattedDate = new Date(procedureDate).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

    // ── 2. Resolve doctors → user_ids ────────────────────────────────────────
    const doctors = await db.doctor.findMany({
      where: { id: { in: surgeonIds } },
      select: { id: true, name: true, user_id: true },
    });

    // ── 3. Transaction: update case + procedures ─────────────────────────────
    await db.$transaction(async (tx) => {
      // Update SurgicalCase
      await tx.surgicalCase.update({
        where: { id: caseId },
        data: {
          procedure_date: new Date(procedureDate),
          primary_surgeon_id: surgeonIds[0],
          surgeon_ids: JSON.stringify(surgeonIds),
          diagnosis,
          procedure_category: procedureCategory,
          primary_or_revision: primaryOrRevision,
          status: 'PLANNING',
        },
      });

      // Sync procedures
      await tx.surgicalCaseProcedure.deleteMany({ where: { surgical_case_id: caseId } });
      if (procedureIds.length > 0) {
        await tx.surgicalCaseProcedure.createMany({
          data: procedureIds.map((procedureId: string) => ({
            surgical_case_id: caseId,
            procedure_id: procedureId,
          })),
        });
      }
    });

    // ── 4. Upsert StaffInvite rows + create Notifications ───────────────────
    //
    // Primary surgeon (index 0) → ACCEPTED immediately (so they see the case
    // in their list right away without needing to accept an invite).
    // Co-surgeons → PENDING (they can accept/decline via the invite flow).
    //
    // We skip surgeons whose user_id couldn't be resolved.
    const invitorUserId = authResult.user?.userId ?? '';

    await Promise.all(
      doctors.map(async (doctor, idx) => {
        if (!doctor.user_id) return; // skip doctors without a user account

        const isPrimary = idx === 0 || doctor.id === surgeonIds[0];
        const role = isPrimary ? 'SURGEON' : 'ASSISTANT_SURGEON';
        const status = isPrimary ? 'ACCEPTED' : 'PENDING';

        // Upsert StaffInvite
        const existingInvite = await db.staffInvite.findFirst({
          where: {
            surgical_case_id: caseId,
            invited_user_id: doctor.user_id,
          },
          select: { id: true },
        });

        if (!existingInvite) {
          await db.staffInvite.create({
            data: {
              surgical_case_id: caseId,
              invited_user_id: doctor.user_id,
              invited_role: role as any,
              invited_by_user_id: invitorUserId,
              status: status as any,
              acknowledged_at: isPrimary ? new Date() : null,
            },
          });

          // Fire IN_APP notification only for newly created invites
          await db.notification.create({
            data: {
              user_id: doctor.user_id,
              sender_id: invitorUserId || null,
              type: 'IN_APP',
              status: 'PENDING',
              subject: 'Surgical Case Assignment',
              message: `You have been assigned to a surgical case for ${patientName} on ${formattedDate}.`,
              metadata: JSON.stringify({
                surgicalCaseId: caseId,
                patientName,
                procedureDate,
                role: role as any,
                event: 'SURGICAL_CASE_ASSIGNMENT'
              }),
            },
          });
        } else if (isPrimary) {
          // Ensure primary surgeon's existing invite is ACCEPTED
          await db.staffInvite.updateMany({
            where: {
              surgical_case_id: caseId,
              invited_user_id: doctor.user_id,
              status: { not: 'ACCEPTED' },
            },
            data: { status: 'ACCEPTED', acknowledged_at: new Date() },
          });
        }
      })
    );

    await syncDoctorCalendarEventsForSurgicalCase(db, caseId);

    revalidatePath(`/doctor/surgical-cases/${caseId}/plan`);
    revalidatePath('/doctor/surgical-cases');
    revalidatePath('/doctor/schedule');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving page 1:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save' },
      { status: 500 }
    );
  }
}
