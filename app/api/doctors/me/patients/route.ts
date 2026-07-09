/**
 * API Route: GET /api/doctors/me/patients
 *
 * Fetch the current doctor's patients from explicit DoctorPatientAssignment records.
 *
 * Query parameters:
 * - status:     Filter by assignment status: ACTIVE | DISCHARGED | TRANSFERRED | INACTIVE | ALL
 *               Default: ACTIVE. 'ALL' returns every lifecycle status.
 * - skip:       Pagination offset (default: 0)
 * - take:       Records per page (default: 50, max: 200)
 * - search:     Free-text search across first_name, last_name, file_number, email, phone
 * - sortBy:     Sort field: assignedAt | name (default: assignedAt)
 * - sortOrder:  Sort direction: asc | desc (default: desc)
 *
 * Response includes `total` (total matching records for pagination math)
 * and enriches each patient DTO with:
 *   - assignedAt: when the patient was assigned to this doctor
 *   - lastVisitDate: date of their most recent appointment
 *   - visitCount: total number of appointments with this doctor
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { Role } from '@/domain/enums/Role';
import { PatientMapper as InfrastructurePatientMapper } from '@/infrastructure/mappers/PatientMapper';
import { PatientMapper as ApplicationPatientMapper } from '@/application/mappers/PatientMapper';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { DoctorPatientAssignmentStatus } from '@prisma/client';

// Valid server-side sort fields
const VALID_SORT_FIELDS = ['assignedAt', 'name'] as const;
type SortField = (typeof VALID_SORT_FIELDS)[number];

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // ── 1. Authenticate ──────────────────────────────────────────────────────
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { userId, role } = authResult.user;

    // ── 2. Authorise ─────────────────────────────────────────────────────────
    if (role !== Role.DOCTOR) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Only doctors can access this endpoint' },
        { status: 403 }
      );
    }

    // ── 3. Resolve doctor profile ────────────────────────────────────────────
    const doctor = await db.doctor.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor profile not found' },
        { status: 404 }
      );
    }

    // ── 4. Parse + validate query params ─────────────────────────────────────
    const url = new URL(request.url);
    const statusParam = url.searchParams.get('status') || 'ACTIVE';
    const skip        = Math.max(0, parseInt(url.searchParams.get('skip')  || '0',  10));
    const take        = Math.min(200, Math.max(1, parseInt(url.searchParams.get('take') || '50', 10)));
    const search      = url.searchParams.get('search')?.trim() || '';
    const sortByParam = (url.searchParams.get('sortBy') || 'assignedAt') as SortField;
    const sortOrder   = url.searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    // Sanitise sortBy to avoid injection
    const sortBy: SortField = VALID_SORT_FIELDS.includes(sortByParam) ? sortByParam : 'assignedAt';

    // ── 5. Build assignment WHERE clause ──────────────────────────────────────
    const assignmentWhere: Record<string, unknown> = { doctor_id: doctor.id };

    // 'ALL' is a UI sentinel — do NOT pass it to Prisma as an enum value
    if (statusParam !== 'ALL') {
      // Validate it's a real enum member before using it
      const validStatuses = Object.values(DoctorPatientAssignmentStatus) as string[];
      if (!validStatuses.includes(statusParam)) {
        return NextResponse.json(
          { success: false, error: `Invalid status filter: ${statusParam}` },
          { status: 400 }
        );
      }
      assignmentWhere.status = statusParam as DoctorPatientAssignmentStatus;
    }

    // ── 6. Fetch assignments (just IDs + assignedAt for now) ─────────────────
    const assignments = await db.doctorPatientAssignment.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: assignmentWhere as any,
      select: { patient_id: true, assigned_at: true },
    });

    const patientIds = assignments.map((a) => a.patient_id);

    // Build a lookup: patientId → assignedAt
    const assignedAtMap: Record<string, Date> = {};
    for (const a of assignments) {
      assignedAtMap[a.patient_id] = a.assigned_at;
    }

    // ── 7. Build patient search clause ────────────────────────────────────────
    const baseWhere: Record<string, unknown> = { id: { in: patientIds } };

    if (search) {
      const likeSearch = { contains: search, mode: 'insensitive' } as const;
      (baseWhere as any).OR = [
        { first_name:   likeSearch },
        { last_name:    likeSearch },
        { file_number:  likeSearch },
        { email:        likeSearch },
        { phone:        likeSearch },
      ];
    }

    // ── 8. Count total matching patients (for pagination) ────────────────────
    const total = await db.patient.count({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: baseWhere as any,
    });

    // ── 9. Determine Prisma orderBy ───────────────────────────────────────────
    // For 'name' we sort by first_name then last_name; for 'assignedAt' we sort
    // in JS after fetching (Prisma can't ORDER BY a computed "assignedAt" on the
    // patient table — it lives on the assignment record).
    const prismaOrderBy: Record<string, unknown>[] =
      sortBy === 'name'
        ? [{ first_name: sortOrder }, { last_name: sortOrder }]
        : [{ created_at: 'desc' }]; // fallback; we re-sort by assignedAt in JS below

    // ── 10. Fetch patients ────────────────────────────────────────────────────
    const patients = await db.patient.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where:   baseWhere    as any,
      orderBy: prismaOrderBy as any,
      skip,
      take,
    });

    // ── 11. Fetch appointment stats for these patients (last visit + count) ───
    //
    // We fetch aggregated appointment data so the client does NOT need a
    // separate useDoctorAppointments call just to decorate the roster.
    let visitCountMap:    Record<string, number> = {};
    let lastVisitDateMap: Record<string, Date>   = {};

    if (patients.length > 0) {
      const fetchedPatientIds = patients.map((p) => p.id);

      // Group appointments by patient, get count + max date in one query
      const appointmentGroups = await db.appointment.groupBy({
        by: ['patient_id'],
        where: {
          patient_id:  { in: fetchedPatientIds },
          doctor_id:   doctor.id,
        },
        _count: { id: true },
        _max:   { appointment_date: true },
      });

      for (const group of appointmentGroups) {
        if (!group.patient_id) continue;
        visitCountMap[group.patient_id]    = group._count.id;
        if (group._max.appointment_date) {
          lastVisitDateMap[group.patient_id] = group._max.appointment_date;
        }
      }
    }

    // ── 12. Map to DTOs ───────────────────────────────────────────────────────
    let patientDtos: (PatientResponseDto & { visitCount: number })[] = patients.map(
      (prismaPatient) => {
        const entity = InfrastructurePatientMapper.fromPrisma(prismaPatient);
        const dto    = ApplicationPatientMapper.toResponseDto(entity);
        return {
          ...dto,
          assignedAt:    assignedAtMap[dto.id]    ?? null,
          lastVisitDate: lastVisitDateMap[dto.id] ?? undefined,
          visitCount:    visitCountMap[dto.id]    ?? 0,
        };
      }
    );

    // ── 13. Re-sort by assignedAt in JS when sortBy === 'assignedAt' ──────────
    // (Prisma can't ORDER BY a field from a different table in findMany without a join)
    if (sortBy === 'assignedAt') {
      patientDtos = patientDtos.sort((a, b) => {
        const ta = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
        const tb = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
        return sortOrder === 'asc' ? ta - tb : tb - ta;
      });
    }

    // ── 14. Respond ───────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        data:    patientDtos,
        count:   patientDtos.length,
        total,
        status:  statusParam,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/doctors/me/patients GET - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch patients' },
      { status: 500 }
    );
  }
}
