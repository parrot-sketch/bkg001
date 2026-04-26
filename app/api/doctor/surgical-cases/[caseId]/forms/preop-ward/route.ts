import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { ClinicalFormStatus } from '@prisma/client';
import { TEMPLATE_KEY, normalizeLegacyChecklistData } from '@/domain/clinical-forms/NursePreopWardChecklist';

function fullName(u: { first_name: string | null; last_name: string | null } | null | undefined): string {
  if (!u) return '';
  return `${u.first_name || ''} ${u.last_name || ''}`.trim();
}

function getInviteDisplayName(invite: { invited_user: { first_name: string | null; last_name: string | null } | null }): string {
  return fullName(invite.invited_user) || '—';
}

function getAnaesthesiologistName(
  invites: Array<{ status: string; invited_role: string; invited_user: { first_name: string | null; last_name: string | null } | null }> | undefined,
): string | null {
  if (!invites?.length) return null;
  const matchesRole = (i: { invited_role: string }) =>
    i.invited_role === 'ANESTHESIOLOGIST' || i.invited_role === 'ANESTHETIST_NURSE';
  const ana = invites.find((i) => matchesRole(i) && i.status === 'ACCEPTED') ?? invites.find((i) => matchesRole(i));
  if (!ana) return null;
  return getInviteDisplayName(ana) || null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  try {
    const { caseId } = await context.params;
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    if (authResult.user.role !== 'DOCTOR') {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const doctor = await db.doctor.findUnique({
      where: { user_id: authResult.user.userId },
      select: { id: true },
    });
    if (!doctor) {
      return NextResponse.json({ success: false, error: 'Doctor profile not found' }, { status: 404 });
    }

    const surgicalCase = await db.surgicalCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        primary_surgeon_id: true,
        primary_surgeon: { select: { id: true, name: true } },
        patient: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            file_number: true,
            allergies: true,
            date_of_birth: true,
            gender: true,
          },
        },
        staff_invites: {
          where: { invited_user_id: authResult.user.userId },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!surgicalCase) {
      return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
    }

    const isPrimarySurgeon = surgicalCase.primary_surgeon_id === doctor.id;
    const hasInvite = (surgicalCase as any).staff_invites?.length > 0;
    if (!isPrimarySurgeon && !hasInvite) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Fetch all invites for header display (anaesthesiologist)
    const allInvites = await db.staffInvite.findMany({
      where: { surgical_case_id: caseId },
      select: {
        status: true,
        invited_role: true,
        invited_user: { select: { first_name: true, last_name: true } },
      },
    });

    const formResponse = await db.clinicalFormResponse.findFirst({
      where: {
        surgical_case_id: caseId,
        template_key: TEMPLATE_KEY,
        status: ClinicalFormStatus.FINAL,
      },
      orderBy: { updated_at: 'desc' },
    });

    if (!formResponse) {
      return NextResponse.json({
        success: true,
        data: {
          form: null,
          patient: surgicalCase.patient,
          surgeonName: surgicalCase.primary_surgeon?.name ?? null,
          anaesthesiologistName: getAnaesthesiologistName(allInvites),
        },
      });
    }

    let rawData: unknown = {};
    try {
      rawData = JSON.parse(formResponse.data_json);
    } catch {
      rawData = {};
    }
    const data = normalizeLegacyChecklistData(rawData);

    return NextResponse.json({
      success: true,
      data: {
        form: {
          id: formResponse.id,
          status: formResponse.status,
          signedAt: formResponse.signed_at,
          data,
        },
        patient: surgicalCase.patient,
        surgeonName: surgicalCase.primary_surgeon?.name ?? null,
        anaesthesiologistName: getAnaesthesiologistName(allInvites),
      },
    });
  } catch (error) {
    console.error('[API] GET doctor preop-ward checklist error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
