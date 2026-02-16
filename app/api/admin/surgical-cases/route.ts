/**
 * API Route: GET /api/admin/surgical-cases
 *
 * Returns surgical cases filtered by status for admin dashboards.
 * Primarily used by the theater scheduling page to show cases
 * that are READY_FOR_SCHEDULING.
 *
 * Query params:
 *   ?status=READY_FOR_SCHEDULING  (default)
 *   ?status=SCHEDULED
 *   ?status=PLANNING
 *   ?page=1            (default 1)
 *   ?pageSize=50       (default 50, max 100)
 *
 * Security:
 * - Requires authentication
 * - Only ADMIN role can access
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { SurgicalCaseStatus } from '@prisma/client';
import db from '@/lib/db';
import { endpointTimer } from '@/lib/observability/endpointLogger';

const ALLOWED_STATUSES = new Set(Object.values(SurgicalCaseStatus));
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

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

        // 2. Authorize (Admin only)
        if (authResult.user.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Forbidden: Admin access required' },
                { status: 403 },
            );
        }

        // 3. Parse query params
        const { searchParams } = new URL(request.url);
        const statusParam = searchParams.get('status') || 'READY_FOR_SCHEDULING';
        const page = Math.max(1, parseInt(searchParams.get('page') || '', 10) || DEFAULT_PAGE);
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get('pageSize') || '', 10) || DEFAULT_PAGE_SIZE));

        if (!ALLOWED_STATUSES.has(statusParam as SurgicalCaseStatus)) {
            return NextResponse.json(
                { success: false, error: `Invalid status: ${statusParam}` },
                { status: 400 },
            );
        }

        const where = { status: statusParam as SurgicalCaseStatus };

        // 4. Fetch cases with select (no include) + pagination
        const timer = endpointTimer('GET /api/admin/surgical-cases');
        const [cases, total] = await Promise.all([
            db.surgicalCase.findMany({
                where,
                orderBy: { created_at: 'asc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    status: true,
                    urgency: true,
                    diagnosis: true,
                    procedure_name: true,
                    created_at: true,
                    patient: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                            file_number: true,
                            date_of_birth: true,
                            gender: true,
                            allergies: true,
                        },
                    },
                    primary_surgeon: {
                        select: {
                            id: true,
                            name: true,
                            specialization: true,
                        },
                    },
                    case_plan: {
                        select: {
                            id: true,
                            readiness_status: true,
                            ready_for_surgery: true,
                            procedure_plan: true,
                            planned_anesthesia: true,
                            special_instructions: true,
                            appointment_id: true,
                        },
                    },
                    theater_booking: {
                        select: {
                            id: true,
                            start_time: true,
                            end_time: true,
                            status: true,
                            theater: {
                                select: { id: true, name: true, type: true },
                            },
                        },
                    },
                },
            }),
            db.surgicalCase.count({ where }),
        ]);
        timer.end({ status: statusParam, total, page });

        // 5. Map to response DTO
        const mapped = cases.map((sc) => ({
            id: sc.id,
            status: sc.status,
            urgency: sc.urgency,
            diagnosis: sc.diagnosis,
            procedureName: sc.procedure_name,
            createdAt: sc.created_at,
            patient: sc.patient
                ? {
                      id: sc.patient.id,
                      firstName: sc.patient.first_name,
                      lastName: sc.patient.last_name,
                      fileNumber: sc.patient.file_number,
                      dateOfBirth: sc.patient.date_of_birth,
                      gender: sc.patient.gender,
                      allergies: sc.patient.allergies,
                  }
                : null,
            primarySurgeon: sc.primary_surgeon
                ? {
                      id: sc.primary_surgeon.id,
                      name: sc.primary_surgeon.name,
                      specialization: sc.primary_surgeon.specialization,
                  }
                : null,
            casePlan: sc.case_plan
                ? {
                      id: sc.case_plan.id,
                      readinessStatus: sc.case_plan.readiness_status,
                      readyForSurgery: sc.case_plan.ready_for_surgery,
                      procedurePlan: sc.case_plan.procedure_plan,
                      plannedAnesthesia: sc.case_plan.planned_anesthesia,
                      specialInstructions: sc.case_plan.special_instructions,
                      appointmentId: sc.case_plan.appointment_id,
                  }
                : null,
            theaterBooking: sc.theater_booking
                ? {
                      id: sc.theater_booking.id,
                      startTime: sc.theater_booking.start_time,
                      endTime: sc.theater_booking.end_time,
                      status: sc.theater_booking.status,
                      theater: sc.theater_booking.theater,
                  }
                : null,
        }));

        return NextResponse.json({
            success: true,
            data: mapped,
            meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        });
    } catch (error) {
        console.error('[API] GET /api/admin/surgical-cases - Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 },
        );
    }
}
