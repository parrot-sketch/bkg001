/**
 * API Route: POST /api/doctor/surgical-cases/[caseId]/photos
 * Doctor clinical photos on CasePlan — not nurse forms.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { ImageAngle, ImageTimepoint } from '@prisma/client';
import {
  ensureCasePlanForDoctor,
  resolveDoctorCaseAccess,
} from '@/lib/doctor/surgicalCaseDocumentAccess';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    if (authResult.user.role !== 'DOCTOR') {
      return NextResponse.json({ success: false, error: 'Forbidden: Doctors only' }, { status: 403 });
    }

    const { caseId } = await context.params;
    const body = await request.json();
    const { imageUrl, angle, timepoint, description, consentForMarketing } = body;

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'imageUrl is required' }, { status: 400 });
    }

    const validAngles = Object.values(ImageAngle);
    if (angle && !validAngles.includes(angle)) {
      return NextResponse.json(
        { success: false, error: `Invalid angle. Valid: ${validAngles.join(', ')}` },
        { status: 400 },
      );
    }

    const validTimepoints = Object.values(ImageTimepoint);
    const resolvedTimepoint =
      timepoint && validTimepoints.includes(timepoint) ? timepoint : ImageTimepoint.PRE_OP;

    const access = await resolveDoctorCaseAccess(authResult.user.userId, caseId);
    if (!access) {
      return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
    }
    if (!access.canEdit) {
      return NextResponse.json({ success: false, error: 'Forbidden: Not the case surgeon' }, { status: 403 });
    }

    const plan = await ensureCasePlanForDoctor({
      caseId: access.caseId,
      patientId: access.patientId,
      doctorId: access.doctorId,
    });

    const planRow = await db.casePlan.findUnique({
      where: { id: plan.id },
      select: { id: true, appointment_id: true },
    });

    const image = await db.patientImage.create({
      data: {
        patient_id: access.patientId,
        appointment_id: planRow?.appointment_id ?? null,
        case_plan_id: plan.id,
        image_url: imageUrl,
        angle: angle || ImageAngle.FRONT,
        timepoint: resolvedTimepoint,
        description: description || null,
        consent_for_marketing: consentForMarketing ?? false,
        taken_by: authResult.user.userId,
        taken_at: new Date(),
      },
    });

    await db.auditLog.create({
      data: {
        user_id: authResult.user.userId,
        record_id: image.id.toString(),
        action: 'CREATE',
        model: 'PatientImage',
        details: `Pre-op photo added for case ${caseId}. Angle: ${image.angle}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: image.id,
        imageUrl: image.image_url,
        angle: image.angle,
        timepoint: image.timepoint,
        description: image.description,
        consentForMarketing: image.consent_for_marketing,
        takenAt: image.taken_at,
      },
      message: 'Photo added successfully',
    });
  } catch (error) {
    console.error('[API] POST photos - Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
