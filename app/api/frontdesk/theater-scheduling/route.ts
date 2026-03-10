/**
 * API Route: GET /api/frontdesk/theater-scheduling
 *
 * Returns surgical cases ready for theater booking (READY_FOR_SCHEDULING status).
 * Frontdesk uses this to see which cases need theater scheduling.
 *
 * - Requires authentication (FRONTDESK or ADMIN)
 * - Returns cases with patient, surgeon, procedure details
 * - Includes pre-op checklist completion status
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { SurgicalCaseStatus } from '@prisma/client';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        // 1. Authenticate
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { role } = authResult.user;

        // 2. Check permissions (FRONTDESK or ADMIN only)
        if (role !== Role.FRONTDESK && role !== Role.ADMIN) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Access denied: Only frontdesk staff can view theater scheduling queue',
                },
                { status: 403 }
            );
        }

        // 3. Fetch cases ready for theater booking
        const cases = await db.surgicalCase.findMany({
            where: {
                status: SurgicalCaseStatus.READY_FOR_SCHEDULING,
            },
            select: {
                id: true,
                status: true,
                procedure_name: true,
                urgency: true,
                created_at: true,
                patient: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        file_number: true,
                        date_of_birth: true,
                        gender: true,
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
                        procedure_plan: true,
                    },
                },
                theater_booking: {
                    // theater_booking is singular (optional), not an array
                    // Only include if status is not CANCELLED
                    select: {
                        id: true,
                        theater_id: true,
                        start_time: true,
                        end_time: true,
                        status: true,
                    },
                },
                clinical_forms: {
                    where: {
                        template_key: 'nurse_preop_ward_checklist',
                        status: 'FINAL',
                    },
                    select: {
                        id: true,
                        status: true,
                        signed_at: true, // Use signed_at instead of finalized_at (check schema)
                    },
                    take: 1,
                },
            },
            orderBy: [
                { urgency: 'asc' }, // Emergency first (urgency is on SurgicalCase, not CasePlan)
                { created_at: 'asc' }, // Then by creation date
            ],
        });

        // 4. Format response
        const formattedCases = cases.map((c) => {
            const preOpChecklist = c.clinical_forms[0];
            // theater_booking is singular (optional), not an array
            // Only include if status is not CANCELLED
            const existingBooking = c.theater_booking && c.theater_booking.status !== 'CANCELLED' 
                ? c.theater_booking 
                : null;

            return {
                id: c.id,
                status: c.status,
                patient: c.patient
                    ? {
                          id: c.patient.id,
                          name: `${c.patient.first_name} ${c.patient.last_name}`.trim(),
                          fileNumber: c.patient.file_number,
                          dateOfBirth: c.patient.date_of_birth,
                          gender: c.patient.gender,
                      }
                    : null,
                surgeon: c.primary_surgeon
                    ? {
                          id: c.primary_surgeon.id,
                          name: c.primary_surgeon.name,
                          specialization: c.primary_surgeon.specialization,
                      }
                    : null,
                procedure: c.procedure_name || 'Unspecified',
                urgency: c.urgency || 'ELECTIVE',
                preOpChecklistFinalized: !!preOpChecklist,
                preOpChecklistFinalizedAt: preOpChecklist?.signed_at || null,
                existingBooking: existingBooking
                    ? {
                          id: existingBooking.id,
                          theaterId: existingBooking.theater_id,
                          startTime: existingBooking.start_time,
                          endTime: existingBooking.end_time,
                          status: existingBooking.status,
                      }
                    : null,
                createdAt: c.created_at,
            };
        });

        return NextResponse.json({
            success: true,
            data: {
                cases: formattedCases,
                count: formattedCases.length,
            },
        });
    } catch (error) {
        console.error('[API] /api/frontdesk/theater-scheduling GET - Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch theater scheduling queue',
            },
            { status: 500 }
        );
    }
}
