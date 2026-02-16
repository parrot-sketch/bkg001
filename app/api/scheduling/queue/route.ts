
import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role, SurgicalCaseStatus } from '@prisma/client';
import db from '@/lib/db';
import { endpointTimer } from '@/lib/observability/endpointLogger';
import { z } from 'zod';

// Allowed roles for scheduling
const ALLOWED_ROLES = new Set<Role>([Role.ADMIN, Role.THEATER_TECHNICIAN]);

const querySchema = z.object({
    q: z.string().optional(),
    urgency: z.enum(['ELECTIVE', 'URGENT', 'EMERGENCY']).optional(),
    surgeonId: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(100).default(50),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
    const timer = endpointTimer('GET /api/scheduling/queue');
    try {
        // 1. Authenticate
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        // 2. Authorize
        if (!ALLOWED_ROLES.has(authResult.user.role as Role)) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        // 3. Parse Query
        const url = new URL(request.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        const validation = querySchema.safeParse(queryParams);

        if (!validation.success) {
            return NextResponse.json({ success: false, error: 'Invalid query parameters', details: validation.error.format() }, { status: 400 });
        }

        const { q, urgency, surgeonId, page, pageSize } = validation.data;

        // 4. Build Where Clause
        const where: any = {
            status: SurgicalCaseStatus.READY_FOR_SCHEDULING,
        };

        if (q) {
            where.OR = [
                { patient: { first_name: { contains: q, mode: 'insensitive' } } },
                { patient: { last_name: { contains: q, mode: 'insensitive' } } },
                { patient: { file_number: { contains: q, mode: 'insensitive' } } },
                { procedure_name: { contains: q, mode: 'insensitive' } },
            ];
        }

        if (urgency) {
            where.urgency = urgency;
        }

        if (surgeonId) {
            where.primary_surgeon_id = surgeonId;
        }

        // 5. Fetch Data (Select only)
        const [cases, total] = await Promise.all([
            db.surgicalCase.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { created_at: 'asc' }, // FIFO
                select: {
                    id: true,
                    urgency: true,
                    procedure_name: true,
                    diagnosis: true,
                    created_at: true,
                    patient: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                            file_number: true,
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
                            ready_for_surgery: true, // Doctor's "Plan Ready" flag
                            estimated_duration_minutes: true,
                            images: {
                                select: { id: true }, // Count photos
                            },
                            consents: {
                                select: { status: true }, // Count signed
                            },
                        },
                    },
                    clinical_forms: {
                        where: { template_key: 'NURSE_PREOP_WARD_CHECKLIST' },
                        select: { status: true },
                        take: 1, // Only need latest
                        orderBy: { created_at: 'desc' }
                    }
                },
            }),
            db.surgicalCase.count({ where }),
        ]);

        timer.end({ total, page });

        // 6. Map to Lean DTO
        const data = cases.map((c) => {
            const consentsSigned = c.case_plan?.consents.filter(x => x.status === 'SIGNED').length || 0;
            const photosCount = c.case_plan?.images.length || 0;
            const nursePreopStatus = c.clinical_forms[0]?.status || 'NONE';

            return {
                caseId: c.id,
                patientName: `${c.patient.first_name} ${c.patient.last_name}`,
                fileNumber: c.patient.file_number,
                procedureName: c.procedure_name,
                diagnosis: c.diagnosis,
                urgency: c.urgency,
                surgeonName: c.primary_surgeon.name,
                estimatedDurationMinutes: c.case_plan?.estimated_duration_minutes || 60, // Default 60 if missing
                readiness: {
                    doctorPlanReady: c.case_plan?.ready_for_surgery || false,
                    consentsSignedCount: consentsSigned,
                    photosCount: photosCount,
                    nursePreopStatus: nursePreopStatus,
                },
                createdAt: c.created_at.toISOString(),
            };
        });

        return NextResponse.json({
            success: true,
            data,
            meta: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        });

    } catch (error) {
        console.error('[API] GET /api/scheduling/queue - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
