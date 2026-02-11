/**
 * API Route: GET /api/doctor/surgical-cases
 *
 * Returns surgical cases for the authenticated doctor with:
 * - Pagination (page, pageSize)
 * - Search (q — patient name, procedure, diagnosis)
 * - Filters (status, urgency)
 * - Metrics (counts by status — always global, not filtered)
 *
 * Response shape:
 * {
 *   success: true,
 *   data: {
 *     items: SurgicalCaseListItemDto[],
 *     meta: { page, pageSize, total, totalPages },
 *     metrics: { total, draft, planning, readyForScheduling, scheduled, inProgress, completed, cancelled }
 *   }
 * }
 *
 * Security:
 * - Requires authentication
 * - Only DOCTOR role can access
 * - Scoped to the requesting doctor's cases
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { Prisma, SurgicalCaseStatus, SurgicalUrgency } from '@prisma/client';

// ─── Constants ──────────────────────────────────────────────────────────
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// Active statuses are sorted before terminal statuses
const STATUS_SORT_ORDER: Record<string, number> = {
    IN_THEATER: 0,
    IN_PREP: 1,
    SCHEDULED: 2,
    READY_FOR_SCHEDULING: 3,
    PLANNING: 4,
    DRAFT: 5,
    RECOVERY: 6,
    COMPLETED: 7,
    CANCELLED: 8,
};

// ─── Helpers ────────────────────────────────────────────────────────────

function parseIntParam(value: string | null, fallback: number): number {
    if (!value) return fallback;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) || parsed < 1 ? fallback : parsed;
}

function isValidStatus(s: string): s is SurgicalCaseStatus {
    return Object.values(SurgicalCaseStatus).includes(s as SurgicalCaseStatus);
}

function isValidUrgency(u: string): u is SurgicalUrgency {
    return Object.values(SurgicalUrgency).includes(u as SurgicalUrgency);
}

/** Map a raw Prisma case to the lean DTO shape */
function mapCaseToDto(sc: any) {
    return {
        id: sc.id,
        status: sc.status,
        urgency: sc.urgency,
        diagnosis: sc.diagnosis,
        procedureName: sc.procedure_name,
        side: sc.side,
        createdAt: sc.created_at,
        updatedAt: sc.updated_at,
        patient: sc.patient
            ? {
                  id: sc.patient.id,
                  firstName: sc.patient.first_name,
                  lastName: sc.patient.last_name,
                  fileNumber: sc.patient.file_number,
                  gender: sc.patient.gender,
                  dateOfBirth: sc.patient.date_of_birth,
              }
            : null,
        primarySurgeon: sc.primary_surgeon
            ? {
                  id: sc.primary_surgeon.id,
                  name: sc.primary_surgeon.name,
              }
            : null,
        casePlan: sc.case_plan
            ? {
                  id: sc.case_plan.id,
                  appointmentId: sc.case_plan.appointment_id,
                  readinessStatus: sc.case_plan.readiness_status,
                  readyForSurgery: sc.case_plan.ready_for_surgery,
                  hasProcedurePlan: !!sc.case_plan.procedure_plan,
                  hasRiskFactors: !!sc.case_plan.risk_factors,
                  plannedAnesthesia: sc.case_plan.planned_anesthesia,
                  estimatedDurationMinutes: sc.case_plan.estimated_duration_minutes,
                  consentCount: sc.case_plan._count?.consents ?? 0,
                  imageCount: sc.case_plan._count?.images ?? 0,
              }
            : null,
        theaterBooking: sc.theater_booking
            ? {
                  id: sc.theater_booking.id,
                  startTime: sc.theater_booking.start_time,
                  endTime: sc.theater_booking.end_time,
                  status: sc.theater_booking.status,
                  theaterName: sc.theater_booking.theater?.name ?? null,
              }
            : null,
        consultation: sc.consultation
            ? {
                  id: sc.consultation.id,
                  appointmentId: sc.consultation.appointment_id,
              }
            : null,
    };
}

// ─── Handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        // 1. Authenticate
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 },
            );
        }

        // 2. Authorize (Doctor only)
        if (authResult.user.role !== 'DOCTOR') {
            return NextResponse.json(
                { success: false, error: 'Forbidden: Doctors only' },
                { status: 403 },
            );
        }

        // 3. Resolve doctor profile
        const doctorProfile = await db.doctor.findUnique({
            where: { user_id: authResult.user.userId },
            select: { id: true },
        });

        if (!doctorProfile) {
            return NextResponse.json(
                { success: false, error: 'Doctor profile not found' },
                { status: 404 },
            );
        }

        // 4. Parse query params
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q')?.trim() || '';
        const statusFilter = searchParams.get('status') || '';
        const urgencyFilter = searchParams.get('urgency') || '';
        const page = parseIntParam(searchParams.get('page'), DEFAULT_PAGE);
        const rawPageSize = parseIntParam(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);
        const pageSize = Math.min(rawPageSize, MAX_PAGE_SIZE);

        // 5. Build WHERE clause
        const where: Prisma.SurgicalCaseWhereInput = {
            primary_surgeon_id: doctorProfile.id,
        };

        // Status filter
        if (statusFilter) {
            // Support comma-separated statuses for grouped tabs (e.g. "IN_PREP,IN_THEATER,RECOVERY")
            const statuses = statusFilter.split(',').filter(isValidStatus);
            if (statuses.length === 1) {
                where.status = statuses[0] as SurgicalCaseStatus;
            } else if (statuses.length > 1) {
                where.status = { in: statuses as SurgicalCaseStatus[] };
            }
        }

        // Urgency filter
        if (urgencyFilter && isValidUrgency(urgencyFilter)) {
            where.urgency = urgencyFilter as SurgicalUrgency;
        }

        // Search — patient name, procedure name, or diagnosis
        if (q) {
            where.OR = [
                { patient: { first_name: { contains: q, mode: 'insensitive' } } },
                { patient: { last_name: { contains: q, mode: 'insensitive' } } },
                { patient: { file_number: { contains: q, mode: 'insensitive' } } },
                { procedure_name: { contains: q, mode: 'insensitive' } },
                { diagnosis: { contains: q, mode: 'insensitive' } },
            ];
        }

        // 6. Compute metrics (global counts, unaffected by filters)
        //    Single aggregation query with groupBy
        const statusCounts = await db.surgicalCase.groupBy({
            by: ['status'],
            where: { primary_surgeon_id: doctorProfile.id },
            _count: { _all: true },
        });

        const countMap: Record<string, number> = {};
        let totalAll = 0;
        for (const row of statusCounts) {
            countMap[row.status] = row._count._all;
            totalAll += row._count._all;
        }

        const metrics = {
            total: totalAll,
            draft: countMap['DRAFT'] ?? 0,
            planning: countMap['PLANNING'] ?? 0,
            readyForScheduling: countMap['READY_FOR_SCHEDULING'] ?? 0,
            scheduled: countMap['SCHEDULED'] ?? 0,
            inProgress:
                (countMap['IN_PREP'] ?? 0) +
                (countMap['IN_THEATER'] ?? 0) +
                (countMap['RECOVERY'] ?? 0),
            completed: countMap['COMPLETED'] ?? 0,
            cancelled: countMap['CANCELLED'] ?? 0,
        };

        // 7. Count filtered total (for pagination)
        const total = await db.surgicalCase.count({ where });
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const safePage = Math.min(page, totalPages);

        // 8. Fetch filtered + paginated cases
        const cases = await db.surgicalCase.findMany({
            where,
            orderBy: [
                { updated_at: 'desc' },
            ],
            skip: (safePage - 1) * pageSize,
            take: pageSize,
            select: {
                id: true,
                status: true,
                urgency: true,
                diagnosis: true,
                procedure_name: true,
                side: true,
                created_at: true,
                updated_at: true,
                patient: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        file_number: true,
                        gender: true,
                        date_of_birth: true,
                    },
                },
                primary_surgeon: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                case_plan: {
                    select: {
                        id: true,
                        appointment_id: true,
                        readiness_status: true,
                        ready_for_surgery: true,
                        procedure_plan: true,
                        risk_factors: true,
                        planned_anesthesia: true,
                        estimated_duration_minutes: true,
                        _count: {
                            select: {
                                consents: true,
                                images: true,
                            },
                        },
                    },
                },
                theater_booking: {
                    select: {
                        id: true,
                        start_time: true,
                        end_time: true,
                        status: true,
                        theater: {
                            select: { name: true },
                        },
                    },
                },
                consultation: {
                    select: {
                        id: true,
                        appointment_id: true,
                    },
                },
            },
        });

        // 9. Sort in application layer for custom status priority
        //    Active cases first (by status priority), then by updatedAt desc within each group
        const sorted = [...cases].sort((a, b) => {
            const aPrio = STATUS_SORT_ORDER[a.status] ?? 99;
            const bPrio = STATUS_SORT_ORDER[b.status] ?? 99;
            if (aPrio !== bPrio) return aPrio - bPrio;
            // Within same priority: newest updated first
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });

        // 10. Map to DTO
        const items = sorted.map(mapCaseToDto);

        return NextResponse.json({
            success: true,
            data: {
                items,
                meta: {
                    page: safePage,
                    pageSize,
                    total,
                    totalPages,
                },
                metrics,
            },
        });
    } catch (error) {
        console.error('[API] GET /api/doctor/surgical-cases - Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 },
        );
    }
}
