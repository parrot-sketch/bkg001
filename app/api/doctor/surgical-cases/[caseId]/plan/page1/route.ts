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
import { Role } from '@prisma/client';
import { saveSurgicalCasePlanPage1 } from '@/application/services/SurgicalCasePlanPage1Service';

function mapErrorToStatus(errorMessage: string): number {
  const msg = (errorMessage || '').toLowerCase();
  if (msg.includes('not found')) return 404;
  if (
    msg.includes('invalid') ||
    msg.includes('required') ||
    msg.includes('select at least one') ||
    msg.includes('linked user account') ||
    msg.includes('not eligible')
  ) return 400;
  return 500;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;

  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const allowedRoles: Role[] = [Role.THEATER_TECHNICIAN, Role.ADMIN, Role.DOCTOR];
    if (!allowedRoles.includes(authResult.user.role as Role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const body = await request.json();
    await saveSurgicalCasePlanPage1(db, {
      caseId,
      invitorUserId: authResult.user.userId,
      invitorRole: authResult.user.role as Role,
      body,
    });

    await syncDoctorCalendarEventsForSurgicalCase(db, caseId);

    revalidatePath(`/doctor/surgical-cases/${caseId}/plan`);
    revalidatePath('/doctor/surgical-cases');
    revalidatePath('/doctor/schedule');
    revalidatePath(`/theater-tech/surgical-cases/${caseId}/edit`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving page 1:', error);
    const status = mapErrorToStatus(error?.message || '');
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save' },
      { status }
    );
  }
}
