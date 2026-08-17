/**
 * GET /api/theater-tech/surgical-cases/[caseId]
 * DELETE /api/theater-tech/surgical-cases/[caseId]
 * 
 * Allows theater tech to view and delete DRAFT surgical cases.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
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

    const { role } = authResult.user;
    if (role !== 'THEATER_TECHNICIAN' && role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden: Theater technician role required' }, { status: 403 });
    }

    const { caseId } = await params;

    const surgicalCase = await db.surgicalCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        status: true,
        procedure_name: true,
        procedure_date: true,
        diagnosis: true,
        procedure_category: true,
        primary_or_revision: true,
        admission_type: true,
        urgency: true,
        created_at: true,
        updated_at: true,
        patient: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            file_number: true,
            email: true,
            phone: true,
            date_of_birth: true,
            gender: true,
            address: true,
          },
        },
        primary_surgeon: {
          select: { id: true, name: true, specialization: true },
        },
        primary_surgeon_name: true,
        case_plan: {
          select: {
            id: true,
            readiness_status: true,
            ready_for_surgery: true,
            estimated_duration_minutes: true,
          },
        },
        theater_booking: {
          include: {
            theater: { select: { id: true, name: true, type: true } },
          },
        },
        case_procedures: {
          include: {
            procedure: {
              select: { id: true, name: true, category: true, subcategory: true, estimated_duration_minutes: true },
            },
          },
        },
      },
    });

    if (!surgicalCase) {
      return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: surgicalCase });
  } catch (error) {
    console.error('[API] GET /api/theater-tech/surgical-cases/[caseId] - Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch surgical case' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { role } = authResult.user;
    if (role !== 'THEATER_TECHNICIAN' && role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden: Theater technician role required' }, { status: 403 });
    }

    const { caseId } = await params;

    // Validate the case exists and is in DRAFT status
    const sc = await db.surgicalCase.findUnique({
      where: { id: caseId },
      select: { id: true, status: true },
    });

    if (!sc) {
      return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
    }

    if (sc.status !== 'DRAFT') {
      return NextResponse.json({ success: false, error: 'Only draft cases can be deleted' }, { status: 400 });
    }

    // Delete the surgical case (cascade handles related records)
    await db.surgicalCase.delete({ where: { id: caseId } });

    return NextResponse.json({ success: true, msg: 'Case deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting surgical case:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete case' },
      { status: 500 }
    );
  }
}