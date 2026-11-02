import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { SurgicalCaseStatus, SurgicalRole } from '@prisma/client';
import db from '@/lib/db';
import { recordStaffAssignment } from '@/application/services/theater-tech/CreateSurgicalCaseFromPatientService';

export interface SurgicalTeamMemberInput {
  name?: string;
  doctorId?: string;
}

export interface SurgicalCaseTeamInput {
  primary?: SurgicalTeamMemberInput | null;
  assistants?: SurgicalTeamMemberInput[];
}

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
  team?: SurgicalCaseTeamInput;
}

const caseUpdateSelect = {
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
} as const;

async function applySurgicalTeam(
  caseId: string,
  team: SurgicalCaseTeamInput,
  assignedByUserId: string,
): Promise<void> {
  const doctorIds = [
    team.primary?.doctorId,
    ...(team.assistants ?? []).map((member) => member.doctorId),
  ].filter((id): id is string => Boolean(id));

  type DirectoryDoctor = { id: string; name: string; user_id: string | null };
  let doctors: DirectoryDoctor[] = [];
  if (doctorIds.length > 0) {
    doctors = await db.doctor.findMany({
      where: { id: { in: [...new Set(doctorIds)] } },
      select: { id: true, name: true, user_id: true },
    });
  }
  const doctorsById = new Map(doctors.map((doctor) => [doctor.id, doctor]));
  for (const doctorId of new Set(doctorIds)) {
    if (!doctorsById.has(doctorId)) {
      throw new Error('Surgeon not found');
    }
  }

  const primaryDoctor = team.primary?.doctorId ? doctorsById.get(team.primary.doctorId) : undefined;
  const primaryName = (primaryDoctor?.name || team.primary?.name || '').trim();
  if (team.primary && !primaryDoctor && primaryName.length > 0 && primaryName.length < 2) {
    throw new Error('Primary surgeon name is too short');
  }

  const surgicalCase = await db.surgicalCase.findUnique({
    where: { id: caseId },
    select: { patient: { select: { first_name: true, last_name: true } } },
  });
  const patientName = `${surgicalCase?.patient.first_name ?? ''} ${surgicalCase?.patient.last_name ?? ''}`.trim() || 'Unknown Patient';

  const members: Array<{
    surgical_case_id: string;
    role: SurgicalRole;
    name: string;
    user_id: string | null;
    is_external: boolean;
    external_name: string | null;
  }> = [];

  if (primaryName) {
    members.push({
      surgical_case_id: caseId,
      role: SurgicalRole.SURGEON,
      name: primaryName,
      user_id: primaryDoctor?.user_id ?? null,
      is_external: !primaryDoctor,
      external_name: primaryDoctor ? null : primaryName,
    });
  }

  for (const assistant of team.assistants ?? []) {
    const doctor = assistant.doctorId ? doctorsById.get(assistant.doctorId) : undefined;
    const name = (doctor?.name || assistant.name || '').trim();
    if (name.length < 2) continue;
    members.push({
      surgical_case_id: caseId,
      role: SurgicalRole.ASSISTANT_SURGEON,
      name,
      user_id: doctor?.user_id ?? null,
      is_external: !doctor,
      external_name: doctor ? null : name,
    });
  }

  await db.$transaction(async (tx) => {
    await tx.surgicalCase.update({
      where: { id: caseId },
      data: {
        primary_surgeon_id: primaryDoctor?.id ?? null,
        primary_surgeon_name: primaryDoctor ? null : (primaryName || null),
      },
    });
    await tx.surgicalCaseTeamMember.deleteMany({
      where: {
        surgical_case_id: caseId,
        role: { in: [SurgicalRole.SURGEON, SurgicalRole.ASSISTANT_SURGEON] },
      },
    });
    if (members.length > 0) {
      await tx.surgicalCaseTeamMember.createMany({ data: members });
    }
  });

  const invited = new Set<string>();
  if (primaryDoctor?.user_id) {
    invited.add(`${primaryDoctor.user_id}:${SurgicalRole.SURGEON}`);
    await recordStaffAssignment(db, {
      surgicalCaseId: caseId,
      patientName,
      invitedUserId: primaryDoctor.user_id,
      invitedRole: SurgicalRole.SURGEON,
      assignedByUserId,
    });
  }

  for (const assistant of team.assistants ?? []) {
    const doctor = assistant.doctorId ? doctorsById.get(assistant.doctorId) : undefined;
    if (!doctor?.user_id) continue;
    const key = `${doctor.user_id}:${SurgicalRole.ASSISTANT_SURGEON}`;
    if (invited.has(key)) continue;
    invited.add(key);
    await recordStaffAssignment(db, {
      surgicalCaseId: caseId,
      patientName,
      invitedUserId: doctor.user_id,
      invitedRole: SurgicalRole.ASSISTANT_SURGEON,
      assignedByUserId,
    });
  }
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
        team_members: {
          select: { id: true, role: true, name: true, user_id: true, is_external: true },
        },
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
              select: {
                id: true,
                name: true,
                category: true,
                subcategory: true,
                estimated_duration_minutes: true,
                procedure_service_links: {
                  select: {
                    service: {
                      select: { id: true, service_name: true, price: true, category: true, is_active: true },
                    },
                  },
                },
              },
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
    if (
      user.role !== Role.FRONTDESK &&
      user.role !== Role.ADMIN &&
      user.role !== Role.THEATER_TECHNICIAN &&
      user.role !== Role.NURSE
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Only frontdesk, nurse, or theater-tech can update procedures' },
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
      team,
    } = body;

    if (team) {
      try {
        await applySurgicalTeam(caseId, team, user.userId);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save surgical team';
        const statusCode = message === 'Surgeon not found' || message === 'Primary surgeon name is too short' ? 400 : 500;
        if (statusCode === 500) {
          console.error('[API] PATCH surgical team - Error:', error);
        }
        return NextResponse.json({ success: false, error: message }, { status: statusCode });
      }
    }

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
      if (team) {
        const updated = await db.surgicalCase.findUnique({
          where: { id: caseId },
          select: caseUpdateSelect,
        });
        return NextResponse.json({ success: true, data: updated });
      }
      return NextResponse.json({ success: false, error: 'No fields provided for update' }, { status: 400 });
    }

    const updated = await db.surgicalCase.update({
      where: { id: caseId },
      data: updateData,
      select: caseUpdateSelect,
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
    if (
      user.role !== Role.FRONTDESK &&
      user.role !== Role.ADMIN &&
      user.role !== Role.THEATER_TECHNICIAN &&
      user.role !== Role.NURSE
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Only frontdesk, nurse, or theater-tech can delete procedures' },
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
