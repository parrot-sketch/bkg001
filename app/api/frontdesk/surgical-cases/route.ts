import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { SurgicalCaseStatus } from '@prisma/client';
import { createSurgicalCaseFromPatient } from '@/application/services/theater-tech/CreateSurgicalCaseFromPatientService';
import db from '@/lib/db';

export interface ScheduleProcedureRequest {
  patientId: string;
  procedureIds: string[];
  procedureDate: string;
  primarySurgeonDoctorId?: string;
  primarySurgeonName?: string;
  diagnosis?: string;
  procedureCategory?: string;
  primaryOrRevision?: string;
  admissionType?: string;
  appointmentId?: number;
}

export interface ScheduleProcedureResponse {
  surgicalCaseId: string;
  status: string;
  patientName: string;
}

export interface FrontdeskSurgicalCaseListItem {
  id: string;
  status: string;
  procedure_name: string;
  procedure_date: string | null;
  diagnosis: string | null;
  procedure_category: string | null;
  primary_or_revision: string | null;
  admission_type: string | null;
  created_at: string;
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    file_number: string | null;
  };
  primary_surgeon: {
    id: string;
    name: string;
    specialization: string | null;
  } | null;
  primary_surgeon_name: string | null;
}

export interface FrontdeskSurgicalCasesListResponse {
  data: FrontdeskSurgicalCaseListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      const statusValues = status.split(',').map(s => s.trim()).filter(Boolean);
      if (statusValues.length > 0) {
        where.status = { in: statusValues };
      }
    }

    if (search) {
      where.OR = [
        { patient: { first_name: { contains: search, mode: 'insensitive' } } },
        { patient: { last_name: { contains: search, mode: 'insensitive' } } },
        { patient: { file_number: { contains: search, mode: 'insensitive' } } },
        { procedure_name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [cases, total] = await Promise.all([
      db.surgicalCase.findMany({
        where,
        select: {
          id: true,
          status: true,
          procedure_name: true,
          procedure_date: true,
          diagnosis: true,
          procedure_category: true,
          primary_or_revision: true,
          admission_type: true,
          created_at: true,
          updated_at: true,
          primary_surgeon_name: true,
          patient: {
            select: { id: true, first_name: true, last_name: true, file_number: true },
          },
          primary_surgeon: {
            select: { id: true, name: true, specialization: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      db.surgicalCase.count({ where }),
    ]);

    const response: FrontdeskSurgicalCasesListResponse = {
      data: cases,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('[API] GET /api/frontdesk/surgical-cases - Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch surgical cases' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const user = authResult.user;
    if (user.role !== Role.FRONTDESK && user.role !== Role.ADMIN && user.role !== Role.THEATER_TECHNICIAN && user.role !== Role.NURSE) {
        return NextResponse.json(
            { success: false, error: 'Access denied: Only frontdesk, nurse, or theater-tech can schedule procedures' },
            { status: 403 }
        );
    }

    const body: ScheduleProcedureRequest = await request.json();
    const { patientId, procedureIds, procedureDate, primarySurgeonDoctorId, primarySurgeonName, diagnosis, procedureCategory, primaryOrRevision, admissionType, appointmentId } = body;

    if (!patientId || !procedureIds || !Array.isArray(procedureIds) || procedureIds.length === 0 || !procedureDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: patientId, procedureIds, procedureDate' },
        { status: 400 }
      );
    }

    if (!primarySurgeonDoctorId && !primarySurgeonName?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: primarySurgeonDoctorId or primarySurgeonName' },
        { status: 400 }
      );
    }

    const patient = await db.patient.findUnique({
      where: { id: patientId },
      select: { id: true, first_name: true, last_name: true },
    });

    if (!patient) {
      return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }

    if (appointmentId) {
      const existing = await db.surgicalCase.findUnique({
        where: { appointment_id: appointmentId },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json(
          { success: true, data: { surgicalCaseId: existing.id, status: SurgicalCaseStatus.READY_FOR_WARD_PREP, patientName: `${patient.first_name} ${patient.last_name}` } },
          { status: 200 }
        );
      }
    }

    const procedureDateObj = new Date(procedureDate);
    const primaryProcedureId = procedureIds[0];
    const primaryProcedure = await db.surgicalProcedureOption.findUnique({
      where: { id: primaryProcedureId },
      select: { name: true },
    });

    const created = await createSurgicalCaseFromPatient(db, {
      patientId,
      createdByUserId: user.userId,
      primarySurgeonDoctorId,
      primarySurgeonName: primarySurgeonName?.trim() || undefined,
      appointmentId,
      procedureDate: procedureDateObj,
      procedureName: primaryProcedure?.name || '',
      status: SurgicalCaseStatus.READY_FOR_WARD_PREP,
    });

    if (!created.alreadyExisted) {
      if (diagnosis || procedureCategory || primaryOrRevision || admissionType) {
        await db.surgicalCase.update({
          where: { id: created.surgicalCaseId },
          data: {
            ...(diagnosis ? { diagnosis } : {}),
            ...(procedureCategory ? { procedure_category: procedureCategory } : {}),
            ...(primaryOrRevision ? { primary_or_revision: primaryOrRevision } : {}),
            ...(admissionType ? { admission_type: admissionType } : {}),
          },
        });
      }

      const allProcedures = await db.surgicalProcedureOption.findMany({
        where: { id: { in: procedureIds } },
        select: { id: true, name: true },
      });

      if (allProcedures.length > 0) {
        const procedureNameSummary = allProcedures.map(p => p.name).join(', ');
        await db.surgicalCase.update({
          where: { id: created.surgicalCaseId },
          data: { procedure_name: procedureNameSummary },
        });

        await db.surgicalCaseProcedure.createMany({
          data: allProcedures.map((proc) => ({
            surgical_case_id: created.surgicalCaseId,
            procedure_id: proc.id,
          })),
        });
      }
    }

    const patientName = `${patient.first_name} ${patient.last_name}`.trim() || 'Unknown Patient';

    return NextResponse.json(
      {
        success: true,
        data: {
          surgicalCaseId: created.surgicalCaseId,
          status: SurgicalCaseStatus.READY_FOR_WARD_PREP,
          patientName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] POST /api/frontdesk/surgical-cases - Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to schedule procedure' },
      { status: 500 }
    );
  }
}
