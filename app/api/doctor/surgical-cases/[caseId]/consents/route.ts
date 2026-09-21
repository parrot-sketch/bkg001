/**
 * API Route: GET/POST /api/doctor/surgical-cases/[caseId]/consents
 *
 * Doctor ConsentForm documents on CasePlan — not nurse forms.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { ConsentStatus, ConsentType } from '@prisma/client';
import db from '@/lib/db';
import {
  ensureCasePlanForDoctor,
  resolveDoctorCaseAccess,
} from '@/lib/doctor/surgicalCaseDocumentAccess';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { caseId } = await context.params;
    const access = await resolveDoctorCaseAccess(authResult.user.userId, caseId);
    if (!access) {
      return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
    }
    if (!access.canView) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const sc = await db.surgicalCase.findUnique({
      where: { id: caseId },
      select: { case_plan: { select: { id: true } } },
    });

    if (!sc?.case_plan) {
      return NextResponse.json({ success: true, data: [] });
    }

    const consents = await db.consentForm.findMany({
      where: { case_plan_id: sc.case_plan.id },
      orderBy: { created_at: 'desc' },
      include: {
        documents: { orderBy: { version: 'desc' } },
      },
    });

    return NextResponse.json({ success: true, data: consents });
  } catch (error) {
    console.error('[API] GET consents - Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

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
      return NextResponse.json({ success: false, error: 'Doctors only' }, { status: 403 });
    }

    const { caseId } = await context.params;
    const access = await resolveDoctorCaseAccess(authResult.user.userId, caseId);
    if (!access) {
      return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
    }
    if (!access.canEdit) {
      return NextResponse.json(
        { success: false, error: 'Only the case surgeon can create consents' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const type = (body.type as string) || 'GENERAL_PROCEDURE';
    const title = (typeof body.title === 'string' && body.title.trim()) || 'Consent Form';

    if (!Object.values(ConsentType).includes(type as ConsentType)) {
      return NextResponse.json({ success: false, error: 'Invalid consent type' }, { status: 400 });
    }

    const plan = await ensureCasePlanForDoctor({
      caseId: access.caseId,
      patientId: access.patientId,
      doctorId: access.doctorId,
    });

    const consent = await db.consentForm.create({
      data: {
        case_plan_id: plan.id,
        title,
        type: type as ConsentType,
        content_snapshot: title,
        status: ConsentStatus.DRAFT,
      },
    });

    return NextResponse.json({ success: true, data: consent });
  } catch (error) {
    console.error('[API] POST consents - Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
