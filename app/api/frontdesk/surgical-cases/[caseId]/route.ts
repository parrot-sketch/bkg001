import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { SurgicalCaseStatus } from '@prisma/client';
import db from '@/lib/db';

export interface UpdateFrontdeskSurgicalCaseRequest {
  procedureName?: string;
  procedureDate?: string;
  primarySurgeonDoctorId?: string;
  primarySurgeonName?: string;
  diagnosis?: string | null;
  procedureCategory?: string | null;
  primaryOrRevision?: string | null;
  admissionType?: string | null;
  status?: SurgicalCaseStatus;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
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
    console.error('[API] GET /api/frontdesk/surgical-cases/[caseId] - Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch surgical case' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const user = authResult.user;
    if (user.role !== Role.FRONTDESK && user.role !== Role.ADMIN && user.role !== Role.THEATER_TECHNICIAN) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Only frontdesk or theater-tech can update procedures' },
        { status: 403 }
      );
    }

    const { caseId } = await params;

    const existingCase = await db.surgicalCase.findUnique({
      where: { id: caseId },
      select: { id: true, status: true },
    });

    if (!existingCase) {
      return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
    }

    const body: UpdateFrontdeskSurgicalCaseRequest = await request.json();
    const {
      procedureName,
      procedureDate,
      primarySurgeonDoctorId,
      primarySurgeonName,
      diagnosis,
      procedureCategory,
      primaryOrRevision,
      admissionType,
      status,
    } = body;

    const updateData: any = {};

    if (procedureName !== undefined) updateData.procedure_name = procedureName;
    if (procedureDate !== undefined) updateData.procedure_date = new Date(procedureDate);
    if (primarySurgeonDoctorId !== undefined) updateData.primary_surgeon_id = primarySurgeonDoctorId || null;
    if (primarySurgeonName !== undefined) updateData.primary_surgeon_name = primarySurgeonName || null;
    if (diagnosis !== undefined) updateData.diagnosis = diagnosis;
    if (procedureCategory !== undefined) updateData.procedure_category = procedureCategory;
    if (primaryOrRevision !== undefined) updateData.primary_or_revision = primaryOrRevision;
    if (admissionType !== undefined) updateData.admission_type = admissionType;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields provided for update' }, { status: 400 });
    }

    const updated = await db.surgicalCase.update({
      where: { id: caseId },
      data: updateData,
      select: {
        id: true,
        status: true,
        procedure_name: true,
        procedure_date: true,
        diagnosis: true,
        procedure_category: true,
        primary_or_revision: true,
        admission_type: true,
        updated_at: true,
        primary_surgeon_name: true,
        patient: {
          select: { id: true, first_name: true, last_name: true, file_number: true },
        },
        primary_surgeon: {
          select: { id: true, name: true, specialization: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('[API] PATCH /api/frontdesk/surgical-cases/[caseId] - Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update surgical case' },
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

    const user = authResult.user;
    if (user.role !== Role.FRONTDESK && user.role !== Role.ADMIN && user.role !== Role.THEATER_TECHNICIAN) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Only frontdesk or theater-tech can delete procedures' },
        { status: 403 }
      );
    }

    const { caseId } = await params;

    const sc = await db.surgicalCase.findUnique({
      where: { id: caseId },
      select: { id: true, status: true },
    });

    if (!sc) {
      return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
    }

    const allowedStatuses: string[] = [
      SurgicalCaseStatus.DRAFT,
      SurgicalCaseStatus.PLANNING,
      SurgicalCaseStatus.READY_FOR_SCHEDULING,
      SurgicalCaseStatus.READY_FOR_WARD_PREP,
      SurgicalCaseStatus.IN_WARD_PREP,
    ];

    if (!allowedStatuses.includes(sc.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot delete case in status: ${sc.status}. Only early-stage cases can be removed.` },
        { status: 400 }
      );
    }

    await db.surgicalCase.delete({ where: { id: caseId } });

    return NextResponse.json({ success: true, msg: 'Case deleted successfully' });
  } catch (error) {
    console.error('[API] DELETE /api/frontdesk/surgical-cases/[caseId] - Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete case' },
      { status: 500 }
    );
  }
}
