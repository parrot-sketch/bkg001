import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (authResult.user.role !== Role.NURSE && authResult.user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { caseId } = await params;

    const surgicalCase = await db.surgicalCase.findUnique({
      where: { id: caseId },
      include: {
        patient: {
          select: { id: true, first_name: true, last_name: true, file_number: true, email: true, phone: true },
        },
        primary_surgeon: {
          select: { name: true, specialization: true },
        },
        case_procedures: {
          include: { procedure: true },
        },
        theater_booking: {
          include: {
            theater: {
              select: { name: true },
            },
          },
        },
        case_plan: true,
        checklist: true,
      },
    });

    if (!surgicalCase) {
      return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });
    }

    const mappedCase = {
      ...surgicalCase,
      procedure_name: surgicalCase.case_procedures?.length > 0
        ? surgicalCase.case_procedures.map((cp: any) => cp.procedure.name).join(', ')
        : surgicalCase.procedure_name,
    };

    return NextResponse.json({ success: true, data: mappedCase });
  } catch (error) {
    console.error('Error fetching nurse surgical case:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch case' }, { status: 500 });
  }
}
